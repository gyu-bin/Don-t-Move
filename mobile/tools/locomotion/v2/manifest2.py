import json, sys
from rig2 import GAITS, IDLE, DEPTH, CELL, PIV
out = sys.argv[1]
h = json.load(open(f'{out}/measure.json'))['heights']
HEIGHT = {'player': round(h['player'], 1), 'guard': round(h['guard'], 1)}
SCALE = 46 / HEIGHT['player']          # same world/px for both: relative size from the design sheet
WORLD = {w: round(HEIGHT[w] * SCALE, 2) for w in HEIGHT}
ROWS = ['down', 'left', 'right', 'up']
def stride(who, st, d):
    g = GAITS[who][st]; reach = g['reach'] * (1 if d in ('left', 'right') else DEPTH[who])
    return 2 * reach / g['stance'] * (WORLD[who] / HEIGHT[who])
m = {'version': 2, 'generator': 'tools/locomotion (V2 cutout rig from Character Design Sheet masters)', 'cell': CELL,
     'pivot': {'x': int(PIV[0]), 'y': int(PIV[1])}, 'rows': ROWS, 'characters': {}}
for who, states in {'player': ['idle', 'sneak', 'walk', 'run'], 'guard': ['idle', 'walk', 'run']}.items():
    c = {'heightPx': HEIGHT[who], 'worldHeight': WORLD[who], 'scale': WORLD[who] / HEIGHT[who], 'depth': DEPTH[who], 'atlases': {}}
    for st in states:
        n = IDLE[who]['frames'] if st == 'idle' else GAITS[who][st]['frames']
        e = {'file': f'{who}_{st}.png', 'width': n * CELL, 'height': 4 * CELL, 'columns': n, 'rows': 4}
        if st == 'idle': e.update(mode='time', fps=IDLE[who]['fps'])
        else: e.update(mode='distance', stance=GAITS[who][st]['stance'], reachPx=GAITS[who][st]['reach'], strideWorld={d: round(stride(who, st, d), 4) for d in ROWS})
        c['atlases'][st] = e
    m['characters'][who] = c
json.dump(m, open(f'{out}/locomotion-manifest.json', 'w'), indent=1)
print(HEIGHT, WORLD, {f'{w}.{s}': m['characters'][w]['atlases'][s].get('strideWorld', {}).get('right') for w in m['characters'] for s in m['characters'][w]['atlases']})
