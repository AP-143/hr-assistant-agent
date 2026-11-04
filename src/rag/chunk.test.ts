import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { config } from "../config.js";
import { chunkMarkdown } from "./chunk.js";

describe("chunkMarkdown", () => {
  it("keeps a short section as one chunk and prefixes the heading path", () => {
    const chunks = chunkMarkdown("# Doc\n\n## Cuti\n\n### Cuti Tahunan\n\nSetiap karyawan berhak atas 12 hari cuti.\n");
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].heading, "Doc > Cuti > Cuti Tahunan");
    assert.ok(chunks[0].text.startsWith("Doc > Cuti > Cuti Tahunan\n\n"));
    assert.ok(chunks[0].text.includes("12 hari cuti"));
  });

  it("resets deeper headings when a new sibling section starts", () => {
    const chunks = chunkMarkdown("# Doc\n\n## A\n\n### A1\n\nisi a1\n\n## B\n\nisi b\n");
    assert.deepEqual(chunks.map((c) => c.heading), ["Doc > A > A1", "Doc > B"]);
  });

  it("splits a long section on sentence boundaries with overlap between pieces", () => {
    const { maxChars, overlapChars } = config.chunk;
    const sentences = Array.from({ length: 30 }, (_, i) => `Kalimat nomor ${i + 1} menjelaskan aturan penting perusahaan.`);
    const chunks = chunkMarkdown(`# Doc\n\n## Panjang\n\n${sentences.join(" ")}\n`);

    assert.ok(chunks.length > 1, "a section well over the limit must be split");
    for (const c of chunks) {
      assert.equal(c.heading, "Doc > Panjang");
      // Heading prefix plus one piece; a piece may exceed maxChars by at most one sentence.
      assert.ok(c.text.length <= c.heading.length + 2 + maxChars + 60, `chunk too long: ${c.text.length}`);
    }

    // Overlap: the tail of one piece is repeated at the start of the next.
    const bodies = chunks.map((c) => c.text.slice(c.heading.length + 2));
    for (let i = 1; i < bodies.length; i++) {
      const tail = bodies[i - 1].slice(-overlapChars).trim();
      const sharedWord = tail.split(/\s+/).slice(-3).join(" ");
      assert.ok(bodies[i].includes(sharedWord), `piece ${i} should repeat the end of piece ${i - 1} ("${sharedWord}")`);
    }

    // Nothing is lost: every sentence still appears in some chunk.
    const all = chunks.map((c) => c.text).join(" ");
    for (const s of sentences) assert.ok(all.includes(s.slice(0, 20)), `missing: ${s}`);
  });

  it("ignores text before the first heading", () => {
    assert.deepEqual(chunkMarkdown("teks tanpa heading\n"), []);
  });
});
