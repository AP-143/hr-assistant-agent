import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { looksLikeDecline } from "./grounding.js";

// A model that declines in its own words ("tidak disebutkan ... hubungi tim HR") should be
// treated like the fixed polite reply, so the answer and its badge look the same every time.
describe("looksLikeDecline", () => {
  it("recognises a short refusal that points to the HR team", () => {
    for (const text of [
      "Tunjangan transportasi bulanan tidak disebutkan dalam kebijakan yang tersedia. Silakan hubungi tim HR untuk informasi lebih lanjut.",
      "Informasi tersebut tidak tercantum di dokumen. Silakan hubungi tim HR.",
      "Maaf, hal itu tidak ada dalam kebijakan. Hubungi tim HR ya.",
    ]) {
      assert.equal(looksLikeDecline(text), true, text);
    }
  });

  it("does not mistake a real answer for a refusal", () => {
    for (const text of [
      "Untuk cuti khusus lainnya, hubungi tim HR.",
      "Sisa cuti Anda 7 hari.",
      "Karyawan boleh WFH maksimal 2 hari per minggu dengan persetujuan atasan langsung.",
      "Informasi tidak tercantum untuk cuti besar, tetapi cuti tahunan Anda 12 hari per tahun sesuai kebijakan yang berlaku bagi semua karyawan tetap di perusahaan ini, ditambah aturan lain yang panjang. Silakan hubungi tim HR untuk pertanyaan lain.",
    ]) {
      assert.equal(looksLikeDecline(text), false, text);
    }
  });
});
