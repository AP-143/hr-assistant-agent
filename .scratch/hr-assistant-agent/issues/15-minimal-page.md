# 15: Minimal page: only what belongs to the chat

**What to build:** The demo page shows only what a chat needs. The logo and name, the navigation links, the top-right "How it works" button, the phone burger menu and the footer are gone; what stays is the background video, the greeting headline, the composer with its test tools, and the chat itself.

**Blocked by:** 14 (the finished UI).

**Status:** done

- [x] No logo, brand name, navigation, call-to-action button, burger menu or footer on desktop, tablet or phone
- [x] The code that only served the removed parts is removed too: their styles, entrance animations, script handlers, and the server's `/readme` route and its tests
- [x] The composer, example questions, employee switching, trace switch, steps, badges and sources still work
- [x] Nothing is clipped and nothing scrolls sideways at desktop, tablet, phone and short landscape sizes

## Notes

- Verified in Chrome: the page has no header, nav, footer, logo or links (0 anchors); a real question still gets its answer with the "From HR system" badge and the steps panel; no console errors.
- Same-size iframes (tablet 820x900, phone 390x844, short landscape 739x379): no horizontal or vertical page scroll, the card is fully inside the viewport, the headline sits above the card, and the toolbar rows are as before.
- The padding above and below the content is now equal (it used to leave a large empty band at the bottom for the footer), so the card is vertically centred and sits about 38 px lower than before on a laptop screen. The geometry inside the card did not change.
- Kept on purpose: the background video (the visual language of the design prompt) and the one-line greeting. Dropping either is a small change.
- The entrance animation now ends when the send button's animation ends (it used to wait for the footer logos).
- Removed the `/readme` route: it existed only for the removed links.
