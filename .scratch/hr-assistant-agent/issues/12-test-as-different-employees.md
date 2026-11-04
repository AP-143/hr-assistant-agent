# 12: Test as different employees, with example questions

**What to build:** The composer chips become the testing tools: choosing who is asking (E001 to E006), picking a ready-made demo question, starting a new chat, and seeing which model answers. The model name comes from the server, not from a hard-coded label.

**Blocked by:** 10 (ask from the browser).

**Status:** done

- [x] "Acting as" opens a menu of the six demo employees with name and title; choosing one resets the conversation and shows a small "Switched to E003" note
- [x] After switching to E003, asking for the leave of E001 is blocked, and switching back to E002 lets the manager flow work
- [x] "Example questions" lists demo prompts covering a policy question, own leave, subordinates, a team comparison, an unknown topic and a forbidden request; picking one fills the composer
- [x] The paperclip position now acts as "New chat" (clears the conversation) and says so in its tooltip and accessible label
- [x] The model label shows the real configured model name returned by the server
- [x] The send button is disabled while the agent is working and re-enabled afterwards, including after an error
- [x] All controls are reachable and operable by keyboard, with the focus style from the design prompt

## Notes

- Verified in Chrome with real clicks and key presses: the "Acting as" menu lists E001 to E006 with name and title and marks the current one; picking E003 resets the conversation and adds "Switched to E003 · Sari Dewi (Backend Engineer). New conversation."; the "Forbidden" example then gives "Access denied" with a Blocked step; switching back to E002 and asking for the team works. "Examples" lists seven ready-made questions (policy, own leave, team, team comparison, data plus policy, unknown, forbidden) and picking one fills the composer without sending. The pencil icon (the old paperclip position) is "New chat" and returns the page to the hero. While the agent works the send button is disabled and a second Enter is ignored without losing the typed text; after a failed request the button is enabled again and the error shows in the chat. The menu opens with Enter, moves with the arrow keys, closes with Escape and returns focus to the chip, and the focus ring is visible. No console errors.
- `/api/info` returns only id, name and title of the demo employees (tested); leave balances and reporting lines stay behind the MCP tools.
- Switching employee before the first question changes the label only (no note), because the note belongs to a conversation that does not exist yet. The nav link "Examples" opens the same menu.
- The "Forbidden" example asks for E001, which is blocked for E002 (their manager) as well as for E003, so it works as a demo from any account except E001 itself.
