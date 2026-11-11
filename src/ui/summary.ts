import { config } from "../config.js";
import { classifyToolResult, parseObject } from "../agent/answer.js";
import type { AgentEvent } from "../agent/events.js";
import type { RunResult } from "../agent/harness.js";

export type AnswerBadge = "documents" | "hr_system" | "denied" | "not_covered" | "fallback";
export interface AnswerSource {
  section: string;
  similarity: number;
}
export interface AnswerSummary {
  badges: AnswerBadge[];
  sources: AnswerSource[];
}

// "Kebijakan dan SOP > 2. Cuti > 2.1 Cuti Tahunan" -> "2.1 Cuti Tahunan"
const shortSection = (heading: string) => heading.split(" > ").pop() ?? heading;

// Sources = chunks above the gate; weaker top-k chunks are context, not citations.
export function summarize(
  events: AgentEvent[],
  result: RunResult,
  minSimilarity: number = config.minSimilarity,
): AnswerSummary {
  if (result.hitIterationLimit) return { badges: ["fallback"], sources: [] };

  const sources = new Map<string, number>();
  let usedDocuments = false;
  let usedHrSystem = false;
  let denied = false;

  for (const event of events) {
    if (event.type === "blocked") denied = true;
    if (event.type !== "tool_result") continue;

    const outcome = classifyToolResult(event.name, event.output);
    if (outcome === "data_ok") usedHrSystem = true;
    if (outcome !== "documents_found") continue;
    usedDocuments = true;
    const passages = parseObject(event.output)?.passages;
    for (const p of (Array.isArray(passages) ? passages : []) as Array<{ section: string; similarity: number }>) {
      sources.set(shortSection(p.section), p.similarity);
    }
  }

  // The harness decides coverage; when not covered, the retrieved passages are not cited.
  const notCovered = result.notCovered;
  const badges: AnswerBadge[] = [];
  if (denied) badges.push("denied");
  if (usedDocuments && !notCovered) badges.push("documents");
  if (usedHrSystem) badges.push("hr_system");
  if (notCovered) badges.push("not_covered");

  const cited = badges.includes("documents")
    ? [...sources].filter(([, similarity]) => similarity >= minSimilarity).map(([section, similarity]) => ({ section, similarity }))
    : [];
  return { badges, sources: cited };
}
