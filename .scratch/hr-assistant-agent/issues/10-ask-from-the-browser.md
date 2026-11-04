# 10: Ask a question from the browser and get an answer

**What to build:** `npm run ui` starts a small local server (default port 4310, changeable with `PORT`, no new dependencies). Opening it shows the hero page from the design prompt, adapted to the HR assistant: looping background video with a dark fallback, glass composer card, the composer toolbar with its right-hand controls placed exactly as specified. Typing a question and sending it moves the page into a chat state (headline and footer fade out, the composer settles at the bottom, the conversation appears above it) and the agent's answer shows up. This is the tracer bullet from browser to agent and back.

**Blocked by:** 09 (structured agent events).

**Status:** ready-for-agent

- [ ] `npm run ui` serves the page on port 4310 and prints the address; `PORT` overrides it; a port already in use gives a clear message instead of a crash
- [ ] The desktop hero matches the design prompt (layout units, composer card, absolute toolbar, right cluster placement, fonts, colours) with the replaced HR Assistant copy and no third-party company logos or claims
- [ ] Sending "Boleh WFH berapa hari seminggu?" in the browser shows the agent's real answer; Enter sends, Shift+Enter does not
- [ ] The server answers one question at a time and is stateless: the browser sends the conversation so far with each question
- [ ] Answer text is escaped (no HTML injection) and "- " lines render as bullets
- [ ] If the video fails to load, the dark fallback keeps the page readable
- [ ] A server error (model down, timeout) shows a readable message in the chat, not a blank page
- [ ] Server behaviour is covered by tests that use a scripted agent (request validation, stream format, one-at-a-time rule, error path)
