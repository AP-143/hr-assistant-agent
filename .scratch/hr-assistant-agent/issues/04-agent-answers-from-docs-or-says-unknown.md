# 04: Agent answers a policy question from documents, and says "tidak tahu" otherwise

**What to build:** From the CLI, an employee asks a policy question and the agent answers in Indonesian using only retrieved passages. The agent decides by itself to search the documents. When the documents do not contain the answer, it replies that it does not know and points to the HR team instead of inventing something. The agent connects to the MCP server at startup and lists its tools next to the local document-search tool.

**Blocked by:** 02, 03.

**Status:** done

- [x] `npm run chat -- --employee-id E002 --ask "<policy question>"` prints a trace and a final answer in Indonesian
- [x] For an in-document question, the trace shows the document-search tool being called and the answer contains the fact from the document (e.g. 12 days of annual leave)
- [x] For an out-of-scope question (e.g. CEO salary), the answer is the fixed "tidak tahu" reply and no employee-data tool is called
- [x] Startup output lists the available tools, proving the MCP connection is made through the protocol
- [x] The interactive mode works for at least two consecutive questions in one session
- [x] Running without `--employee-id` prints a usage message and exits non-zero

## Findings (for the README)

- `qwen3:4b` now resolves to a thinking build: it ignores `think: false` and `/no_think` and writes its reasoning into the reply (closing tag only), at roughly 15x the latency (78s versus 5s per question). Switched to `qwen3:4b-instruct` (same family, non-thinking, supports tool calling). The reply stripper still handles leaked reasoning as a safety net.
- The small model sometimes answers "tidak tahu" without searching. A prompt rule alone did not fix it, so the harness now nudges once and then runs `search_policy` itself (forced retrieval), skipping pure small talk. This guardrail is covered by tests with a scripted model.
- Follow-up questions have no topic of their own, so forced retrieval prepends the previous user question to the query.
