import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { runAgent } from "./harness.js";
import type { ChatMessage, ToolSpec } from "./llm.js";
import { McpToolClient } from "./mcpClient.js";
import { allToolSpecs } from "./tools.js";

// Each test forces one harness control with a scripted model. The MCP server and the
// retriever are real (needs Ollama with bge-m3 and `npm run ingest` done).
describe("harness loop controls", () => {
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
  const collect = () => {
    const lines: string[] = [];
    return { lines, trace: (line: string) => lines.push(line) };
  };

  it("stops a model that never finishes at the iteration cap and returns a safe answer", async () => {
    let n = 0;
    // A different query each time, so the duplicate guard does not mask the cap.
    const llm = async () => call("get_leave_balance", { employee_id: `E00${(n++ % 6) + 1}` });
    const { lines, trace } = collect();

    const result = await runAgent({
      question: "Sisa cuti saya?",
      employeeId: "E001",
      mcp,
      tools,
      llm,
      maxIterations: 2,
      trace,
    });

    assert.equal(result.hitIterationLimit, true);
    assert.equal(result.iterations, 2);
    assert.match(result.answer, /hubungi tim HR/i);
    assert.ok(lines.some((l) => l.includes("iteration limit (2) reached")));
  });

  it("never returns an unverified answer when the cap leaves no room to force a search", async () => {
    // A refusing model that never searches, with a cap so low the harness cannot force one.
    const llm = async () => text("Maaf, saya tidak tahu.");
    const { lines, trace } = collect();

    const result = await runAgent({
      question: "Berapa hari cuti tahunan yang saya dapat?",
      employeeId: "E002",
      mcp,
      tools,
      llm,
      maxIterations: 2,
      trace,
    });

    assert.equal(result.hitIterationLimit, true);
    assert.deepEqual(result.toolsCalled, []);
    assert.match(result.answer, /hubungi tim HR/i);
    assert.ok(lines.some((l) => l.includes("iteration limit (2) reached")));
  });

  it("blocks an identical repeated tool call and still finishes", async () => {
    // Asks for the same balance twice, then answers once it has seen the duplicate warning.
    const llm = async (messages: ChatMessage[]) => {
      const results = messages.filter((m) => m.role === "tool");
      if (results.length === 0) return call("get_leave_balance", { employee_id: "E002" });
      if (results.length === 1) return call("get_leave_balance", { employee_id: "E002" });
      return text("Sisa cuti Anda 7 hari.");
    };
    const { lines, trace } = collect();

    const result = await runAgent({ question: "Sisa cuti saya?", employeeId: "E002", mcp, tools, llm, trace });

    assert.deepEqual(result.toolsCalled, ["get_leave_balance"], "the duplicate must not run again");
    assert.equal(result.hitIterationLimit, false);
    assert.equal(result.answer, "Sisa cuti Anda 7 hari.");
    assert.ok(lines.some((l) => l.includes("duplicate call blocked")));
  });

  it("retries a transient model failure once and succeeds", async () => {
    let attempts = 0;
    const llm = async () => {
      if (attempts++ === 0) throw new Error("model connection reset");
      return text("Halo!");
    };
    const { lines, trace } = collect();

    const result = await runAgent({ question: "halo", employeeId: "E002", mcp, tools, llm, trace });

    assert.equal(result.answer, "Halo!");
    assert.equal(attempts, 2);
    assert.ok(lines.some((l) => l.startsWith("retry llm: model connection reset")));
  });

  it("retries a transient tool failure once and succeeds", async () => {
    let failures = 0;
    // Same client, but the first get_leave_balance call fails like a dropped connection.
    const flaky = Object.create(mcp) as McpToolClient;
    flaky.callTool = async (name, args) => {
      if (name === "get_leave_balance" && failures++ === 0) throw new Error("tool transport closed");
      return mcp.callTool(name, args);
    };
    const llm = async (messages: ChatMessage[]) => {
      const tool = messages.find((m) => m.role === "tool");
      return tool ? text(tool.content) : call("get_leave_balance", { employee_id: "E002" });
    };
    const { lines, trace } = collect();

    const result = await runAgent({ question: "Sisa cuti saya?", employeeId: "E002", mcp: flaky, tools, llm, trace });

    assert.equal(JSON.parse(result.answer).leave_remaining_days, 7);
    assert.ok(lines.some((l) => l.startsWith("retry get_leave_balance: tool transport closed")));
  });

  it("fails loudly when the retry fails too instead of looping", async () => {
    const llm = async () => {
      throw new Error("model is down");
    };
    await assert.rejects(runAgent({ question: "halo", employeeId: "E002", mcp, tools, llm }), /model is down/);
  });

  it("nudges once before forcing, and traces both steps", async () => {
    const llm = async (messages: ChatMessage[]) =>
      messages.some((m) => m.role === "tool") ? text("12 hari.") : text("Maaf, saya tidak tahu.");
    const { lines, trace } = collect();

    await runAgent({ question: "Berapa hari cuti tahunan?", employeeId: "E002", mcp, tools, llm, trace });

    const nudgeAt = lines.findIndex((l) => l.includes("nudging once"));
    const forceAt = lines.findIndex((l) => l.includes("harness runs search_policy"));
    assert.ok(nudgeAt >= 0 && forceAt > nudgeAt, "nudge must come before the forced search");
    assert.equal(lines.filter((l) => l.includes("nudging once")).length, 1);
  });

  it("does not nudge a greeting", async () => {
    const llm = async () => text("Halo! Ada yang bisa dibantu?");
    const { lines, trace } = collect();

    await runAgent({ question: "terima kasih ya", employeeId: "E002", mcp, tools, llm, trace });

    assert.ok(!lines.some((l) => l.includes("nudging") || l.includes("harness runs")));
  });

  it("traces every step: iteration, tool call, tool result, block and final answer", async () => {
    const llm = async (messages: ChatMessage[]) =>
      messages.some((m) => m.role === "tool") ? text("Tidak ada akses.") : call("get_leave_balance", { employee_id: "E001" });
    const { lines, trace } = collect();

    await runAgent({ question: "Sisa cuti E001?", employeeId: "E003", mcp, tools, llm, trace });

    for (const expected of ["[1] tool_call get_leave_balance", "[1] BLOCKED get_leave_balance", "[1] tool_result", "[2] final answer"]) {
      assert.ok(lines.some((l) => l.includes(expected)), `missing trace line: ${expected}\n${lines.join("\n")}`);
    }
  });
});
