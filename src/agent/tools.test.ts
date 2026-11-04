import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runSearchPolicy } from "./tools.js";

// Seam: the document search tool. Retrieval is real (needs Ollama + ingest); the judge is scripted.
// Raw similarity of the question "saya ingin resigne" is 0.570: right section first, but under
// the 0.59 gate, which is exactly where the judge is meant to step in.
describe("search_policy with a relevance check", () => {
  const search = (query: string, judge: (q: string, p: string[]) => Promise<boolean>, question = query) =>
    runSearchPolicy({ query }, { question, judge }).then((out) => JSON.parse(out));

  it("accepts a grey-zone result the judge confirms", async () => {
    const result = await search("saya ingin resigne", async () => true);
    assert.equal(result.found, true);
    assert.match(result.passages[0].section, /Pengunduran Diri/);
  });

  it("rejects a grey-zone result the judge turns down", async () => {
    const result = await search("saya ingin resigne", async () => false);
    assert.equal(result.found, false);
  });

  it("asks the judge about the user's own question and the two best passages", async () => {
    let asked: { question: string; passages: string[] } | undefined;
    await search("saya ingin resigne", async (question, passages) => {
      asked = { question, passages };
      return false;
    }, "Saya mau resigne bulan depan, bagaimana?");

    assert.equal(asked?.question, "Saya mau resigne bulan depan, bagaimana?");
    assert.equal(asked?.passages.length, 2);
    assert.match(asked?.passages[0] ?? "", /Pengunduran Diri/);
  });

  it("does not ask the judge when the score already passes the gate", async () => {
    let calls = 0;
    const result = await search("prosedur pengunduran diri", async () => {
      calls += 1;
      return false;
    });
    assert.equal(result.found, true);
    assert.equal(calls, 0);
  });

  it("does not ask the judge when the score is too low to be a near miss", async () => {
    let calls = 0;
    const result = await search("resep nasi goreng spesial", async () => {
      calls += 1;
      return true;
    });
    assert.equal(result.found, false);
    assert.equal(calls, 0);
  });
});
