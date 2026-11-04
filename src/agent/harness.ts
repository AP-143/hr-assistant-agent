import { config } from "../config.js";
import { traceLine, type AgentEvent } from "./events.js";
import { condenseFollowUp, lastExchange, type Exchange } from "./followup.js";
import { NOT_COVERED_REPLY, classifyToolResult } from "./grounding.js";
import { addressUser, collectPeople, isFollowUp, nameKnownIds } from "./wording.js";
import { chat, type ChatMessage, type ToolSpec } from "./llm.js";
import type { McpToolClient } from "./mcpClient.js";
import { SEARCH_POLICY, runSearchPolicy } from "./tools.js";

export interface RunResult {
  answer: string;
  iterations: number;
  toolsCalled: string[];
  blocked: string[];
  hitIterationLimit: boolean;
  // True when the harness ran search_policy itself because the model never did.
  forcedRetrieval: boolean;
  // True when the HR documents did not cover the question (answer is then the fixed polite reply).
  notCovered: boolean;
}

const SMALL_TALK =
  /^\s*(halo|hai|hi|hello|pagi|siang|sore|malam|selamat\s+\w+|terima\s*kasih|makasih|thanks|thank you|ok|oke|sip)(\s+(ya|yaa|banyak|kak|pak|bu))?\W*$/i;

export function isSmallTalk(text: string): boolean {
  return SMALL_TALK.test(text);
}

export type TraceFn = (line: string) => void;
type EmitFn = (event: AgentEvent) => void;

const AUTHZ_TOOLS = new Set(["get_leave_balance", "get_subordinat_list"]);

const NUDGE =
  "Reminder: if this question needs company information (policy, leave, team), call a tool first instead of answering from memory. If it is only a greeting or small talk, answer directly.";

function systemPrompt(employeeId: string): string {
  return `You are the internal HR assistant of the company. Reply in Indonesian, short and clear.
The user is employee ${employeeId}. In the user's message "saya", "I" and "my" always mean this user (employee_id ${employeeId}), never you.

Tools:
- search_policy: HR policy documents (rules, procedures, benefits). Use for any "what are the rules" question.
- get_leave_balance: the leave of one employee: leave_remaining_days ("sisa cuti") and leave_taken_days ("cuti yang sudah diambil").
- get_subordinat_list: the direct reports of a manager, with their names and employee IDs.
Combine tools when needed.

Rules:
0. For ANY question about company rules, policies, procedures, benefits, or employee data, call a tool FIRST. Never answer from memory, and never say the information is unavailable before you have searched.
1. Answer policy questions ONLY from passages returned by search_policy. Never use outside knowledge or guess.
2. If search_policy returns found=false, or the passages do not contain the answer, reply with exactly this message and nothing else: "${NOT_COVERED_REPLY}"
3. Employee data (leave, team) comes ONLY from tools. Never invent numbers.
4. If a tool returns an access error, tell the user they do not have access to that data.
5. Access control is enforced by the system, not by you. If the user asks about another employee, still call the tool and report what it returns. Never refuse or decide access yourself.
6. Users name colleagues instead of giving IDs. To find an ID, call get_subordinat_list for the user; if the name is not in that list, call it for the user's reports too. If the person is still not found, say you cannot find them in the user's team. Never guess an ID.
7. For lowest, highest or total over several employees: call get_leave_balance for each person, then answer in exactly this shape. One line per person: "- <Name>: <N> hari" (use the number the question is about: sisa cuti = leave_remaining_days, cuti yang diambil = leave_taken_days). Then ONE last line that matches the question:
   "Paling sedikit: <Name> (<N> hari)" for the lowest, "Paling banyak: <Name> (<N> hari)" for the highest, "Total: <N> hari" for a total (add the numbers).
8. Wording: you talk TO the user, who is "Anda"; you are the assistant. Write "Sisa cuti Anda 7 hari", never "Sisa cuti saya 7 hari", and "bawahan Anda", never "bawahan saya". Name people, with the ID in brackets: "Sari Dewi (E003) memiliki sisa cuti 12 hari". Answer exactly what was asked, nothing more. Never use emoji.
9. For a greeting or thanks, reply with one short friendly sentence that offers help with HR questions.
10. How many leave days someone has LEFT ("sisa", "tinggal", "masih berapa") or has TAKEN ("diambil", "terpakai") is employee data: call get_leave_balance, and never give a number from the policy text as someone's leave. How many leave days the company gives in a year ("per tahun", "setahun", "hak cuti", "entitled to") is policy: use search_policy.
11. No tool can tell who someone's manager (atasan) is. Do not answer that from the team list; reply with the message from rule 2.
12. The policy documents are in Indonesian, so always write search_policy queries in Indonesian, translating if the user wrote in another language. Example: the question "What is the WFH policy?" becomes the query "aturan kerja dari rumah (WFH)".
13. A short follow-up such as "Kalau Andi?" or "Dan yang sudah saya ambil?" repeats the previous question for what is asked now: use the same tool again. Never answer a follow-up from the policy text when the previous question was about employee data.`;
}

// Earlier turns go in as one system note instead of replayed chat turns. Measured with the
// 4B model: replayed turns made it answer from the previous reply and skip search_policy
// (0/5 correct on a policy question), while the note kept it searching (5/5).
function historyNote(history: ChatMessage[]): ChatMessage[] {
  if (history.length === 0) return [];
  const turns = history.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n");
  return [
    {
      role: "system",
      content: `Earlier in this conversation (only to resolve references like "itu" or "kalau begitu"; it is NOT evidence, always use tools for facts):\n${turns}`,
    },
  ];
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

async function withRetry<T>(fn: () => Promise<T>, emit: EmitFn, label: string): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    emit({ type: "retry", label, message: (err as Error).message });
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
  onEvent?: (event: AgentEvent) => void;
  // Injectable so the loop can be tested with a scripted model.
  llm?: (messages: ChatMessage[], tools: ToolSpec[]) => Promise<ChatMessage>;
  maxIterations?: number;
  // Rewrites a short follow-up ("Kalau Andi?") into a complete question; injectable for tests.
  condenseFollowUp?: (question: string, previous: Exchange) => Promise<string | null>;
}): Promise<RunResult> {
  const { question, employeeId, mcp, tools } = opts;
  // Single reporting point: the text trace is derived from the same events.
  const emit: EmitFn = (event) => {
    opts.onEvent?.(event);
    opts.trace?.(traceLine(event, employeeId));
  };
  const llm = opts.llm ?? chat;
  const maxIterations = opts.maxIterations ?? config.maxIterations;

  const previous = lastExchange(opts.history ?? []);
  const isFollowUpQuestion = previous !== undefined && !isSmallTalk(question) && isFollowUp(question);
  // A bare "Kalau Andi?" is rewritten into a complete question before the model sees it.
  const standalone = isFollowUpQuestion
    ? await (opts.condenseFollowUp ?? ((q, p) => condenseFollowUp(llm, q, p)))(question, previous)
    : null;
  if (standalone) emit({ type: "follow_up", original: question, standalone });
  // If the rewrite failed, at least say which question this one follows.
  const userMessage =
    standalone ??
    (isFollowUpQuestion
      ? `${question}\n\n(Follow-up to the previous question: "${previous.previousQuestion}". Answer it the same way, for what is asked now.)`
      : question);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(employeeId) },
    ...historyNote(opts.history ?? []),
    { role: "user", content: userMessage },
  ];

  const result: RunResult = {
    answer: "",
    iterations: 0,
    toolsCalled: [],
    blocked: [],
    hitIterationLimit: false,
    forcedRetrieval: false,
    notCovered: false,
  };
  const seenCalls = new Set<string>();
  // What the tools gave the model to answer from, across the whole run.
  const evidence = { documentsFound: false, documentsEmpty: false, dataOk: false };
  const people = new Map<string, string>();
  const recordEvidence = (name: string, output: string) => {
    collectPeople(output, people);
    const outcome = classifyToolResult(name, output);
    if (outcome === "documents_found") evidence.documentsFound = true;
    if (outcome === "documents_empty") evidence.documentsEmpty = true;
    if (outcome === "data_ok") evidence.dataOk = true;
  };
  let nudged = false;

  for (let i = 1; i <= maxIterations; i++) {
    result.iterations = i;
    const reply = await withRetry(() => llm(messages, tools), emit, "llm");
    const calls = reply.tool_calls ?? [];

    if (calls.length === 0) {
      const ungrounded = result.toolsCalled.length === 0 && !isSmallTalk(question);
      // Grounding check, step 1: no evidence gathered yet, so push the model toward a tool once.
      if (ungrounded && !nudged) {
        nudged = true;
        emit({ type: "nudge", iteration: i });
        messages.push(reply, { role: "user", content: NUDGE });
        continue;
      }
      // Step 2: the model ignored the nudge. Small models like to say "tidak tahu" without
      // looking, so the harness runs the document search itself and feeds the result back.
      // With no iteration left to read that result, never return the unverified answer:
      // leave the loop and use the safe fallback below.
      if (ungrounded) {
        if (i >= maxIterations) break;
        result.forcedRetrieval = true;
        result.toolsCalled.push(SEARCH_POLICY);
        // Search with the complete question. If a follow-up could not be rewritten ("hari apa
        // saja?" has no topic of its own), prepend the previous question so the retriever has one.
        const args = { query: standalone ?? (previous ? `${previous.previousQuestion} ${question}` : question) };
        emit({ type: "forced_search", iteration: i, query: args.query });
        const output = await withRetry(() => runSearchPolicy(args), emit, SEARCH_POLICY);
        emit({ type: "tool_result", iteration: i, name: SEARCH_POLICY, output });
        recordEvidence(SEARCH_POLICY, output);
        messages.push(
          reply,
          { role: "assistant", content: "", tool_calls: [{ function: { name: SEARCH_POLICY, arguments: args } }] },
          { role: "tool", tool_name: SEARCH_POLICY, content: output },
        );
        continue;
      }
      // Guarantee: if the documents had nothing and no HR data backs the answer, whatever the model
      // wrote is unsupported, so the user gets the fixed polite reply instead.
      const modelSaidNotCovered = reply.content.includes(NOT_COVERED_REPLY);
      const nothingFound =
        evidence.documentsEmpty && !evidence.documentsFound && !evidence.dataOk && result.blocked.length === 0;
      result.notCovered = nothingFound || modelSaidNotCovered;
      result.answer = addressUser(nameKnownIds(nothingFound && !modelSaidNotCovered ? NOT_COVERED_REPLY : reply.content, people));
      emit({ type: "final", iteration: i, answer: result.answer });
      return result;
    }

    messages.push(reply);

    for (const call of calls) {
      const { name, arguments: args } = call.function;
      const callKey = `${name}:${JSON.stringify(args)}`;
      emit({
        type: "tool_call",
        iteration: i,
        name,
        args,
        source: name === SEARCH_POLICY ? "documents" : "hr_system",
      });

      let output: string;
      if (seenCalls.has(callKey)) {
        // Loop guard: identical call repeated, so stop the model from spinning.
        emit({ type: "duplicate", iteration: i, name });
        output = JSON.stringify({ error: "Duplicate tool call. Use the earlier result and write the final answer." });
      } else {
        seenCalls.add(callKey);
        result.toolsCalled.push(name);

        if (AUTHZ_TOOLS.has(name) && !(await isAuthorized(mcp, employeeId, String(args.employee_id ?? "")))) {
          emit({ type: "blocked", iteration: i, name, target: String(args.employee_id) });
          result.blocked.push(name);
          output = JSON.stringify({ error: "Access denied. You may only view yourself and your own subordinates." });
        } else if (name === SEARCH_POLICY) {
          output = await withRetry(() => runSearchPolicy(args), emit, name);
        } else {
          output = (await withRetry(() => mcp.callTool(name, args), emit, name)).text;
        }
      }

      emit({ type: "tool_result", iteration: i, name, output });
      recordEvidence(name, output);
      messages.push({ role: "tool", tool_name: name, content: output });
    }
  }

  result.hitIterationLimit = true;
  result.answer = "Maaf, saya tidak bisa menyelesaikan pertanyaan ini. Silakan hubungi tim HR.";
  emit({ type: "iteration_limit", max: maxIterations });
  return result;
}
