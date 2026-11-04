import { config } from "../config.js";
import { judgeRelevance } from "../rag/judge.js";
import { retrieve } from "../rag/retrieve.js";
import { chat, type ToolSpec } from "./llm.js";
import type { McpToolClient } from "./mcpClient.js";

export const SEARCH_POLICY = "search_policy";

const searchPolicySpec: ToolSpec = {
  type: "function",
  function: {
    name: SEARCH_POLICY,
    description:
      "Search the company HR policy documents (leave rules, working hours, WFH, reimbursement, benefits, procedures). Use for any question about rules, policies, or procedures. Not for how many leave days a person has or has taken: that is employee data (use get_leave_balance).",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search query in Indonesian, the language of the documents. Translate it if the user wrote in English, e.g. 'aturan cuti sakit'.",
        },
      },
      required: ["query"],
    },
  },
};

// Local RAG tool: the same function-calling interface as the MCP tools, so the LLM
// chooses between documents (RAG) and live data (MCP) in one decision.
export type RelevanceJudge = (question: string, passages: string[]) => Promise<boolean>;

export async function runSearchPolicy(
  args: Record<string, unknown>,
  // question: what the user actually asked (the judge reads this, not the model's search query).
  ctx: { question?: string; judge?: RelevanceJudge } = {},
): Promise<string> {
  const query = String(args.query ?? "");
  let { relevant, all } = await retrieve(query);

  // Near miss: the right section is usually first but scores a little under the gate when the
  // question is colloquial ("saya ingin resigne"). Let the model confirm instead of turning it away.
  const nearMiss = relevant.length === 0 && all.length > 0 && all[0].similarity >= config.borderlineSimilarity;
  if (nearMiss) {
    const judge = ctx.judge ?? ((q, passages) => judgeRelevance(chat, q, passages));
    if (await judge(ctx.question ?? query, all.slice(0, 2).map((c) => c.text))) relevant = all;
  }

  if (relevant.length === 0) {
    return JSON.stringify({
      found: false,
      message: "No relevant passages found in the HR documents. Reply with the fixed not-covered message from your rules.",
      best_similarity: all[0]?.similarity ?? 0,
    });
  }
  return JSON.stringify({
    found: true,
    passages: relevant.map((c) => ({
      section: c.heading,
      similarity: Number(c.similarity.toFixed(3)),
      text: c.text,
    })),
  });
}

export async function allToolSpecs(mcp: McpToolClient): Promise<ToolSpec[]> {
  return [searchPolicySpec, ...(await mcp.listTools())];
}
