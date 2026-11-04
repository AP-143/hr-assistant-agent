import { config } from "../config.js";
import { chat, type ChatMessage, type ToolSpec } from "./llm.js";
import type { McpToolClient } from "./mcpClient.js";
import { SEARCH_POLICY, runSearchPolicy } from "./tools.js";

export interface RunResult {
  answer: string;
  iterations: number;
  toolsCalled: string[];
  blocked: string[];
  hitIterationLimit: boolean;
}

export type TraceFn = (line: string) => void;

const AUTHZ_TOOLS = new Set(["get_leave_balance", "get_subordinat_list"]);

const NUDGE =
  "Reminder: if this question needs company information (policy, leave, team), call a tool first instead of answering from memory. If it is only a greeting or small talk, answer directly.";

function systemPrompt(employeeId: string): string {
  return `You are the internal HR assistant of the company. Always answer in Indonesian, short and clear.
The user is employee ${employeeId}. When they say "saya" or "my", use employee_id ${employeeId}.

Tools:
- search_policy: HR policy documents (rules, procedures, benefits). Use for any "what are the rules" question.
- get_leave_balance: live leave balance of one employee.
- get_subordinat_list: direct reports of a manager.
Combine tools when needed (e.g. list subordinates first, then check each one's leave balance).

Rules:
1. Answer policy questions ONLY from passages returned by search_policy. Never use outside knowledge or guess.
2. If search_policy returns found=false, or the passages do not contain the answer, reply exactly that you do not know: "Maaf, saya tidak tahu. Informasi itu tidak ada di dokumen HR yang saya miliki." and suggest contacting the HR team.
3. Employee data (leave balance, subordinates) comes ONLY from tools. Never invent numbers.
4. If a tool returns an access error, tell the user they do not have access to that data.`;
}

// Walks get_subordinat_list over MCP to build the requester's downline (direct + indirect).
async function isAuthorized(mcp: McpToolClient, requesterId: string, targetId: string): Promise<boolean> {
  const requester = requesterId.toUpperCase();
  const target = targetId.trim().toUpperCase();
  if (requester === target) return true;

  const queue = [requester];
  const seen = new Set(queue);
  while (queue.length > 0) {
    const manager = queue.shift()!;
    const { text, isError } = await mcp.callTool("get_subordinat_list", { employee_id: manager });
    if (isError) continue;
    const parsed = JSON.parse(text) as { subordinates: Array<{ employee_id: string }> };
    for (const sub of parsed.subordinates) {
      if (sub.employee_id === target) return true;
      if (!seen.has(sub.employee_id)) {
        seen.add(sub.employee_id);
        queue.push(sub.employee_id);
      }
    }
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, trace: TraceFn, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    trace(`retry ${label}: ${(err as Error).message}`);
    return await fn();
  }
}

export async function runAgent(opts: {
  question: string;
  employeeId: string;
  mcp: McpToolClient;
  tools: ToolSpec[];
  history?: ChatMessage[];
  trace?: TraceFn;
}): Promise<RunResult> {
  const { question, employeeId, mcp, tools } = opts;
  const trace = opts.trace ?? (() => {});

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(employeeId) },
    ...(opts.history ?? []),
    { role: "user", content: question },
  ];

  const result: RunResult = { answer: "", iterations: 0, toolsCalled: [], blocked: [], hitIterationLimit: false };
  const seenCalls = new Set<string>();
  let nudged = false;

  for (let i = 1; i <= config.maxIterations; i++) {
    result.iterations = i;
    const reply = await withRetry(() => chat(messages, tools), trace, "llm");
    const calls = reply.tool_calls ?? [];

    if (calls.length === 0) {
      // Grounding check: no evidence gathered yet, so push the model toward a tool once.
      if (result.toolsCalled.length === 0 && !nudged) {
        nudged = true;
        trace(`[${i}] answered without any tool -> nudging once`);
        messages.push(reply, { role: "user", content: NUDGE });
        continue;
      }
      result.answer = reply.content;
      trace(`[${i}] final answer`);
      return result;
    }

    messages.push(reply);

    for (const call of calls) {
      const { name, arguments: args } = call.function;
      const callKey = `${name}:${JSON.stringify(args)}`;
      trace(`[${i}] tool_call ${name} ${JSON.stringify(args)}`);

      let output: string;
      if (seenCalls.has(callKey)) {
        // Loop guard: identical call repeated, so stop the model from spinning.
        trace(`[${i}] duplicate call blocked`);
        output = JSON.stringify({ error: "Duplicate tool call. Use the earlier result and write the final answer." });
      } else {
        seenCalls.add(callKey);
        result.toolsCalled.push(name);

        if (AUTHZ_TOOLS.has(name) && !(await isAuthorized(mcp, employeeId, String(args.employee_id ?? "")))) {
          trace(`[${i}] BLOCKED ${name}: ${employeeId} may not access ${String(args.employee_id)}`);
          result.blocked.push(name);
          output = JSON.stringify({ error: "Access denied. You may only view yourself and your own subordinates." });
        } else if (name === SEARCH_POLICY) {
          output = await withRetry(() => runSearchPolicy(args), trace, name);
        } else {
          output = (await withRetry(() => mcp.callTool(name, args), trace, name)).text;
        }
      }

      trace(`[${i}] tool_result ${output.slice(0, 160)}${output.length > 160 ? "..." : ""}`);
      messages.push({ role: "tool", tool_name: name, content: output });
    }
  }

  result.hitIterationLimit = true;
  result.answer = "Maaf, saya tidak bisa menyelesaikan pertanyaan ini. Silakan hubungi tim HR.";
  trace(`iteration limit (${config.maxIterations}) reached`);
  return result;
}
