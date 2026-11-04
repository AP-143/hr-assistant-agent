import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { retrieve } from "./retrieve.js";

// Integration tests: need Ollama running with bge-m3 and `npm run ingest` done.
describe("retrieval", () => {
  const inScope: Array<[string, string]> = [
    ["Berapa hari cuti tahunan saya per tahun?", "Cuti Tahunan"],
    ["Kalau sakit lebih dari 2 hari harus bawa apa?", "Cuti Sakit"],
    ["Berapa lama cuti melahirkan?", "Cuti Melahirkan"],
    ["Boleh WFH berapa hari seminggu?", "Kebijakan WFH"],
    ["Bagaimana hitungan upah lembur?", "Lembur"],
    ["Batas waktu klaim reimbursement perjalanan dinas?", "Reimbursement Perjalanan Dinas"],
    ["Berapa batas rawat jalan asuransi kesehatan?", "Tunjangan Kesehatan"],
    ["Berapa lama notice period kalau resign?", "Prosedur Pengunduran Diri"],
    ["boleh gak kerja dari rumah?", "Kebijakan WFH"],
    ["jam kerja kantor", "Jam Kerja Reguler"],
    ["aturan cuti sakit", "Cuti Sakit"],
    ["cuti nikah dapat berapa hari", "Cuti Khusus"],
  ];

  for (const [query, heading] of inScope) {
    it(`finds "${heading}" for: ${query}`, async () => {
      const { relevant } = await retrieve(query);
      assert.ok(relevant.length > 0, "expected the gate to pass");
      assert.ok(
        relevant[0].heading.includes(heading),
        `top result was "${relevant[0].heading}" (${relevant[0].similarity.toFixed(3)})`,
      );
    });
  }

  const outOfScope = [
    "Berapa gaji CEO perusahaan ini?",
    "Resep nasi goreng spesial",
    "Apakah perusahaan menyediakan penitipan anak di kantor?",
    "Siapa presiden Indonesia saat ini?",
    "Bagaimana cara reset password email kantor?",
    "Apakah ada program stock option untuk karyawan?",
  ];

  for (const query of outOfScope) {
    it(`returns nothing relevant for: ${query}`, async () => {
      const { relevant, all } = await retrieve(query);
      assert.equal(relevant.length, 0, `best similarity ${all[0].similarity.toFixed(3)} passed the gate`);
    });
  }

  it("returns the full top-k once the best chunk passes the gate", async () => {
    const { relevant } = await retrieve("Berapa hari cuti tahunan saya per tahun?", 4);
    assert.equal(relevant.length, 4);
  });
});
