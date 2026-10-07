import math, sys, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

R = '/mnt/user-data/uploads/mobile/'
W, H, FPS = 1080, 1920, 30
DUR = 25.0

# ---------- fonts ----------
KR_BLACK = ('/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc', 1)
KR_BOLD = ('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', 1)
KR_MED = ('/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc', 1)
LOGO = '/usr/share/fonts/opentype/inter/InterDisplay-BlackItalic.otf'
INTER_B = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'
_fc = {}
def font(spec, size):
    key = (spec, size)
    if key not in _fc:
        if isinstance(spec, tuple):
            _fc[key] = ImageFont.truetype(spec[0], size, index=spec[1])
        else:
            _fc[key] = ImageFont.truetype(spec, size)
    return _fc[key]

IVORY = (244, 238, 226)
CYAN = (86, 184, 255)
RED = (235, 64, 52)
NAVY = (8, 24, 36)

# ---------- easing ----------
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))
def prog(t, a, b): return clamp((t - a) / (b - a))
def eo(x): return 1 - (1 - x) ** 3
def eio(x): return 3 * x * x - 2 * x * x * x
def eback(x, s=1.7):
    x -= 1
    return x * x * ((s + 1) * x + s) + 1
def fade(t, a, b, fin=0.25, fout=0.25):
    if t < a or t > b: return 0.0
    return min(clamp((t - a) / fin) if fin else 1, clamp((b - t) / fout) if fout else 1)

# ---------- assets ----------
def L(p): return Image.open(R + p).convert('RGBA')

bg_src = L('assets/branding/opening/bg_museum.png')
STAGE_W = 1080
STAGE_H = round(bg_src.height * STAGE_W / bg_src.width)
bg_stage = bg_src.resize((STAGE_W, STAGE_H), Image.LANCZOS)

def scaled(img, s):
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)

thief = {k: L(f'assets/branding/opening/thief_{k}.png') for k in ('peek', 'sneak', 'freeze')}
guard = {k: L(f'assets/branding/opening/guard_{k}.png') for k in ('away', 'turn')}
column = L('assets/branding/opening/fg_column_left.png')

T_SCALE = 400 / thief['sneak'].getbbox()[3]          # canvas scale so the figure is ~bbox-based
thief_s = {k: scaled(v, T_SCALE) for k, v in thief.items()}
G_SCALE = 480 / 460
guard_s = {k: scaled(v, G_SCALE) for k, v in guard.items()}
col_s = scaled(column, 1500 / column.height)
icon = Image.open(R + 'assets/branding/app-icon.png').convert('RGBA')

def game(p, top=305, bottom=2240):
    im = Image.open(R + p).convert('RGB')
    return im.crop((0, top, im.width, bottom))

G = {
    'museum': game('Reports/V13_PHASE6/play/01-01-a1.png'),
    'casino': game('Reports/HOTFIX/play/0505-at-prize.png'),
    'gallery': game('Reports/V13_PHASE7/zoom/zoom-02-02-7b.png'),
    'bank': game('Reports/V13_PHASE8/sim/zoom-03-04.png'),
    'lab': game('Reports/V13_PHASE8/sim/zoom-04-05.png'),
    'mansion': game('Reports/V13_PHASE5/zoom/zoom-06-02-a.png'),
    'warehouse': game('Reports/V13_PHASE8/sim/zoom-07-02.png'),
    'hq': game('Reports/V13_PHASE8/sim/zoom-08-04.png'),
    'vault': game('Reports/V13_PHASE6/play/09-05-prize.png'),
}

# ---------- drawing helpers ----------
def cover(img, z=1.0, fx=0.5, fy=0.5, w=W, h=H):
    """crop img to w:h aspect at zoom z around focus (fx,fy in 0..1), resize to w,h"""
    s = max(w / img.width, h / img.height) * z
    cw, ch = w / s, h / s
    cx = clamp(fx * img.width, cw / 2, img.width - cw / 2)
    cy = clamp(fy * img.height, ch / 2, img.height - ch / 2)
    box = (cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2)
    return img.resize((w, h), Image.BICUBIC, box=box)

def paste(base, img, x, y, alpha=1.0):
    if alpha <= 0: return
    if alpha < 1:
        a = img.getchannel('A').point(lambda v: int(v * alpha))
        img = img.copy(); img.putalpha(a)
    base.alpha_composite(img, (int(round(x)), int(round(y))))

def vgrad(w, h, top, bottom):
    g = Image.new('RGBA', (1, 256))
    for i in range(256):
        f = i / 255
        g.putpixel((0, i), tuple(int(top[k] + (bottom[k] - top[k]) * f) for k in range(4)))
    return g.resize((w, h), Image.BILINEAR)

def text_layer(txt, fnt, fill, spacing=0, stroke=0, stroke_fill=None, track=0):
    """render text (optionally letter-tracked) to tight RGBA"""
    if track:
        widths = [fnt.getlength(c) for c in txt]
        tw = int(sum(widths) + track * (len(txt) - 1)) + 8
        asc, desc = fnt.getmetrics()
        im = Image.new('RGBA', (tw, asc + desc + 8), (0, 0, 0, 0))
        d = ImageDraw.Draw(im); x = 4
        for c, cw in zip(txt, widths):
            d.text((x, 4), c, font=fnt, fill=fill); x += cw + track
        return im
    d0 = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    bb = d0.multiline_textbbox((0, 0), txt, font=fnt, spacing=spacing, align='center', stroke_width=stroke)
    im = Image.new('RGBA', (int(bb[2] - bb[0]) + 20, int(bb[3] - bb[1]) + 20), (0, 0, 0, 0))
    ImageDraw.Draw(im).multiline_text((10 - bb[0], 10 - bb[1]), txt, font=fnt, fill=fill, spacing=spacing,
                                      align='center', stroke_width=stroke, stroke_fill=stroke_fill)
    return im

def shadowed(layer, radius=18, strength=0.85, color=(0, 0, 0)):
    pad = radius * 2
    out = Image.new('RGBA', (layer.width + pad * 2, layer.height + pad * 2), (0, 0, 0, 0))
    sh = Image.new('RGBA', out.size, color + (0,))
    a = Image.new('L', out.size, 0); a.paste(layer.getchannel('A'), (pad, pad))
    a = a.filter(ImageFilter.GaussianBlur(radius)).point(lambda v: int(min(255, v * strength * 1.6)))
    sh.putalpha(a)
    out.alpha_composite(sh); out.alpha_composite(layer, (pad, pad))
    return out

_tc = {}
def T(key, *args, **kw):
    if key not in _tc:
        _tc[key] = shadowed(text_layer(*args, **kw))
    return _tc[key]

def put_center(base, layer, cy, alpha=1.0, dy=0, scale=1.0, cx=W / 2):
    if alpha <= 0: return
    if scale != 1.0:
        layer = layer.resize((max(1, int(layer.width * scale)), max(1, int(layer.height * scale))), Image.BICUBIC)
    paste(base, layer, cx - layer.width / 2, cy - layer.height / 2 + dy, alpha)

def caption(base, t, a, b, eyebrow, head, cy=1560, sub=None):
    """eyebrow (cyan tracked) + headline + optional sub, slide-up in, fade out"""
    al = fade(t, a, b, 0.3, 0.25)
    if al <= 0: return
    up = (1 - eo(prog(t, a, a + 0.45))) * 40
    if eyebrow:
        e = T(('eb', eyebrow), eyebrow, font(INTER_B, 30), CYAN + (255,), track=7)
        put_center(base, e, cy - 92, al, up * 1.2)
    h = T(('hd', head), head, font(KR_BLACK, 84), IVORY + (255,), spacing=18)
    put_center(base, h, cy, al, up)
    if sub:
        s = T(('sb', sub), sub, font(KR_MED, 38), (200, 214, 222, 255), spacing=12)
        put_center(base, s, cy + h.height / 2 + 26, al, up * 0.7)

def bottom_shade(base, strength=220, start=0.45):
    g = vgrad(W, int(H * (1 - start)), (0, 0, 0, 0), (2, 8, 14, strength))
    base.alpha_composite(g, (0, int(H * start)))

def top_shade(base, strength=200, end=0.3):
    g = vgrad(W, int(H * end), (2, 8, 14, strength), (0, 0, 0, 0))
    base.alpha_composite(g, (0, 0))

def vignette(strength=170):
    v = Image.new('L', (W // 4, H // 4), 0)
    d = ImageDraw.Draw(v)
    d.ellipse((-W // 8, -H // 10, W // 4 + W // 8, H // 4 + H // 10), fill=255)
    v = v.filter(ImageFilter.GaussianBlur(60)).resize((W, H), Image.BILINEAR)
    inv = ImageChops.invert(v).point(lambda x: int(x * strength / 255))
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0)); out.putalpha(inv)
    return out
VIG = vignette()
RED_VIG = Image.new('RGBA', (W, H), RED + (0,)); RED_VIG.putalpha(ImageChops.invert(vignette(255).getchannel('A')).point(lambda x: 255 - x))

def logo(scale=1.0):
    key = ('logo', scale)
    if key in _tc: return _tc[key]
    f = font(LOGO, int(200 * scale))
    l1 = text_layer("DON'T", f, IVORY + (255,))
    l2 = text_layer("MOVE", f, IVORY + (255,))
    lh = int(170 * scale)
    w = max(l1.width, l2.width) + 40
    im = Image.new('RGBA', (w, lh * 2 + int(60 * scale)), (0, 0, 0, 0))
    im.alpha_composite(l1, ((w - l1.width) // 2 - int(14 * scale), 0))
    im.alpha_composite(l2, ((w - l2.width) // 2 + int(10 * scale), lh))
    d = ImageDraw.Draw(im)
    bw, by = int(250 * scale), lh * 2 + int(28 * scale)
    d.rounded_rectangle(((w - bw) // 2, by, (w + bw) // 2, by + int(12 * scale)), radius=int(6 * scale), fill=CYAN + (255,))
    _tc[key] = shadowed(im, 26, 0.9)
    return _tc[key]

def rounded_mask(w, h, r):
    m = Image.new('L', (w * 2, h * 2), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * 2 - 1, h * 2 - 1), radius=r * 2, fill=255)
    return m.resize((w, h), Image.LANCZOS)

# ---------- SCENE A: museum opening 0 - 7.6 ----------
FEET = 1330
def stage(t):
    st = bg_stage.copy()
    # guard
    turned = t >= 5.0
    g = guard_s['turn' if turned else 'away']
    gx = 640 + (0 if turned else math.sin(t * 1.3) * 6)
    paste(st, g, gx, FEET - g.height + 20)
    # thief
    if t < 2.7:
        p = eo(prog(t, 0.9, 1.8)) - eo(prog(t, 2.3, 2.7))
        img = thief_s['peek']
        paste(st, img, 30 + p * 90 - 60, FEET - img.height + 10)
    else:
        if t < 5.0:
            k = prog(t, 2.7, 5.0)
            img = thief_s['sneak']
            x = 20 + eio(k) * 110
            bob = abs(math.sin(t * 7.5)) * -10
        else:
            img = thief_s['freeze']; x = 130; bob = 0
            if t < 5.15: bob = -18 * (1 - prog(t, 5.0, 5.15))
        paste(st, img, x, FEET - img.height + 10 + bob)
    paste(st, col_s, -col_s.width + 250, FEET + 40 - col_s.height)
    return st

def scene_a(t):
    # camera
    z = 1.30 - 0.18 * eio(prog(t, 0, 5.0))
    fx, fy = 0.5, 0.45
    if t >= 5.0:
        z = 1.12 + 0.12 * eo(prog(t, 5.0, 5.35))
        fx, fy = 0.48, 0.46
    st = stage(t)
    frame = cover(st, z, fx, fy)
    if 5.0 <= t < 5.45:  # shake
        k = 1 - prog(t, 5.0, 5.45)
        dx = int(math.sin(t * 90) * 22 * k); dy = int(math.cos(t * 77) * 16 * k)
        frame = ImageChops.offset(frame, dx, dy)
    frame.alpha_composite(VIG)
    top_shade(frame, 230, 0.32)
    bottom_shade(frame, 235, 0.55)
    if t >= 5.0:
        k = 1 - prog(t, 5.0, 6.4)
        rv = RED_VIG.copy(); rv.putalpha(rv.getchannel('A').point(lambda v: int(v * (0.35 + 0.65 * k))))
        frame.alpha_composite(rv)
        if t < 5.08:
            fl = Image.new('RGBA', (W, H), (255, 240, 230, int(150 * (1 - prog(t, 5.0, 5.08)))))
            frame.alpha_composite(fl)
    caption(frame, t, 0.5, 2.6, 'NIGHT · MUSEUM', '경비가 등을 돌린 순간')
    caption(frame, t, 2.7, 4.95, None, '숨죽이고, 한 걸음씩')
    if t >= 5.12:
        k = prog(t, 5.12, 5.42)
        s = 1.0 + (1 - eback(k, 2.2)) * 0.8 if k < 1 else 1.0
        lg = logo(1.0)
        put_center(frame, lg, 380, clamp(k * 3), scale=s)
        caption(frame, t, 5.5, 7.6, None, '움직이면, 들킨다.')
    if t < 0.5:
        frame.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * (1 - t / 0.5)))))
    if t > 7.35:
        frame.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * prog(t, 7.35, 7.6)))))
    return frame

# ---------- SCENE B: tilt control 7.6 - 12.0 ----------
PH_W, PH_H = 600, 1060
SCREEN_MASK = rounded_mask(PH_W - 36, PH_H - 36, 62)
def phone(content):
    ph = Image.new('RGBA', (PH_W, PH_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ph)
    d.rounded_rectangle((0, 0, PH_W - 1, PH_H - 1), radius=80, fill=(20, 26, 32, 255), outline=(70, 90, 105, 255), width=4)
    sc = content.convert('RGBA'); sc.putalpha(SCREEN_MASK)
    ph.alpha_composite(sc, (18, 18))
    d.rounded_rectangle((PH_W // 2 - 70, 34, PH_W // 2 + 70, 70), radius=18, fill=(5, 5, 7, 255))
    return ph

BG_B = None
def bg_b():
    global BG_B
    if BG_B is None:
        b = vgrad(W, H, (6, 18, 28, 255), (2, 6, 10, 255))
        glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse((90, 520, 990, 1420), fill=(40, 120, 190, 110))
        b.alpha_composite(glow.filter(ImageFilter.GaussianBlur(160)))
        BG_B = b
    return BG_B.copy()

def scene_b(t):
    lt = t - 7.6
    fr = bg_b()
    ang = math.sin(lt * 2.0) * 13 * eo(prog(lt, 0.3, 1.0))
    ent = eo(prog(lt, 0, 0.6))
    # in-phone camera pans with tilt direction
    fx = 0.5 + math.sin(lt * 2.0 - 0.5) * 0.06
    fy = 0.70 + lt * 0.015
    content = cover(G['museum'], 1.25, fx, fy, PH_W - 36, PH_H - 36)
    ph = phone(content)
    ph = ph.rotate(ang, resample=Image.BICUBIC, expand=True)
    s = 0.86 + 0.14 * ent
    cy = 1010 + (1 - ent) * 200
    put_center(fr, ph, cy, ent, scale=s)
    # tilt arc + speed meter
    mag = abs(math.sin(lt * 2.0)) * eo(prog(lt, 0.3, 1.0))
    labels = ['IDLE', 'SNEAK', 'WALK', 'RUN']
    lvl = 0 if mag < 0.12 else 1 if mag < 0.45 else 2 if mag < 0.8 else 3
    mx0, my = W / 2 - 330, 1645
    for i, lb in enumerate(labels):
        on = i == lvl
        bx = mx0 + i * 170
        box = Image.new('RGBA', (150, 64), (0, 0, 0, 0))
        dd = ImageDraw.Draw(box)
        dd.rounded_rectangle((0, 0, 149, 63), radius=16, fill=(86, 184, 255, 255) if on else (14, 30, 42, 230),
                             outline=(86, 184, 255, 255) if on else (50, 80, 100, 255), width=2)
        tl = text_layer(lb, font(INTER_B, 26), (6, 18, 28, 255) if on else (150, 175, 190, 255), track=3)
        box.alpha_composite(tl, ((150 - tl.width) // 2, (64 - tl.height) // 2 - 2))
        paste(fr, box, bx, my, fade(lt, 0.5, 4.4, 0.3, 0.3))
    top_shade(fr, 160, 0.25)
    # caption on top
    al = fade(lt, 0.35, 4.4, 0.3, 0.3)
    up = (1 - eo(prog(lt, 0.35, 0.8))) * 30
    put_center(fr, T('b_eb', 'TILT TO MOVE', font(INTER_B, 30), CYAN + (255,), track=7), 205, al, up)
    put_center(fr, T('b_hd', '폰을 기울이면\n도둑이 움직인다', font(KR_BLACK, 80), IVORY + (255,), spacing=16), 340, al, up)
    put_center(fr, T('b_sb', '살짝 기울이면 살금살금, 크게 기울이면 전력질주', font(KR_MED, 36), (200, 214, 222, 255)), 1765, al)
    return fr

# ---------- SCENE C: vision cones 12.0 - 15.6 ----------
Q_POS = (807 / 1206, (759 - 305) / 1935)   # "?" bubble location in casino crop
def scene_c(t):
    lt = t - 12.0
    k = eio(prog(lt, 0, 3.6))
    z = 1.05 + 0.55 * k
    fx = 0.5 + (Q_POS[0] - 0.5) * k
    fy = 0.45 + (Q_POS[1] - 0.45) * k
    fr = cover(G['casino'], z, fx, fy).convert('RGBA')
    fr.alpha_composite(VIG)
    bottom_shade(fr, 235, 0.52)
    top_shade(fr, 150, 0.2)
    # pulsing ring around the "?" guard
    if lt > 1.4:
        s = max(W / G['casino'].width, H / G['casino'].height) * z
        cw, ch = W / s, H / s
        cx = clamp(fx * G['casino'].width, cw / 2, G['casino'].width - cw / 2)
        cy = clamp(fy * G['casino'].height, ch / 2, G['casino'].height - ch / 2)
        px = (Q_POS[0] * G['casino'].width - (cx - cw / 2)) * s
        py = (Q_POS[1] * G['casino'].height - (cy - ch / 2)) * s
        ring = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        dd = ImageDraw.Draw(ring)
        for j in range(2):
            ph = ((lt - 1.4) * 1.3 + j * 0.5) % 1.0
            r = 50 + ph * 120
            dd.ellipse((px - r, py - r, px + r, py + r), outline=(255, 210, 80, int(230 * (1 - ph))), width=6)
        fr.alpha_composite(ring)
    caption(fr, lt, 0.2, 1.75, 'STAY OUT OF SIGHT', '붉은 시야 = 실제 감지 범위', sub='가까울수록, 정면일수록 빨리 들킨다')
    caption(fr, lt, 1.85, 3.6, 'SUSPICION', '? 가 뜨면, 의심이 쌓이는 중', sub='100%가 되면 ! — 휘슬과 함께 모든 경비가 깨어난다')
    if lt > 3.4:
        fr.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * prog(lt, 3.4, 3.6)))))
    return fr

# ---------- SCENE D: chapter montage 15.6 - 21.4 ----------
CH = [('02', '미술관', 'gallery'), ('03', '은행', 'bank'), ('04', '연구소', 'lab'), ('05', '카지노', 'casino'),
      ('06', '저택', 'mansion'), ('07', '창고', 'warehouse'), ('08', '보안 본부', 'hq'), ('09', '최고 보안 금고', 'vault')]
CUT = 0.5
def scene_d(t):
    lt = t - 15.6
    n = len(CH)
    if lt < n * CUT:
        i = int(lt // CUT); u = (lt - i * CUT) / CUT
        num, name, key = CH[i]
        fy = 0.35 if key != 'vault' else 0.3
        fr = cover(G[key], 1.18 - 0.08 * u, 0.5, fy + 0.04 * u).convert('RGBA')
        fr.alpha_composite(VIG)
        bottom_shade(fr, 240, 0.55)
        if u < 0.12:
            fr.alpha_composite(Image.new('RGBA', (W, H), (255, 255, 255, int(90 * (1 - u / 0.12)))))
        e = T(('d_eb', num), f'CHAPTER {num}', font(INTER_B, 32), CYAN + (255,), track=8)
        h = T(('d_hd', name), name, font(KR_BLACK, 104), IVORY + (255,))
        sl = (1 - eo(clamp(u / 0.35))) * 60
        put_center(fr, e, 1540, 1, 0, cx=W / 2 - sl)
        put_center(fr, h, 1640, 1, 0, cx=W / 2 + sl)
        # progress ticks
        bar = Image.new('RGBA', (W, 12), (0, 0, 0, 0)); dd = ImageDraw.Draw(bar)
        tw = 60; gap = 14; x0 = (W - (9 * tw + 8 * gap)) / 2
        for j in range(9):
            on = j <= i + 1
            dd.rounded_rectangle((x0 + j * (tw + gap), 2, x0 + j * (tw + gap) + tw, 9), radius=4,
                                 fill=CYAN + (255,) if on else (255, 255, 255, 60))
        paste(fr, bar, 0, 1770)
        return fr
    # stat card
    u = lt - n * CUT
    fr = bg_b()
    # mosaic of all 9 chapter thumbs, faint
    al = eo(prog(u, 0, 0.4))
    keys = ['museum', 'gallery', 'bank', 'lab', 'casino', 'mansion', 'warehouse', 'hq', 'vault']
    tw, th = 330, 586
    for j, kk in enumerate(keys):
        cx = (j % 3) * (tw + 20) + (W - (3 * tw + 40)) / 2
        cy = (j // 3) * (th + 20) + (H - (3 * th + 40)) / 2 - 40 * u
        th_img = cover(G[kk], 1.1, 0.5, 0.4, tw, th).convert('RGBA')
        th_img.putalpha(rounded_mask(tw, th, 28).point(lambda v: int(v * 0.42 * al)))
        fr.alpha_composite(th_img, (int(cx), int(cy)))
    fr.alpha_composite(Image.new('RGBA', (W, H), (4, 12, 20, 120)))
    k1 = eback(prog(u, 0.05, 0.45), 1.6)
    put_center(fr, T('d_n1', '9', font(LOGO, 300), IVORY + (255,)), 690, clamp(k1), scale=0.6 + 0.4 * k1)
    put_center(fr, T('d_t1', '개의 챕터', font(KR_BLACK, 76), IVORY + (255,)), 900, clamp(k1))
    k2 = eback(prog(u, 0.35, 0.75), 1.6)
    put_center(fr, T('d_n2', '45', font(LOGO, 300), CYAN + (255,)), 1150, clamp(k2), scale=0.6 + 0.4 * k2)
    put_center(fr, T('d_t2', '개의 미션', font(KR_BLACK, 76), IVORY + (255,)), 1360, clamp(k2))
    put_center(fr, T('d_s', '박물관에서 최고 보안 금고까지', font(KR_MED, 40), (200, 214, 222, 255)), 1500, eo(prog(u, 0.7, 1.1)))
    if u > 1.6:
        fr.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * prog(u, 1.6, 1.8)))))
    return fr

# ---------- SCENE E: end card 21.4 - 25.0 ----------
def scene_e(t):
    lt = t - 21.4
    z = 1.22 - 0.06 * eio(prog(lt, 0, 3.6))
    st = bg_stage.copy()
    g = guard_s['away']; paste(st, g, 640, FEET - g.height + 20)
    img = thief_s['peek']; paste(st, img, 30, FEET - img.height + 10)
    paste(st, col_s, -col_s.width + 250, FEET + 40 - col_s.height)
    fr = cover(st, z, 0.5, 0.40)
    fr.alpha_composite(VIG)
    fr.alpha_composite(Image.new('RGBA', (W, H), (2, 8, 14, 70)))
    top_shade(fr, 235, 0.36)
    bottom_shade(fr, 255, 0.42)
    k = eo(prog(lt, 0.15, 0.8))
    put_center(fr, logo(1.0), 380 + (1 - k) * 30, k)
    put_center(fr, T('e_tag', 'A STEALTH GAME IN YOUR HANDS', font(INTER_B, 30), (174, 195, 203, 255), track=8), 640, eo(prog(lt, 0.6, 1.1)))
    # icon + CTA row
    k2 = eo(prog(lt, 0.9, 1.5))
    fr.alpha_composite(vgrad(W, 560, (2, 8, 14, 0), (2, 8, 14, 235)), (0, H - 560))
    ic = icon.resize((150, 150), Image.LANCZOS); ic.putalpha(rounded_mask(150, 150, 34))
    btn = Image.new('RGBA', (500, 116), (0, 0, 0, 0)); dd = ImageDraw.Draw(btn)
    dd.rounded_rectangle((0, 0, 499, 115), radius=58, fill=(10, 30, 46, 235), outline=CYAN + (255,), width=4)
    tl = text_layer('지금 플레이하기', font(KR_BLACK, 46), IVORY + (255,))
    btn.alpha_composite(tl, ((500 - tl.width) // 2, (116 - tl.height) // 2 - 4))
    pulse = 1 + 0.025 * math.sin(lt * 5) * (lt > 1.6)
    put_center(fr, shadowed(ic, 24, 0.8), 1712 + (1 - k2) * 40, k2, cx=W / 2 - 300)
    put_center(fr, shadowed(btn, 30, 0.6, (40, 140, 220)), 1712, eo(prog(lt, 1.2, 1.7)), scale=pulse, cx=W / 2 + 85)
    put_center(fr, T('e_si', 'SILENCE IS A SKILL', font(INTER_B, 24), (140, 160, 170, 255), track=8), 1848, eo(prog(lt, 1.6, 2.1)))
    if lt > 3.2:
        fr.alpha_composite(Image.new('RGBA', (W, H), (0, 0, 0, int(255 * prog(lt, 3.2, 3.6)))))
    return fr

def frame_at(t):
    if t < 7.6: f = scene_a(t)
    elif t < 12.0: f = scene_b(t)
    elif t < 15.6: f = scene_c(t)
    elif t < 21.4: f = scene_d(t)
    else: f = scene_e(t)
    return f.convert('RGB')

def render_idx(i):
    return frame_at(i / FPS).tobytes()

if __name__ == '__main__':
    if sys.argv[1] == 'still':
        for ts in sys.argv[2:]:
            frame_at(float(ts)).save(f'/home/claude/promo/still_{ts}.jpg', quality=88)
    else:
        from multiprocessing import Pool
        out = sys.argv[2]
        n = int(DUR * FPS)
        p = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}',
                              '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17',
                              '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
        with Pool(2) as pool:
            for k, b in enumerate(pool.imap(render_idx, range(n), chunksize=4)):
                p.stdin.write(b)
                if k % 60 == 0: print(k, flush=True)
        p.stdin.close(); p.wait()
