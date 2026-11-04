# 14: Verify in the browser and finish

**What to build:** The finished UI is checked in a real browser at the three layout sizes, with a real conversation against the real agent, and the project documentation and tests are brought up to date.

**Blocked by:** 11, 12, 13.

**Status:** done

- [x] In a new Chrome tab (localhost only), the page is checked at 1560x1008, a tablet width and a phone width, with screenshots
- [x] On desktop the right-hand composer controls are measured against the design prompt (model label, paperclip and send positions relative to the chip row) and any deviation is fixed or recorded
- [x] One real session is run end to end: a policy question, a leave question, a team comparison, an unknown question, and a forbidden request as another employee
- [x] Browser console shows no errors during that session
- [x] The README gains two lines about `npm run ui` and its port, and stays short
- [x] The full test suite and the eval suite pass
- [x] Findings and deviations from the design prompt are written into this ticket

## Findings

- **Browser checks** (Chrome, one new tab, localhost only). Desktop was checked at the real window size; tablet (820x1000), phone (390x844) and short landscape (739x379) through same-size iframes, because resizing the window through the tool does not change the viewport (see ticket 13).
- **Composer geometry on desktop**, card-relative in layout units (spec in brackets): edit icon 618.7 / 102.2 / 19.8 (618.15 / 102.14 / 19.79); send 659.6 / 94.1 / 35.0 (659 / 94 / 35), hanging 7u below the 30u chip row; model label top 107.6 and height 10.4 (107.5 and 10.4); gap from icon to send 21.1 (21.06); chips top 92.1, height 30, widths 107.1 / 108.1 / 107.1. After the responsive work the desktop numbers were unchanged.
- **One real session, desktop, history on:** "Boleh WFH berapa hari seminggu?" gave 2 days (Selasa, Rabu, Kamis) with "From documents"; "Sisa cuti saya berapa hari?" gave 7 days with "From HR system"; the team comparison listed all three reports and named Andi Pratama (4 days) as the lowest; "Berapa gaji CEO perusahaan ini?" gave "tidak tahu" via nudge plus forced search with a "Don't know" badge; after switching to E003, "Berapa sisa cuti E001?" showed an HR-system step, a Blocked step, "Access denied", and no data. The browser console showed no errors in any session.
- **Deviations from the design prompt** (all listed in tickets 10 and 13): longer HR headline wraps on small screens; right-anchored model label; compose icon instead of a paperclip; "Examples" instead of "Example questions"; nav links Chat / Examples / Architecture / Docs; 16px question box on phones; no company logos, honest footer.
- **Open decision for the user:** the typed question uses the design's 9.97u font size (about 10 to 12 px on a laptop). It matches the reference but is small for a live demo. Raising it to a minimum of 13 px is a one-line change; it was left as specified.
- **Process notes:** restarting the dev server needs the old process stopped first (the new one exits with "port in use" and the old one keeps serving stale code), and a test that reported a burger-menu failure turned out to be a script-click artifact, so interaction checks use real mouse and key events.
- **Final state:** typecheck clean, 94 of 94 tests pass, eval 13 of 13, README gained two lines about `npm run ui`.
