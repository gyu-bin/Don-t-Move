import numpy as np, cv2, json, os, sys
from multiprocessing import Pool
from rig2 import render, to_png_rgba, GAITS, IDLE, DEPTH, CELL, PIV
ROWS = ['down', 'left', 'right', 'up']
STATES = {'player': ['idle', 'sneak', 'walk', 'run'], 'guard': ['idle', 'walk', 'run']}
out = sys.argv[1] if len(sys.argv) > 1 else 'atlas'
os.makedirs(out, exist_ok=True)
def job(args):
    who, state, row, k = args
    img, feet = render(who, state, k, row, True)
    return args, to_png_rgba(img), feet
if __name__ == '__main__':
    jobs = []
    for who, states in STATES.items():
        for st in states:
            n = IDLE[who]['frames'] if st == 'idle' else GAITS[who][st]['frames']
            for row in ROWS:
                for k in range(n): jobs.append((who, st, row, k))
    with Pool(os.cpu_count()) as pool: res = pool.map(job, jobs, chunksize=4)
    sheets, feet = {}, {}
    for (who, st, row, k), img, ft in res:
        n = IDLE[who]['frames'] if st == 'idle' else GAITS[who][st]['frames']
        sh = sheets.setdefault((who, st), np.zeros((4 * CELL, n * CELL, 4), np.uint8))
        r = ROWS.index(row); sh[r * CELL:(r + 1) * CELL, k * CELL:(k + 1) * CELL] = img
        feet.setdefault(f'{who}_{st}', {}).setdefault(row, {})[k] = [{'x': round(f['x'], 3), 'y': round(f['y'], 3), 'planted': f['planted']} for f in ft]
    for (who, st), sh in sheets.items(): cv2.imwrite(f'{out}/{who}_{st}.png', sh)
    feet = {key: {row: [v[k] for k in sorted(v)] for row, v in rows.items()} for key, rows in feet.items()}
    # measured heights (pivot -> top) over idle frames
    heights = {}
    for who in STATES:
        a = sheets[(who, 'idle')][..., 3]
        tops = []
        for r in range(4):
            for k in range(IDLE[who]['frames']):
                cell = a[r * CELL:(r + 1) * CELL, k * CELL:(k + 1) * CELL]
                ys = np.nonzero(cell.max(1) > 24)[0]; tops.append(PIV[1] + 0.5 - ys.min())
        heights[who] = float(np.mean(tops))
    json.dump(feet, open(f'{out}/locomotion-feet.json', 'w'))
    json.dump({'heights': heights}, open(f'{out}/measure.json', 'w'))
    print(heights)
