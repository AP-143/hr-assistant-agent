# 11: See how the agent got the answer

**What to build:** Under each question the page shows the agent's steps live as they happen, one line per step with a coloured label (document search, HR system tool, blocked, forced search or nudge, retry). After the answer arrives the steps collapse into one summary line that can be reopened. Under the answer a badge says where it came from (from documents, from HR system, access denied, don't know, safety fallback), with chips for the document sections used and their similarity scores. A "Trace" switch hides all of this for a clean demo view.

**Blocked by:** 10 (ask from the browser).

**Status:** done

- [x] Asking a policy question shows a document-search step live, then a collapsed summary like "2 steps" that expands to show the query and the sections found
- [x] Asking for leave data shows an HR-system step with its arguments; a question needing both shows both
- [x] An out-of-scope question ("Berapa gaji CEO perusahaan ini?") shows the nudge and forced-search steps and a "Don't know" badge
- [x] A forbidden request as another employee shows a blocked step and an "Access denied" badge, and no data from the blocked tool appears anywhere on the page
- [x] Document answers show source chips with section name and similarity score
- [x] The Trace switch hides steps, summary and chips without affecting the badge
- [x] Badge and steps are derived from the structured events, with the badge rules covered by tests

## Notes

- Verified in Chrome with the real agent: a question needing data and a policy shows an "HR system" step (`get_leave_balance(employee_id=E002)` with "Budi Santoso: 7 days left, 5 taken") and a "Documents" step (query plus the 4 sections found with scores), collapses to "2 steps · get_leave_balance → search_policy", and carries the badges "From documents" and "From HR system". The CEO-salary question shows "Nudge" and "Forced search" steps and a "Don't know" badge. A request for E006 (not in E002's team) shows "HR system" and "Blocked" steps and an "Access denied" badge. The page text contains no data of the blocked employee. The Trace switch hides steps and source chips and keeps the badges. No console errors.
- Badge and source rules live in one pure function (`summarize`, 12 tests) and are computed on the server, so the page holds no logic about what an answer means.
- Found while testing: the source chips listed all four retrieved sections (including 0.52 and 0.51), which looks like "these four were used". The search returns the whole top-k once the best chunk passes, so weaker chunks are context, not sources. Chips now show only sections at or above the relevance bar (0.59); all of them stay visible in the step details. Covered by a test.
- Found while testing: restarting the dev server silently failed twice because the old process still held the port (the new one exits with the "port in use" message and the old one keeps serving old code). Stop the old process before restarting.
- The steps appear live as events arrive, but with this model a whole run takes about one to three seconds, so on screen they mostly flash by; the collapsed summary line is what stays.
