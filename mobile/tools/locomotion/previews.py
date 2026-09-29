"""Contact / sliding previews for the Production Locomotion Atlas.

  python3 tools/locomotion/previews.py <atlasDir> <outDir>

A. in-place loop (frame continuity), B. moving at the real gameplay speed with
distance-driven frame selection (floor(phase * n), exactly as the runtime), and
planted-foot markers: every frame a tick is drawn where each planted sole is on
the floor. No sliding = each step's ticks stay in one spot (their spread is the
8-frame quantisation, centred on the contact point). Prints drift statistics.
"""
import json, math, os, sys
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
man = json.load(open(os.path.join(src, 'locomotion-manifest.json')))
feet = json.load(open(os.path.join(src, 'locomotion-feet.json')))
CELL, PX, PY = man['cell'], man['pivot']['x'], man['pivot']['y']
ROWS = man['rows']
SPEED = {('player', 'sneak'): 38, ('player', 'walk'): 72, ('player', 'run'): 150, ('guard', 'walk'): 52, ('guard', 'run'): 168}
FPS = 30

def cells(who, state):
    a = man['characters'][who]['atlases'][state]
    im = Image.open(os.path.join(src, a['file'])).convert('RGBA')
    return a, [[im.crop((k * CELL, r * CELL, k * CELL + CELL, r * CELL + CELL)) for k in range(a['columns'])] for r in range(len(ROWS))]

def floor(w, h, horizontal):
    bg = Image.new('RGBA', (w, h), (52, 58, 64, 255)); d = ImageDraw.Draw(bg)
    step = 16
    for x in range(0, w, step): d.line([(x, 0), (x, h)], fill=(60, 67, 74, 255))
    for y in range(0, h, step): d.line([(0, y), (w, y)], fill=(60, 67, 74, 255))
    return bg

stats = {}
for (who, state), v in SPEED.items():
    a, frames = cells(who, state)
    scale = man['characters'][who]['scale']
    n = a['columns']
    for dirn in ('right', 'down'):
        r = ROWS.index(dirn); stride = a['strideWorld'][dirn]
        soles = feet[f'{who}_{state}'][dirn]
        # ---- A: in-place loop at the gameplay cadence ----
        dwell = int(round(1000 * stride / n / v))
        loop = []
        for k in range(n):
            bg = floor(CELL * 2, CELL * 2, True)
            big = frames[r][k].resize((CELL * 2, CELL * 2), Image.NEAREST)
            bg.alpha_composite(big); loop.append(bg.convert('P', palette=Image.ADAPTIVE))
        loop[0].save(os.path.join(out, f'{who}_{state}_{dirn}_inplace.gif'), save_all=True, append_images=loop[1:], duration=max(20, dwell), loop=0, disposal=2)
        # ---- B: moving at real speed, planted-foot ticks ----
        horiz = dirn == 'right'
        W, H = (760, 190) if horiz else (190, 620)
        travel = (W - 180) if horiz else (H - 200)
        T = travel * scale / v
        ticks = []; gif = []; errs = []; step_anchor = {}
        for i in range(int(T * FPS) + 1):
            t = i / FPS; dist = v * t
            phase = (dist / stride) % 1; k = int(phase * n) % n
            pos = dist / scale
            ox, oy = (90 + pos, 150) if horiz else (95, 90 + pos)
            bg = floor(W, H, horiz)
            d = ImageDraw.Draw(bg)
            for f in (0, 1):
                s = soles[k][f]
                if not s['planted']: continue
                sx = ox + s['x'] - PX if horiz else ox + s['x'] - PX
                sy = oy + s['y'] - PY
                worldpos = (sx if horiz else sy)
                ticks.append((sx, sy, f))
                # which step? count of cycles + foot identity
                cyc = int(dist / stride + (0.5 if f else 0))
                step_anchor.setdefault((f, cyc), {}).setdefault(k, []).append(worldpos * scale)
            for (tx, ty, f) in ticks[-400:]:
                col = (255, 90, 90, 255) if f == 0 else (90, 220, 255, 255)
                if horiz: d.line([(tx, ty + 6), (tx, ty + 11)], fill=col)
                else: d.line([(tx + 14, ty), (tx + 19, ty)], fill=col)
            spr = frames[r][k]
            bg.alpha_composite(spr, (int(round(ox - PX)), int(round(oy - PY))))
            gif.append(bg.convert('P', palette=Image.ADAPTIVE))
        gif[0].save(os.path.join(out, f'{who}_{state}_{dirn}_moving.gif'), save_all=True, append_images=gif[1:], duration=int(1000 / FPS), loop=0, disposal=2)
        # statistics (1 ms simulation, runtime frame rule): while a frame is held the body
        # keeps moving (8-frame quantisation). Averaging over each held frame removes that
        # sawtooth; the spread of those means inside one planted step is systematic sliding.
        anchors = {}
        for i in range(int(3 * stride / v * 1000)):
            dist = v * i / 1000; phase = (dist / stride) % 1; k = int(phase * n) % n
            for f in (0, 1):
                s = soles[k][f]
                if not s['planted']: continue
                screen = (dist / scale + s['x'] - PX) if horiz else (dist / scale + s['y'] - PY)
                cyc = int(dist / stride + (0.5 if f else 0))
                anchors.setdefault((f, cyc), {}).setdefault(k, []).append(screen * scale)
        spreads, drifts = [], []
        dwell_ms = 1000 * stride / n / v
        for key, byk in anchors.items():
            full = {kk: ps for kk, ps in byk.items() if len(ps) >= 0.95 * dwell_ms}
            allp = [p for ps in full.values() for p in ps]
            if len(full) < 1: continue
            spreads.append(max(allp) - min(allp))
            means = [sum(ps) / len(ps) for ps in full.values()]
            drifts.append(max(means) - min(means))
        stats[f'{who}_{state}_{dirn}'] = {
            'speed': v, 'strideWorld': stride, 'stepsPerSec': round(2 * v / stride, 2),
            'quantisationSpreadWorld': round(max(spreads), 2) if spreads else None,
            'perFrameTravelWorld': round(stride / n, 2),
            'systematicSlideWorld': round(max(drifts, default=0), 3),
        }
json.dump(stats, open(os.path.join(out, 'sliding-stats.json'), 'w'), indent=1)
print(json.dumps(stats, indent=1))
