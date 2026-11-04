import { retrieve } from "../rag/retrieve.js";
import type { ToolSpec } from "./llm.js";
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
export async function runSearchPolicy(args: Record<string, unknown>): Promise<string> {
  const query = String(args.query ?? "");
  const { relevant, all } = await retrieve(query);

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
