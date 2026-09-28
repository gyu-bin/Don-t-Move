/** Author-labelled anatomy, never nearest-contact matching. Annotations alone are
 * not proof of identity: they are bound to PNG bytes and checked against pixels;
 * anatomical labels and the full-body loop still require visual review. */
import { ANCHOR, CELL, plantedFeet, plantingFor } from './spriteSpec';
import type { SheetSpec } from './spriteSpec';

export type Point = [number, number];
export type FootId = 'L' | 'R';
export interface FootLandmarks {
  sole: Point;
  ankle: Point;
  knee: Point;
  planted: boolean;
}
export interface TrackedFrame {
  phase: number;
  beat: string;
  root: Point;
  hip: Point;
  L: FootLandmarks;
  R: FootLandmarks;
}
export interface FootTrackFile {
  version: 1;
  imageSha256: string;
  rows: Partial<Record<'right', TrackedFrame[]>>;
}
export interface TrackResult {
  errors: string[];
  transitions: { from: number; to: number; foot: FootId; backwardPx: number; residualWorld: number; pass: boolean; boundary: boolean }[];
}
type Pixels = { w: number; h: number; data: Uint8Array };
const ids: FootId[] = ['L', 'R'];
const point = (v: unknown): v is Point => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < CELL);

export function validateRightFootTracks(px: Pixels, spec: SheetSpec, rowIndex: number, input: unknown): TrackResult {
  const out: TrackResult = { errors: [], transitions: [] };
  const fail = (s: string) => out.errors.push(s);
  const pl = plantingFor(spec);
  if (!pl || spec.anim !== 'walk' || spec.character !== 'player') {
    fail('identity tracking is currently scoped to Player RIGHT Walk only'); return out;
  }
  if (!Array.isArray(input) || input.length !== spec.frames) {
    fail(`requires ${spec.frames} author-labelled frames; missing tracks cannot pass`); return out;
  }
  if (px.w < spec.frames * CELL || px.h < (rowIndex + 1) * CELL) {
    fail('pixel dimensions do not contain the requested row'); return out;
  }
  for (let i = 0; i < input.length; i++) {
    const f = input[i];
    if (!f || typeof f !== 'object' || !point(f.root) || !point(f.hip) ||
      !Number.isFinite(f.phase) || typeof f.beat !== 'string' ||
      ids.some(id => !f[id] || !point(f[id].sole) || !point(f[id].ankle) || !point(f[id].knee) || typeof f[id].planted !== 'boolean')) {
      fail(`frame ${i + 1}: malformed/unknown anatomical landmarks`);
    }
  }
  if (out.errors.length) return out;
  const frames = input as TrackedFrame[];
  // Existing side-view band and transition proportion are unchanged.
  const tol = Math.max(4, pl.perFramePx * 0.35);
  const onArt = (i: number, p: Point) => {
    for (let y = Math.max(0, Math.round(p[1]) - 2); y <= Math.min(CELL - 1, Math.round(p[1]) + 2); y++) {
      for (let x = Math.max(0, Math.round(p[0]) - 2); x <= Math.min(CELL - 1, Math.round(p[0]) + 2); x++) {
        if (px.data[((rowIndex * CELL + y) * px.w + i * CELL + x) * 4 + 3] >= 128) return true;
      }
    }
    return false;
  };
  frames.forEach((f, i) => {
    const at = `frame ${i + 1}`;
    if (Math.abs(f.phase - i / spec.frames) > 1e-6 || f.beat !== spec.beats[i]) fail(`${at}: wrong phase/beat order`);
    if (Math.abs(f.root[0] - ANCHOR.x) > 0.5 || Math.abs(f.root[1] - ANCHOR.y) > 0.5) fail(`${at}: common root/anchor changed`);
    if (!onArt(i, f.hip)) fail(`${at}: hip landmark is not on image pixels`);
    const expected = plantedFeet(spec, i);
    ids.forEach(id => {
      const foot = f[id];
      const target = expected.find(p => p.foot === id);
      if (foot.planted !== !!target) fail(`${at} ${id}: stance/swing does not match ${spec.beats[i]}`);
      for (const key of ['sole', 'ankle', 'knee'] as const) {
        if (!onArt(i, foot[key])) fail(`${at} ${id}: ${key} landmark is not on image pixels`);
      }
      if (target) {
        if (Math.abs(foot.sole[1] - ANCHOR.y) > 3) fail(`${at} ${id}: planted sole is off ground`);
        if (Math.abs(foot.sole[0] - f.root[0] - target.forwardPx) > tol) fail(`${at} ${id}: contact/passing/toe-off position differs from runtime trajectory`);
      } else if (foot.sole[1] >= ANCHOR.y - 5) {
        fail(`${at} ${id}: swing sole touches ground band`);
      }
    });
    if (Math.hypot(f.L.sole[0] - f.R.sole[0], f.L.sole[1] - f.R.sole[1]) < 3) fail(`${at}: both identities assigned to one sole`);
  });
  for (let i = 0; i < frames.length; i++) {
    const j = (i + 1) % frames.length;
    // Use model identity, including toe-off at half/full cycle boundaries.
    const a = plantedFeet(spec, i), b = plantedFeet(spec, i + 1);
    for (const id of ids) {
      if (!a.some(p => p.foot === id) || !b.some(p => p.foot === id)) continue;
      const back = (frames[i][id].sole[0] - frames[i].root[0]) - (frames[j][id].sole[0] - frames[j].root[0]);
      const pass = Math.abs(back - pl.perFramePx) <= tol;
      const boundary = j === 0 || j === frames.length / 2;
      out.transitions.push({ from: i + 1, to: j + 1, foot: id, backwardPx: back,
        residualWorld: (pl.perFramePx - back) / pl.pxPerUnit, pass, boundary });
      if (boundary && !pass) fail(`${i + 1}→${j + 1} ${id}: same-foot loop/contact boundary fails`);
    }
  }
  const passed = out.transitions.filter(t => t.pass).length;
  if (passed < Math.ceil(out.transitions.length * 0.75)) fail(`foot planting: ${passed}/${out.transitions.length} same-foot transitions pass`);
  return out;
}
