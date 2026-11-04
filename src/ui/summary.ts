import { config } from "../config.js";
import type { AgentEvent } from "../agent/events.js";
import type { RunResult } from "../agent/harness.js";

export type AnswerBadge = "documents" | "hr_system" | "denied" | "unknown" | "fallback";
export interface AnswerSource {
  section: string;
  similarity: number;
}
export interface AnswerSummary {
  badges: AnswerBadge[];
  sources: AnswerSource[];
}

const REFUSAL = /tidak tahu/i;

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(text);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// "Kebijakan dan SOP > 2. Cuti > 2.1 Cuti Tahunan" -> "2.1 Cuti Tahunan"
const shortSection = (heading: string) => heading.split(" > ").pop() ?? heading;

// Where did this answer come from? Derived only from what the agent actually did.
// `minSimilarity`: the search returns the whole top-k once the best chunk passes the gate, so
// weaker chunks are retrieved context, not sources. They stay visible in the step details.
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

    const data = parseJson(event.output);
    if (event.name === "search_policy") {
      if (data?.found === true && Array.isArray(data.passages)) {
        usedDocuments = true;
        for (const p of data.passages as Array<{ section: string; similarity: number }>) {
          sources.set(shortSection(p.section), p.similarity);
        }
      }
    } else if (data && !("error" in data)) {
      usedHrSystem = true;
    }
  }

  // A refusal means the retrieved passages did not answer the question, so do not cite them.
  const refused = REFUSAL.test(result.answer);
  const badges: AnswerBadge[] = [];
  if (denied) badges.push("denied");
  if (usedDocuments && !refused) badges.push("documents");
  if (usedHrSystem) badges.push("hr_system");
  if (refused) badges.push("unknown");

  const cited = badges.includes("documents")
    ? [...sources].filter(([, similarity]) => similarity >= minSimilarity).map(([section, similarity]) => ({ section, similarity }))
    : [];
  return { badges, sources: cited };
}
