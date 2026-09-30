# Per-view rig landmarks in MASTER pixel coordinates (master_<view>.png).
# legs/arms: list of {poly, joints} ; joints: legs [hip, knee, ankle, toe]; arms [shoulder, elbow, hand]
# 'vl' = viewer-left source, 'vr' = viewer-right source (down/up); side views use 'near'.
P = {
 'player_down': dict(ground=(53,179), hip=(53,127), cut=128,
   legs={'vl': dict(poly=[(27,122),(57,122),(58,158),(59,181),(27,181),(29,158)], joints=[(42,124),(43,146),(43,168),(43,178)])},
   arms={'vl': dict(poly=[(12,90),(34,86),(46,106),(48,132),(26,134),(14,112)], joints=[(28,94),(30,110),(37,125)]),
         'vr': dict(poly=[(76,86),(100,88),(102,118),(94,136),(74,136),(72,106)], joints=[(86,94),(90,110),(84,128)])}),
 'player_up': dict(ground=(57,172), hip=(57,135), cut=141, pack=dict(poly=[(31,85),(82,85),(83,138),(31,138)], pivot=(56,88)),
   legs={'vl': dict(poly=[(22,134),(57,134),(56,175),(22,175)], joints=[(40,137),(40,152),(38,165),(38,172)]),
         'vr': dict(poly=[(59,134),(95,134),(95,175),(59,175)], joints=[(76,137),(76,152),(78,165),(78,172)])},
   arms={'vl': dict(poly=[(0,86),(30,84),(33,110),(30,139),(2,139)], joints=[(18,94),(16,114),(17,130)]),
         'vr': dict(poly=[(84,84),(116,86),(116,139),(86,139),(83,110)], joints=[(98,94),(100,114),(100,130)])}),
 'player_left': dict(ground=(48,178), hip=(52,128), cut=129, pack=dict(poly=[(79,60),(88,60),(100,76),(104,95),(102,112),(96,119),(84,118),(80,100),(78,80)], pivot=(84,64)),
   legs={'near': dict(poly=[(33,124),(66,124),(64,150),(58,168),(57,180),(18,180),(20,162),(34,150)], joints=[(52,127),(47,148),(42,166),(24,172)])},
   arms={'near': dict(poly=[(54,86),(81,90),(84,115),(76,141),(62,148),(47,141),(49,118),(51,100)], joints=[(68,96),(66,120),(58,138)])}),
 'guard_down': dict(ground=(57,199), hip=(57,141), cut=142,
   legs={'vl': dict(poly=[(26,138),(58,138),(58,201),(26,201)], joints=[(42,141),(42,160),(42,185),(42,197)]),
         'vr': dict(poly=[(58,138),(90,138),(90,201),(58,201)], joints=[(72,141),(72,160),(72,185),(72,197)])},
   arms={'vl': dict(poly=[(0,86),(30,84),(32,120),(26,144),(2,144)], joints=[(16,92),(14,114),(13,133)]),
         'vr': dict(poly=[(85,84),(115,86),(115,144),(89,144),(84,120)], joints=[(99,92),(101,114),(99,133)])}),
 'guard_up': dict(ground=(57,207), hip=(57,147), cut=148,
   legs={'vl': dict(poly=[(24,144),(57,144),(57,209),(24,209)], joints=[(40,147),(40,168),(40,192),(40,205)]),
         'vr': dict(poly=[(58,144),(90,144),(90,209),(58,209)], joints=[(73,147),(73,168),(73,192),(73,205)])},
   arms={'vl': dict(poly=[(0,86),(30,84),(32,124),(26,146),(2,146)], joints=[(15,92),(12,115),(12,134)]),
         'vr': dict(poly=[(84,86),(114,86),(114,146),(88,146),(83,120)], joints=[(98,92),(101,115),(99,134)])}),
 'guard_left': dict(ground=(50,207), hip=(52,150), cut=151,
   legs={'near': dict(poly=[(36,146),(72,146),(72,190),(68,209),(32,209),(36,190),(38,170)], joints=[(53,150),(55,172),(55,194),(40,204)])},
   arms={'near': dict(poly=[(54,84),(84,86),(86,110),(84,145),(81,164),(56,164),(55,143),(56,110)], joints=[(70,92),(70,122),(68,153)])}),
}

import cv2
def _mirror(view, src, dx=0, dy=0):
    W = cv2.imread(f'master_{view}.png', cv2.IMREAD_UNCHANGED).shape[1]
    f = lambda p: (W - 1 - p[0] + dx, p[1] + dy)
    s = P[src]
    return dict(ground=f(s['ground']), hip=f(s['hip']), cut=s['cut']+dy,
        legs={k: dict(poly=[f(p) for p in d['poly']], joints=[f(p) for p in d['joints']]) for k, d in s['legs'].items()},
        arms={k: dict(poly=[f(p) for p in d['poly']], joints=[f(p) for p in d['joints']]) for k, d in s['arms'].items()},
        **({'pack': dict(poly=[f(p) for p in s['pack']['poly']], pivot=f(s['pack']['pivot']))} if 'pack' in s else {}))
P['player_right'] = _mirror('player_right', 'player_left', -8, -1)
P['guard_right'] = _mirror('guard_right', 'guard_left', 0, 0)
for _d in P['player_right']['arms'].values():
    _d['poly'] = [(x + 6, y) for x, y in _d['poly']]; _d['joints'] = [(x + 6, y) for x, y in _d['joints']]

# Thief legs are mostly hidden behind hands/other leg in the masters, so each view's leg
# texture is assembled from clean master pieces: a pants strip + that view's boot.
# rect = (x0, y0, x1, y1) in the named master; ankle/toe in that master's coordinates.
SYNTH_LEGS = {
 'player_down': dict(pants=('player_down', (30, 132, 54, 157)), boot=('player_down', (31, 156, 58, 181)), ankle=(44, 159), toe=(44, 178)),
 'player_up':   dict(pants=('player_down', (30, 132, 54, 157)), boot=('player_up', (22, 152, 52, 174)), ankle=(38, 156), toe=(38, 172)),
 'player_left': dict(pants=('player_down', (30, 132, 54, 157)), boot=('player_left', (30, 155, 70, 179)), ankle=(52, 159), toe=(33, 171)),
 'guard_left':  dict(pants=('guard_down', (28, 150, 57, 184)), boot=('guard_left', (36, 186, 76, 209)), ankle=(58, 190), toe=(39, 203), len=44),
}
SYNTH_LEN = 40   # master px hip -> ankle
