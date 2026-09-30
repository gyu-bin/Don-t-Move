"""DON'T MOVE — Production Locomotion V2: 2D cutout rig built from the Character Design
Sheet turnaround masters. Body (head/torso/pack) is the painted master; arms and legs are
cut from the same master and deformed with a skinned (LBS) triangle mesh driven by an IK
gait whose stance foot moves back exactly with the body."""
import numpy as np, cv2, math, json
from params import P, SYNTH_LEGS, SYNTH_LEN

K = 0.489            # master px -> final sprite px
SS = 4               # supersampling
CELL = 128
PIV = np.array([64.0, 112.0])
C = K * SS
KL = 0.45            # side view: lateral offset shown as screen-y
GROUND_LIFT = {'player': 2, 'guard': 0}
SHOULDER_CAP = 7    # master px kept on the body around each shoulder joint

# ---------------------------------------------------------------- gait contract (mirrors src/game/core/locomotionAtlas.ts)
GAITS = {
 'player': {'sneak': dict(frames=8, reach=9.0, stance=0.62), 'walk': dict(frames=14, reach=13.5, stance=0.5), 'run': dict(frames=12, reach=13.0, stance=0.32)},
 'guard':  {'walk': dict(frames=12, reach=13.0, stance=0.55), 'run': dict(frames=12, reach=14.0, stance=0.32)},
}
DEPTH = {'player': 0.8, 'guard': 0.8}
IDLE = {'player': dict(frames=6, fps=5), 'guard': dict(frames=6, fps=4)}
MOTION = {
 'player': {'sneak': dict(lift=3.5, bob=0.8, crouch=2.2, lean=10, swing=12, base=28, bend=55, sway=0.8, up=0.25, pack=0.15),
            'walk':  dict(lift=4.5, bob=0.7, crouch=2.4, lean=2, swing=20, base=4, bend=16, sway=0.9, up=0.25, pack=0.25),
            'run':   dict(lift=7.0, bob=1.6, crouch=1.5, lean=15, swing=50, base=14, bend=72, sway=0.7, up=0.41, pack=0.95, shoulder=0.9)},
 'guard':  {'walk':  dict(lift=4.0, bob=1.0, crouch=0.6, lean=2, swing=15, base=3, bend=10, sway=1.8, up=0.28, rock=1.6, shoulder=0.5),
            'run':   dict(lift=7.5, bob=1.6, crouch=1.8, lean=15, swing=50, base=12, bend=74, sway=0.9, up=0.41, rock=0.6, shoulder=0.8)},
}

def body_dims(who):
    s = P[f'{who}_left']; d = P[f'{who}_down']
    hip, knee, ankle, toe = [np.array(p, float) for p in s['legs']['near']['joints']]
    g = np.array(s['ground'], float)
    thigh = np.linalg.norm(knee - hip) * K; shin = np.linalg.norm(ankle - knee) * K
    ankleH = (g[1] - ankle[1]) * K
    hipRest = (g[1] - hip[1]) * K
    legs = d['legs']
    xs = [v['joints'][0][0] for v in legs.values()]
    hipHalf = (abs(xs[1] - xs[0]) / 2 if len(xs) > 1 else abs(d['hip'][0] - xs[0])) * K
    return dict(thigh=thigh, shin=shin, ankleH=ankleH, hipRest=hipRest, hipHalf=hipHalf)

def foot_cycle(q, stance):
    q = q - math.floor(q)
    if q < stance: return 1 - 2 * q / stance, 0.0, True
    v = (q - stance) / (1 - stance); e = v * v * (3 - 2 * v)
    return -1 + 2 * e, math.sin(math.pi * v), False

def solve_leg(hip, target, a, b):
    d = target - hip; dist = np.linalg.norm(d); mx = a + b - 0.05
    if dist > mx: d = d / dist * mx; dist = mx
    ankle = hip + d; dn = d / dist
    fwd = np.array([0, 0, 1.0]); n = fwd - dn * dn.dot(fwd)
    n = n / (np.linalg.norm(n) or 1)
    ca = max(-1, min(1, (a * a + dist * dist - b * b) / (2 * a * dist))); al = math.acos(ca)
    return hip + a * (dn * math.cos(al) + n * math.sin(al)), ankle

def pose(who, state, p):
    """3D joints (final px; x = character right, y up, z forward)."""
    B = body_dims(who)
    if state == 'idle':
        b = math.sin(2 * math.pi * p)
        pel = np.array([0, B['hipRest'], 0.0])
        legs = []
        for side in (-1, 1):
            hip = pel + [side * B['hipHalf'], 0, 0]
            knee, ankle = solve_leg(hip, np.array([side * B['hipHalf'], B['ankleH'], 0.0]), B['thigh'], B['shin'])
            legs.append(dict(hip=hip, knee=knee, ankle=ankle, planted=True, pitch=0.0))
        return dict(pelvis=pel, lean=0.0, breath=b, legs=legs, arms=[dict(theta=3 + 2 * math.sin(2 * math.pi * (p - .1)), bend=6)] * 2, pack=0.0, rock=0.0, shoulder=0.0, phase=p)
    G = GAITS[who][state]; M = MOTION[who][state]
    def hip_at(q):
        up = 0.5 + 0.5 * math.cos(4 * math.pi * (q - M['up']))
        base = B['hipRest'] - M['crouch'] + M['bob'] * (up - 0.5)
        L = (B['thigh'] + B['shin']) * 0.985
        for f in (0, 0.5):
            fz, _, planted = foot_cycle(q + f, G['stance'])
            if planted: base = min(base, B['ankleH'] + math.sqrt(max(0, L * L - (fz * G['reach']) ** 2)))
        return base
    h = hip_at(p)
    pel = np.array([-M['sway'] * math.sin(2 * math.pi * p), h, 0.0])
    legs = []
    for i, side in enumerate((-1, 1)):
        fz, lift, planted = foot_cycle(p + 0.5 * i, G['stance'])
        target = np.array([side * B['hipHalf'], B['ankleH'] + lift * M['lift'], fz * G['reach']])
        hip = pel + [side * B['hipHalf'], 0, 0]
        knee, ankle = solve_leg(hip, target, B['thigh'], B['shin'])
        pitch = 0.0
        if not planted:
            q = (p + 0.5 * i) % 1; v = (q - G['stance']) / (1 - G['stance'])
            pitch = (-26 * (1 - v) + 14 * v) * math.sin(math.pi * v)
        legs.append(dict(hip=hip, knee=knee, ankle=ankle, planted=planted, pitch=pitch))
    arms = []
    for i in range(2):
        lp = p + 0.5 * i
        theta = M['base'] - M['swing'] * math.cos(2 * math.pi * lp)
        bend = M['bend'] + (16 * max(0, -math.cos(2 * math.pi * lp)) if state == 'run' else 0)
        arms.append(dict(theta=theta, bend=bend))
    # backpack follows the torso ~1 frame late: relative screen offset = body move over that frame
    lag = 1.0 / G['frames']
    pack = (h - hip_at(p - lag)) * M.get('pack', 0)
    return dict(pelvis=pel, lean=M['lean'], breath=0.0, legs=legs, arms=arms, pack=pack,
                rock=M.get('rock', 0.0), shoulder=M.get('shoulder', 0.0), phase=p)

def project(v, view, dp, sv=1.0):
    """sv: the design sheet draws legs shorter in some views (3/4 tilt); heights are scaled,
    floor depth (z) is not, so planted-foot travel is unchanged."""
    x, y, z = v
    if view == 'right': return np.array([z, -y * sv + x * KL])
    if view == 'left': return np.array([-z, -y * sv - x * KL])
    if view == 'down': return np.array([-x, -y * sv + z * dp])
    return np.array([x, -y * sv - z * dp])

# ---------------------------------------------------------------- master preparation
def poly_mask(shape, poly):
    m = np.zeros(shape, np.uint8); cv2.fillPoly(m, [np.array(poly, np.int32)], 1); return m.astype(bool)

def feather_inner(mask, alpha_all, px=2.5):
    """Fade limb alpha toward edges that are cut *inside* the silhouette (joins with the body)."""
    inner_cut = (~mask) & alpha_all
    dist = cv2.distanceTransform((~inner_cut).astype(np.uint8), cv2.DIST_L2, 3)
    return np.clip(dist / px, 0, 1)

_prep = {}
def prepare(view):
    if view in _prep: return _prep[view]
    p = P[view]
    a = cv2.imread(f'master_{view}.png', cv2.IMREAD_UNCHANGED)
    H, W = a.shape[:2]
    bgr = a[..., :3].copy(); al = a[..., 3].astype(np.float32) / 255
    alpha = al > 0.05
    arms = {k: poly_mask((H, W), d['poly']) & alpha for k, d in p['arms'].items()}
    armAll = np.zeros((H, W), bool)
    for m in arms.values(): armAll |= m
    armWide = cv2.dilate(armAll.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & alpha
    legs = {k: poly_mask((H, W), d['poly']) & alpha & ~armWide for k, d in p['legs'].items()}
    # Shoulder caps (incl. the Guard's gold trim) stay painted on the body, so a swinging arm
    # never leaves a cut edge there; the arm's own top fades into that cap.
    yy, xx = np.mgrid[0:H, 0:W]
    caps = np.zeros((H, W), bool)
    for d in p['arms'].values():
        sx, sy = d['joints'][0]; caps |= (xx - sx) ** 2 + (yy - sy) ** 2 <= SHOULDER_CAP ** 2
    armCut = armAll & ~caps
    packMask = poly_mask((H, W), p['pack']['poly']) & alpha if 'pack' in p else np.zeros((H, W), bool)
    body = alpha & ~armCut & ~packMask
    top = min(min(y for _, y in d['poly']) for d in p['arms'].values())
    if 'pack' in p: top = min(top, min(y for _, y in p['pack']['poly']))
    refill = np.zeros_like(body)
    for y in range(max(0, top), min(H, p['cut'] + 1)):
        xs = np.nonzero(body[y])[0]
        if len(xs) > 1:
            seg = np.zeros(W, bool); seg[xs.min():xs.max() + 1] = True
            refill[y] = seg & ~body[y] & alpha[y]
    body |= refill
    body[p['cut'] + 1:] = False
    ink = cv2.dilate((refill | armCut | packMask).astype(np.uint8), np.ones((3, 3), np.uint8))
    bgr_body = cv2.inpaint(bgr, ink, 4, cv2.INPAINT_TELEA) if ink.any() else bgr.copy()
    # dark seam where the body is cut above the legs
    edge = body & ~np.vstack([body[1:], np.zeros((1, W), bool)]) & np.vstack([alpha[1:], np.zeros((1, W), bool)])
    bgr_body[edge] = (bgr_body[edge] * 0.45).astype(np.uint8)
    # outline the torso where an arm was lifted off (covers the arm's rim light left on the body)
    nb = cv2.dilate(armCut.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    cutEdge = body & nb & ~refill
    bgr_body[cutEdge] = (bgr_body[cutEdge] * 0.3).astype(np.uint8)
    def premult(bgrimg, am):
        rgb = bgrimg[..., ::-1].astype(np.float32) / 255
        return np.dstack([rgb * am[..., None], am])
    out = dict(H=H, W=W, body=premult(bgr_body, al * body), arms={}, legs={})
    if 'pack' in p:
        out['pack'] = dict(tex=premult(bgr, al * packMask), pivot=np.array(p['pack']['pivot'], float))
    for k, m in arms.items():
        out['arms'][k] = dict(tex=premult(bgr, al * m * feather_inner(m, alpha, 3.0)), mask=m, joints=np.array(p['arms'][k]['joints'], float))
    synth_key = view if view in SYNTH_LEGS else (view.replace('right', 'left') if view.endswith('right') else None)
    if synth_key:
        out['legs'] = {'vl' if 'left' not in synth_key else 'near': synth_leg(synth_key)}
        if view.endswith('right'): out['legs_flip'] = True
    else:
        for k, m in legs.items():
            out['legs'][k] = dict(tex=premult(bgr, al * m * feather_inner(m, alpha, 2.0)), mask=m, joints=np.array(p['legs'][k]['joints'], float))
    _prep[view] = out
    return out

def synth_leg(key):
    s = SYNTH_LEGS[key]
    def crop(src, rect):
        a = cv2.imread(f'master_{src}.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 255
        x0, y0, x1, y1 = rect; c = a[y0:y1, x0:x1]
        rgb = c[..., :3][..., ::-1]; al = c[..., 3:4]
        return np.concatenate([rgb * al, al], -1)
    pants = crop(*s['pants']); boot = crop(*s['boot'])
    bx0, by0 = s['boot'][1][0], s['boot'][1][1]
    ank = np.array(s['ankle'], float) - [bx0, by0]; toe = np.array(s['toe'], float) - [bx0, by0]
    L = s.get('len', SYNTH_LEN); pw = pants.shape[1]
    pants = cv2.resize(pants, (pw, L + 4), interpolation=cv2.INTER_LINEAR)
    Wd = max(boot.shape[1], pw) + 8; Ht = L + boot.shape[0] + 8
    tex = np.zeros((Ht, Wd, 4), np.float32)
    cx = Wd // 2
    ox = int(round(cx - ank[0])); oy = int(round(2 + L - ank[1]))
    px = int(round(cx - pw / 2))
    tex[2:2 + L + 4, px:px + pw] = pants
    # boot over the pants bottom
    sub = tex[oy:oy + boot.shape[0], ox:ox + boot.shape[1]]
    tex[oy:oy + boot.shape[0], ox:ox + boot.shape[1]] = boot + sub * (1 - boot[..., 3:4])
    mask = tex[..., 3] > 0.05
    joints = np.array([(cx, 3), (cx, 3 + L / 2), (ank[0] + ox, ank[1] + oy), (toe[0] + ox, toe[1] + oy)], float)
    return dict(tex=tex, mask=mask, joints=joints)

# ---------------------------------------------------------------- skinned mesh
def bone_xform(v, a, b, A, B, sw, flip):
    us = (b - a) / (np.linalg.norm(b - a) or 1); ns = np.array([-us[1], us[0]])
    L = np.linalg.norm(B - A); ut = (B - A) / (L or 1); nt = np.array([-ut[1], ut[0]]) * (-1 if flip else 1)
    d = v - a
    along = d @ us * (L / (np.linalg.norm(b - a) or 1)); across = d @ ns * sw
    return A + np.outer(along, ut) + np.outer(across, nt)

def seg_dist(v, a, b):
    ab = b - a; t = np.clip(((v - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(v - (a + np.outer(t, ab)), axis=1)

def render_limb(tex, mask, src, dst, flip=False, tint=1.0, step=2, sigma=2.6):
    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
    gx = np.arange(x0, x1 + step, step, dtype=float); gy = np.arange(y0, y1 + step, step, dtype=float)
    VX, VY = np.meshgrid(gx, gy); V = np.stack([VX.ravel(), VY.ravel()], 1)
    nb = len(src) - 1
    D = np.stack([seg_dist(V, src[i], src[i + 1]) for i in range(nb)], 1)
    Wt = np.exp(-(D / sigma) ** 2) + 1e-9
    # nearest bone always wins strongly away from joints
    Wt[np.arange(len(V)), D.argmin(1)] += 0.15
    Wt /= Wt.sum(1, keepdims=True)
    out = np.zeros_like(V)
    for i in range(nb):
        out += Wt[:, i:i + 1] * bone_xform(V, src[i], src[i + 1], dst[i], dst[i + 1], C, flip)
    Vd = out.reshape(len(gy), len(gx), 2)
    layer = np.zeros((CELL * SS, CELL * SS, 4), np.float32)
    covered = np.zeros((CELL * SS, CELL * SS), bool)
    t = tex * np.array([tint, tint, tint, 1], np.float32)
    msk = cv2.dilate(mask.astype(np.uint8), np.ones((3, 3), np.uint8))
    for r in range(len(gy) - 1):
        for c in range(len(gx) - 1):
            if not msk[int(gy[r]):int(gy[r + 1]) + 1, int(gx[c]):int(gx[c + 1]) + 1].any(): continue
            s = [(gx[c], gy[r]), (gx[c + 1], gy[r]), (gx[c + 1], gy[r + 1]), (gx[c], gy[r + 1])]
            d = [Vd[r, c], Vd[r, c + 1], Vd[r + 1, c + 1], Vd[r + 1, c]]
            for tri in ((0, 1, 2), (0, 2, 3)):
                S = np.float32([s[i] for i in tri]); Dd = np.float32([d[i] for i in tri])
                bx0 = int(max(0, math.floor(Dd[:, 0].min()) - 1)); by0 = int(max(0, math.floor(Dd[:, 1].min()) - 1))
                bx1 = int(min(CELL * SS, math.ceil(Dd[:, 0].max()) + 2)); by1 = int(min(CELL * SS, math.ceil(Dd[:, 1].max()) + 2))
                if bx1 <= bx0 or by1 <= by0: continue
                M = cv2.getAffineTransform(S, Dd - np.float32([bx0, by0]))
                w = cv2.warpAffine(t, M, (bx1 - bx0, by1 - by0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
                tm = np.zeros((by1 - by0, bx1 - bx0), np.uint8)
                cv2.fillConvexPoly(tm, np.int32(np.round(Dd - [bx0, by0])), 1)
                tm = cv2.dilate(tm, np.ones((3, 3), np.uint8)).astype(bool) & ~covered[by0:by1, bx0:bx1]
                layer[by0:by1, bx0:bx1][tm] = w[tm]
                covered[by0:by1, bx0:bx1] |= tm & (w[..., 3] > 0.5)
    return layer

def over(dst, src):
    return src + dst * (1 - src[..., 3:4])

def affine_body(tex, hip_m, hip_c, rot_deg, sy=1.0):
    a = math.radians(rot_deg); c, s = math.cos(a), math.sin(a)
    A = np.array([[c, -s], [s, c]]) @ np.array([[C, 0], [0, C * sy]])
    t = hip_c - A @ hip_m
    M = np.hstack([A, t[:, None]]).astype(np.float32)
    return cv2.warpAffine(tex, M, (CELL * SS, CELL * SS), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)

def rot2(v, a):
    c, s = math.cos(a), math.sin(a); return np.array([v[0] * c - v[1] * s, v[0] * s + v[1] * c])

# ---------------------------------------------------------------- frame
SIDE = ('left', 'right')
def render(who, state, k, view, return_feet=False):
    n = IDLE[who]['frames'] if state == 'idle' else GAITS[who][state]['frames']
    ph = k / n if state == 'idle' else (k + 0.5) / n
    ps = pose(who, state, ph)
    dp = DEPTH[who]; pr = P[f'{who}_{view}']; mp = prepare(f'{who}_{view}')
    B = body_dims(who)
    to_c = lambda s: (PIV + s) * SS
    fx = 1 if view == 'right' else -1 if view == 'left' else 0
    # body
    sv = (pr['ground'][1] - pr['hip'][1]) * K / B['hipRest']
    prj = lambda v: project(v, view, dp, sv)
    pel_c = to_c(prj(ps['pelvis']))
    hip_m = np.array(pr['hip'], float)
    # rest-pose pelvis must land where the master hip is relative to its ground point
    rest_off = (np.array(pr['hip'], float) - np.array(pr['ground'], float)) * K   # screen offset from pivot at rest
    rest_c = (PIV + rest_off) * SS
    delta = pel_c - to_c(prj(np.array([0, B['hipRest'], 0.0])))
    hip_c = rest_c + delta
    rot = ps['lean'] * fx
    ph = ps['phase']
    if fx: rot += fx * ps['rock'] * 0.35 * math.cos(4 * math.pi * ph)          # small nod per step
    elif view == 'down': rot += ps['rock'] * math.sin(2 * math.pi * ph)        # weight onto the stance leg
    else: rot -= ps['rock'] * math.sin(2 * math.pi * ph)
    sy = 1 + 0.012 * ps['breath'] if state == 'idle' else (math.cos(math.radians(ps['lean'])) ** 0.5 if fx == 0 else 1)
    body = affine_body(mp['body'], hip_m, hip_c, rot, sy)
    bodyM = lambda pm: hip_c + rot2((np.array(pm, float) - hip_m) * np.array([C, C * sy]), math.radians(rot))
    # legs
    leg_layers = []; feet = []
    for i, side in enumerate((-1, 1)):
        L = ps['legs'][i]
        if view in SIDE:
            src = mp['legs']['near']; near = (view == 'right') == (i == 1); flip = bool(mp.get('legs_flip')); tint = 1.0 if near else 0.62
        elif view == 'down':
            key = 'vr' if i == 0 else 'vl'
            if key in mp['legs']: src, flip = mp['legs'][key], False
            else: src, flip = mp['legs']['vl'], True
            tint = 1.0; near = None
        else:
            key = 'vl' if i == 0 else 'vr'
            if key in mp['legs']: src, flip = mp['legs'][key], False
            else: src, flip = mp['legs']['vl'], True
            tint = 1.0; near = None
        sj = src['joints']
        # hip joint follows the body (so the leg stays attached), knee/ankle from IK
        hip_scr = prj(L['hip']); knee_scr = prj(L['knee']); ank_scr = prj(L['ankle'])
        shift = (hip_c - rest_c) / SS  # keep legs consistent with body offset (already in hip_scr)
        hipc = (PIV + rest_off + (hip_scr - prj(ps['pelvis'])) + (prj(ps['pelvis']) - prj(np.array([0, B['hipRest'], 0.0])))) * SS
        if view not in SIDE:
            # lateral hip position from the master (source joint) mirrored for the other leg
            pass
        kneec = hipc + (knee_scr - hip_scr) * SS; ankc = hipc + (ank_scr - hip_scr) * SS
        foot_vec = (sj[3] - sj[2]) * C
        if view in SIDE:
            if flip: foot_vec[0] *= -1
            foot_vec = rot2(foot_vec, math.radians(-L['pitch']) * fx)
        else:
            foot_vec = foot_vec * np.array([1, math.cos(math.radians(L['pitch']))])
        toec = ankc + foot_vec
        dst = np.array([hipc, kneec, ankc, toec])
        if flip and view not in SIDE:
            sj = sj.copy()
        lay = render_limb(src['tex'], src['mask'], sj, dst, flip=flip, tint=tint)
        depth = project(L['ankle'], view, dp)
        z = L['ankle'][2]; order = (L['ankle'][0] * (1 if view == 'right' else -1)) if view in SIDE else (z if view == 'down' else -z)
        leg_layers.append((order, lay))
        sole = ankc / SS - PIV + np.array([0, B['ankleH'] * sv])  # sole screen point = ankle + ankle height down
        feet.append(dict(x=float(sole[0] + PIV[0]), y=float(sole[1] + PIV[1]), planted=bool(L['planted'])))
    # arms
    arm_front, arm_back = [], []
    for i in range(2):
        A = ps['arms'][i]
        if view in SIDE:
            src = mp['arms']['near']; near = (view == 'right') == (i == 1); tint = 1.0 if near else 0.6
            flip = False
        elif view == 'down':
            key = 'vr' if i == 0 else 'vl'; src = mp['arms'][key]; near = True; tint = 1.0; flip = False
        else:
            key = 'vl' if i == 0 else 'vr'; src = mp['arms'][key]; near = True; tint = 1.0; flip = False
        sj = src['joints']
        sh = bodyM(sj[0])
        s_fwd = -math.cos(2 * math.pi * (ph + 0.5 * i))   # +1 when this arm swings forward
        if view in SIDE: sh = sh + np.array([fx * ps['shoulder'] * 0.6 * s_fwd * (1 if near else 0.6), 0]) * SS
        else: sh = sh + np.array([0, ps['shoulder'] * 0.4 * s_fwd * (1 if view == 'down' else -1)]) * SS
        if view in SIDE and not near:
            sh = sh + np.array([-fx * 1.5, -1.5]) * SS
        up = (sj[1] - sj[0]) * C; fo = (sj[2] - sj[1]) * C
        dth = math.radians(A['theta'] - 3); dbend = math.radians(A['bend'] - 8)
        if view in SIDE:
            up2 = rot2(up, -fx * dth); fo2 = rot2(fo, -fx * (dth + dbend))
            zf = math.sin(dth)
        else:
            sgn = 1 if view == 'down' else -1
            # facing/back views: swing reads through foreshortening; keep it subtle so the
            # arm never flattens into a sideways sliver
            dth = max(-math.radians(22), min(math.radians(22), dth)); dbend = min(dbend, math.radians(35))
            f1 = max(0.4, math.cos(dth) + math.sin(dth) * dp * sgn)
            a2 = dth + dbend
            f2 = max(0.35, math.cos(a2) + math.sin(a2) * dp * sgn)
            # toward the camera the arm drops lower on screen; away from it, it shortens as a whole
            up2 = np.array([up[0], up[1] * f1]) if f1 >= 1 else up * f1
            fo2 = np.array([fo[0], fo[1] * f2]) if f2 >= 1 else fo * f2
            zf = math.sin(dth)
        el = sh + up2; hd = el + fo2
        lay = render_limb(src['tex'], src['mask'], sj, np.array([sh, el, hd]), flip=flip, tint=tint)
        if view in SIDE: (arm_front if near else arm_back).append(lay)
        elif view == 'down': (arm_front if zf > -0.3 else arm_back).append(lay)
        else: (arm_front if zf < 0.3 else arm_back).append(lay)
    canvas = np.zeros((CELL * SS, CELL * SS, 4), np.float32)
    for lay in arm_back: canvas = over(canvas, lay)
    for _, lay in sorted(leg_layers, key=lambda t: t[0]): canvas = over(canvas, lay)
    canvas = over(canvas, body)
    if 'pack' in mp:
        pk = mp['pack']; dy = ps['pack'] * SS
        prot = rot + (fx * ps['pack'] * 2.5 if fx else 0)
        canvas = over(canvas, affine_body(pk['tex'], pk['pivot'], bodyM(pk['pivot']) + np.array([0, dy]), prot, sy))
    for lay in arm_front: canvas = over(canvas, lay)
    small = cv2.resize(canvas, (CELL, CELL), interpolation=cv2.INTER_AREA)
    # seat the lowest shoe pixel on the pivot line (the Player masters' ground point sits ~2 px high)
    lift = GROUND_LIFT[who]
    if lift:
        small = np.vstack([small[lift:], np.zeros((lift, CELL, 4), np.float32)])
        for f in feet: f['y'] -= lift
    return (small, feet) if return_feet else small

def to_png_rgba(img):
    a = img[..., 3:4]; rgb = np.where(a > 1e-4, img[..., :3] / np.maximum(a, 1e-4), 0)
    out = np.dstack([rgb, a]); out = np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_RGBA2BGRA)
