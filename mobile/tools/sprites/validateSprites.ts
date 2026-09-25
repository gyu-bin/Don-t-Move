/**
 * Validates delivered character sprite sheets + indicator icons against the
 * contract in spriteSpec.ts, then writes human-review previews.
 *
 *   npm run sprites:validate                      # assets/characters + assets/ui
 *   npm run sprites:validate -- --chars <dir> --ui <dir> --out <dir> [--only a.png,b.png]
 *
 * Automated checks (ERROR fails the run, WARN needs a human look):
 *   file present · exact size (frames×256 by 4×256) · real alpha channel
 *   transparent background · no semi-transparent haze · no empty cell
 *   nothing within EDGE_MARGIN of a cell edge (no bleed / padding errors)
 *   feet on the ground line (per-frame tolerance by animation type)
 *   no horizontal drift (idle/action frames) · body centred on the anchor
 *   silhouette height vs spec (idle) and within a row (all anims)
 *   colour identity: every frame's palette close to that character's idle
 *   identity vs art/characters/reference/<who>_identity.png (advisory WARNs:
 *   palette, silhouette height, occupied width/area, colour distribution;
 *   gross palette change is an ERROR) — not design approval
 *   Guard taller/broader and bluer than Player
 *   foot planting (locomotion) · idle not frozen
 *   icons: size, alpha, centred, '?' yellow / '!' red, dark outline present
 *
 * Previews (NOT game assets): <out>/player_preview.png, guard_preview.png,
 * indicators_preview.png, preview.html (animated playback of every row).
 */
import * as fs from 'fs';
import * as path from 'path';
import type { CanvasKit, Image } from 'canvaskit-wasm';

import { initSkiaNode, loadLabelFont } from './skiaNode';
import {
  ANCHOR,
  CELL,
  CHARACTERS,
  EDGE_MARGIN,
  FEET_RANGE,
  ICON_CELL,
  ICONS,
  ROWS,
  SHEETS,
  FRONT_BACK_FORESHORTEN,
  plantedFeet,
  plantingFor,
} from './spriteSpec';
import type { SheetSpec } from './spriteSpec';

const MOBILE = path.resolve(__dirname, '../..');

const T = {
  opaqueAlpha: 128,
  hazeAlphaMax: 12, // 1..12 alpha counts as haze
  hazeFractionMax: 0.02,
  minTransparentFraction: 0.35,
  centreTolerance: 30,
  idleDriftMax: 4,
  rowHeightSpread: 0.22, // max (maxH - minH)/idleH within a row
  colourDistanceWarn: 38,
  /** Identity vs <who>_identity.png (advisory except designError). */
  designWarn: 22,
  designError: 40,
  identityHeight: 0.08,
  identityWidth: 0.15,
  identityWidthLoco: 0.35,
  identityArea: 0.2,
  identityAreaLoco: 0.35,
  /**
   * Colour-distribution overlap (16 levels/channel). Calibrated: same character
   * 91–100 %, a different rendition of the "same" Agent Zero 73–82 %, the
   * procedural rig 44–54 %.
   */
  identityHistogram: 0.85,
  /** Idle: min changed silhouette pixels between some pair of frames (not frozen). */
  idleMinChange: 60,
};

type Level = 'ERROR' | 'WARN' | 'OK';
interface Finding {
  level: Level;
  where: string;
  msg: string;
}

interface CellStats {
  opaque: number;
  transparentFraction: number;
  hazeFraction: number;
  edgeHit: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
  cx: number;
  mean: [number, number, number];
}

interface Pixels {
  w: number;
  h: number;
  data: Uint8Array;
  hasAlpha: boolean;
  image: Image;
}

export function decode(ck: CanvasKit, file: string): Pixels | null {
  const img = ck.MakeImageFromEncoded(fs.readFileSync(file));
  if (!img) return null;
  const info = img.getImageInfo();
  const data = img.readPixels(0, 0, {
    width: info.width,
    height: info.height,
    colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul,
    colorSpace: ck.ColorSpace.SRGB,
  }) as Uint8Array;
  return {
    w: info.width,
    h: info.height,
    data,
    hasAlpha: info.alphaType !== ck.AlphaType.Opaque,
    image: img,
  };
}

function cellStats(px: Pixels, x0: number, y0: number, size: number): CellStats {
  let opaque = 0;
  let transparent = 0;
  let haze = 0;
  let edgeHit = false;
  let top = size;
  let bottom = -1;
  let left = size;
  let right = -1;
  let sx = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = ((y0 + y) * px.w + (x0 + x)) * 4;
      const a = px.data[i + 3];
      if (a === 0) {
        transparent++;
        continue;
      }
      if (a <= T.hazeAlphaMax) haze++;
      if (
        a > T.hazeAlphaMax &&
        (x < EDGE_MARGIN || y < EDGE_MARGIN || x >= size - EDGE_MARGIN || y >= size - EDGE_MARGIN)
      ) {
        edgeHit = true;
      }
      if (a >= T.opaqueAlpha) {
        opaque++;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
        sx += x;
        r += px.data[i];
        g += px.data[i + 1];
        b += px.data[i + 2];
      }
    }
  }
  const n = Math.max(1, opaque);
  return {
    opaque,
    transparentFraction: transparent / (size * size),
    hazeFraction: haze / (size * size),
    edgeHit,
    top,
    bottom,
    left,
    right,
    cx: sx / n,
    mean: [r / n, g / n, b / n],
  };
}

/** 16 levels per channel → 4096 bins, normalised over opaque pixels. */
const HIST_BINS = 4096;
function colourHistogram(px: Pixels, x0: number, y0: number): Float64Array {
  const h = new Float64Array(HIST_BINS);
  let n = 0;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const i = ((y0 + y) * px.w + (x0 + x)) * 4;
      if (px.data[i + 3] < 128) continue;
      h[(px.data[i] >> 4) * 256 + (px.data[i + 1] >> 4) * 16 + (px.data[i + 2] >> 4)]++;
      n++;
    }
  }
  if (n) for (let k = 0; k < HIST_BINS; k++) h[k] /= n;
  return h;
}

const dist3 = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function hueOf([r, g, b]: number[]): number {
  const R = r / 255;
  const G = g / 255;
  const B = b / 255;
  const max = Math.max(R, G, B);
  const min = Math.min(R, G, B);
  if (max === min) return -1;
  let h: number;
  if (max === R) h = ((G - B) / (max - min)) % 6;
  else if (max === G) h = (B - R) / (max - min) + 2;
  else h = (R - G) / (max - min) + 4;
  return (h * 60 + 360) % 360;
}

export interface ValidationResult {
  findings: Finding[];
  errors: number;
  warnings: number;
  sheets: { file: string; size: string; grid: string; frames: number; alpha: boolean; present: boolean }[];
}

export async function validate(
  charsDir: string,
  uiDir: string,
  outDir: string | null,
  only: string[] | null = null,
): Promise<ValidationResult> {
  const ck = await initSkiaNode();
  const findings: Finding[] = [];
  const add = (level: Level, where: string, msg: string) => findings.push({ level, where, msg });
  const sheetsOut: ValidationResult['sheets'] = [];
  const loaded: Record<string, { spec: SheetSpec; px: Pixels; stats: CellStats[][] }> = {};

  for (const spec of SHEETS) {
    if (only && !only.includes(spec.file)) continue;
    const file = path.join(charsDir, spec.file);
    const expectW = spec.frames * CELL;
    const expectH = ROWS.length * CELL;
    const entry = {
      file: spec.file,
      size: '-',
      grid: `${spec.frames} cols × ${ROWS.length} rows @${CELL}px`,
      frames: spec.frames * ROWS.length,
      alpha: false,
      present: false,
    };
    sheetsOut.push(entry);
    if (!fs.existsSync(file)) {
      add('ERROR', spec.file, 'missing');
      continue;
    }
    const px = decode(ck, file);
    if (!px) {
      add('ERROR', spec.file, 'not a decodable PNG');
      continue;
    }
    entry.present = true;
    entry.size = `${px.w}×${px.h}`;
    entry.alpha = px.hasAlpha;
    if (px.w !== expectW || px.h !== expectH) {
      add('ERROR', spec.file, `size ${px.w}×${px.h}, expected ${expectW}×${expectH}`);
      continue;
    }
    if (!px.hasAlpha) add('ERROR', spec.file, 'PNG has no alpha channel (opaque)');

    const stats: CellStats[][] = ROWS.map((_, r) =>
      Array.from({ length: spec.frames }, (_, i) => cellStats(px, i * CELL, r * CELL, CELL)),
    );
    loaded[spec.file] = { spec, px, stats };
    const ch = CHARACTERS[spec.character];
    const locomotion = spec.kind === 'loop-locomotion';

    ROWS.forEach((row, r) => {
      const heights: number[] = [];
      const cxs: number[] = [];
      const range = locomotion
        ? row === 'down' || row === 'up'
          ? FEET_RANGE.locomotionFrontBack
          : FEET_RANGE.locomotionSide
        : spec.kind === 'action'
          ? FEET_RANGE.action
          : FEET_RANGE.idle;
      const above = range.above + (spec.anim === 'run' ? FEET_RANGE.runExtraLift : 0);
      let closest = Infinity;
      stats[r].forEach((s, i) => {
        const where = `${spec.file} ${row} #${i + 1}`;
        if (s.opaque === 0) {
          add('ERROR', where, 'empty cell');
          return;
        }
        if (s.transparentFraction < T.minTransparentFraction) {
          add(
            'ERROR',
            where,
            `background not transparent (${(s.transparentFraction * 100).toFixed(0)}% clear)`,
          );
        }
        if (s.hazeFraction > T.hazeFractionMax) {
          add(
            'WARN',
            where,
            `semi-transparent haze ${(s.hazeFraction * 100).toFixed(1)}% (glow/shadow baked?)`,
          );
        }
        if (s.edgeHit) add('ERROR', where, `pixels within ${EDGE_MARGIN}px of cell edge (bleed/clipping)`);
        // + = lowest pixel below the ground line, − = above it.
        const feet = s.bottom + 1 - ANCHOR.y;
        closest = Math.min(closest, Math.abs(feet));
        if (feet < -above)
          add('ERROR', where, `feet ${-feet}px above ground line (max ${above}) — floating frame?`);
        if (feet > range.below) add('ERROR', where, `feet ${feet}px below ground line (max ${range.below})`);
        if (Math.abs(s.cx - ANCHOR.x) > T.centreTolerance) {
          add(
            'ERROR',
            where,
            `body centre x=${s.cx.toFixed(0)} is ${(s.cx - ANCHOR.x).toFixed(0)}px off anchor`,
          );
        }
        heights.push(ANCHOR.y - s.top);
        cxs.push(s.cx);
      });
      if (heights.length === 0) return;
      const where = `${spec.file} ${row}`;
      if (locomotion && closest > FEET_RANGE.mustTouch) {
        add(
          'ERROR',
          where,
          `no frame has a foot on the ground line (closest ${closest}px) — row floating or sunk`,
        );
      }
      if (spec.anim === 'idle') {
        const h = heights.reduce((a, b) => a + b, 0) / heights.length;
        if (Math.abs(h - ch.height) > ch.heightTolerance) {
          add('ERROR', where, `idle height ${h.toFixed(0)}px, spec ${ch.height}±${ch.heightTolerance}`);
        }
      }
      if (spec.kind !== 'loop-locomotion') {
        const drift = Math.max(...cxs) - Math.min(...cxs);
        if (drift > T.idleDriftMax + (spec.anim === 'search' || spec.anim === 'whistle' ? 8 : 0)) {
          add('WARN', where, `character drifts ${drift.toFixed(1)}px horizontally across frames`);
        }
      }
      const spread = (Math.max(...heights) - Math.min(...heights)) / ch.height;
      if (spread > T.rowHeightSpread) {
        add(
          'ERROR',
          where,
          `silhouette height varies ${(spread * 100).toFixed(0)}% within the row (scale jump?)`,
        );
      }
    });
  }

  // Foot planting: grounded feet must travel BACKWARD at body speed.
  for (const { spec, px } of Object.values(loaded)) {
    const pl = plantingFor(spec);
    if (!pl) continue;
    ROWS.forEach((row, r) => {
      const res = checkPlanting(px, spec, row, r, pl.perFramePx);
      if (res.expected === 0) return;
      const where = `${spec.file} ${row}`;
      const avg = res.backward.length ? res.backward.reduce((a, b) => a + b, 0) / res.backward.length : 0;
      if (res.matched < Math.ceil(res.expected * 0.75)) {
        add(
          'ERROR',
          where,
          `foot planting: only ${res.matched}/${res.expected} stance transitions move the grounded foot back ≈${pl.perFramePx.toFixed(0)}px/frame ` +
            `(measured ${avg.toFixed(1)}px) — walking in place / foot sliding`,
        );
      }
    });
  }

  // Idle must breathe: a row of pixel-identical frames is a frozen image.
  for (const { spec, px } of Object.values(loaded)) {
    if (spec.anim !== 'idle') continue;
    ROWS.forEach((row, r) => {
      let maxChange = 0;
      for (let i = 1; i < spec.frames; i++) {
        let changed = 0;
        for (let y = 0; y < CELL; y++) {
          for (let x = 0; x < CELL; x++) {
            const a = px.data[((r * CELL + y) * px.w + x) * 4 + 3];
            const b = px.data[((r * CELL + y) * px.w + i * CELL + x) * 4 + 3];
            if (a >= 128 !== b >= 128) changed++;
          }
        }
        maxChange = Math.max(maxChange, changed);
      }
      if (maxChange < T.idleMinChange) {
        add(
          'ERROR',
          `${spec.file} ${row}`,
          `idle is frozen (max ${maxChange}px silhouette change) — needs breathing/shoulder/backpack motion`,
        );
      }
    });
  }

  // Identity vs each character's own reference (art/characters/reference/<who>_identity.png,
  // built by `npm run sprites:identity` from the approved look). ADVISORY: warnings flag
  // likely drift; passing is not design approval. Gross palette change stays an ERROR.
  for (const who of ['player', 'guard'] as const) {
    const refFile = path.join(MOBILE, `art/characters/reference/${who}_identity.png`);
    if (!fs.existsSync(refFile)) continue;
    const ref = decode(ck, refFile);
    if (!ref || ref.w !== ROWS.length * CELL || ref.h !== CELL) continue;
    const refStats = ROWS.map((_, r) => cellStats(ref, r * CELL, 0, CELL));
    const refHist = ROWS.map((_, r) => colourHistogram(ref, r * CELL, 0));
    for (const { spec, px, stats } of Object.values(loaded)) {
      if (spec.character !== who) continue;
      const loose = spec.kind === 'loop-locomotion';
      stats.forEach((rowStats, r) => {
        const cells = rowStats.map((c, i) => ({ c, i })).filter(({ c }) => c.opaque > 0);
        if (!cells.length) return;
        const where = `${spec.file} ${ROWS[r]}`;
        const rs = refStats[r];
        const med = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1];
        // Palette mean.
        const mean = [0, 1, 2].map((k) => cells.reduce((a, { c }) => a + c.mean[k], 0) / cells.length);
        const d = dist3(mean, rs.mean);
        if (d > T.designError)
          add('ERROR', where, `identity: palette Δ${d.toFixed(0)} from the ${who} reference`);
        else if (d > T.designWarn)
          add('WARN', where, `identity: palette Δ${d.toFixed(0)} from the ${who} reference`);
        // Silhouette height / occupied width / occupied area.
        const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, b);
        const h = med(cells.map(({ c }) => c.bottom - c.top + 1));
        const w = med(cells.map(({ c }) => c.right - c.left + 1));
        const area = med(cells.map(({ c }) => c.opaque));
        const rh = rs.bottom - rs.top + 1;
        const rw = rs.right - rs.left + 1;
        if (rel(h, rh) > T.identityHeight) {
          add(
            'WARN',
            where,
            `identity: silhouette height ${h}px vs reference ${rh}px (${(rel(h, rh) * 100).toFixed(0)}%)`,
          );
        }
        const wTol = loose ? T.identityWidthLoco : T.identityWidth;
        if (rel(w, rw) > wTol) {
          add(
            'WARN',
            where,
            `identity: occupied width ${w}px vs reference ${rw}px (${(rel(w, rw) * 100).toFixed(0)}%)`,
          );
        }
        const aTol = loose ? T.identityAreaLoco : T.identityArea;
        if (rel(area, rs.opaque) > aTol) {
          add(
            'WARN',
            where,
            `identity: occupied area ${area}px vs reference ${rs.opaque}px (${(rel(area, rs.opaque) * 100).toFixed(0)}%)`,
          );
        }
        // Main colour distribution (histogram intersection, 0..1).
        const hist = new Float64Array(HIST_BINS);
        for (const { i } of cells) {
          const hc = colourHistogram(px, i * CELL, r * CELL);
          for (let k = 0; k < HIST_BINS; k++) hist[k] += hc[k] / cells.length;
        }
        let inter = 0;
        for (let k = 0; k < HIST_BINS; k++) inter += Math.min(hist[k], refHist[r][k]);
        if (inter < T.identityHistogram) {
          add(
            'WARN',
            where,
            `identity: colour distribution overlap ${(inter * 100).toFixed(0)}% with the ${who} reference`,
          );
        }
      });
    }
  }

  // Cross-sheet identity: every frame's palette near the character's idle palette.
  for (const who of ['player', 'guard'] as const) {
    const idle = loaded[`${who}_idle.png`];
    if (!idle) continue;
    const ref = [0, 1, 2].map(
      (k) => idle.stats.flat().reduce((a, s) => a + s.mean[k], 0) / idle.stats.flat().length,
    );
    for (const { spec, stats } of Object.values(loaded)) {
      if (spec.character !== who) continue;
      stats.forEach((rowStats, r) =>
        rowStats.forEach((s, i) => {
          if (s.opaque === 0) return;
          const d = dist3(s.mean, ref);
          if (d > T.colourDistanceWarn) {
            add(
              'WARN',
              `${spec.file} ${ROWS[r]} #${i + 1}`,
              `palette differs from ${who} idle (Δ${d.toFixed(0)}) — outfit/colour change?`,
            );
          }
        }),
      );
    }
  }
  const p = loaded['player_idle.png'];
  const g = loaded['guard_idle.png'];
  if (p && g) {
    const hp = p.stats[0].reduce((a, s) => a + (ANCHOR.y - s.top), 0) / p.stats[0].length;
    const hg = g.stats[0].reduce((a, s) => a + (ANCHOR.y - s.top), 0) / g.stats[0].length;
    const wp = p.stats[0].reduce((a, s) => a + (s.right - s.left), 0) / p.stats[0].length;
    const wg = g.stats[0].reduce((a, s) => a + (s.right - s.left), 0) / g.stats[0].length;
    if (!(hg > hp))
      add(
        'ERROR',
        'guard vs player',
        `guard (${hg.toFixed(0)}px) not taller than player (${hp.toFixed(0)}px)`,
      );
    if (!(wg > wp))
      add(
        'WARN',
        'guard vs player',
        `guard (${wg.toFixed(0)}px) not broader than player (${wp.toFixed(0)}px)`,
      );
    const mp = p.stats[0][0].mean;
    const mg = g.stats[0][0].mean;
    if (!(mg[2] - mg[0] > mp[2] - mp[0] + 8)) {
      add('WARN', 'guard vs player', 'guard is not clearly bluer than player — silhouettes may be confused');
    }
  }

  // Icons.
  for (const icon of ICONS) {
    if (only && !only.includes(icon.file)) continue;
    const file = path.join(uiDir, icon.file);
    const entry = {
      file: icon.file,
      size: '-',
      grid: `1 × 1 @${ICON_CELL}px`,
      frames: 1,
      alpha: false,
      present: false,
    };
    sheetsOut.push(entry);
    if (!fs.existsSync(file)) {
      add('ERROR', icon.file, 'missing');
      continue;
    }
    const px = decode(ck, file);
    if (!px) {
      add('ERROR', icon.file, 'not a decodable PNG');
      continue;
    }
    entry.present = true;
    entry.size = `${px.w}×${px.h}`;
    entry.alpha = px.hasAlpha;
    if (px.w !== ICON_CELL || px.h !== ICON_CELL) {
      add('ERROR', icon.file, `size ${px.w}×${px.h}, expected ${ICON_CELL}×${ICON_CELL}`);
      continue;
    }
    if (!px.hasAlpha) add('ERROR', icon.file, 'PNG has no alpha channel');
    const s = cellStats(px, 0, 0, ICON_CELL);
    if (s.opaque === 0) {
      add('ERROR', icon.file, 'empty');
      continue;
    }
    if (s.transparentFraction < 0.3) add('ERROR', icon.file, 'background not transparent');
    const cy = (s.top + s.bottom) / 2;
    if (Math.abs(s.cx - ICON_CELL / 2) > 10 || Math.abs(cy - ICON_CELL / 2) > 12) {
      add('WARN', icon.file, `glyph not centred (cx ${s.cx.toFixed(0)}, cy ${cy.toFixed(0)})`);
    }
    // Hue of saturated pixels + presence of a dark outline.
    let hr = 0;
    let hg2 = 0;
    let hb = 0;
    let hn = 0;
    let dark = 0;
    for (let i = 0; i < px.data.length; i += 4) {
      if (px.data[i + 3] < T.opaqueAlpha) continue;
      const rgb = [px.data[i], px.data[i + 1], px.data[i + 2]];
      const mx = Math.max(...rgb);
      const mn = Math.min(...rgb);
      if (mx < 60) dark++;
      if (mx > 120 && mx - mn > 60) {
        hr += rgb[0];
        hg2 += rgb[1];
        hb += rgb[2];
        hn++;
      }
    }
    const hue = hn ? hueOf([hr / hn, hg2 / hn, hb / hn]) : -1;
    const okHue = icon.hue === 'yellow' ? hue >= 35 && hue <= 65 : hue >= 340 || (hue >= 0 && hue <= 15);
    if (!okHue) add('ERROR', icon.file, `main colour hue ${hue.toFixed(0)}°, expected ${icon.hue}`);
    if (dark < s.opaque * 0.05) add('WARN', icon.file, 'no visible dark outline');
  }

  if (outDir) writePreviews(ck, loaded, charsDir, uiDir, outDir, only);

  const errors = findings.filter((f) => f.level === 'ERROR').length;
  const warnings = findings.filter((f) => f.level === 'WARN').length;
  return { findings, errors, warnings, sheets: sheetsOut };
}

// ---------------------------------------------------------------- foot planting

/**
 * Ground contacts per frame, as forward offsets from the anchor (px, + = the
 * direction of travel). Side rows: opaque column runs touching the ground
 * line. Down/Up rows: per screen half, the lowest opaque point, converted from
 * screen-y with the 3/4 foreshortening; keyed L/R anatomically.
 */
export function contacts(
  px: Pixels,
  row: string,
  r: number,
  i: number,
): { foot: 'L' | 'R' | '?'; fwd: number }[] {
  const x0 = i * CELL;
  const y0 = r * CELL;
  const alpha = (x: number, y: number) => px.data[((y0 + y) * px.w + (x0 + x)) * 4 + 3];
  const out: { foot: 'L' | 'R' | '?'; fwd: number }[] = [];
  if (row === 'left' || row === 'right') {
    const sign = row === 'right' ? 1 : -1;
    let start = -1;
    for (let x = 0; x <= CELL; x++) {
      let hit = false;
      if (x < CELL) for (let y = ANCHOR.y - 5; y <= ANCHOR.y + 2 && !hit; y++) hit = alpha(x, y) >= 128;
      if (hit && start < 0) start = x;
      if (!hit && start >= 0) {
        if (x - start >= 5) out.push({ foot: '?', fwd: sign * ((start + x - 1) / 2 - ANCHOR.x) });
        start = -1;
      }
    }
    return out;
  }
  const toCam = row === 'down' ? 1 : -1;
  for (const half of [-1, 1]) {
    let bottom = -1;
    // Skip ±4 px around the midline so one shoe's outline can't leak into the other half.
    for (let x = ANCHOR.x + (half < 0 ? -40 : 4); x < ANCHOR.x + (half < 0 ? -4 : 40); x++) {
      for (let y = ANCHOR.y + 30; y >= ANCHOR.y - 40; y--) {
        if (alpha(x, y) >= 128) {
          if (y > bottom) bottom = y;
          break;
        }
      }
    }
    if (bottom < 0) continue;
    // Facing the camera the character's left foot is on screen-right.
    const foot = half > 0 === (row === 'down') ? 'L' : 'R';
    out.push({ foot, fwd: (toCam * (bottom + 1 - ANCHOR.y)) / FRONT_BACK_FORESHORTEN });
  }
  return out;
}

function checkPlanting(
  px: Pixels,
  spec: SheetSpec,
  row: string,
  r: number,
  perFrame: number,
): { expected: number; matched: number; backward: number[] } {
  const side = row === 'left' || row === 'right';
  // Down/Up rows measure screen-y: 1 px there is 1/FORESHORTEN px of forward
  // travel, so allow ~4 screen px of quantisation on top of the relative band.
  const tol = side ? Math.max(4, perFrame * 0.35) : Math.max(4 / FRONT_BACK_FORESHORTEN, perFrame * 0.6);
  let expected = 0;
  let matched = 0;
  const backward: number[] = [];
  for (let i = 0; i < spec.frames; i++) {
    const j = (i + 1) % spec.frames;
    const a = plantedFeet(spec, i);
    const b = plantedFeet(spec, j === 0 ? spec.frames : j); // phase-continuous across the loop
    const stay = a.filter((f) => b.some((g) => g.foot === f.foot));
    if (stay.length === 0) continue;
    const ca = contacts(px, row, r, i);
    const cb = contacts(px, row, r, j);
    for (const f of stay) {
      expected++;
      let best = Infinity;
      let bestShift = 0;
      for (const p of ca) {
        if (!side && p.foot !== f.foot) continue;
        for (const q of cb) {
          if (!side && q.foot !== f.foot) continue;
          const shift = q.fwd - p.fwd; // should be −perFrame
          const err = Math.abs(shift + perFrame);
          if (err < best) {
            best = err;
            bestShift = -shift;
          }
        }
      }
      if (best < Infinity) backward.push(bestShift);
      if (best <= tol) matched++;
    }
  }
  return { expected, matched, backward };
}

// ---------------------------------------------------------------- previews

function writePreviews(
  ck: CanvasKit,
  loaded: Record<string, { spec: SheetSpec; px: Pixels }>,
  charsDir: string,
  uiDir: string,
  outDir: string,
  only: string[] | null,
) {
  fs.mkdirSync(outDir, { recursive: true });
  const inScope = (f: string) => !only || only.includes(f);
  const font = loadLabelFont(ck, 22);
  const small = loadLabelFont(ck, 14);
  const S = 0.5; // preview scale
  const cell = CELL * S;
  const title = 40;

  for (const who of ['player', 'guard'] as const) {
    const sheets = SHEETS.filter((s) => s.character === who && inScope(s.file));
    if (sheets.length === 0) continue;
    const width = 90 + Math.max(...sheets.map((s) => s.frames)) * cell + 20;
    const blockH = title + ROWS.length * cell + 20;
    const height = 60 + sheets.length * blockH;
    const surf = ck.MakeSurface(Math.ceil(width), Math.ceil(height))!;
    const c = surf.getCanvas();
    c.clear(ck.parseColorString('#0e1116'));
    const p = new ck.Paint();
    p.setAntiAlias(true);
    const text = (s: string, x: number, y: number, f: typeof font, col: string) => {
      if (!f) return;
      p.setStyle(ck.PaintStyle.Fill);
      p.setColor(ck.parseColorString(col));
      c.drawText(s, x, y, p, f);
    };
    text(`${who.toUpperCase()} — animation preview (review only, not a game asset)`, 16, 36, font, '#e8ecf2');
    sheets.forEach((spec, k) => {
      const y0 = 60 + k * blockH;
      text(`${spec.anim.toUpperCase()}  ${spec.frames} frames × 4 directions`, 16, y0 + 28, small, '#ffd84a');
      const L = loaded[spec.file];
      ROWS.forEach((row, r) => {
        const ry = y0 + title + r * cell;
        text(row, 16, ry + cell / 2 + 5, small, '#aab3c2');
        for (let i = 0; i < spec.frames; i++) {
          const x = 90 + i * cell;
          p.setStyle(ck.PaintStyle.Fill);
          p.setColor(ck.parseColorString((i + r) % 2 ? '#171b22' : '#1b2029'));
          c.drawRect(ck.XYWHRect(x, ry, cell, cell), p);
          p.setStyle(ck.PaintStyle.Stroke);
          p.setStrokeWidth(1);
          p.setColor(ck.parseColorString('#2f6d99'));
          c.drawLine(x + 4, ry + ANCHOR.y * S, x + cell - 4, ry + ANCHOR.y * S, p);
          if (L) {
            c.drawImageRect(
              L.px.image,
              ck.XYWHRect(i * CELL, r * CELL, CELL, CELL),
              ck.XYWHRect(x, ry, cell, cell),
              p,
            );
          } else {
            text('missing', x + 20, ry + cell / 2, small, '#ff5a5a');
          }
        }
      });
    });
    p.delete();
    surf.flush();
    fs.writeFileSync(path.join(outDir, `${who}_preview.png`), surf.makeImageSnapshot().encodeToBytes()!);
    surf.delete();
  }

  // Icons on light + dark backgrounds.
  {
    const surf = ck.MakeSurface(ICONS.length * 2 * 140 + 20, 170)!;
    const c = surf.getCanvas();
    c.clear(ck.parseColorString('#0e1116'));
    const p = new ck.Paint();
    ICONS.forEach((icon, i) => {
      const file = path.join(uiDir, icon.file);
      for (let bg = 0; bg < 2; bg++) {
        const x = 10 + (i * 2 + bg) * 140;
        p.setColor(ck.parseColorString(bg ? '#c9ced6' : '#1b2029'));
        c.drawRect(ck.XYWHRect(x, 10, 128, 128), p);
        if (fs.existsSync(file)) {
          const img = ck.MakeImageFromEncoded(fs.readFileSync(file));
          if (img) c.drawImage(img, x, 10, p);
        }
      }
    });
    p.delete();
    surf.flush();
    fs.writeFileSync(path.join(outDir, 'indicators_preview.png'), surf.makeImageSnapshot().encodeToBytes()!);
    surf.delete();
  }

  // Animated HTML preview (CSS steps over each sheet row).
  const fps: Record<string, number> = { idle: 4, sneak: 8, walk: 10, run: 14, whistle: 8, search: 5 };
  const rows = SHEETS.filter((s) => inScope(s.file))
    .map((s) => {
      const src = path.relative(outDir, path.join(charsDir, s.file));
      const cells = ROWS.map(
        (row, r) =>
          `<div class="cell"><div class="spr" style="width:128px;height:128px;background-image:url('${src}');` +
          `background-size:${s.frames * 128}px 512px;background-position-y:-${r * 128}px;` +
          `animation:a${s.frames} ${(s.frames / fps[s.anim]).toFixed(3)}s steps(${s.frames}) infinite"></div><span>${row}</span></div>`,
      ).join('');
      return `<section><h3>${s.character} · ${s.anim} <small>${s.frames}f</small></h3><div class="row">${cells}</div></section>`;
    })
    .join('\n');
  const keyframes = [4, 6, 8]
    .map((n) => `@keyframes a${n}{from{background-position-x:0}to{background-position-x:-${n * 128}px}}`)
    .join('');
  const html = `<!doctype html><meta charset="utf-8"><title>Sprite preview</title>
<style>body{background:#0e1116;color:#e8ecf2;font:14px -apple-system,system-ui,sans-serif;margin:24px}
h3{margin:18px 0 6px;font-weight:600}small{color:#8a93a3}.row{display:flex;gap:10px}
.cell{display:flex;flex-direction:column;align-items:center;gap:4px;color:#8a93a3}
.spr{background-color:#1b2029;background-repeat:no-repeat;image-rendering:auto;border-bottom:1px solid #2f6d99}
${keyframes}</style>
<h2>DON'T MOVE — character animation preview <small>(review only)</small></h2>
<p><small>Locomotion shown at fixed fps for review; in game it is distance-driven.</small></p>
${rows}`;
  fs.writeFileSync(path.join(outDir, 'preview.html'), html);
}

// ---------------------------------------------------------------- CLI

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (require.main === module) {
  const chars = path.resolve(arg('chars') ?? path.join(MOBILE, 'assets/characters'));
  const ui = path.resolve(arg('ui') ?? path.join(MOBILE, 'assets/ui'));
  const out = path.resolve(arg('out') ?? path.join(MOBILE, 'art/characters/preview'));
  const only = arg('only')?.split(',') ?? null;
  validate(chars, ui, out, only).then((r) => {
    console.log('\nSheets');
    for (const s of r.sheets) {
      console.log(
        `  ${s.present ? '✓' : '✗'} ${s.file.padEnd(26)} ${s.size.padEnd(11)} ${s.grid.padEnd(24)} ${String(s.frames).padStart(3)} frames  alpha:${s.alpha ? 'yes' : 'no'}`,
      );
    }
    const shown = r.findings.slice(0, 80);
    if (shown.length) console.log('\nFindings');
    for (const f of shown) console.log(`  ${f.level.padEnd(5)} ${f.where}: ${f.msg}`);
    if (r.findings.length > shown.length) console.log(`  … ${r.findings.length - shown.length} more`);
    console.log(
      `\n${r.errors} error(s), ${r.warnings} warning(s). Previews → ${path.relative(MOBILE, out)}/`,
    );
    console.log('Identity checks are advisory: passing them is not design approval (human review required).');
    process.exit(r.errors > 0 ? 1 : 0);
  });
}
