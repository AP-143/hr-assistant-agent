import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ChatMessage } from "../agent/llm.js";
import { judgeRelevance } from "./judge.js";

// Seam: "do these passages answer this question?", asked of the model for scores in the grey zone.
describe("judgeRelevance", () => {
  const says = (content: string) => async () => ({ role: "assistant" as const, content });
  const passages = ["2.1 Cuti Tahunan\n\nSetiap karyawan tetap berhak atas cuti tahunan sebanyak 12 hari."];

  it("is true when the model answers YES, in any casing or with punctuation", async () => {
    for (const reply of ["YES", "yes", "Yes.", "  YES\n", "yes, the passage says 12 days"]) {
      assert.equal(await judgeRelevance(says(reply), "Berapa hari cuti?", passages), true, reply);
    }
  });

  it("is false when the model answers NO or anything unclear", async () => {
    for (const reply of ["NO", "no.", "", "Maybe", "I think the passage is related", "Mohon maaf"]) {
      assert.equal(await judgeRelevance(says(reply), "Berapa hari cuti?", passages), false, reply);
    }
  });

  it("is false when the model call fails (an unsure check must never let an answer through)", async () => {
    const broken = async () => {
      throw new Error("model down");
    };
    assert.equal(await judgeRelevance(broken, "Berapa hari cuti?", passages), false);
  });

  it("shows the model the user's question and the passages", async () => {
    let seen: ChatMessage[] = [];
    const llm = async (messages: ChatMessage[]) => {
      seen = messages;
      return { role: "assistant" as const, content: "YES" };
    };
    await judgeRelevance(llm, "kenaikan gaji kapan?", passages);

    const prompt = seen.map((m) => m.content).join("\n");
    assert.match(prompt, /kenaikan gaji kapan\?/);
    assert.match(prompt, /sebanyak 12 hari/);
  });
});
