# 10: Ask a question from the browser and get an answer

**What to build:** `npm run ui` starts a small local server (default port 4310, changeable with `PORT`, no new dependencies). Opening it shows the hero page from the design prompt, adapted to the HR assistant: looping background video with a dark fallback, glass composer card, the composer toolbar with its right-hand controls placed exactly as specified. Typing a question and sending it moves the page into a chat state (headline and footer fade out, the composer settles at the bottom, the conversation appears above it) and the agent's answer shows up. This is the tracer bullet from browser to agent and back.

**Blocked by:** 09 (structured agent events).

**Status:** done

- [x] `npm run ui` serves the page on port 4310 and prints the address; `PORT` overrides it; a port already in use gives a clear message instead of a crash
- [x] The desktop hero matches the design prompt (layout units, composer card, absolute toolbar, right cluster placement, fonts, colours) with the replaced HR Assistant copy and no third-party company logos or claims
- [x] Sending "Boleh WFH berapa hari seminggu?" in the browser shows the agent's real answer; Enter sends, Shift+Enter does not
- [x] The server answers one question at a time and is stateless: the browser sends the conversation so far with each question
- [x] Answer text is escaped (no HTML injection) and "- " lines render as bullets
- [x] If the video fails to load, the dark fallback keeps the page readable
- [x] A server error (model down, timeout) shows a readable message in the chat, not a blank page
- [x] Server behaviour is covered by tests that use a scripted agent (request validation, stream format, one-at-a-time rule, error path)

## Notes

- Verified in Chrome (new tab, localhost only) at the 1560x1008 window: the page loads, the video plays, a typed question goes out on Enter, the page switches to the chat state, and answers come back, including a second question with history ("tidak tahu" for the CEO salary). No console errors.
- Composer geometry measured against the design prompt, card-relative in layout units: card 708.6 x 143.1 (spec 708 x 143), chips top 92.1 / height 30 / widths 107.1, 108.1, 107.1, edit icon 618.7 / 102.2 / 19.8 (spec 618.15 / 102.14 / 19.79), send 659.6 / 94.1 / 35.0 (spec 659 / 94 / 35, hangs 7u below the chip row), gap icon to send 21.1 (spec 21.06).
- Deliberate deviations from the design prompt: (1) the model label is anchored by its right edge (594u) and grows leftwards, because the real model name is much longer than "Sonnet 4.5" and would run into the icon next to it; (2) the paperclip glyph is a compose/pencil glyph at the same position, since it now means "New chat"; (3) the chip "Example questions" is labelled "Examples" because the longer text overflowed its 108u chip by 8px; (4) the nav links are Chat, Examples, Architecture, Docs (Pricing makes no sense here); (5) the typed text keeps the design's 9.97u size, which is small on a laptop: worth a decision in ticket 14.
- Found while testing: the first screenshot showed only the dark gradient because the video had not drawn its first frame yet, which also proves the offline fallback is visible. Messages hugged the top of the screen instead of the composer; fixed by anchoring the first message with an auto margin so scroll-up still works.
- Server: loopback only, JSON-only POST (blocks cross-site form posts), body limit 64 KB, one question at a time (429 otherwise), error event on agent failure, clear message when the port is taken.
