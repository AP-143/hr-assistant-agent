# 06: Harness loop controls verified

**What to build:** The harness around the agent loop (the harness and loop engineering use case) demonstrably protects against runaway and ungrounded behaviour. Each control is shown working through a scenario that forces it, so it is proven rather than assumed.

**Blocked by:** 04.

**Status:** done

- [x] Iteration cap: with a very low cap, a multi-step question stops at the cap and returns the safe fallback answer instead of looping
- [x] Duplicate-call guard: a repeated identical tool call is blocked, the model is told to reuse the earlier result, and the loop still finishes
- [x] Retry: a simulated transient failure (e.g. the tool or LLM call failing once) is retried once and the run succeeds
- [x] Ungrounded-answer nudge: when the model answers an information question without calling any tool, it is nudged once, and a plain greeting still gets a direct answer
- [x] Trace: every iteration, tool call, tool result, block, and retry produces a readable trace line
- [x] Each scenario and its observed output is noted so it can be cited in the README

## Scenarios and observed output (for the README)

All run by a scripted model against the real MCP server and retriever (`src/agent/loop-controls.test.ts`, 8/8 passing).

| Control | Forced scenario | Observed |
|---|---|---|
| Iteration cap | Model calls a different tool every turn forever, cap set to 2 | Stops at iteration 2, `hitIterationLimit` set, safe "hubungi tim HR" answer, trace `iteration limit (2) reached` |
| Duplicate guard | Model asks for the same balance twice | Second call is not executed (tool ran once), model is told to reuse the result, run finishes normally |
| LLM retry | First model call throws | Trace `retry llm: model connection reset`, second attempt succeeds |
| Tool retry | First MCP call throws | Trace `retry get_leave_balance: tool transport closed`, second attempt returns the data |
| Retry exhausted | Model always throws | Error surfaces after one retry (no infinite loop); the CLI prints a friendly message and keeps the session alive |
| Nudge | Model refuses without searching | One nudge, then the harness runs `search_policy` itself; trace shows nudge before the forced search |
| Small talk | "terima kasih ya" | No nudge, no forced search |
| Trace | Blocked call | `tool_call`, `BLOCKED`, `tool_result` and `final answer` lines all present |

Real-world check: with Ollama unreachable the CLI prints `retry llm: fetch failed` and then `Maaf, terjadi kesalahan: fetch failed` (exit code 1).
