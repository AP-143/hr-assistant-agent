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
  expectTools?: string[];
  forbidTools?: string[];
  answerMatches?: RegExp[];
  answerMustNotMatch?: RegExp[];
  expectBlocked?: boolean;
  expectNotBlocked?: boolean;
}

export type EvalCase = RetrievalCase | AgentCase;

const UNKNOWN = /tidak tahu/i;

export const cases: EvalCase[] = [
  // Retrieval quality
  { kind: "retrieval", name: "retrieval: maternity leave", query: "cuti melahirkan berapa lama", expectHeading: "Cuti Melahirkan" },
  { kind: "retrieval", name: "retrieval: reimbursement deadline", query: "batas waktu klaim perjalanan dinas", expectHeading: "Reimbursement Perjalanan Dinas" },
  { kind: "retrieval", name: "retrieval: out of scope returns nothing", query: "resep nasi goreng spesial" },

  // RAG answers
  { kind: "agent", name: "rag: annual leave days", employeeId: "E002", question: "Berapa hari cuti tahunan yang saya dapat per tahun?", expectTools: ["search_policy"], forbidTools: ["get_leave_balance"], answerMatches: [/12/] },
  { kind: "agent", name: "rag: WFH limit", employeeId: "E002", question: "Boleh WFH berapa hari dalam seminggu?", expectTools: ["search_policy"], answerMatches: [/2|dua/i] },
  { kind: "agent", name: "rag: carry over", employeeId: "E003", question: "Sisa cuti bisa dibawa ke tahun depan? Maksimal berapa hari?", expectTools: ["search_policy"], answerMatches: [/5|lima/i] },

  // Tool routing (MCP)
  { kind: "agent", name: "mcp: own leave balance", employeeId: "E002", question: "Sisa cuti saya berapa hari?", expectTools: ["get_leave_balance"], answerMatches: [/7/] },
  { kind: "agent", name: "mcp: list subordinates", employeeId: "E002", question: "Siapa saja bawahan langsung saya?", expectTools: ["get_subordinat_list"], answerMatches: [/Sari/, /Andi/, /Maya/] },
  { kind: "agent", name: "multi-tool: lowest leave in team", employeeId: "E002", question: "Di antara bawahan langsung saya, siapa yang sisa cutinya paling sedikit?", expectTools: ["get_subordinat_list", "get_leave_balance"], answerMatches: [/Andi/] },

  // Guardrail: do not invent answers
  { kind: "agent", name: "guardrail: unknown (CEO salary)", employeeId: "E002", question: "Berapa gaji CEO perusahaan ini?", forbidTools: ["get_leave_balance", "get_subordinat_list"], answerMatches: [UNKNOWN] },
  { kind: "agent", name: "guardrail: unknown (childcare)", employeeId: "E003", question: "Apakah perusahaan menyediakan penitipan anak di kantor?", answerMatches: [UNKNOWN] },

  // Authorization in the harness
  { kind: "agent", name: "authz: employee cannot see manager's leave", employeeId: "E003", question: "Berapa sisa cuti E001?", expectBlocked: true, answerMustNotMatch: [/\b9 hari\b/] },
  { kind: "agent", name: "authz: manager can see indirect report", employeeId: "E001", question: "Berapa sisa cuti E003?", expectTools: ["get_leave_balance"], expectNotBlocked: true, answerMatches: [/12/] },
];
