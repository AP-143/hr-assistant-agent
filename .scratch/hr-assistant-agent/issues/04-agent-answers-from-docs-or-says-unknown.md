# 04: Agent answers a policy question from documents, and says "tidak tahu" otherwise

**What to build:** From the CLI, an employee asks a policy question and the agent answers in Indonesian using only retrieved passages. The agent decides by itself to search the documents. When the documents do not contain the answer, it replies that it does not know and points to the HR team instead of inventing something. The agent connects to the MCP server at startup and lists its tools next to the local document-search tool.

**Blocked by:** 02, 03.

**Status:** ready-for-agent

- [ ] `npm run chat -- --employee-id E002 --ask "<policy question>"` prints a trace and a final answer in Indonesian
- [ ] For an in-document question, the trace shows the document-search tool being called and the answer contains the fact from the document (e.g. 12 days of annual leave)
- [ ] For an out-of-scope question (e.g. CEO salary), the answer is the fixed "tidak tahu" reply and no employee-data tool is called
- [ ] Startup output lists the available tools, proving the MCP connection is made through the protocol
- [ ] The interactive mode works for at least two consecutive questions in one session
- [ ] Running without `--employee-id` prints a usage message and exits non-zero
