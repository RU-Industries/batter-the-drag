# Change list

This list comes from the design review and testing done on 2026-11-05. Testing covered Chrome, Safari and Firefox on macOS, and Safari on an iPhone 15 Pro Max (iOS 27.0.1).

Items are in priority order. Estimates include retesting.

This folder starts with an underscore, so GitHub Pages leaves it off batterthedrag.com.

## Fix before launch (about 4–5 h)

| # | Change | What it covers | Estimate |
|---|---|---|---|
| 1 | Layout on short screens: the centred title must stop colliding with the song info at the bottom left, and the arrows must stop covering text. | The Universe Is Ours title over the song list (1440×900) and over the logo (1280×720). The Big Sleep title running into the Discography link. Ensete's title over its release line in a 914×680 window. Arrows over text on The Wendt and The Universe Is Ours at 125% zoom. Every page overlaps with the phone held sideways. | 2–3 h |
| 2 | Ask Sound / No sound on whichever page a visit starts, and never partway through. | A visit that starts on another page (for example from a link in Messages) is asked mid-visit on reaching The Wendt (`index.html:1019`). Pages other than The Wendt also never offer the choice. | 45 min |
| 3 | Use one release-line format on every page, like "EP · 2026", without repeating the release name. Settle what The Wendt is called. Number The Wendt's songs 1 2 3 instead of tally marks. Set the Unfathomable Depths stamp the same way. | Ensete shows its name three times. The Wendt is an LP on the Discography, has no kind on its own page and is a single on Apple Music. The tally marks read as dividers. | 45 min |
| 4 | Make The Wendt's year readable over the photo. | It is hard to read on phones and in narrow windows. | 15 min |
| 5 | Remove the mouse parallax on The Wendt and Ensete. | The reviewer doesn't want the effect in the interface. Removing it also removes The Wendt's parallax bug: `index.html:1028` redeclares `target` from `:946`, so the parallax dies after the entry screen. | 20 min |

## Small fixes (about 1.5 h together)

- The "Swipe" hint on The Universe Is Ours shows in Times, because the page never sets a font.
- With Reduce motion on, The Wendt's arrow nudge (`index.html:331`) and The Universe Is Ours lettering (`the-universe-is-ours.html:96`) still move.
- The arrow links and the Discography link have no accessible names.
- The Universe Is Ours (`:608`), The Big Sleep (`:1604`) and Unfathomable Depths (`:1138`) let a swipe or arrow key leave during the opening animation. The Wendt and Ensete wait for theirs to finish.
- Add `og:type` and `og:url` to the Discography. Keep The Wendt cover as its share image.
- The Big Sleep's watercolour cursor blooms should fade sooner.
- On Unfathomable Depths, the play button fills blue when it is tapped but white when the record is tapped (on iPhone).
- The arrows sit over the art on The Big Sleep and Unfathomable Depths in narrow desktop windows (very low priority).
- Optional, about 1–2 h on its own: fades on iPhone. iOS ignores `audio.volume`, so music starts at full volume and cuts off at page changes.

## Make shared parts match (about 1–1.5 h)

- The Universe Is Ours:
  - Give the player a level meter like the other pages.
  - Make the Listen button the same shape and width as elsewhere (as wide as the icon rows below it).
  - Mixed case vs caps is a mild issue.
- Discography: add the Listen and Follow icon rows.
- Ensete: replace the gradient fill on the Listen button's hover state.

## Design changes that need a decision first

- **The Universe Is Ours, entrance and exit.**
  - The sky is always spinning, and the letters are a window onto it.
  - Leaving fades the window away, leaving the spinning sky, which then fades to black.
  - Also try the floating stars (currently only with `?p=1`) to fill the empty space.
  - About 2–3 h.
- **Unfathomable Depths needs one story.**
  - It mixes photocopier, spray paint, ink and vinyl.
  - The cursor reads as a pen rather than a brush, and the blue misregistration reads as reality warping rather than a bad photocopy.
  - Pick one story, such as a photocopied DIY flyer, and make the cursor, splats and glitch fit it.
  - About 1–2 h once chosen.
- **Newer vs older releases.**
  - The Big Sleep and Unfathomable Depths build a designed scene around their artwork.
  - The Wendt, Ensete and The Universe Is Ours fill the page with a photo or texture, and feel less developed.
  - Either accept the difference, or give the newer pages a designed element of their own.
  - This is a project of its own (days, not hours).
- **Pace.** Make entrances slightly faster (about 30 min).
- **The Wendt's white-out exit.** Keep it: it was marked Change, but grew on the reviewer.

## Open decisions

1. Is The Wendt an EP or a single?
2. Should the mouse parallax be removed everywhere?
3. Should Bandcamp stay linked twice on each release (the button plus the icon)?
4. Which story should Unfathomable Depths tell?
5. Should the newer release pages stay as they are, or get reworked?

## Not yet tested

- An Android phone.
- A large external monitor.
- A slow mobile connection.
