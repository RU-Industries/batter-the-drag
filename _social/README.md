# Link-preview cards

Source pages for the 1200x630 share images (`<release>/share.jpg`). GitHub Pages skips `_` folders, so these aren't published.

- `wendt-card.html`: the home page (The Wendt), built from the wide tunnel art.
- `discography-card.html`: the Discography (`discography-share.jpg` at the repo root), the band mark over all five covers.
- `cover-card.html#<release>`: the other releases, the whole square cover on a backdrop from its page
  (`ensete`, `the-big-sleep`, `unfathomable-depths`, `the-universe-is-ours`).

Rebuild one (run from the repo root), e.g. Ensete:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --allow-file-access-from-files --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot=/tmp/card.png "file://$PWD/_social/cover-card.html#ensete"
sips -s format jpeg -s formatOptions 85 /tmp/card.png --out ensete/share.jpg
```

Then bump the `?v=` on that page's `og:image` so Facebook, iMessage etc. fetch the new one.
