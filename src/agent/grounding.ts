import { SEARCH_POLICY } from "./tools.js";

// The one polite reply for "the HR documents do not cover this". The system prompt asks the
// model for exactly this text, and the harness uses it when the model fails to.
export const NOT_COVERED_REPLY =
  "Mohon maaf, informasi tersebut tidak tercantum dalam dokumen kebijakan HR yang tersedia. Silakan hubungi tim HR untuk informasi lebih lanjut.";

export type ToolOutcome = "documents_found" | "documents_empty" | "data_ok" | "failed";

// What a tool result means for grounding: did it give the model something to answer from?
export function classifyToolResult(name: string, output: string): ToolOutcome {
  let data: Record<string, unknown> | null = null;
  try {
    const parsed = JSON.parse(output);
    data = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    data = null;
  }
  if (!data) return "failed";
  if (name === SEARCH_POLICY) return data.found === true ? "documents_found" : "documents_empty";
  return "error" in data ? "failed" : "data_ok";
}

// A short answer that says the information is missing and points to the HR team: the model
// declined in its own words instead of using the fixed reply. Kept narrow on purpose: both cues
// must be there and the answer must be short, so a real answer that happens to say "hubungi tim
// HR" is left alone.
export function looksLikeDecline(text: string): boolean {
  return text.length <= 200 && /\bhubungi tim HR\b/i.test(text) && /\btidak\s+(disebutkan|tercantum|ada|tersedia|ditemukan)\b/i.test(text);
}
