# Batter The Drag (batterthedrag.com)

Static site, no build, on GitHub Pages. Local server: `python3 serve.py` (http://localhost:4480).

## Every page needs a link-preview card

Each page has a 1200x630 share image so links look right on Facebook, iMessage, X, LinkedIn, Slack and Discord.
A square cover alone gets cropped to its middle in wide previews (titles cut off), so never point `og:image` at a cover.

When you add a page (a new release, or any other page):

1. Make its card in `_social/` (not published: Pages skips `_` folders). Reuse `cover-card.html#<release>` for a
   release with a square cover (add the release to its `covers` list and give it a backdrop from its page), or make a
   page-specific one like `wendt-card.html`. Keep lettering away from the edges.
2. Render it to `<release>/share.jpg` with headless Chrome + `sips` (commands in `_social/README.md`) and look at it.
3. Put these in the page's `<head>`:
   ```html
   <meta property="og:image" content="https://batterthedrag.com/<release>/share.jpg?v=1">
   <meta property="og:image:width" content="1200">
   <meta property="og:image:height" content="630">
   <meta property="og:image:alt" content="<what the card shows>">
   <meta name="twitter:card" content="summary_large_image">
   ```
   plus `og:title`, `og:description`, `og:url` and `og:type` like the other pages.
4. Changing an existing card: bump its `?v=` so the sites fetch the new one.
5. A new release also goes on the Discography, so rebuild `discography-card.html` → `discography-share.jpg` with it.
