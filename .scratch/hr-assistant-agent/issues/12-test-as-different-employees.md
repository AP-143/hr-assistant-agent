# 12: Test as different employees, with example questions

**What to build:** The composer chips become the testing tools: choosing who is asking (E001 to E006), picking a ready-made demo question, starting a new chat, and seeing which model answers. The model name comes from the server, not from a hard-coded label.

**Blocked by:** 10 (ask from the browser).

**Status:** ready-for-agent

- [ ] "Acting as" opens a menu of the six demo employees with name and title; choosing one resets the conversation and shows a small "Switched to E003" note
- [ ] After switching to E003, asking for the leave of E001 is blocked, and switching back to E002 lets the manager flow work
- [ ] "Example questions" lists demo prompts covering a policy question, own leave, subordinates, a team comparison, an unknown topic and a forbidden request; picking one fills the composer
- [ ] The paperclip position now acts as "New chat" (clears the conversation) and says so in its tooltip and accessible label
- [ ] The model label shows the real configured model name returned by the server
- [ ] The send button is disabled while the agent is working and re-enabled afterwards, including after an error
- [ ] All controls are reachable and operable by keyboard, with the focus style from the design prompt
