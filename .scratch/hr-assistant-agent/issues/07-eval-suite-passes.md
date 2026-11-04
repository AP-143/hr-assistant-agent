# 07: Eval suite passes and results are recorded

**What to build:** `npm run eval` runs the full mini eval suite (retrieval, RAG answers, tool routing, multi-tool, "tidak tahu" guardrail, access control) against the real local models and reports pass or fail per case. Failures are triaged: fix the prompt, threshold, or chunking when the system is wrong, fix the case when the expectation is wrong, and record honestly anything that stays flaky with the small model.

**Blocked by:** 05, 06.

**Status:** done

- [x] The suite runs end to end and exits non-zero on any failure
- [x] Every failing case has a recorded cause (system bug, wrong expectation, or model limitation)
- [x] All cases pass, or the remaining failures are explicitly documented as known model limitations with the model name and a suggested mitigation
- [x] The suite is run at least twice to catch flaky cases, and any flakiness is noted
- [x] The final pass count, total runtime, and chat model used are written down for the README

## Results (for the README)

- Chat model `qwen3:4b-instruct` (Ollama), embeddings `bge-m3`, 17 chunks, `MIN_SIMILARITY=0.59`, top-k 4.
- `npm run eval`: **13/13 passed**, 11-14 s per full run. Six runs in total (three before and three after tightening the answer checks; the last one after the history change): no flaky case.
- Ran at the start on a clean first attempt; the failures that did show up earlier (tickets 04 and 05) were found by manual runs and are now fixed and covered by tests: reasoning leaking from the thinking model, "tidak tahu" without searching, no access check for other employees' data, wrong minimum in a comparison.
- Sanity check that the suite can fail: with `MIN_SIMILARITY=0.3` (guardrail loosened) two cases turn red (retrieval returns chunks for an off-topic query; childcare question no longer gets "tidak tahu"). 11/13 passed.
- Known limitation of rule-based checks: under the loosened guardrail the model refused with "tidak ada informasi tentang penitipan anak" (a correct refusal in meaning), which the strict `/tidak tahu/` check marks as a failure. A judge model would score it correctly; this is the argument for LLM-as-judge in the production plan.
- Answer checks were tightened from bare numbers (`/2|dua/`) to number plus unit (`/(2|dua) hari/`) so an unrelated digit cannot pass a case.
- Not covered yet: multi-turn follow-ups in the suite (covered by a unit test only), paraphrase robustness, and answers that are right but mention extra wrong facts.
- Other test suites: `npm test` runs MCP server, retrieval (19 queries), reasoning stripper, harness controls and access control tests.
