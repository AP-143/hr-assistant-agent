# 14: Verify in the browser and finish

**What to build:** The finished UI is checked in a real browser at the three layout sizes, with a real conversation against the real agent, and the project documentation and tests are brought up to date.

**Blocked by:** 11, 12, 13.

**Status:** ready-for-agent

- [ ] In a new Chrome tab (localhost only), the page is checked at 1560x1008, a tablet width and a phone width, with screenshots
- [ ] On desktop the right-hand composer controls are measured against the design prompt (model label, paperclip and send positions relative to the chip row) and any deviation is fixed or recorded
- [ ] One real session is run end to end: a policy question, a leave question, a team comparison, an unknown question, and a forbidden request as another employee
- [ ] Browser console shows no errors during that session
- [ ] The README gains two lines about `npm run ui` and its port, and stays short
- [ ] The full test suite and the eval suite pass
- [ ] Findings and deviations from the design prompt are written into this ticket
