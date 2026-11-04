import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addressUser, collectPeople, isFollowUp, nameKnownIds } from "./wording.js";

describe("nameKnownIds", () => {
  const people = new Map([
    ["E003", "Sari Dewi"],
    ["E004", "Andi Pratama"],
  ]);

  it("puts the name in front of a bare employee ID", () => {
    assert.equal(nameKnownIds("E003 memiliki sisa cuti 12 hari.", people), "Sari Dewi (E003) memiliki sisa cuti 12 hari.");
    assert.equal(nameKnownIds("Sisa cuti E003 adalah 12 hari.", people), "Sisa cuti Sari Dewi (E003) adalah 12 hari.");
  });

  it("handles several people and repeated mentions", () => {
    assert.equal(
      nameKnownIds("E003: 12 hari, E004: 4 hari. Paling sedikit: E004 (4 hari).", people),
      "Sari Dewi (E003): 12 hari, Andi Pratama (E004): 4 hari. Paling sedikit: Andi Pratama (E004) (4 hari).",
    );
  });

  it("leaves answers that already name the person alone", () => {
    for (const text of ["Sari Dewi (E003) memiliki sisa cuti 12 hari.", "E003 (Sari Dewi) memiliki 12 hari."]) {
      assert.equal(nameKnownIds(text, people), text);
    }
  });

  it("leaves unknown IDs and longer numbers alone", () => {
    assert.equal(nameKnownIds("E999 tidak ditemukan. E0031 bukan ID.", people), "E999 tidak ditemukan. E0031 bukan ID.");
  });
});

describe("collectPeople", () => {
  it("learns names from a leave result and from a list of subordinates", () => {
    const people = new Map<string, string>();
    collectPeople(JSON.stringify({ employee_id: "E003", name: "Sari Dewi", leave_remaining_days: 12 }), people);
    collectPeople(
      JSON.stringify({ manager_id: "E002", subordinates: [{ employee_id: "E004", name: "Andi Pratama", title: "FE" }] }),
      people,
    );
    assert.deepEqual([...people], [["E003", "Sari Dewi"], ["E004", "Andi Pratama"]]);
  });

  it("ignores errors and text that is not JSON", () => {
    const people = new Map<string, string>();
    collectPeople(JSON.stringify({ error: "Access denied." }), people);
    collectPeople("not json", people);
    assert.equal(people.size, 0);
  });
});

// The assistant must talk TO the user ("Anda"), never about the user's own things as if they
// were its own ("sisa cuti saya"). Small models copy "saya" from the question.
describe("addressUser", () => {
  it("turns the user's own things into 'Anda'", () => {
    assert.equal(addressUser("Sisa cuti saya adalah 7 hari."), "Sisa cuti Anda adalah 7 hari.");
    assert.equal(addressUser("Bawahan langsung saya adalah Sari Dewi."), "Bawahan langsung Anda adalah Sari Dewi.");
    assert.equal(addressUser("Di antara tim saya, Andi paling sedikit."), "Di antara tim Anda, Andi paling sedikit.");
    assert.equal(addressUser("Jatah cuti saya tinggal 7 hari."), "Jatah cuti Anda tinggal 7 hari.");
    assert.equal(addressUser("Atasan saya adalah Rina."), "Atasan Anda adalah Rina.");
  });

  it("fixes every occurrence, whatever the capitalisation", () => {
    assert.equal(
      addressUser("SISA CUTI SAYA 7 hari. Lalu cuti saya yang diambil 5 hari."),
      "SISA CUTI Anda 7 hari. Lalu cuti Anda yang diambil 5 hari.",
    );
  });

  it("leaves the assistant speaking about itself alone", () => {
    for (const text of [
      "Maaf, saya tidak bisa menjawab itu.",
      "Informasi itu tidak ada di dokumen yang saya miliki.",
      "Saya bisa bantu cek sisa cuti Anda.",
      "Sisa cuti Anda adalah 7 hari.",
    ]) {
      assert.equal(addressUser(text), text);
    }
  });

  it("does not touch words that merely contain the noun", () => {
    assert.equal(addressUser("Antim saya tidak dikenal."), "Antim saya tidak dikenal.");
  });
});

describe("isFollowUp", () => {
  it("recognises short questions that only make sense after the previous one", () => {
    for (const text of ["Kalau Andi?", "Dan Maya?", "Lalu?", "Hari apa saja?", "Bagaimana dengan Sari Dewi?", "Dan yang sudah saya ambil?", "Terus gimana kalau sakit?"]) {
      assert.equal(isFollowUp(text), true, text);
    }
  });

  it("does not treat a complete question as a follow-up", () => {
    for (const text of ["Berapa sisa cuti saya?", "Boleh WFH berapa hari seminggu?", "Siapa saja bawahan saya?", "Apa aturan cuti sakit?"]) {
      assert.equal(isFollowUp(text), false, text);
    }
  });
});
