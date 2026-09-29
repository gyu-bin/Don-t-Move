/**
 * Cut-out part drawing for the locomotion rig (CanvasKit). Everything is drawn
 * in final cell pixels; the caller supersamples.
 */
import type { CanvasKit, Canvas, Paint, Path } from 'canvaskit-wasm';
import type { LocoDir, LocoWho } from '../../src/game/core/locomotionAtlas';
import { LOCO_CHARACTERS } from '../../src/game/core/locomotionAtlas';
import { BODIES, project, type P2, type Pose, type V3 } from './rig';

type RGB = [number, number, number];
const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export interface Palette {
  outline: RGB; skin: RGB; top: RGB; topFar: RGB; pants: RGB; pantsFar: RGB; shoe: RGB; hand: RGB;
  hat: RGB; hatBand: RGB; hatFar?: RGB; eye: RGB; hair?: RGB; pack?: RGB; packDark?: RGB; strap?: RGB;
  gold?: RGB; belt?: RGB; tie?: RGB; visor?: RGB;
}
export const PALETTES: Record<LocoWho, Palette> = {
  player: {
    outline: hex('#07090d'), skin: hex('#3d2b22'), top: hex('#23272f'), topFar: hex('#191c22'),
    pants: hex('#222c42'), pantsFar: hex('#1a2233'), shoe: hex('#35271f'), hand: hex('#b97a45'),
    hat: hex('#1b1f27'), hatBand: hex('#262b35'), eye: hex('#fbfaf2'),
    pack: hex('#8a6440'), packDark: hex('#6a4a2e'), strap: hex('#5a3f27'),
  },
  guard: {
    outline: hex('#07090d'), skin: hex('#f0b98c'), top: hex('#2a3f75'), topFar: hex('#1f3060'),
    pants: hex('#223566'), pantsFar: hex('#1a2a52'), shoe: hex('#121317'), hand: hex('#eab186'),
    hat: hex('#243a72'), hatBand: hex('#101217'), eye: hex('#15171c'), hair: hex('#16161a'),
    gold: hex('#e1b54b'), belt: hex('#121317'), tie: hex('#141d36'), visor: hex('#0c0e12'),
  },
};

const OL = 1.25; // outline width (cell px)

export class Painter {
  constructor(private ck: CanvasKit, private c: Canvas) {}
  private paint(color: RGB, alpha = 1): Paint {
    const p = new this.ck.Paint(); p.setAntiAlias(true); p.setColor(this.ck.Color4f(color[0], color[1], color[2], alpha)); return p;
  }
  path(points: [number, number][], close: boolean): Path {
    const pb = new this.ck.PathBuilder();
    pb.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) pb.lineTo(points[i][0], points[i][1]);
    if (close) pb.close();
    return pb.detachAndDelete();
  }
  /** Round-capped stroke chain with outline. */
  chain(pts: P2[], w: number, color: RGB, outline: RGB, shade = true) {
    const pa = this.path(pts.map(p => [p.x, p.y]), false);
    const ol = this.paint(outline); ol.setStyle(this.ck.PaintStyle.Stroke); ol.setStrokeWidth(w + 2 * OL);
    ol.setStrokeCap(this.ck.StrokeCap.Round); ol.setStrokeJoin(this.ck.StrokeJoin.Round);
    this.c.drawPath(pa, ol);
    const f = this.paint(color); f.setStyle(this.ck.PaintStyle.Stroke); f.setStrokeWidth(w);
    f.setStrokeCap(this.ck.StrokeCap.Round); f.setStrokeJoin(this.ck.StrokeJoin.Round);
    this.c.drawPath(pa, f);
    if (shade) {
      this.c.save(); this.c.translate(-w * 0.2, -w * 0.18);
      const hl = this.paint(mix(color, [1, 1, 1], 0.28), 0.55); hl.setStyle(this.ck.PaintStyle.Stroke); hl.setStrokeWidth(w * 0.32);
      hl.setStrokeCap(this.ck.StrokeCap.Round); hl.setStrokeJoin(this.ck.StrokeJoin.Round);
      this.c.drawPath(pa, hl); this.c.restore();
    }
  }
  /** Filled polygon with rounded corners (radius r) and outline. */
  blob(points: [number, number][], r: number, color: RGB, outline: RGB | null, grad?: { from: RGB; to: RGB; y0: number; y1: number }) {
    const pa = this.path(points, true);
    const both = (p: Paint, w: number) => {
      this.c.drawPath(pa, p);
      if (w > 0) { p.setStyle(this.ck.PaintStyle.Stroke); p.setStrokeWidth(w); p.setStrokeJoin(this.ck.StrokeJoin.Round); this.c.drawPath(pa, p); }
    };
    if (outline) both(this.paint(outline), 2 * r + 2 * OL);
    const f = this.paint(color);
    if (grad) f.setShader(this.ck.Shader.MakeLinearGradient([0, grad.y0], [0, grad.y1],
      [this.ck.Color4f(...grad.from, 1), this.ck.Color4f(...grad.to, 1)], null, this.ck.TileMode.Clamp));
    both(f, 2 * r);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, color: RGB, outline: RGB | null, alpha = 1, rot = 0) {
    this.c.save(); this.c.translate(cx, cy); if (rot) this.c.rotate(rot, 0, 0);
    const r = this.ck.XYWHRect(-rx, -ry, rx * 2, ry * 2);
    if (outline) { const ol = this.paint(outline, alpha); ol.setStyle(this.ck.PaintStyle.Stroke); ol.setStrokeWidth(2 * OL); this.c.drawOval(r, ol); }
    this.c.drawOval(r, this.paint(color, alpha));
    this.c.restore();
  }
  glow(cx: number, cy: number, r: number, color: RGB, alpha: number) {
    const p = this.paint(color, alpha); p.setMaskFilter(this.ck.MaskFilter.MakeBlur(this.ck.BlurStyle.Normal, r * 0.5, true));
    this.c.drawCircle(cx, cy, r, p);
  }
  clipCircleAbove(cx: number, cy: number, r: number, cutY: number, fn: () => void) {
    this.c.save();
    this.c.clipRect(this.ck.XYWHRect(cx - r - 6, cy - r - 12, 2 * r + 12, cutY - (cy - r - 12)), this.ck.ClipOp.Intersect, true);
    fn(); this.c.restore();
  }
  save() { this.c.save(); } restore() { this.c.restore(); }
  canvas() { return this.c; }
}

// ── Character composition ─────────────────────────────────────────────────────
interface Ctx { P: Painter; pose: Pose; dir: LocoDir; who: LocoWho; pal: Palette; pr: (v: V3) => P2 }

function torsoQuad(ctx: Ctx, from: number, to: number, wBot: number, wTop: number): [number, number][] {
  const { pose, pr } = ctx;
  const a = pr(add3(pose.pelvis, mul3(pose.axis, from))), b = pr(add3(pose.pelvis, mul3(pose.axis, to)));
  let nx = -(b.y - a.y), ny = b.x - a.x; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
  return [[a.x + nx * wBot, a.y + ny * wBot], [b.x + nx * wTop, b.y + ny * wTop], [b.x - nx * wTop, b.y - ny * wTop], [a.x - nx * wBot, a.y - ny * wBot]];
}
const add3 = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul3 = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const side = (d: LocoDir) => d === 'left' || d === 'right';

function drawLeg(ctx: Ctx, i: 0 | 1, far: boolean) {
  const { P, pose, pal, who, dir, pr } = ctx; const B = BODIES[who]; const L = pose.legs[i];
  const hip = pr(L.hip), knee = pr(L.knee), ankle = pr(L.ankle);
  const pants = far ? pal.pantsFar : pal.pants;
  P.chain([hip, knee, ankle], B.legW, pants, pal.outline);
  // Foot
  const shoe = far ? mix(pal.shoe, [0, 0, 0], 0.25) : pal.shoe;
  const sole = L.sole, pitch = (L.pitch * Math.PI) / 180;
  if (side(dir)) {
    const f = { x: Math.cos(pitch), y: Math.sin(pitch) }; // along foot (forward, up) in (z,y)
    const pts: V3[] = [
      { x: sole.x, y: sole.y + (-B.heel) * f.y, z: sole.z - B.heel * f.x },
      { x: sole.x, y: sole.y + B.toe * f.y, z: sole.z + B.toe * f.x },
      { x: sole.x, y: sole.y + B.toe * f.y + B.footH * 0.7 * f.x, z: sole.z + B.toe * f.x - B.footH * 0.7 * f.y },
      { x: sole.x, y: sole.y + B.footH * f.x, z: sole.z - B.footH * f.y - B.heel * 0.2 },
      { x: sole.x, y: sole.y - B.heel * f.y + B.footH * 0.8 * f.x, z: sole.z - B.heel * f.x },
    ];
    P.blob(pts.map(v => { const q = pr(v); return [q.x, q.y] as [number, number]; }), 1.4, shoe, pal.outline);
  } else {
    const s = pr(sole); const toward = dir === 'down';
    const h = B.footH * (toward ? 1 : 0.9);
    const lift = Math.max(0, L.ankle.y - B.ankle);
    P.ellipse(s.x, s.y - h / 2 + (toward ? 0.4 : 0), B.footW / 2, h / 2 + (lift > 1 ? 0.6 : 0), shoe, pal.outline);
    if (toward) P.ellipse(s.x - 0.8, s.y - h * 0.62, B.footW * 0.22, h * 0.16, mix(shoe, [1, 1, 1], 0.35), null, 0.6);
    // shin/ankle cover so the leg meets the shoe
    void ankle;
  }
}

function drawArm(ctx: Ctx, i: 0 | 1, far: boolean) {
  const { P, pose, pal, who, pr } = ctx; const B = BODIES[who]; const A = pose.arms[i];
  const s = pr(A.shoulder), e = pr(A.elbow), h = pr(A.hand);
  const sleeve = far ? pal.topFar : pal.top;
  P.chain([s, e, h], B.armW, sleeve, pal.outline);
  if (who === 'guard' && pal.gold && !far) {
    // shoulder patch
    const px = s.x + (e.x - s.x) * 0.3, py = s.y + (e.y - s.y) * 0.3;
    P.ellipse(px, py, 2.1, 2.5, pal.gold, null, 0.9);
  }
  P.ellipse(h.x, h.y, B.handR, B.handR, far ? mix(pal.hand, [0, 0, 0], 0.2) : pal.hand, pal.outline);
}

function drawTorso(ctx: Ctx) {
  const { P, pose, pal, who, dir, pr } = ctx; const B = BODIES[who];
  const sd = side(dir);
  const wTop = (sd ? B.torsoD : B.torsoW) / 2, wBot = (sd ? B.torsoD * 0.92 : B.torsoWHip) / 2;
  const r = 3.2;
  const body = torsoQuad(ctx, -1.5 + r, B.torso - 1 - r * 0.6, wBot - r, wTop - r);
  const top = pr(add3(pose.pelvis, mul3(pose.axis, B.torso))), bot = pr(pose.pelvis);
  P.blob(body, r, pal.top, pal.outline, { from: mix(pal.top, [1, 1, 1], 0.1), to: mix(pal.top, [0, 0, 0], 0.18), y0: top.y, y1: bot.y + 2 });
  // hips / waist in trouser colour
  P.blob(torsoQuad(ctx, -2 + 2.4, 4.5, wBot - 2.4, wBot - 2.2), 2.4, pal.pants, pal.outline);
  if (who === 'guard') {
    P.blob(torsoQuad(ctx, 4.2, 6.6, wBot - 0.4, wBot - 0.2), 0.6, pal.belt!, null);
    const c = pr(add3(pose.pelvis, mul3(pose.axis, 5.4)));
    if (dir === 'down') P.blob([[c.x - 2.2, c.y - 1.3], [c.x + 2.2, c.y - 1.3], [c.x + 2.2, c.y + 1.3], [c.x - 2.2, c.y + 1.3]], 0.4, pal.gold!, null);
    if (dir === 'down') {
      // tie + collar + badge on the wearer's left chest (screen right)
      const n = pr(add3(pose.pelvis, mul3(pose.axis, B.torso - 1.5)));
      const t = pr(add3(pose.pelvis, mul3(pose.axis, 8.5)));
      P.blob([[n.x - 1.5, n.y], [n.x + 1.5, n.y], [t.x + 1.2, t.y - 1.5], [t.x, t.y], [t.x - 1.2, t.y - 1.5]], 0.4, pal.tie!, null);
      P.blob([[n.x - 5.5, n.y - 1], [n.x - 0.5, n.y + 3.2], [n.x + 0.5, n.y + 3.2], [n.x + 5.5, n.y - 1]], 0.6, mix(pal.top, [1, 1, 1], 0.12), pal.outline);
      const bd = pr(add3(pose.pelvis, add3(mul3(pose.axis, B.torso - 7), { x: -B.torsoW * 0.26, y: 0, z: 0 })));
      P.blob([[bd.x - 2.2, bd.y - 2.4], [bd.x + 2.2, bd.y - 2.4], [bd.x + 2.2, bd.y + 0.8], [bd.x, bd.y + 2.6], [bd.x - 2.2, bd.y + 0.8]], 0.5, pal.gold!, pal.outline);
      for (const k of [11, 14.5, 18]) { const bt = pr(add3(pose.pelvis, mul3(pose.axis, k))); P.ellipse(bt.x + 2.6, bt.y, 0.7, 0.7, pal.gold!, null, 0.85); }
    }
    if (dir === 'left') {
      const bd = pr(add3(pose.pelvis, add3(mul3(pose.axis, B.torso - 7), { x: -B.torsoW * 0.2, y: 0, z: B.torsoD * 0.3 })));
      P.blob([[bd.x - 1.6, bd.y - 2.2], [bd.x + 1.6, bd.y - 2.2], [bd.x + 1.6, bd.y + 0.7], [bd.x, bd.y + 2.3], [bd.x - 1.6, bd.y + 0.7]], 0.4, pal.gold!, pal.outline);
    }
  } else if (dir === 'down' && pal.strap) {
    // backpack straps over the chest
    for (const sgn of [-1, 1]) {
      const a = pr(add3(pose.pelvis, add3(mul3(pose.axis, B.torso - 1.5), { x: sgn * B.torsoW * 0.27, y: 0, z: 0 })));
      const b = pr(add3(pose.pelvis, add3(mul3(pose.axis, 7), { x: sgn * B.torsoW * 0.33, y: 0, z: 0 })));
      P.chain([a, b], 2.6, pal.strap, pal.outline, false);
    }
  }
}

function drawPack(ctx: Ctx) {
  const { P, pose, pal, who, dir, pr } = ctx; const B = BODIES[who];
  if (!B.pack || !pose.pack) return;
  const c = pr(pose.pack); const k = B.pack;
  if (dir === 'up') {
    const hw = k.w / 2, hh = k.h / 2;
    P.blob([[c.x - hw + 2, c.y - hh + 2], [c.x + hw - 2, c.y - hh + 2], [c.x + hw - 2, c.y + hh - 2], [c.x - hw + 2, c.y + hh - 2]], 2.5, pal.pack!, pal.outline,
      { from: mix(pal.pack!, [1, 1, 1], 0.12), to: pal.packDark!, y0: c.y - hh, y1: c.y + hh });
    P.blob([[c.x - hw + 3.5, c.y + 1], [c.x + hw - 3.5, c.y + 1], [c.x + hw - 3.5, c.y + hh - 3], [c.x - hw + 3.5, c.y + hh - 3]], 1.4, pal.packDark!, pal.outline);
    P.chain([{ x: c.x - hw + 3, y: c.y - hh + 3.2, d: 0 }, { x: c.x + hw - 3, y: c.y - hh + 3.2, d: 0 }], 1.1, mix(pal.pack!, [1, 1, 1], 0.25), pal.packDark!, false);
  } else if (side(dir)) {
    const back = dir === 'right' ? -1 : 1, hd = k.d / 2 + 0.5, hh = k.h / 2;
    const lean = Math.atan2(pose.axis.z, pose.axis.y) * (dir === 'right' ? 1 : -1);
    P.save(); P.canvas().rotate((lean * 180) / Math.PI, c.x, c.y);
    P.blob([[c.x - hd + 2, c.y - hh + 2.5], [c.x + hd - 2, c.y - hh + 2], [c.x + hd - 2, c.y + hh - 2], [c.x - hd + 2, c.y + hh - 2]], 2.6, pal.pack!, pal.outline,
      { from: mix(pal.pack!, [1, 1, 1], 0.12), to: pal.packDark!, y0: c.y - hh, y1: c.y + hh });
    P.blob([[c.x + back * (hd - 1.5), c.y - 1], [c.x + back * (hd + 1.2), c.y - 0.5], [c.x + back * (hd + 1.2), c.y + hh - 2.5], [c.x + back * (hd - 1.5), c.y + hh - 2.5]], 1.2, pal.packDark!, pal.outline);
    P.restore();
  } else {
    // facing camera: pack peeks out behind the shoulders
    const hw = k.w / 2 + 0.5;
    P.blob([[c.x - hw + 2, c.y - k.h / 2 + 1], [c.x + hw - 2, c.y - k.h / 2 + 1], [c.x + hw - 2, c.y + 4], [c.x - hw + 2, c.y + 4]], 2.4, pal.packDark!, pal.outline);
  }
}

function drawHead(ctx: Ctx) {
  const { P, pose, pal, who, dir, pr } = ctx; const B = BODIES[who];
  const c = pr(pose.head), R = B.headR;
  const fx = dir === 'right' ? 1 : dir === 'left' ? -1 : 0;
  if (who === 'player') {
    P.ellipse(c.x, c.y, R, R * 0.97, pal.skin, pal.outline);
    // beanie dome
    const cut = c.y + (dir === 'up' ? R * 0.42 : R * 0.02);
    P.clipCircleAbove(c.x, c.y, R, cut, () => {
      P.ellipse(c.x - fx * 0.6, c.y - 1.3, R + 1.3, R + 0.4, pal.hat, pal.outline);
    });
    P.ellipse(c.x - 4 - fx * 3, c.y - R * 0.55, R * 0.42, R * 0.2, mix(pal.hat, [1, 1, 1], 0.2), null, 0.7, -18);
    // rolled cuff
    const bw = R + 1.9, by = cut - R * 0.02;
    const tilt = fx * 1.6;
    P.blob([[c.x - bw + 1.5, by - 4 - tilt], [c.x + bw - 1.5, by - 4 + tilt], [c.x + bw - 1.5, by + 1.6 + tilt], [c.x - bw + 1.5, by + 1.6 - tilt]], 1.5, pal.hatBand, pal.outline);
    for (let k = -3; k <= 3; k++) {
      const x = c.x + k * (bw / 3.6);
      P.chain([{ x, y: by - 4 + (tilt * k) / 3.6, d: 0 }, { x, y: by + 1.4 + (tilt * k) / 3.6, d: 0 }], 0.55, mix(pal.hatBand, [0, 0, 0], 0.45), pal.hatBand, false);
    }
    // glowing eyes
    const ey = by + R * 0.3;
    const eyes: [number, number, number][] = dir === 'down' ? [[-R * 0.36, 1, 1], [R * 0.36, 1, 1]]
      : dir === 'up' ? [] : [[fx * R * 0.5, 0.95, 1], [fx * R * 0.86, 0.55, 0.8]];
    for (const [ox, sx, a] of eyes) {
      P.glow(c.x + ox, ey, R * 0.3, pal.eye, 0.28 * a);
      P.ellipse(c.x + ox, ey, R * 0.2 * sx, R * 0.12, pal.eye, null, a);
    }
    return;
  }
  // Guard
  const hair = pal.hair!;
  if (dir !== 'up') P.ellipse(c.x - fx * 1.2, c.y - 1.5, R + 0.6, R * 0.95, hair, pal.outline);
  if (dir === 'down') for (const s of [-1, 1]) P.ellipse(c.x + s * (R - 0.5), c.y + R * 0.18, 2.6, 3.4, pal.skin, pal.outline);
  if (dir === 'up') {
    P.ellipse(c.x, c.y, R, R * 0.96, hair, pal.outline);
    P.ellipse(c.x, c.y + R * 0.86, R * 0.34, R * 0.16, pal.skin, null, 1);
  } else if (dir === 'down') {
    P.ellipse(c.x, c.y + 1, R * 0.93, R * 0.9, pal.skin, pal.outline);
  } else {
    P.ellipse(c.x + fx * R * 0.2, c.y + 1.2, R * 0.78, R * 0.86, pal.skin, pal.outline);
    P.ellipse(c.x - fx * R * 0.4, c.y + R * 0.22, 1.9, 2.6, mix(pal.skin, [0.55, 0.25, 0.12], 0.22), null);
  }
  // face
  if (dir === 'down') {
    for (const s of [-1, 1]) {
      P.ellipse(c.x + s * R * 0.34, c.y + R * 0.3, 1.5, 2.1, pal.eye, null);
      P.chain([{ x: c.x + s * R * 0.2, y: c.y + R * 0.08, d: 0 }, { x: c.x + s * R * 0.5, y: c.y + R * 0.1, d: 0 }], 1, hair, hair, false);
    }
    P.chain([{ x: c.x - 2, y: c.y + R * 0.68, d: 0 }, { x: c.x + 2, y: c.y + R * 0.68, d: 0 }], 0.9, mix(pal.skin, [0.4, 0.15, 0.1], 0.6), pal.skin, false);
  } else if (side(dir)) {
    P.ellipse(c.x + fx * R * 0.62, c.y + R * 0.3, 1.4, 2.1, pal.eye, null);
    P.chain([{ x: c.x + fx * R * 0.46, y: c.y + R * 0.08, d: 0 }, { x: c.x + fx * R * 0.76, y: c.y + R * 0.1, d: 0 }], 1, hair, hair, false);
  }
  // cap: crown, band, visor, badge
  const crownY = c.y - R * 0.6, cw = R * 1.02, ch = R * 0.46;
  const back = side(dir) ? -fx * 1.5 : 0;
  P.blob([[c.x - cw + back, crownY - ch * 0.55], [c.x + cw + back, crownY - ch * 0.55], [c.x + cw * 0.9 + back, crownY + ch * 0.55], [c.x - cw * 0.9 + back, crownY + ch * 0.55]], 4.2, pal.hat, pal.outline,
    { from: mix(pal.hat, [1, 1, 1], 0.14), to: mix(pal.hat, [0, 0, 0], 0.15), y0: crownY - ch, y1: crownY + ch });
  const bandY = crownY + ch * 0.55 + 2.2, bw = R * 0.98;
  P.blob([[c.x - bw + back * 0.5, bandY - 1.4], [c.x + bw + back * 0.5, bandY - 1.4], [c.x + bw + back * 0.5, bandY + 1.4], [c.x - bw + back * 0.5, bandY + 1.4]], 0.8, pal.hatBand, pal.outline);
  if (dir === 'down') {
    P.blob([[c.x - R * 0.92, bandY + 1.2], [c.x + R * 0.92, bandY + 1.2], [c.x + R * 0.7, bandY + 4.6], [c.x - R * 0.7, bandY + 4.6]], 1.2, pal.visor!, pal.outline);
    P.ellipse(c.x, crownY - 0.5, 2.3, 2.9, pal.gold!, pal.outline);
  } else if (side(dir)) {
    const vx = c.x + fx * (bw - 1);
    P.blob([[vx - fx * 2, bandY + 0.6], [vx + fx * 7.5, bandY + 2.4], [vx + fx * 7, bandY + 4], [vx - fx * 2, bandY + 3]], 0.9, pal.visor!, pal.outline);
    P.ellipse(c.x + fx * R * 0.78, crownY - 0.2, 1.7, 2.6, pal.gold!, pal.outline);
  }
}

/** Draws one character frame (flat parts, no lighting pass). */
export function drawCharacter(P: Painter, who: LocoWho, pose: Pose, dir: LocoDir) {
  const depth = LOCO_CHARACTERS[who].depth;
  const ctx: Ctx = { P, pose, dir, who, pal: PALETTES[who], pr: v => project(v, dir, depth) };
  const legD = (i: 0 | 1) => project(pose.legs[i].ankle, dir, depth).d;
  const armD = (i: 0 | 1) => project(pose.arms[i].hand, dir, depth).d;
  if (side(dir)) {
    const near: 0 | 1 = dir === 'right' ? 1 : 0, far: 0 | 1 = near === 1 ? 0 : 1;
    drawArm(ctx, far, true); drawLeg(ctx, far, true);
    drawTorso(ctx); drawLeg(ctx, near, false); drawPack(ctx); drawHead(ctx); drawArm(ctx, near, false);
    return;
  }
  const legs: (0 | 1)[] = legD(0) <= legD(1) ? [0, 1] : [1, 0];
  const armsBehind = ([0, 1] as (0 | 1)[]).filter(i => armD(i) < -2.5);
  const armsFront = ([0, 1] as (0 | 1)[]).filter(i => armD(i) >= -2.5);
  if (dir === 'down') {
    drawPack(ctx);
    for (const i of armsBehind) drawArm(ctx, i, true);
    for (const i of legs) drawLeg(ctx, i, false);
    drawTorso(ctx); drawHead(ctx);
    for (const i of armsFront) drawArm(ctx, i, false);
  } else {
    for (const i of armsBehind) drawArm(ctx, i, true);
    for (const i of legs) drawLeg(ctx, i, false);
    drawTorso(ctx); drawHead(ctx); drawPack(ctx);
    for (const i of armsFront) drawArm(ctx, i, false);
  }
}
