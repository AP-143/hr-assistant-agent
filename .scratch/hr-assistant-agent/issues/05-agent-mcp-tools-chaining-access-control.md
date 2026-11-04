# 05: Agent calls MCP tools, chains them, and enforces access control

**What to build:** The agent answers questions about live employee data by calling the MCP tools, combines several calls when one question needs it, and refuses to expose data the asking employee is not allowed to see. An employee may only view themselves and their own subordinates (direct and indirect); the check happens in code before the tool runs, not in the prompt.

**Blocked by:** 04.

**Status:** done

- [x] "Sisa cuti saya berapa hari?" as E002 calls the leave-balance tool with E002 and the answer states 7 days
- [x] "Siapa saja bawahan langsung saya?" as E002 calls the subordinate-list tool and the answer names all three direct reports
- [x] "Siapa bawahan saya yang sisa cutinya paling sedikit?" as E002 calls the subordinate-list tool and then the leave-balance tool for the reports, and the answer names the correct person
- [x] A mixed question (e.g. remaining leave plus the carry-over rule) uses both the MCP tool and the document search
- [x] As E003, asking for the leave of E001 is blocked: the trace shows the block, the tool never returns data, and the answer says the employee has no access without leaking the number
- [x] As E001, asking for the leave of E003 (an indirect report) is allowed
- [x] If the small model fails a case reliably, the tool descriptions or system prompt are adjusted (or the failure is recorded for 07) rather than hard-coding the answer

## Findings (for the README)

- First real run: tool calls and chaining were correct, but two failures showed up that only a real small model reveals. (1) For "who has the least leave", the model called all the right tools and then reported the last tool result (10 days) instead of the smallest (4 days), 2/2 runs. An abstract rule did not help; forcing a fixed output shape (one line per person, then the minimum line) fixed it, 3/3 runs. (2) For another employee's data, the model decided by itself not to call the tool, so the access check never ran and the user got a misleading "tidak tahu". A prompt rule saying access is enforced by the system fixed it (2/2 blocked, correct message).
- Access control is covered by deterministic tests with a scripted model (block manager's data, block another team's subordinates, allow indirect report, ID normalisation) so it does not depend on model behaviour.
- Remaining risk: a 4B model can still slip on arithmetic-style comparisons. A bigger model or a server-side aggregate tool would remove it; the eval suite (ticket 07) is where this is measured.
