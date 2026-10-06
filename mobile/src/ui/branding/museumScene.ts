import { COLUMN, GUARD, THIEF, type OpeningLayout } from './openingLayout';
import type { IntroFrame } from './introTimeline';

export type SceneImageKey = 'bg' | 'thiefPeek' | 'thiefSneak' | 'thiefFreeze' | 'guardAway' | 'guardTurn' | 'column';
export type RGB = readonly [number, number, number];
/**
 * Minimal drawing surface shared by the app (react-native-skia, UI thread) and the
 * Node QA renderer (CanvasKit). The scene logic below is written once against it.
 */
export interface SceneGfx {
  image(key: SceneImageKey, x: number, y: number, w: number, h: number, alpha: number): void;
  /** Draw the source sub-rect (bitmap pixels) into the destination rect. */
  imageRect(key: SceneImageKey, sx: number, sy: number, sw: number, sh: number, x: number, y: number, w: number, h: number, alpha: number): void;
  rect(x: number, y: number, w: number, h: number, color: RGB, alpha: number): void;
  /** Vertical gradient rect; stops are [position 0..1, alpha]. */
  vGradient(x: number, y: number, w: number, h: number, color: RGB, stops: readonly (readonly [number, number])[]): void;
  /** Filled polygon with a linear gradient from→to (alpha a0→a1), optional blur sigma. */
  poly(points: readonly number[], fx: number, fy: number, tx: number, ty: number, color: RGB, a0: number, a1: number, blur: number): void;
  /** Soft elliptical glow (alpha at centre, 0 at the edge). */
  glow(cx: number, cy: number, rx: number, ry: number, color: RGB, alpha: number): void;
  save(): void; restore(): void;
  translate(x: number, y: number): void;
  rotate(deg: number, px: number, py: number): void;
  scale(sx: number, sy: number, px: number, py: number): void;
  beginLayer(): void;
  /** Keep the layer inside an ellipse (soft edge), multiplied by alpha. */
  endEllipseMask(cx: number, cy: number, rx: number, ry: number, alpha: number): void;
  /** Keep the layer above y0, fading to transparent at y1. */
  endFadeBelow(y0: number, y1: number): void;
  /** Darken/tint only the layer's own pixels (src-atop), then close the layer. */
  endTint(color: RGB, alpha: number): void;
}

/** Guard is darkened by this much so his detailed, lit face never outshines the diamond. */
export const GUARD_TONE = 0.3;

export const SCENE_COLORS = {
  bg: [2 / 255, 14 / 255, 27 / 255] as RGB,
  veil: [2 / 255, 9 / 255, 17 / 255] as RGB,
  ivory: [1, 244 / 255, 214 / 255] as RGB,
};

/** Feet anchor x of thief_peek (slides out from behind the column) and of thief_sneak/freeze. */
export function peekAnchorX(L: OpeningLayout, f: IntroFrame) {
  'worklet';
  return L.thief.peekX - (1 - f.peekOut) * L.W * 0.15;
}
export function thiefAnchorX(L: OpeningLayout, f: IntroFrame) {
  'worklet';
  const walked = L.thief.startX + (L.thief.finalX - L.thief.startX) * f.travel;
  return walked + (L.thief.diveX - walked) * f.dive;
}
/** Light path: diamond → where the thief was standing → the column edge beside his face. */
export function beamTarget(L: OpeningLayout, f: IntroFrame) {
  'worklet';
  const mid = { x: L.face.x, y: L.face.y };
  const u = f.beamT;
  const a = u < 0.5 ? u / 0.5 : 1, b = u < 0.5 ? 0 : (u - 0.5) / 0.5;
  const x1 = L.diamond.x + (mid.x - L.diamond.x) * a, y1 = L.diamond.y + (mid.y - L.diamond.y) * a;
  return { ox: L.flashlight.x, oy: L.flashlight.y, tx: x1 + (L.hideSpot.x - x1) * b, ty: y1 + (L.hideSpot.y - y1) * b };
}

/** One museum scene for Intro and Lobby; f = introFrame(ms). */
export function drawMuseumScene(g: SceneGfx, L: OpeningLayout, f: IntroFrame) {
  'worklet';
  const { W, H, bg } = L;
  const C = SCENE_COLORS;
  g.rect(0, 0, W, H, C.bg, 1);
  g.image('bg', bg.x, bg.y, bg.w, bg.h, 1);
  g.rect(0, 0, W, H, C.veil, f.veil);

  // Diamond spotlight: the lit centre of the same bitmap is revealed through the veil.
  const spanY = L.pedestalBottomY - L.lampY;
  if (f.reveal > 0.001) {
    g.beginLayer();
    g.image('bg', bg.x, bg.y, bg.w, bg.h, 1);
    g.endEllipseMask(W / 2, L.lampY + spanY * 0.58, W * 0.36, spanY * 0.72, f.reveal);
  }

  // Guard: away → turn cut on one feet anchor; toned down so the diamond stays the hero.
  const gd = L.guard;
  if (f.guardAway > 0.001 || f.guardTurn > 0.001) {
    g.beginLayer();
    if (f.guardAway > 0.001) g.image('guardAway', gd.x, gd.y, gd.w, gd.h, f.guardAway);
    if (f.guardTurn > 0.001) g.image('guardTurn', gd.x, gd.y, gd.w, gd.h, f.guardTurn);
    g.endTint(C.veil, GUARD_TONE);
  }

  // Flashlight beam from the real lens in guard_turn: diamond → thief.
  const b = beamTarget(L, f);
  if (f.beamAlpha > 0.001) {
    const dx = b.tx - b.ox, dy = b.ty - b.oy, len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const reach = len * 1.12, spread = Math.max(18, len * 0.2), core = spread * 0.42;
    const ex = b.ox + ux * reach, ey = b.oy + uy * reach;
    g.poly([b.ox + nx * 3, b.oy + ny * 3, ex + nx * spread, ey + ny * spread, ex - nx * spread, ey - ny * spread, b.ox - nx * 3, b.oy - ny * 3],
      b.ox, b.oy, ex, ey, C.ivory, 0.5 * f.beamAlpha, 0.18 * f.beamAlpha, 5);
    g.poly([b.ox + nx * 1.5, b.oy + ny * 1.5, ex + nx * core, ey + ny * core, ex - nx * core, ey - ny * core, b.ox - nx * 1.5, b.oy - ny * 1.5],
      b.ox, b.oy, ex, ey, C.ivory, 0.32 * f.beamAlpha, 0.1 * f.beamAlpha, 2.5);
    g.glow(b.ox, b.oy, 7, 7, C.ivory, 0.85 * f.beamAlpha);
    g.glow(b.tx, b.ty, W * 0.14, W * 0.13, C.ivory, (0.14 + 0.08 * f.lit) * f.beamAlpha);
  }

  // Thief: peek → sneak → freeze (startle) → dive behind the column → peek again; one scale, one feet anchor.
  const k = L.thief.k, tw = THIEF.w * k, th = THIEF.h * k;
  const ax = thiefAnchorX(L, f), ty = L.thief.ground - THIEF.groundY * k + f.thiefBob * H;
  const tx = ax - THIEF.anchorX * k;
  const px = ax, py = L.thief.ground;
  if (f.thiefPeek > 0.001) g.image('thiefPeek', peekAnchorX(L, f) - THIEF.anchorX * k, L.thief.ground - THIEF.groundY * k, tw, th, f.thiefPeek);
  if (f.thiefSneak > 0.001 || f.thiefFreeze > 0.001) {
    g.save(); g.rotate(f.thiefLean, px, py);
    if (f.thiefSneak > 0.001) g.image('thiefSneak', tx, ty, tw, th, f.thiefSneak);
    if (f.thiefFreeze > 0.001) g.image('thiefFreeze', tx, ty, tw, th, f.thiefFreeze);
    g.restore();
  }

  // Foreground column (in front of the thief): base on the floor, shaft stretched to the top edge.
  const cs = L.column.scale, cx = L.column.x, cw = COLUMN.w * cs;
  const baseH = (COLUMN.h - COLUMN.baseTop) * cs, baseY = L.column.baseBottom - baseH;
  g.imageRect('column', 0, COLUMN.baseTop, COLUMN.w, COLUMN.h - COLUMN.baseTop, cx, baseY, cw, baseH, 1);
  g.imageRect('column', 0, COLUMN.capitalBottom, COLUMN.w, COLUMN.baseTop - COLUMN.capitalBottom, cx, -2, cw, baseY + 2.5, 1);

  // Legibility bands for logo (top) and menu (bottom).
  g.vGradient(0, 0, W, H * 0.32, C.bg, [[0, 0.65], [0.6, 0.30], [1, 0]]);
  g.vGradient(0, L.pedestalBottomY, W, H - L.pedestalBottomY, C.bg, [[0, 0], [0.35, 0.50], [1, 0.76]]);
}

/** Guard lens position is part of the asset contract (tests assert it sits on the flashlight). */
export const GUARD_LENS = { x: GUARD.lensX, y: GUARD.lensY };
