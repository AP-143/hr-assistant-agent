import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { isSmallTalk, runAgent } from "./harness.js";
import type { ChatMessage, ToolSpec } from "./llm.js";
import { McpToolClient } from "./mcpClient.js";
import { allToolSpecs } from "./tools.js";

// The LLM is replaced by a scripted fake; the MCP server and retrieval are real
// (needs Ollama with bge-m3 and `npm run ingest` done).
describe("agent harness", () => {
  const mcp = new McpToolClient();
  let tools: ToolSpec[];

  before(async () => {
    await mcp.connect();
    tools = await allToolSpecs(mcp);
  });
  after(async () => {
    await mcp.close();
  });

  const reply = (content: string): ChatMessage => ({ role: "assistant", content });
  const hasToolResult = (messages: ChatMessage[]) => messages.some((m) => m.role === "tool");

  describe("isSmallTalk", () => {
    it("recognises greetings and thanks", () => {
      for (const text of ["halo", "Hai!", "terima kasih", "Makasih ya", "Selamat pagi"]) {
        assert.equal(isSmallTalk(text), true, text);
      }
    });
    it("does not treat information questions as small talk", () => {
      for (const text of ["Berapa hari cuti tahunan?", "halo, boleh WFH berapa hari?"]) {
        assert.equal(isSmallTalk(text), false, text);
      }
    });
  });

  it("forces a document search when the model keeps answering without any tool", async () => {
    // Fake model: refuses until it has seen a tool result, then answers from it.
    const llm = async (messages: ChatMessage[]) =>
      hasToolResult(messages) ? reply("12 hari kerja per tahun.") : reply("Maaf, saya tidak tahu.");

    const result = await runAgent({
      question: "Berapa hari cuti tahunan yang saya dapat?",
      employeeId: "E002",
      mcp,
      tools,
      llm,
    });

    assert.deepEqual(result.toolsCalled, ["search_policy"]);
    assert.equal(result.forcedRetrieval, true);
    assert.equal(result.answer, "12 hari kerja per tahun.");
  });

  it("uses the previous question as context when it forces a search for a follow-up", async () => {
    let toolOutput = "";
    const llm = async (messages: ChatMessage[]) => {
      const tool = messages.find((m) => m.role === "tool");
      if (tool) {
        toolOutput = tool.content;
        return reply("Selasa, Rabu, atau Kamis.");
      }
      return reply("Maaf, saya tidak tahu.");
    };

    const result = await runAgent({
      question: "Kalau begitu hari apa saja yang boleh?",
      employeeId: "E002",
      mcp,
      tools,
      llm,
      history: [
        { role: "user", content: "Boleh WFH berapa hari seminggu?" },
        { role: "assistant", content: "Maksimal 2 hari per minggu." },
      ],
    });

    assert.equal(result.forcedRetrieval, true);
    assert.equal(JSON.parse(toolOutput).found, true, "the follow-up alone has no topic; it needs the previous question");
    assert.match(toolOutput, /Kebijakan WFH/);
  });

  describe("access control", () => {
    // Fake model: calls one tool, then repeats whatever the tool returned.
    const callThenEcho = (name: string, args: Record<string, unknown>) => async (messages: ChatMessage[]) => {
      const tool = messages.find((m) => m.role === "tool");
      if (tool) return reply(tool.content);
      return { role: "assistant" as const, content: "", tool_calls: [{ function: { name, arguments: args } }] };
    };

    it("blocks an employee from reading their manager's leave and leaks nothing", async () => {
      const result = await runAgent({
        question: "Berapa sisa cuti E001?",
        employeeId: "E003",
        mcp,
        tools,
        llm: callThenEcho("get_leave_balance", { employee_id: "E001" }),
      });

      assert.deepEqual(result.blocked, ["get_leave_balance"]);
      assert.match(result.answer, /Access denied/);
      assert.doesNotMatch(result.answer, /leave_remaining_days|Rina/);
    });

    it("blocks reading another employee's subordinates", async () => {
      const result = await runAgent({
        question: "Siapa bawahan E002?",
        employeeId: "E003",
        mcp,
        tools,
        llm: callThenEcho("get_subordinat_list", { employee_id: "E002" }),
      });
      assert.deepEqual(result.blocked, ["get_subordinat_list"]);
    });

    it("allows a manager to read an indirect report", async () => {
      const result = await runAgent({
        question: "Berapa sisa cuti E003?",
        employeeId: "E001",
        mcp,
        tools,
        llm: callThenEcho("get_leave_balance", { employee_id: "E003" }),
      });

      assert.deepEqual(result.blocked, []);
      assert.equal(JSON.parse(result.answer).leave_remaining_days, 12);
    });

    it("allows reading yourself, regardless of ID casing", async () => {
      const result = await runAgent({
        question: "Sisa cuti saya?",
        employeeId: "e004",
        mcp,
        tools,
        llm: callThenEcho("get_leave_balance", { employee_id: " E004 " }),
      });
      assert.deepEqual(result.blocked, []);
      assert.equal(JSON.parse(result.answer).leave_remaining_days, 4);
    });
  });

  it("passes earlier turns as a system note, not as chat turns the model can copy", async () => {
    // Measured with the real model: raw earlier turns made it skip the document search
    // (0/5 correct); the same turns as a system note kept it searching (5/5).
    let seen: ChatMessage[] = [];
    const llm = async (messages: ChatMessage[]) => {
      seen = messages;
      return reply("Halo!");
    };

    await runAgent({
      question: "halo",
      employeeId: "E002",
      mcp,
      tools,
      llm,
      history: [
        { role: "user", content: "Boleh WFH berapa hari seminggu?" },
        { role: "assistant", content: "Maksimal 2 hari per minggu." },
      ],
    });

    assert.deepEqual(seen.map((m) => m.role), ["system", "system", "user"]);
    assert.match(seen[1].content, /Boleh WFH berapa hari seminggu\?/);
    assert.match(seen[1].content, /Maksimal 2 hari per minggu\./);
    assert.match(seen[1].content, /not evidence/i);
    assert.equal(seen[2].content, "halo");
  });

  it("does not force a search for small talk", async () => {
    const llm = async () => reply("Halo! Ada yang bisa saya bantu soal HR?");

    const result = await runAgent({ question: "halo", employeeId: "E002", mcp, tools, llm });

    assert.deepEqual(result.toolsCalled, []);
    assert.equal(result.forcedRetrieval, false);
    assert.match(result.answer, /^Halo/);
  });
});
