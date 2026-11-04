import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentEvent } from "../agent/events.js";
import type { RunResult } from "../agent/harness.js";
import { summarize } from "./summary.js";

// Seam: how a finished run is labelled for the UI (badges and document sources).
const base: RunResult = {
  answer: "Jawaban.",
  iterations: 2,
  toolsCalled: [],
  blocked: [],
  hitIterationLimit: false,
  forcedRetrieval: false,
  notCovered: false,
};

const searchFound = (passages: Array<{ section: string; similarity: number }>): AgentEvent[] => [
  { type: "tool_call", iteration: 1, name: "search_policy", args: { query: "x" }, source: "documents" },
  {
    type: "tool_result",
    iteration: 1,
    name: "search_policy",
    output: JSON.stringify({ found: true, passages: passages.map((p) => ({ ...p, text: "..." })) }),
  },
];
const searchEmpty: AgentEvent[] = [
  { type: "tool_call", iteration: 1, name: "search_policy", args: { query: "x" }, source: "documents" },
  { type: "tool_result", iteration: 1, name: "search_policy", output: JSON.stringify({ found: false, best_similarity: 0.44 }) },
];
const balanceOk: AgentEvent[] = [
  { type: "tool_call", iteration: 1, name: "get_leave_balance", args: { employee_id: "E002" }, source: "hr_system" },
  { type: "tool_result", iteration: 1, name: "get_leave_balance", output: JSON.stringify({ employee_id: "E002", leave_remaining_days: 7 }) },
];

describe("summarize", () => {
  it("labels a document answer and lists the sections with their short names and scores", () => {
    const events = searchFound([
      { section: "Kebijakan dan SOP > 2. Cuti > 2.1 Cuti Tahunan", similarity: 0.668 },
      { section: "Kebijakan dan SOP > 2. Cuti > 2.2 Sisa Cuti dan Carry Over", similarity: 0.614 },
    ]);
    assert.deepEqual(summarize(events, { ...base, toolsCalled: ["search_policy"] }), {
      badges: ["documents"],
      sources: [
        { section: "2.1 Cuti Tahunan", similarity: 0.668 },
        { section: "2.2 Sisa Cuti dan Carry Over", similarity: 0.614 },
      ],
    });
  });

  it("only cites sections that pass the relevance bar, not every retrieved one", () => {
    // The search returns the whole top-k once the best chunk passes, so the weak ones are
    // retrieved context, not sources of the answer.
    const events = searchFound([
      { section: "A > 2.2 Sisa Cuti dan Carry Over", similarity: 0.67 },
      { section: "A > 2.1 Cuti Tahunan", similarity: 0.59 },
      { section: "A > 2.3 Cuti Sakit", similarity: 0.52 },
      { section: "A > 2.5 Cuti Khusus", similarity: 0.51 },
    ]);
    const summary = summarize(events, base, 0.59);
    assert.deepEqual(summary.sources.map((s) => s.section), ["2.2 Sisa Cuti dan Carry Over", "2.1 Cuti Tahunan"]);
    assert.deepEqual(summary.badges, ["documents"]);
  });

  it("labels an answer from the HR system", () => {
    assert.deepEqual(summarize(balanceOk, base), { badges: ["hr_system"], sources: [] });
  });

  it("shows both labels, documents first, when both were used", () => {
    const events = [...balanceOk, ...searchFound([{ section: "A > 2.2 Carry Over", similarity: 0.67 }])];
    assert.deepEqual(summarize(events, base).badges, ["documents", "hr_system"]);
  });

  it("labels a blocked request as access denied and shows no data labels for it", () => {
    const events: AgentEvent[] = [
      { type: "tool_call", iteration: 1, name: "get_leave_balance", args: { employee_id: "E001" }, source: "hr_system" },
      { type: "blocked", iteration: 1, name: "get_leave_balance", target: "E001" },
      { type: "tool_result", iteration: 1, name: "get_leave_balance", output: JSON.stringify({ error: "Access denied." }) },
    ];
    assert.deepEqual(summarize(events, { ...base, blocked: ["get_leave_balance"] }), { badges: ["denied"], sources: [] });
  });

  it("keeps the data label when only one of several requests was denied", () => {
    const events: AgentEvent[] = [
      ...balanceOk,
      { type: "blocked", iteration: 2, name: "get_leave_balance", target: "E001" },
    ];
    assert.deepEqual(summarize(events, base).badges, ["denied", "hr_system"]);
  });

  it("labels an answer as not covered when the run was flagged, and cites nothing", () => {
    assert.deepEqual(summarize(searchEmpty, { ...base, notCovered: true }), { badges: ["not_covered"], sources: [] });
  });

  it("does not cite document sources when the model said it is not covered despite retrieved passages", () => {
    const events = searchFound([{ section: "A > 4.2 Tunjangan Kesehatan", similarity: 0.56 }]);
    assert.deepEqual(summarize(events, { ...base, notCovered: true }), { badges: ["not_covered"], sources: [] });
  });

  it("decides from the flag, not from the words of the answer", () => {
    const events = searchFound([{ section: "A > 2.1 Cuti Tahunan", similarity: 0.67 }]);
    const result = { ...base, answer: "Saya tidak tahu persis tanggalnya, tetapi cuti tahunan 12 hari." };
    assert.deepEqual(summarize(events, result).badges, ["documents"]);
  });

  it("labels the safety fallback when the iteration cap was hit", () => {
    const result = { ...base, hitIterationLimit: true, answer: "Maaf, saya tidak bisa menyelesaikan pertanyaan ini." };
    assert.deepEqual(summarize(balanceOk, result), { badges: ["fallback"], sources: [] });
  });

  it("gives small talk no badge", () => {
    assert.deepEqual(summarize([], base), { badges: [], sources: [] });
  });

  it("does not count a failed data lookup as an answer from the HR system", () => {
    const events: AgentEvent[] = [
      { type: "tool_call", iteration: 1, name: "get_leave_balance", args: { employee_id: "E999" }, source: "hr_system" },
      { type: "tool_result", iteration: 1, name: "get_leave_balance", output: JSON.stringify({ error: "Employee E999 not found" }) },
    ];
    assert.deepEqual(summarize(events, base).badges, []);
  });

  it("lists each section once, even if it was retrieved by two searches", () => {
    const events = [
      ...searchFound([{ section: "A > 2.1 Cuti Tahunan", similarity: 0.67 }]),
      ...searchFound([{ section: "A > 2.1 Cuti Tahunan", similarity: 0.7 }]),
    ];
    assert.deepEqual(summarize(events, base).sources, [{ section: "2.1 Cuti Tahunan", similarity: 0.7 }]);
  });
});
