import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { AgentEvent } from "./events.js";
import { NOT_COVERED_REPLY } from "./grounding.js";
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
      condenseFollowUp: async () => null,
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

  it("speaks to the user as 'Anda' even when the model copies 'saya' from the question", async () => {
    const llm = async (messages: ChatMessage[]) =>
      hasToolResult(messages)
        ? reply("Sisa cuti saya adalah 7 hari. Maaf, saya tidak bisa menambah jatah itu.")
        : { role: "assistant" as const, content: "", tool_calls: [{ function: { name: "get_leave_balance", arguments: { employee_id: "E002" } } }] };

    const result = await runAgent({ question: "Sisa cuti saya berapa hari?", employeeId: "E002", mcp, tools, llm });

    assert.equal(result.answer, "Sisa cuti Anda adalah 7 hari. Maaf, saya tidak bisa menambah jatah itu.");
  });

  it("puts the person's name next to an employee ID the tools returned", async () => {
    const llm = async (messages: ChatMessage[]) =>
      hasToolResult(messages)
        ? reply("Sisa cuti E003 adalah 12 hari.")
        : { role: "assistant" as const, content: "", tool_calls: [{ function: { name: "get_leave_balance", arguments: { employee_id: "E003" } } }] };

    const result = await runAgent({ question: "Berapa sisa cuti E003?", employeeId: "E001", mcp, tools, llm });

    assert.equal(result.answer, "Sisa cuti Sari Dewi (E003) adalah 12 hari.");
  });

  describe("follow-up questions", () => {
    const history = [
      { role: "user" as const, content: "Berapa sisa cuti Sari Dewi?" },
      { role: "assistant" as const, content: "Sari Dewi (E003) memiliki sisa cuti 12 hari." },
    ];
    // Records the question the model is asked (the first user message; later ones are the harness's reminders).
    const capture = () => {
      let asked = "";
      const llm = async (messages: ChatMessage[]) => {
        asked ||= messages.find((m) => m.role === "user")?.content ?? "";
        return reply("Halo!");
      };
      return { llm, asked: () => asked };
    };

    it("rewrites a short follow-up into a complete question before the model sees it", async () => {
      const spy = capture();
      const events: AgentEvent[] = [];
      await runAgent({
        question: "Kalau Andi?",
        employeeId: "E002",
        mcp,
        tools,
        llm: spy.llm,
        history,
        condenseFollowUp: async () => "Berapa sisa cuti Andi?",
        onEvent: (e) => events.push(e),
      });

      assert.equal(spy.asked(), "Berapa sisa cuti Andi?");
      assert.deepEqual(events[0], { type: "follow_up", original: "Kalau Andi?", standalone: "Berapa sisa cuti Andi?" });
    });

    it("falls back to attaching the previous question when the rewrite fails", async () => {
      const spy = capture();
      await runAgent({ question: "Kalau Andi?", employeeId: "E002", mcp, tools, llm: spy.llm, history, condenseFollowUp: async () => null });

      assert.match(spy.asked(), /^Kalau Andi\?/);
      assert.match(spy.asked(), /Follow-up to the previous question: "Berapa sisa cuti Sari Dewi\?"/);
    });

    it("does not rewrite a complete question", async () => {
      const spy = capture();
      let rewrites = 0;
      await runAgent({
        question: "Siapa saja bawahan saya?",
        employeeId: "E002",
        mcp,
        tools,
        llm: spy.llm,
        history,
        condenseFollowUp: async () => {
          rewrites += 1;
          return "x";
        },
      });
      assert.equal(rewrites, 0);
      assert.equal(spy.asked(), "Siapa saja bawahan saya?");
    });

    it("does not rewrite when there is no earlier question", async () => {
      const spy = capture();
      await runAgent({ question: "Kalau Andi?", employeeId: "E002", mcp, tools, llm: spy.llm, condenseFollowUp: async () => "x" });
      assert.equal(spy.asked(), "Kalau Andi?");
    });

    it("searches with the rewritten question when it has to force a search", async () => {
      let toolOutput = "";
      const llm = async (messages: ChatMessage[]) => {
        const tool = messages.find((m) => m.role === "tool");
        if (tool) {
          toolOutput = tool.content;
          return reply("Selasa, Rabu, atau Kamis.");
        }
        return reply("Maaf.");
      };
      const result = await runAgent({
        question: "Hari apa saja?",
        employeeId: "E002",
        mcp,
        tools,
        llm,
        history: [
          { role: "user", content: "Boleh WFH berapa hari seminggu?" },
          { role: "assistant", content: "Maksimal 2 hari per minggu." },
        ],
        condenseFollowUp: async () => "Hari apa saja yang boleh WFH?",
      });

      assert.equal(result.forcedRetrieval, true);
      assert.match(toolOutput, /Kebijakan WFH/);
    });
  });

  describe("not-covered guarantee", () => {
    const call = (name: string, args: Record<string, unknown>): ChatMessage => ({
      role: "assistant",
      content: "",
      tool_calls: [{ function: { name, arguments: args } }],
    });
    // Calls one search, then gives `answer` once it has seen a tool result.
    const searchThen = (query: string, answer: string) => async (messages: ChatMessage[]) =>
      hasToolResult(messages) ? reply(answer) : call("search_policy", { query });

    it("replaces an invented answer with the fixed polite reply when the documents had nothing", async () => {
      const result = await runAgent({
        question: "Berapa gaji CEO perusahaan ini?",
        employeeId: "E002",
        mcp,
        tools,
        llm: searchThen("resep nasi goreng spesial", "Gaji CEO adalah Rp 100 juta per bulan."),
      });

      assert.equal(result.answer, NOT_COVERED_REPLY);
      assert.equal(result.notCovered, true);
      assert.doesNotMatch(result.answer, /tidak tahu/i);
    });

    it("keeps the model's answer when the documents had it", async () => {
      const result = await runAgent({
        question: "Boleh WFH berapa hari seminggu?",
        employeeId: "E002",
        mcp,
        tools,
        llm: searchThen("aturan WFH per minggu", "Maksimal 2 hari per minggu."),
      });

      assert.equal(result.answer, "Maksimal 2 hari per minggu.");
      assert.equal(result.notCovered, false);
    });

    it("keeps the answer when HR data was found, even if the policy search came back empty", async () => {
      let step = 0;
      const llm = async (messages: ChatMessage[]) => {
        step += 1;
        if (step === 1) return call("get_leave_balance", { employee_id: "E002" });
        if (step === 2) return call("search_policy", { query: "resep nasi goreng spesial" });
        return reply("Sisa cuti Anda 7 hari.");
      };
      const result = await runAgent({ question: "Sisa cuti saya dan aturan masakan?", employeeId: "E002", mcp, tools, llm });

      assert.equal(result.answer, "Sisa cuti Anda 7 hari.");
      assert.equal(result.notCovered, false);
    });

    it("does not override an access-denied answer", async () => {
      let step = 0;
      const llm = async () => {
        step += 1;
        if (step === 1) return call("get_leave_balance", { employee_id: "E001" });
        if (step === 2) return call("search_policy", { query: "resep nasi goreng spesial" });
        return reply("Anda tidak memiliki akses untuk data tersebut.");
      };
      const result = await runAgent({ question: "Sisa cuti E001?", employeeId: "E003", mcp, tools, llm });

      assert.equal(result.answer, "Anda tidak memiliki akses untuk data tersebut.");
      assert.equal(result.notCovered, false);
    });

    it("flags the run when the model itself gives the fixed reply, and keeps its text", async () => {
      const result = await runAgent({
        question: "Apakah ada tunjangan kesehatan?",
        employeeId: "E002",
        mcp,
        tools,
        llm: searchThen("tunjangan kesehatan", NOT_COVERED_REPLY),
      });

      assert.equal(result.answer, NOT_COVERED_REPLY);
      assert.equal(result.notCovered, true);
    });

    it("never flags small talk", async () => {
      const result = await runAgent({ question: "halo", employeeId: "E002", mcp, tools, llm: async () => reply("Halo!") });
      assert.equal(result.notCovered, false);
    });
  });

  it("does not force a search for small talk", async () => {
    const llm = async () => reply("Halo! Ada yang bisa saya bantu soal HR?");

    const result = await runAgent({ question: "halo", employeeId: "E002", mcp, tools, llm });

    assert.deepEqual(result.toolsCalled, []);
    assert.equal(result.forcedRetrieval, false);
    assert.match(result.answer, /^Halo/);
  });
});
