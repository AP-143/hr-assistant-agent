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
- **Decision (resolved):** the typed question used the design's 9.97u font size (about 10 to 12 px on a laptop), which is small for a live demo. The user asked to raise it, so the question box now uses max(13px, 9.97u) (13.55 px measured on the test screen) and 13 px at the smallest on tablets. The composer geometry did not move (chips, send and icon positions identical to the measurements above).
- **Process notes:** restarting the dev server needs the old process stopped first (the new one exits with "port in use" and the old one keeps serving stale code), and a test that reported a burger-menu failure turned out to be a script-click artifact, so interaction checks use real mouse and key events.
- **Final state:** typecheck clean, 94 of 94 tests pass, eval 13 of 13, README gained two lines about `npm run ui`.

## Post-review fixes

A review of the UI work (tickets 09 to 14) found the items below; all are fixed and checked.

- **Polite, structured not-covered reply.** The refusal "Maaf, saya tidak tahu..." is replaced by one fixed reply: "Mohon maaf, informasi tersebut tidak tercantum dalam dokumen kebijakan HR yang tersedia. Silakan hubungi tim HR untuk informasi lebih lanjut." The harness now guarantees it: if the policy search found nothing relevant and no HR data backs the answer, whatever the model wrote is replaced by that reply, and the run is flagged `notCovered` (also when the model itself gives the reply). The badge no longer depends on the wording of the answer (it used to match the phrase with a regular expression); it reads the flag and is called "Not in documents". Covered by 6 harness tests, 3 summary tests and two eval cases that check the wording, the absence of "tidak tahu" and the flag.
- **DNS rebinding.** The server answered any `Host` header. It now returns 403 unless the host is localhost, 127.0.0.1 or [::1] (tested, and checked with curl against the running server: three foreign hosts got 403, local ones 200).
- **Dead links.** The page linked to the private GitHub repository (404 for anyone without access). "How it works", Architecture and Docs now open the README served locally at `/readme` as plain text.
- **Footer claim.** "Runs entirely on this machine" became "Models and data stay on this machine", because the page itself loads a video and fonts from the internet.
- **Phone footer overlap.** At 375x667 with the menu open the footer overlapped the bottom of the card by about 26 px; it now steps aside while the menu is open (card bottom 647 of 667, no overlap).
- **Module boundary.** The demo UI no longer imports the HR data module: who the demo employees are lives in its own directory module, and the HR facts (manager, leave balance) are joined to it inside the MCP server's data file.
- **Not changed on purpose:** the long `createTurn` function and the repeated media-query rules (refactors without behaviour change), and the small question font, which still waits for a decision.
- **Question text size:** raised to a 13 px minimum (see the resolved decision above); it is the only deliberate departure of the typed text from the reference size.

