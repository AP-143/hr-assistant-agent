# 06: Harness loop controls verified

**What to build:** The harness around the agent loop (the harness and loop engineering use case) demonstrably protects against runaway and ungrounded behaviour. Each control is shown working through a scenario that forces it, so it is proven rather than assumed.

**Blocked by:** 04.

**Status:** ready-for-agent

- [ ] Iteration cap: with a very low cap, a multi-step question stops at the cap and returns the safe fallback answer instead of looping
- [ ] Duplicate-call guard: a repeated identical tool call is blocked, the model is told to reuse the earlier result, and the loop still finishes
- [ ] Retry: a simulated transient failure (e.g. the tool or LLM call failing once) is retried once and the run succeeds
- [ ] Ungrounded-answer nudge: when the model answers an information question without calling any tool, it is nudged once, and a plain greeting still gets a direct answer
- [ ] Trace: every iteration, tool call, tool result, block, and retry produces a readable trace line
- [ ] Each scenario and its observed output is noted so it can be cited in the README
