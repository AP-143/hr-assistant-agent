export interface RetrievalCase {
  kind: "retrieval";
  name: string;
  query: string;
  // Expect this heading among the relevant top-k chunks. Omit to expect NO relevant chunk.
  expectHeading?: string;
}

export interface AgentCase {
  kind: "agent";
  name: string;
  employeeId: string;
  question: string;
  // Earlier turns of the conversation, for follow-up questions.
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  expectTools?: string[];
  forbidTools?: string[];
  answerMatches?: RegExp[];
  answerMustNotMatch?: RegExp[];
  expectBlocked?: boolean;
  expectNotBlocked?: boolean;
  // The harness must flag the run as "documents do not cover this" (true) or not (false).
  expectNotCovered?: boolean;
}

export type EvalCase = RetrievalCase | AgentCase;

// The assistant calling the user's own leave, team or manager "mine" ("sisa cuti saya").
const USER_AS_SAYA = /\b(sisa cuti|jatah cuti|cuti|bawahan(?: langsung)?|tim|atasan)\s+saya\b/i;

// The fixed polite reply, checked by wording and by the structured flag.
const NOT_COVERED = /tidak tercantum dalam dokumen kebijakan HR/i;

export const cases: EvalCase[] = [
  // Retrieval quality
  { kind: "retrieval", name: "retrieval: maternity leave", query: "cuti melahirkan berapa lama", expectHeading: "Cuti Melahirkan" },
  { kind: "retrieval", name: "retrieval: reimbursement deadline", query: "batas waktu klaim perjalanan dinas", expectHeading: "Reimbursement Perjalanan Dinas" },
  { kind: "retrieval", name: "retrieval: out of scope returns nothing", query: "resep nasi goreng spesial" },

  // RAG answers
  { kind: "agent", name: "rag: annual leave days", employeeId: "E002", question: "Berapa hari cuti tahunan yang saya dapat per tahun?", expectTools: ["search_policy"], forbidTools: ["get_leave_balance"], answerMatches: [/12 hari/], expectNotCovered: false },
  { kind: "agent", name: "rag: WFH limit", employeeId: "E002", question: "Boleh WFH berapa hari dalam seminggu?", expectTools: ["search_policy"], answerMatches: [/(2|dua) hari/i] },
  { kind: "agent", name: "rag: carry over", employeeId: "E003", question: "Sisa cuti bisa dibawa ke tahun depan? Maksimal berapa hari?", expectTools: ["search_policy"], answerMatches: [/(5|lima) hari/i] },

  // Tool routing (MCP)
  { kind: "agent", name: "mcp: own leave balance", employeeId: "E002", question: "Sisa cuti saya berapa hari?", expectTools: ["get_leave_balance"], answerMatches: [/7 hari/] },
  { kind: "agent", name: "mcp: list subordinates", employeeId: "E002", question: "Siapa saja bawahan langsung saya?", expectTools: ["get_subordinat_list"], answerMatches: [/Sari/, /Andi/, /Maya/] },
  { kind: "agent", name: "multi-tool: lowest leave in team", employeeId: "E002", question: "Di antara bawahan langsung saya, siapa yang sisa cutinya paling sedikit?", expectTools: ["get_subordinat_list", "get_leave_balance"], answerMatches: [/Andi/] },

  // Wording: the assistant talks to the user ("Anda"), never as if the user's things were its own
  { kind: "agent", name: "wording: speaks to the user as Anda", employeeId: "E002", question: "Sisa cuti saya berapa hari, dan apa aturan carry over-nya?", answerMatches: [/7 hari/, /5 hari/], answerMustNotMatch: [USER_AS_SAYA] },
  { kind: "agent", name: "wording: names the person with the ID", employeeId: "E002", question: "Berapa sisa cuti E003?", expectTools: ["get_leave_balance"], answerMatches: [/Sari Dewi \(E003\)/, /12 hari/] },
  { kind: "agent", name: "wording: greeting has no emoji", employeeId: "E002", question: "halo", answerMustNotMatch: [/\p{Extended_Pictographic}/u] },

  // Data questions are answered from the data, not from policy text
  { kind: "agent", name: "mcp: leave already taken", employeeId: "E002", question: "Sudah berapa hari cuti yang saya ambil?", expectTools: ["get_leave_balance"], answerMatches: [/5 hari/], expectNotCovered: false },
  { kind: "agent", name: "mcp: balance asked as 'tinggal berapa'", employeeId: "E003", question: "Cuti saya tinggal berapa hari ya?", expectTools: ["get_leave_balance"], answerMatches: [/12 hari/] },
  { kind: "agent", name: "mcp: person asked by name", employeeId: "E002", question: "Berapa sisa cuti Sari Dewi?", expectTools: ["get_subordinat_list", "get_leave_balance"], answerMatches: [/Sari Dewi \(E003\)/, /12 hari/] },
  { kind: "agent", name: "mcp: name outside my team is not found", employeeId: "E002", question: "Berapa sisa cuti Rina Wijaya?", expectTools: ["get_subordinat_list"], forbidTools: ["get_leave_balance"], answerMustNotMatch: [/\b9 hari\b/] },
  { kind: "agent", name: "multi-tool: team total", employeeId: "E002", question: "Berapa total sisa cuti seluruh tim saya?", expectTools: ["get_subordinat_list", "get_leave_balance"], answerMatches: [/Total: 26 hari/] },
  { kind: "agent", name: "multi-tool: who took the most leave", employeeId: "E002", question: "Siapa di tim saya yang paling banyak mengambil cuti?", expectTools: ["get_leave_balance"], answerMatches: [/Paling banyak: Andi/i] },
  { kind: "agent", name: "unsupported: my manager is not guessed", employeeId: "E002", question: "Siapa atasan saya?", answerMustNotMatch: [/Anda adalah atasan/i, /Sari|Andi|Maya/] },

  // Follow-up questions that only make sense after the previous turn
  { kind: "agent", name: "follow-up: same question for another person", employeeId: "E002", question: "Kalau Andi?", history: [{ role: "user", content: "Berapa sisa cuti Sari Dewi?" }, { role: "assistant", content: "Sari Dewi (E003) memiliki sisa cuti 12 hari." }], expectTools: ["get_leave_balance"], answerMatches: [/Andi/, /4 hari/], expectNotCovered: false },
  { kind: "agent", name: "follow-up: more detail on a policy", employeeId: "E002", question: "Hari apa saja?", history: [{ role: "user", content: "Boleh WFH berapa hari seminggu?" }, { role: "assistant", content: "Maksimal 2 hari per minggu." }], answerMatches: [/Selasa/], expectNotCovered: false },

  // Colloquial wording, typos and English score a little under the relevance gate; the judge confirms them
  { kind: "agent", name: "colloquial: 'resigne' (typo)", employeeId: "E002", question: "saya ingin resigne", expectTools: ["search_policy"], answerMatches: [/30 hari/], expectNotCovered: false },
  { kind: "agent", name: "colloquial: who to tell about sick leave", employeeId: "E002", question: "izin sakit kasih kabar ke siapa jam berapa", answerMatches: [/09[.:]00/], expectNotCovered: false },
  { kind: "agent", name: "colloquial: 'kenaikan gaji kapan?'", employeeId: "E002", question: "kenaikan gaji kapan?", answerMatches: [/Desember/], expectNotCovered: false },
  { kind: "agent", name: "colloquial: policy asked in English", employeeId: "E002", question: "What is the overtime pay?", answerMatches: [/1,5/], expectNotCovered: false },
  { kind: "agent", name: "colloquial: WFH with a typo", employeeId: "E002", question: "berapa hari boleh wfh seminngu", answerMatches: [/(2|dua) hari/i], expectNotCovered: false },

  // Near misses that are NOT in the documents must still be declined (they score as high as the colloquial ones)
  { kind: "agent", name: "near miss: yearly bonus is not THR", employeeId: "E002", question: "Berapa bonus tahunan karyawan?", answerMatches: [NOT_COVERED], expectNotCovered: true },
  { kind: "agent", name: "near miss: new-hire salary", employeeId: "E002", question: "Berapa gaji karyawan baru?", answerMatches: [NOT_COVERED], expectNotCovered: true },
  { kind: "agent", name: "near miss: severance after layoff", employeeId: "E002", question: "Berapa uang pesangon kalau di-PHK?", answerMatches: [NOT_COVERED], expectNotCovered: true },

  // Guardrail: do not invent answers (polite fixed reply, flagged by the harness)
  { kind: "agent", name: "guardrail: unknown (CEO salary)", employeeId: "E002", question: "Berapa gaji CEO perusahaan ini?", forbidTools: ["get_leave_balance", "get_subordinat_list"], answerMatches: [NOT_COVERED], answerMustNotMatch: [/tidak tahu/i], expectNotCovered: true },
  { kind: "agent", name: "guardrail: unknown (childcare)", employeeId: "E003", question: "Apakah perusahaan menyediakan penitipan anak di kantor?", answerMatches: [NOT_COVERED], answerMustNotMatch: [/tidak tahu/i], expectNotCovered: true },

  // Authorization in the harness
  { kind: "agent", name: "authz: employee cannot see manager's leave", employeeId: "E003", question: "Berapa sisa cuti E001?", expectBlocked: true, answerMustNotMatch: [/\b9 hari\b/] },
  { kind: "agent", name: "authz: manager can see indirect report", employeeId: "E001", question: "Berapa sisa cuti E003?", expectTools: ["get_leave_balance"], expectNotBlocked: true, answerMatches: [/12 hari/] },
];
