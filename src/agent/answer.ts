import { SEARCH_POLICY } from "./tools.js";

// The fixed reply for "not in the documents"; the prompt asks for it, the harness enforces it.
export const NOT_COVERED_REPLY =
  "Mohon maaf, informasi tersebut tidak tercantum dalam dokumen kebijakan HR yang tersedia. Silakan hubungi tim HR untuk informasi lebih lanjut.";

// A tool result as a JSON object, or null when it is not one.
export function parseObject(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export type ToolOutcome = "documents_found" | "documents_empty" | "data_ok" | "failed";

// What a tool result means for grounding: did it give the model something to answer from?
export function classifyToolResult(name: string, output: string): ToolOutcome {
  const data = parseObject(output);
  if (!data) return "failed";
  if (name === SEARCH_POLICY) return data.found === true ? "documents_found" : "documents_empty";
  return "error" in data ? "failed" : "data_ok";
}

// The model declined in its own words. Narrow on purpose (short + both cues) so real answers pass.
export function looksLikeDecline(text: string): boolean {
  return text.length <= 200 && /\bhubungi tim HR\b/i.test(text) && /\btidak\s+(disebutkan|tercantum|ada|tersedia|ditemukan)\b/i.test(text);
}

// The assistant has no leave, team or manager, so "<noun> saya" always means the user's.
const USERS_OWN_THINGS = /\b(sisa cuti|jatah cuti|cuti|bawahan langsung|bawahan|tim|atasan)\s+saya\b/gi;

export function addressUser(text: string): string {
  return text.replace(USERS_OWN_THINGS, "$1 Anda");
}

// Learns employee_id -> name from a tool result, so answers can say "Sari Dewi (E003)".
export function collectPeople(toolOutput: string, into: Map<string, string>): void {
  const record = parseObject(toolOutput);
  if (!record) return;
  const learn = (item: unknown) => {
    const person = item as { employee_id?: unknown; name?: unknown } | null;
    if (typeof person?.employee_id === "string" && typeof person.name === "string") {
      into.set(person.employee_id, person.name);
    }
  };
  learn(record);
  if (Array.isArray(record.subordinates)) record.subordinates.forEach(learn);
}

const escapeForRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Skips IDs already written next to the name, before or after.
export function nameKnownIds(text: string, people: Map<string, string>): string {
  let result = text;
  for (const [id, name] of people) {
    const escaped = escapeForRegExp(name);
    const bareId = new RegExp(`(?<!${escaped} \\()\\b${id}\\b(?!\\))(?! \\(${escaped}\\))`, "g");
    result = result.replace(bareId, `${name} (${id})`);
  }
  return result;
}
