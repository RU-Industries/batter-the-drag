# Link-preview cards

Source pages for the 1200x630 share images. GitHub Pages skips `_` folders, so these aren't published.

Rebuild the home page card (run from the repo root):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --allow-file-access-from-files --window-size=1200,630 --virtual-time-budget=4000 \
  --screenshot=/tmp/card.png "file://$PWD/_social/wendt-card.html"
sips -s format jpeg -s formatOptions 85 /tmp/card.png --out wendt/share.jpg
```

Then bump the `?v=` on `og:image` in `index.html` so Facebook, iMessage etc. fetch the new one.
