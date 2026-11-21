# Turn timestamped frames into a constant-60fps video: python3 build.py <dir> <out.mp4>
import json, sys
d, out = sys.argv[1], sys.argv[2]
log = json.load(open(f'{d}/frames.json'))['log']
with open(f'{d}/concat.txt', 'w') as f:
    for i, (name, t) in enumerate(log):
        dur = (log[i+1][1] - t) if i + 1 < len(log) else 1/60
        f.write(f"file '{name}'\nduration {max(dur, 0.001):.4f}\n")
    f.write(f"file '{log[-1][0]}'\n")
