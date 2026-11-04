# 13: Responsive layouts, entrance animation, mobile menu

**What to build:** The page works on tablets and phones as the design prompt describes (three layout architectures: desktop, tablet, compact), plays the one-time entrance animation on first load, and has the CSS-only burger menu on small screens. Chat state works in all three layouts.

**Blocked by:** 10 (ask from the browser).

**Status:** done

- [x] Tablet (600 to 1180 px wide, at least 600 px tall): nav stays horizontal, toolbar stays one row with chips left and controls right, headline stays on one line
- [x] Compact (under 600 px wide, or short landscape): nav links and the top-right button are replaced by the burger menu, the toolbar becomes two rows with the model label left and attach/send on the right, no horizontal scrolling
- [x] The burger menu opens and closes without JavaScript and shows the nav links and the button
- [x] The entrance animation plays once on first load in the specified order, never loops, and its helper class is removed afterwards
- [x] With "reduce motion" enabled in the system, animations are effectively off
- [x] The chat state (messages, steps, badges, composer docked at the bottom) is usable at all three sizes, and long answers scroll inside the conversation area instead of the whole page

## Notes

- **How the sizes were tested.** Resizing the Chrome window through the automation tool reports success but does not change the viewport (it stayed 2143 px wide), so a first "tablet" measurement turned out to be the desktop layout again and was discarded. The real checks load the page inside iframes of the exact size (media queries follow the iframe, the page is same-origin so it can be measured) and use real mouse and key events where the interaction matters.
- **Tablet 820x1000 (tablet layout active):** nav horizontal with all four links and the button (links 268-553 px between brand ending at 183 and button starting at 671); toolbar on one row (chips at y=562, send at y=563); no horizontal scroll; card 607 px = clamp(516, 74vw, 760). Chat state: thread and card share the same width, the card stays in view, the page does not scroll, four answers with their four badges.
- **Phone 390x844 (compact layout active):** links and top-right button hidden, burger shown; chips wrap on the first row; model label left with the edit icon and the 40px send button on the right of the second row; no horizontal scroll; footer fully visible. Chat state: card inside the viewport (bottom 815 of 843), the thread scrolls inside itself while the page does not, all bubbles within the width. The examples menu spans the card width and opens above it.
- **Short landscape 739x379:** compact layout, card and footer fully visible.
- **Burger menu:** a real mouse click opens the panel (Chat, Examples, Architecture, Docs, How it works; 234 px) and a second click closes it (0 px); the checkbox does the work, the script only adds aria-expanded and Enter/Space support. A script-driven `label.click()` inside the iframe once reported a panel height of 0 (a false alarm: with transitions disabled the panel opens to 233.5 px, and a real click works), so the burger was re-tested with the real mouse.
- **Entrance animation:** 17 animations with the exact delays of the design prompt (brand and mark 60 ms, links 160/210/260/310, button 340, headline 300, card 620, placeholder 880, chips 940, right cluster and send 1000, caption 1080, logos 1160/1220/1280); all 17 rules sit inside `prefers-reduced-motion: no-preference` (none outside); the helper class is removed after the last logo or 2.6 s. The reduced-motion branch was verified by reading the rules, not by switching the system setting.
- **Deviations from the design prompt:** (1) the HR headline is longer than the reference one, so on tablets and phones it wraps (two and three lines) instead of staying on one line; (2) the nav links shrink fluidly on tablets and the button gets narrower there, so that four links fit next to the brand at 600 px; (3) on phones the question box uses 16px text, because smaller text makes iOS zoom the page when the box is focused; (4) on phones the menus span the card width instead of hanging off a chip.
