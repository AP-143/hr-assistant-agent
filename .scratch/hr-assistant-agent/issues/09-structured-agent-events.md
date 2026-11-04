# 09: Structured agent events

**What to build:** While the agent runs, the harness reports what it is doing as structured events (tool called with its arguments, full tool result, access blocked, duplicate call ignored, nudge, forced document search, retry, iteration limit, final answer) through an optional listener, next to the existing text trace. A caller such as a web UI can then show the steps and where an answer came from without parsing text. This is preparation: nothing the CLI prints changes.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] A run with a scripted model reports tool call, tool result and final answer events in order, with the tool arguments and the complete (untruncated) tool output
- [x] An access-denied call reports a blocked event naming the tool and the requested employee
- [x] A skipped search reports a nudge event, then a forced-search event with the query used, then the search result
- [x] A model or tool failure reports a retry event with the error message; hitting the iteration cap reports an iteration-limit event
- [x] The existing text trace lines are unchanged and all existing tests still pass
- [x] The text trace and the events come from one place, so the two cannot drift apart
