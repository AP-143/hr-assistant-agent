import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AgentEvent } from "./events.js";
import { runAgent } from "./harness.js";
import type { ChatMessage, ToolSpec } from "./llm.js";
import { McpToolClient } from "./mcpClient.js";
import { allToolSpecs } from "./tools.js";

// Seam: the events a caller (such as the web UI) receives while runAgent works.
// The model is scripted; MCP server and retriever are real.
describe("agent events", () => {
  const mcp = new McpToolClient();
  let tools: ToolSpec[];

  before(async () => {
    await mcp.connect();
    tools = await allToolSpecs(mcp);
  });
  after(async () => {
    await mcp.close();
  });

  const text = (content: string): ChatMessage => ({ role: "assistant", content });
  const call = (name: string, args: Record<string, unknown>): ChatMessage => ({
    role: "assistant",
    content: "",
    tool_calls: [{ function: { name, arguments: args } }],
  });
  const callThenEcho = (name: string, args: Record<string, unknown>) => async (messages: ChatMessage[]) => {
    const tool = messages.find((m) => m.role === "tool");
    return tool ? text(`Hasil: ${tool.content}`) : call(name, args);
  };

  const run = async (opts: Partial<Parameters<typeof runAgent>[0]> & { question: string; employeeId: string }) => {
    const events: AgentEvent[] = [];
    const trace: string[] = [];
    const result = await runAgent({
      mcp,
      tools,
      onEvent: (e) => events.push(e),
      trace: (l) => trace.push(l),
      ...opts,
    });
    return { events, trace, result };
  };

  it("reports a data tool call with its arguments, the full result, then the final answer", async () => {
    const { events } = await run({
      question: "Sisa cuti saya?",
      employeeId: "E002",
      llm: callThenEcho("get_leave_balance", { employee_id: "E002" }),
    });

    assert.deepEqual(events.map((e) => e.type), ["tool_call", "tool_result", "final"]);
    const [callEvent, resultEvent, finalEvent] = events;
    assert.deepEqual(callEvent, {
      type: "tool_call",
      iteration: 1,
      name: "get_leave_balance",
      args: { employee_id: "E002" },
      source: "hr_system",
    });
    assert.equal(resultEvent.type === "tool_result" && resultEvent.name, "get_leave_balance");
    assert.deepEqual(JSON.parse((resultEvent as { output: string }).output), {
      employee_id: "E002",
      name: "Budi Santoso",
      leave_remaining_days: 7,
      leave_taken_days: 5,
    });
    assert.equal(finalEvent.type === "final" && finalEvent.iteration, 2);
  });

  it("marks document search calls with the documents source", async () => {
    const { events } = await run({
      question: "Boleh WFH berapa hari seminggu?",
      employeeId: "E002",
      llm: callThenEcho("search_policy", { query: "aturan WFH per minggu" }),
    });
    const first = events[0];
    assert.equal(first.type === "tool_call" && first.source, "documents");
  });

  it("reports an access-denied call as a blocked event with the requested employee", async () => {
    const { events } = await run({
      question: "Sisa cuti E001?",
      employeeId: "E003",
      llm: callThenEcho("get_leave_balance", { employee_id: "E001" }),
    });

    assert.deepEqual(events.map((e) => e.type), ["tool_call", "blocked", "tool_result", "final"]);
    assert.deepEqual(events[1], { type: "blocked", iteration: 1, name: "get_leave_balance", target: "E001" });
    const denied = events[2];
    assert.match(denied.type === "tool_result" ? denied.output : "", /Access denied/);
  });

  it("reports a nudge, then the forced search with its query, then the search result", async () => {
    const llm = async (messages: ChatMessage[]) =>
      messages.some((m) => m.role === "tool") ? text("12 hari.") : text("Maaf, saya tidak tahu.");

    const { events } = await run({ question: "Berapa hari cuti tahunan?", employeeId: "E002", llm });

    assert.deepEqual(events.map((e) => e.type), ["nudge", "forced_search", "tool_result", "final"]);
    assert.deepEqual(events[0], { type: "nudge", iteration: 1 });
    assert.deepEqual(events[1], { type: "forced_search", iteration: 2, query: "Berapa hari cuti tahunan?" });
    const searched = events[2];
    assert.equal(searched.type === "tool_result" && searched.name, "search_policy");
    assert.equal(JSON.parse((searched as { output: string }).output).found, true);
  });

  it("reports an ignored duplicate call", async () => {
    let n = 0;
    const llm = async () => (n++ < 2 ? call("get_leave_balance", { employee_id: "E002" }) : text("Sisa 7 hari."));
    const { events } = await run({ question: "Sisa cuti saya?", employeeId: "E002", llm });

    assert.ok(events.some((e) => e.type === "duplicate" && e.name === "get_leave_balance" && e.iteration === 2));
  });

  it("reports a retry with the error message", async () => {
    let attempts = 0;
    const llm = async () => {
      if (attempts++ === 0) throw new Error("model connection reset");
      return text("Halo!");
    };
    const { events } = await run({ question: "halo", employeeId: "E002", llm });

    assert.deepEqual(events[0], { type: "retry", label: "llm", message: "model connection reset" });
  });

  it("reports the iteration limit", async () => {
    // The same call twice is ignored as a duplicate, so vary the target to keep it looping.
    let n = 0;
    const llm = async () => call("get_leave_balance", { employee_id: `E00${(n++ % 6) + 1}` });
    const { events, result } = await run({
      question: "Sisa cuti saya?",
      employeeId: "E001",
      llm,
      maxIterations: 2,
    });

    assert.equal(result.hitIterationLimit, true);
    assert.deepEqual(events.at(-1), { type: "iteration_limit", max: 2 });
  });

  it("keeps the full tool output in events while the text trace stays shortened", async () => {
    const llm = async (messages: ChatMessage[]) =>
      messages.some((m) => m.role === "tool") ? text("12 hari.") : text("Maaf, saya tidak tahu.");
    const { events, trace } = await run({ question: "Berapa hari cuti tahunan?", employeeId: "E002", llm });

    const result = events.find((e) => e.type === "tool_result");
    const output = result && result.type === "tool_result" ? result.output : "";
    assert.ok(output.length > 300, "search result is long");
    const traceLine = trace.find((l) => l.includes("tool_result")) ?? "";
    assert.ok(traceLine.endsWith("..."), "trace line is cut");
    assert.ok(traceLine.length < 200);
  });

  it("works without any listener", async () => {
    const result = await runAgent({
      question: "halo",
      employeeId: "E002",
      mcp,
      tools,
      llm: async () => text("Halo!"),
    });
    assert.equal(result.answer, "Halo!");
  });
});
