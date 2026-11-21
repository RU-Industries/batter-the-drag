# Promo video (site tour)

The 16 s social video: a phone-size recording of the real site going Wendt → Ensete → The Universe Is Ours →
The Big Sleep → Unfathomable Depths, then an end card ("Website designed & built by Jeff Ruoss"), with Masmusa underneath.
Outputs (not in git): `~/Movies/Batter The Drag social/` — 9:16 for Reels/Threads/Stories, 4:5 for Facebook/LinkedIn feeds.

Remake (from a scratch folder with `npm i playwright@1.56.1`; needs Google Chrome and `python3 serve.py` running):

1. `node record.js take 2.5 '[2300,1000,1500,1500,2200]'` records at transition speed 2.5 (via the dev `btd-timing`
   setting), taps Sound, hides the swipe hint, and saves timestamped 1080x1920 frames.
2. `python3 build.py take x` then `ffmpeg -f concat -safe 0 -i take/concat.txt -vf fps=60,format=yuv420p ... take.mp4`.
3. Cut out the still stretches before each page change. Last cut (2026-11-21): 0.8–3.0, 5.05–10.55, 11.95–14.9, 16.6–19.85 s.
4. `node shot.js` renders the end card (`endcard.html`) at 9:16 and 4:5; crossfade it in over 0.5 s.
5. Audio: `audio/masmusa.mp3` from 7.6 s, so the band comes in on the Wendt's whiteout; fade out over the end card.
   The 4:5 cut puts the 9:16 video over a blurred copy of itself.
