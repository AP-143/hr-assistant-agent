# 11: See how the agent got the answer

**What to build:** Under each question the page shows the agent's steps live as they happen, one line per step with a coloured label (document search, HR system tool, blocked, forced search or nudge, retry). After the answer arrives the steps collapse into one summary line that can be reopened. Under the answer a badge says where it came from (from documents, from HR system, access denied, don't know, safety fallback), with chips for the document sections used and their similarity scores. A "Trace" switch hides all of this for a clean demo view.

**Blocked by:** 10 (ask from the browser).

**Status:** ready-for-agent

- [ ] Asking a policy question shows a document-search step live, then a collapsed summary like "2 steps" that expands to show the query and the sections found
- [ ] Asking for leave data shows an HR-system step with its arguments; a question needing both shows both
- [ ] An out-of-scope question ("Berapa gaji CEO perusahaan ini?") shows the nudge and forced-search steps and a "Don't know" badge
- [ ] A forbidden request as another employee shows a blocked step and an "Access denied" badge, and no data from the blocked tool appears anywhere on the page
- [ ] Document answers show source chips with section name and similarity score
- [ ] The Trace switch hides steps, summary and chips without affecting the badge
- [ ] Badge and steps are derived from the structured events, with the badge rules covered by tests
