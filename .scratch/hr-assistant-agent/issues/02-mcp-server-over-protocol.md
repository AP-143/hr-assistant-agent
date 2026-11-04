# 02: MCP server reachable over the protocol

**What to build:** The HR MCP server exposes exactly two tools, `get_leave_balance(employee_id)` and `get_subordinat_list(employee_id)`, backed by dummy in-memory data. An MCP client that spawns the server as a child process can list the tools and call both of them through the protocol only (never by importing server code).

**Blocked by:** None (can start immediately). It does not need Ollama, so it can run in parallel with 01.

**Status:** done

- [x] Over stdio, `listTools` returns exactly the two tools with descriptions and input schemas
- [x] `get_leave_balance` returns remaining and taken leave days for a known employee
- [x] `get_subordinat_list` returns the direct reports of a manager, and an empty list for someone without reports
- [x] An unknown employee ID returns a tool-level error result, not a crashed server
- [x] The server writes nothing but protocol messages to stdout (logging goes to stderr)
