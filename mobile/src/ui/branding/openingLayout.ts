/**
 * Shared Splash → Intro → Lobby composition (screen points, ratio based).
 * Intro and Lobby draw the SAME scene from this one layout; only the menu is added in Lobby.
 * Asset anchors below are measured on assets/branding/opening/* (see tools/branding/openingAssets.md).
 */
export type Insets = { top: number; bottom: number; left: number; right: number };

/** bg_museum.png 853×1844, fractions of the bitmap. */
export const BG = { w: 853, h: 1844, diamondX: 426 / 853, diamondY: 1003 / 1844, lampY: 355 / 1844, caseTopY: 850 / 1844, pedestalBottomY: 1262 / 1844 };
/** thief_peek/sneak/freeze.png share one 700×700 canvas: feet centre (350, 690). */
export const THIEF = { w: 700, h: 700, anchorX: 350, groundY: 690, figureTop: 53, peekCutX: 250, faceX: 330, faceY: 174, peekFaceX: 326, peekFaceY: 303 };
/** guard_away/turn.png share one 460×460 canvas: feet centre (230, 440). Lens = real flashlight in guard_turn. */
export const GUARD = { w: 460, h: 460, anchorX: 230, groundY: 440, figureTop: 11, lensX: 108.5, lensY: 250 };
/** fg_column_left.png 186×399: capital | stretchable shaft | base. */
export const COLUMN = { w: 186, h: 399, capitalBottom: 35, baseTop: 300, shaftLeft: 24, shaftRight: 159 };

/** Scene sizes in background pixels (so characters stay in the bitmap's perspective on every phone). */
const SCENE = { thiefFigure: 360, thiefGround: 1236, guardFigure: 400, guardGround: 1196, columnBaseBottom: 1580 };
export const OPENING_RATIOS = {
  diamondY: 0.515, thiefStartX: 0.16, thiefX: 0.25, guardX: 0.845, columnRimX: 0.175, menuTop: 0.69, menuWidth: 0.76,
} as const;

export function openingLayout(W: number, H: number, insets: Insets) {
  const r = OPENING_RATIOS;
  const compact = H < 720;
  // Background: uniform scale, covers the screen, diamond on the exact centre axis.
  const bgH = Math.max(H * 1.04, W * 1.04 * BG.h / BG.w);
  const s = bgH / BG.h; // points per background pixel
  const bgW = BG.w * s;
  const targetY = H * (compact ? 0.49 : r.diamondY);
  const bgY = Math.min(0, Math.max(H - bgH, targetY - BG.diamondY * bgH));
  const bg = { x: W / 2 - BG.diamondX * bgW, y: bgY, w: bgW, h: bgH };
  const Y = (py: number) => bg.y + py * s;
  const diamond = { x: W / 2, y: Y(BG.diamondY * BG.h) };
  const lampY = Y(BG.lampY * BG.h), caseTopY = Y(BG.caseTopY * BG.h), pedestalBottomY = Y(BG.pedestalBottomY * BG.h);

  // Thief: all poses share scale and feet anchor → no size/position jump between poses.
  const tk = SCENE.thiefFigure / (THIEF.groundY - THIEF.figureTop) * s; // points per thief-canvas pixel
  const thiefGround = Y(SCENE.thiefGround);
  const thiefSize = { w: THIEF.w * tk, h: THIEF.h * tk };
  const thiefFinalX = W * r.thiefX;
  const face = { x: thiefFinalX + (THIEF.faceX - THIEF.anchorX) * tk, y: thiefGround - (THIEF.groundY - THIEF.faceY) * tk };

  // Foreground column (replaces the bitmap's own left column); the thief peeks from its lit rim.
  const cs = Math.max(W * r.columnRimX + 8, 0) / (COLUMN.shaftRight - COLUMN.shaftLeft) * 0.95;
  const columnRim = W * r.columnRimX;
  const column = {
    scale: cs, rim: columnRim,
    x: columnRim - COLUMN.shaftRight * cs, // bitmap left edge
    baseBottom: Y(SCENE.columnBaseBottom),
  };
  const peekAnchorX = columnRim + (THIEF.anchorX - THIEF.peekCutX) * tk;
  // Final (Home) state: hidden behind the column, eyes peeking; the guard's light rests on the column edge beside them.
  const peekFace = { x: peekAnchorX + (THIEF.peekFaceX - THIEF.anchorX) * tk, y: thiefGround - (THIEF.groundY - THIEF.peekFaceY) * tk };
  const hideSpot = { x: columnRim - 2, y: peekFace.y - 40 * tk / 0.28 };  // just above the beanie: a near miss
  // Where thief_freeze dives to: fully behind the column.
  const diveX = columnRim - (529 - THIEF.anchorX) * tk - 6;

  // Guard: right rear, same feet anchor for both poses; beam starts at the real flashlight lens.
  const gk = SCENE.guardFigure / (GUARD.groundY - GUARD.figureTop) * s;
  const guardFeet = { x: W * r.guardX, y: Y(SCENE.guardGround) };
  const guard = { x: guardFeet.x - GUARD.anchorX * gk, y: guardFeet.y - GUARD.groundY * gk, w: GUARD.w * gk, h: GUARD.h * gk };
  const flashlight = { x: guard.x + GUARD.lensX * gk, y: guard.y + GUARD.lensY * gk };

  // Logo band (top), menu band (bottom). Safe areas respected; everything centred.
  const logoTop = insets.top + Math.max(10, H * 0.03);
  const logoSize = Math.min(60, Math.max(40, W * 0.135));
  const taglineBottom = Math.max(insets.bottom, 12) + 14;
  const primaryH = compact ? 54 : 62, secondaryH = compact ? 44 : 50, gap = compact ? 9 : 12;
  const menuH = primaryH + secondaryH * 2 + gap * 2;
  const menuW = Math.min(360, Math.max(260, W * r.menuWidth));
  const taglineY = H - taglineBottom - 12;
  // Prefer the concept band (69 %) and keep the pedestal visible; tagline/home-indicator clearance always wins.
  const menuLimit = taglineY - 14 - menuH;
  const menuTop = Math.min(menuLimit, Math.max(pedestalBottomY + 10, Math.min(H * r.menuTop, menuLimit)));
  const menu = { x: (W - menuW) / 2, y: menuTop, w: menuW, h: menuH, primaryH, secondaryH, gap };

  return { W, H, insets, bg, scale: s, diamond, lampY, caseTopY, pedestalBottomY,
    thief: { k: tk, ground: thiefGround, startX: W * r.thiefStartX, finalX: thiefFinalX, peekX: peekAnchorX, diveX, size: thiefSize },
    peekFace, hideSpot,
    face, column, guard, guardFeet, flashlight, logoTop, logoSize, menu, taglineBottom };
}
export type OpeningLayout = ReturnType<typeof openingLayout>;
