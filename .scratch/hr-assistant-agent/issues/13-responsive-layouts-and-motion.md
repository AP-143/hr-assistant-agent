# 13: Responsive layouts, entrance animation, mobile menu

**What to build:** The page works on tablets and phones as the design prompt describes (three layout architectures: desktop, tablet, compact), plays the one-time entrance animation on first load, and has the CSS-only burger menu on small screens. Chat state works in all three layouts.

**Blocked by:** 10 (ask from the browser).

**Status:** ready-for-agent

- [ ] Tablet (600 to 1180 px wide, at least 600 px tall): nav stays horizontal, toolbar stays one row with chips left and controls right, headline stays on one line
- [ ] Compact (under 600 px wide, or short landscape): nav links and the top-right button are replaced by the burger menu, the toolbar becomes two rows with the model label left and attach/send on the right, no horizontal scrolling
- [ ] The burger menu opens and closes without JavaScript and shows the nav links and the button
- [ ] The entrance animation plays once on first load in the specified order, never loops, and its helper class is removed afterwards
- [ ] With "reduce motion" enabled in the system, animations are effectively off
- [ ] The chat state (messages, steps, badges, composer docked at the bottom) is usable at all three sizes, and long answers scroll inside the conversation area instead of the whole page
