# 16: Quiet answers: a typing indicator, then the result

**What to build:** While the agent works the chat shows only "Sedang mengetik" with animated dots, and then the answer. The panel of steps, the source chips and the Trace switch are gone from the page. The small badge that says where the answer came from stays.

**Blocked by:** 15 (the minimal page).

**Status:** done

- [x] After sending a question the reply bubble shows only the typing indicator until the answer arrives
- [x] The answer then replaces the indicator, with its badge, and no steps, step summary or source chips anywhere
- [x] The Trace chip is removed; the other composer chips and the right-hand cluster are unchanged
- [x] The code that only served the removed parts is removed from the page (step rows, result descriptions, trace switch)
- [x] Errors still show a readable message in the chat

## Notes

- Verified in Chrome by sampling the page every 40 ms after sending: at 0 ms the bubble contained only "Sedang mengetik"; at about 2.4 s it contained only the answer and its badges ("From documents", "From HR system"), with no steps panel or source chips in the DOM. Only the two remaining chips are present, and the page script parses without errors.
- The server still streams the agent's step events and sends the sources in its result; the page just ignores them now. The command-line chat (`npm run chat`) still prints the full trace, so the steps stay available for debugging.
- The typing text is Indonesian on request ("Sedang mengetik"); the other page labels are still English.
- Kept on purpose: the answer badge. Removing it is one line in the page script.
