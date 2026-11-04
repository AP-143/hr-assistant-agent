# 07: Eval suite passes and results are recorded

**What to build:** `npm run eval` runs the full mini eval suite (retrieval, RAG answers, tool routing, multi-tool, "tidak tahu" guardrail, access control) against the real local models and reports pass or fail per case. Failures are triaged: fix the prompt, threshold, or chunking when the system is wrong, fix the case when the expectation is wrong, and record honestly anything that stays flaky with the small model.

**Blocked by:** 05, 06.

**Status:** ready-for-agent

- [ ] The suite runs end to end and exits non-zero on any failure
- [ ] Every failing case has a recorded cause (system bug, wrong expectation, or model limitation)
- [ ] All cases pass, or the remaining failures are explicitly documented as known model limitations with the model name and a suggested mitigation
- [ ] The suite is run at least twice to catch flaky cases, and any flakiness is noted
- [ ] The final pass count, total runtime, and chat model used are written down for the README
