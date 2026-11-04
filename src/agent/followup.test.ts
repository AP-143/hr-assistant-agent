import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { condenseFollowUp, lastExchange } from "./followup.js";
import type { ChatMessage } from "./llm.js";

describe("lastExchange", () => {
  it("returns the latest question and the answer that followed it", () => {
    const history: ChatMessage[] = [
      { role: "user", content: "Boleh WFH?" },
      { role: "assistant", content: "Maksimal 2 hari." },
      { role: "user", content: "Berapa sisa cuti Sari Dewi?" },
      { role: "assistant", content: "Sari Dewi (E003) memiliki sisa cuti 12 hari." },
    ];
    assert.deepEqual(lastExchange(history), {
      previousQuestion: "Berapa sisa cuti Sari Dewi?",
      previousAnswer: "Sari Dewi (E003) memiliki sisa cuti 12 hari.",
    });
  });

  it("works when the last question has no answer yet, and for an empty history", () => {
    assert.deepEqual(lastExchange([{ role: "user", content: "Halo" }]), { previousQuestion: "Halo", previousAnswer: undefined });
    assert.equal(lastExchange([]), undefined);
  });
});

describe("condenseFollowUp", () => {
  const ctx = { previousQuestion: "Berapa sisa cuti Sari Dewi?", previousAnswer: "Sari Dewi (E003) memiliki sisa cuti 12 hari." };
  const modelSays = (content: string) => async () => ({ role: "assistant" as const, content });

  it("asks the model with the previous exchange and the follow-up, and returns the standalone question", async () => {
    let seen: ChatMessage[] = [];
    const llm = async (messages: ChatMessage[]) => {
      seen = messages;
      return { role: "assistant" as const, content: "Berapa sisa cuti Andi?" };
    };

    const standalone = await condenseFollowUp(llm, "Kalau Andi?", ctx);

    assert.equal(standalone, "Berapa sisa cuti Andi?");
    const prompt = seen.map((m) => m.content).join("\n");
    assert.match(prompt, /Berapa sisa cuti Sari Dewi\?/);
    assert.match(prompt, /memiliki sisa cuti 12 hari/);
    assert.match(prompt, /Kalau Andi\?/);
  });

  it("tidies up quotes, labels and extra lines the model adds", async () => {
    assert.equal(await condenseFollowUp(modelSays('"Berapa sisa cuti Andi?"'), "Kalau Andi?", ctx), "Berapa sisa cuti Andi?");
    assert.equal(await condenseFollowUp(modelSays("Pertanyaan: Berapa sisa cuti Andi?\nCatatan: ok"), "Kalau Andi?", ctx), "Berapa sisa cuti Andi?");
  });

  it("gives up (null) on an empty, runaway or refusing rewrite", async () => {
    assert.equal(await condenseFollowUp(modelSays(""), "Kalau Andi?", ctx), null);
    assert.equal(await condenseFollowUp(modelSays("x".repeat(400)), "Kalau Andi?", ctx), null);
    assert.equal(await condenseFollowUp(modelSays("Mohon maaf, saya tidak bisa."), "Kalau Andi?", ctx), null);
  });

  it("gives up (null) when the model call fails", async () => {
    const broken = async () => {
      throw new Error("model down");
    };
    assert.equal(await condenseFollowUp(broken, "Kalau Andi?", ctx), null);
  });
});
