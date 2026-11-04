# 05: Agent calls MCP tools, chains them, and enforces access control

**What to build:** The agent answers questions about live employee data by calling the MCP tools, combines several calls when one question needs it, and refuses to expose data the asking employee is not allowed to see. An employee may only view themselves and their own subordinates (direct and indirect); the check happens in code before the tool runs, not in the prompt.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] "Sisa cuti saya berapa hari?" as E002 calls the leave-balance tool with E002 and the answer states 7 days
- [ ] "Siapa saja bawahan langsung saya?" as E002 calls the subordinate-list tool and the answer names all three direct reports
- [ ] "Siapa bawahan saya yang sisa cutinya paling sedikit?" as E002 calls the subordinate-list tool and then the leave-balance tool for the reports, and the answer names the correct person
- [ ] A mixed question (e.g. remaining leave plus the carry-over rule) uses both the MCP tool and the document search
- [ ] As E003, asking for the leave of E001 is blocked: the trace shows the block, the tool never returns data, and the answer says the employee has no access without leaking the number
- [ ] As E001, asking for the leave of E003 (an indirect report) is allowed
- [ ] If the small model fails a case reliably, the tool descriptions or system prompt are adjusted (or the failure is recorded for 07) rather than hard-coding the answer
