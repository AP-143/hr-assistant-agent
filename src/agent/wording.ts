// Things that belong to the person asking. The assistant must say "sisa cuti Anda", but small
// models copy the "saya" of the question and answer "sisa cuti saya". The assistant has no
// leave, team or manager of its own, so for these nouns "saya" is always a mistake.
// (`\b` before the noun keeps words that merely end in one of them, like "antim", untouched.)
const USERS_OWN_THINGS = /\b(sisa cuti|jatah cuti|cuti|bawahan langsung|bawahan|tim|atasan)\s+saya\b/gi;

export function addressUser(text: string): string {
  return text.replace(USERS_OWN_THINGS, "$1 Anda");
}

// ---- naming people -------------------------------------------------------------------------
// "Sisa cuti E003 adalah 12 hari" is correct but cold. The tools already returned the name, so
// the harness can guarantee "Sari Dewi (E003)" whatever the model wrote.

// Learns employee_id -> name from a tool result (a leave result or a list of subordinates).
export function collectPeople(toolOutput: string, into: Map<string, string>): void {
  let data: unknown;
  try {
    data = JSON.parse(toolOutput);
  } catch {
    return;
  }
  if (typeof data !== "object" || data === null) return;
  const record = data as Record<string, unknown>;
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

// Replaces a bare ID with "Name (ID)", but not when the name is already written next to it,
// either before ("Sari Dewi (E003)") or after ("E003 (Sari Dewi)").
export function nameKnownIds(text: string, people: Map<string, string>): string {
  let result = text;
  for (const [id, name] of people) {
    const escaped = escapeForRegExp(name);
    const bareId = new RegExp(`(?<!${escaped} \\()\\b${id}\\b(?!\\))(?! \\(${escaped}\\))`, "g");
    result = result.replace(bareId, `${name} (${id})`);
  }
  return result;
}

// ---- follow-up questions ----------------------------------------------------------------------
// "Kalau Andi?" or "Hari apa saja?" only make sense next to the previous question, and a small
// model does not always connect them: it may answer from policy text and invent a number.
const FOLLOW_UP_CUE = /^\s*(kalau|kalo|dan|lalu|terus|trus|bagaimana dengan|gimana dengan|bagaimana kalau|gimana kalau|how about|and)\b/i;

export function isFollowUp(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return FOLLOW_UP_CUE.test(text) || words <= 3;
}
