/**
 * 2D cutout rig for the Production Locomotion Atlas.
 *
 * A small 3D skeleton (x = character's right, y = up, z = forward) is posed
 * from one gait phase and projected into the four 3/4 views. Legs are solved
 * with two-bone IK to foot targets from `footCycle`, so the stance foot moves
 * back by exactly the body's travel — planting is by construction, not by eye.
 * Parts are flat cut-out shapes (outline + fill), composed per view with
 * depth ordering, then lit once (soft top light + subtle cyan rim).
 */
import { footCycle } from '../../src/game/core/locomotion';
import { LOCO_CHARACTERS, LOCO_PIVOT, type LocoDir, type LocoState, type LocoWho } from '../../src/game/core/locomotionAtlas';

export type V3 = { x: number; y: number; z: number };
const v3 = (x: number, y: number, z: number): V3 => ({ x, y, z });
const add = (a: V3, b: V3): V3 => v3(a.x + b.x, a.y + b.y, a.z + b.z);
const mul = (a: V3, k: number): V3 => v3(a.x * k, a.y * k, a.z * k);
const sub = (a: V3, b: V3): V3 => v3(a.x - b.x, a.y - b.y, a.z - b.z);
const len = (a: V3) => Math.hypot(a.x, a.y, a.z);
const norm = (a: V3) => mul(a, 1 / (len(a) || 1));
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;
const rad = (d: number) => (d * Math.PI) / 180;

export interface Body {
  thigh: number; shin: number; ankle: number; toe: number; heel: number; footH: number; footW: number;
  hipY: number; hipHalf: number; torso: number; torsoW: number; torsoWHip: number; torsoD: number;
  shoulderHalf: number; shoulderDrop: number; upperArm: number; foreArm: number; handR: number;
  headR: number; headY: number; legW: number; armW: number;
  pack?: { w: number; h: number; d: number; y0: number };
}
export interface Motion { lift: number; bob: number; crouch: number; lean: number; armSwing: number; armBase: number; elbow: number; sway: number; upPhase: number }

const body = (b: Omit<Body, 'hipY' | 'shoulderHalf'> & { shoulderIn?: number }): Body =>
  ({ ...b, hipY: b.ankle + 0.955 * (b.thigh + b.shin), shoulderHalf: b.torsoW / 2 + b.armW * 0.18 - (b.shoulderIn ?? 0) });
export const BODIES: Record<LocoWho, Body> = {
  player: body({
    thigh: 14.5, shin: 14, ankle: 3.4, toe: 6.8, heel: 3.2, footH: 5, footW: 8.4,
    hipHalf: 6.4, torso: 20, torsoW: 27, torsoWHip: 23, torsoD: 18.5,
    shoulderDrop: 3.6, upperArm: 9.5, foreArm: 8.5, handR: 3.9,
    headR: 18, headY: 12.8, legW: 10.6, armW: 8.2,
    pack: { w: 20, h: 19, d: 10, y0: 3.5 },
  }),
  guard: body({
    thigh: 15.5, shin: 15, ankle: 3.6, toe: 7.6, heel: 3.4, footH: 5.4, footW: 9.4,
    hipHalf: 7.4, torso: 23, torsoW: 31, torsoWHip: 26, torsoD: 20,
    shoulderDrop: 4, upperArm: 10.5, foreArm: 9.5, handR: 4.3,
    headR: 16.6, headY: 12.6, legW: 12, armW: 9.2,
  }),
};

export const MOTIONS: Record<LocoWho, Partial<Record<LocoState, Motion>>> = {
  player: {
    sneak: { lift: 5, bob: 0.9, crouch: 5, lean: 13, armSwing: 12, armBase: 42, elbow: 78, sway: 1.1, upPhase: 0.25 },
    walk: { lift: 7, bob: 2.0, crouch: 0.5, lean: 3, armSwing: 30, armBase: 4, elbow: 24, sway: 1.4, upPhase: 0.25 },
    run: { lift: 12, bob: 3.0, crouch: 2.5, lean: 15, armSwing: 55, armBase: 16, elbow: 96, sway: 0.9, upPhase: 0.43 },
  },
  guard: {
    walk: { lift: 6, bob: 1.3, crouch: 0.3, lean: 1.5, armSwing: 19, armBase: 3, elbow: 12, sway: 1.7, upPhase: 0.28 },
    run: { lift: 11, bob: 2.4, crouch: 2.5, lean: 13, armSwing: 48, armBase: 12, elbow: 92, sway: 1.1, upPhase: 0.43 },
  },
};

export interface Leg { hip: V3; knee: V3; ankle: V3; pitch: number; planted: boolean; sole: V3 }
export interface Arm { shoulder: V3; elbow: V3; hand: V3 }
export interface Pose { pelvis: V3; axis: V3; neck: V3; head: V3; legs: [Leg, Leg]; arms: [Arm, Arm]; pack: V3 | null; breath: number }

/** Two-bone IK in the plane containing hip→target and the forward axis (knee bends forward). */
function solveLeg(hip: V3, target: V3, a: number, b: number): { knee: V3; ankle: V3 } {
  let d = sub(target, hip);
  let dist = len(d);
  const maxD = a + b - 0.05;
  if (dist > maxD) { d = mul(norm(d), maxD); dist = maxD; }
  const ankle = add(hip, d), dn = norm(d);
  const fwd = v3(0, 0, 1);
  let n = sub(fwd, mul(dn, dot(fwd, dn)));
  n = len(n) < 1e-6 ? v3(0, 0, 1) : norm(n);
  const cosA = Math.max(-1, Math.min(1, (a * a + dist * dist - b * b) / (2 * a * dist)));
  const al = Math.acos(cosA);
  return { knee: add(hip, add(mul(dn, a * Math.cos(al)), mul(n, a * Math.sin(al)))), ankle };
}

function armPose(shoulder: V3, theta: number, elbow: number, B: Body, out: number): Arm {
  const t1 = rad(theta), t2 = rad(theta + elbow);
  const e = add(shoulder, v3(out * 0.6, -Math.cos(t1) * B.upperArm, Math.sin(t1) * B.upperArm));
  const h = add(e, v3(out * 0.8, -Math.cos(t2) * B.foreArm, Math.sin(t2) * B.foreArm));
  return { shoulder, elbow: e, hand: h };
}

/** Pelvis height ceiling so every stance foot is reachable with a little knee slack. */
function hipCeiling(B: Body, feet: { z: number; planted: boolean }[]): number {
  const L = (B.thigh + B.shin) * 0.985;
  let h = Infinity;
  for (const f of feet) if (f.planted) h = Math.min(h, B.ankle + Math.sqrt(Math.max(0, L * L - f.z * f.z)));
  return h;
}

/** Locomotion pose at cycle phase p (0 = left contact). */
export function locomotionPose(who: LocoWho, state: Exclude<LocoState, 'idle'>, p: number): Pose {
  const B = BODIES[who], M = MOTIONS[who][state]!, G = LOCO_CHARACTERS[who].gaits[state]!;
  const foot = (q: number) => { const o = [0, 0]; footCycle(q, G.stance, o); return { f: o[0], l: o[1], q: q - Math.floor(q) }; };
  const hipAt = (q: number) => {
    const fs = [foot(q), foot(q + 0.5)];
    const up = 0.5 + 0.5 * Math.cos(4 * Math.PI * (q - M.upPhase));
    const ceil = hipCeiling(B, fs.map(f => ({ z: f.f * G.reach, planted: f.q < G.stance })));
    return Math.min(B.hipY - M.crouch + M.bob * (up - 0.5), ceil);
  };
  const hipH = hipAt(p);
  const sway = -M.sway * Math.sin(2 * Math.PI * p);
  const pelvis = v3(sway, hipH, 0);
  const lean = rad(M.lean);
  const axis = v3(0, Math.cos(lean), Math.sin(lean));
  const neck = add(pelvis, mul(axis, B.torso));
  const headLag = (hipAt(p - 0.07) - hipH) * 0.35;
  const head = add(neck, v3(0, B.headY * Math.cos(lean * 0.55) + headLag, B.headY * Math.sin(lean * 0.55)));
  const legs = [0, 1].map(i => {
    const side = i === 0 ? -1 : 1, f = foot(p + i * 0.5);
    const planted = f.q < G.stance;
    const target = v3(side * B.hipHalf, B.ankle + f.l * M.lift, f.f * G.reach);
    const hip = add(pelvis, v3(side * B.hipHalf, 0, 0));
    const { knee, ankle } = solveLeg(hip, target, B.thigh, B.shin);
    let pitch = 0;
    if (!planted) { const v = (f.q - G.stance) / (1 - G.stance); pitch = (-28 * (1 - v) + 16 * v) * Math.sin(Math.PI * v); }
    return { hip, knee, ankle, pitch, planted, sole: v3(ankle.x, ankle.y - B.ankle, ankle.z) };
  }) as [Leg, Leg];
  const shoulderBase = add(pelvis, mul(axis, B.torso - B.shoulderDrop));
  const arms = [0, 1].map(i => {
    const side = i === 0 ? -1 : 1, legPhase = p + i * 0.5;
    const theta = M.armBase - M.armSwing * Math.cos(2 * Math.PI * legPhase);
    const elbow = M.elbow + (state === 'run' ? 18 * Math.max(0, Math.cos(2 * Math.PI * legPhase + Math.PI)) : 0);
    return armPose(add(shoulderBase, v3(side * B.shoulderHalf, 0, 0)), theta, elbow, B, side);
  }) as [Arm, Arm];
  let pack: V3 | null = null;
  if (B.pack) {
    const back = v3(0, Math.sin(lean), -Math.cos(lean));
    const lag = (hipAt(p - 0.125) - hipH) * 0.55;
    pack = add(add(add(pelvis, mul(axis, B.pack.y0 + B.pack.h / 2)), mul(back, B.torsoD / 2 + B.pack.d / 2 - 2.5)), v3(0, lag, 0));
  }
  return { pelvis, axis, neck, head, legs, arms, pack, breath: 0 };
}

/** Idle pose at loop time t (0..1): breathing only, feet fixed. */
export function idlePose(who: LocoWho, t: number): Pose {
  const B = BODIES[who];
  const b = Math.sin(2 * Math.PI * t), bLag = Math.sin(2 * Math.PI * (t - 0.1));
  const pelvis = v3(0, B.ankle + 0.975 * (B.thigh + B.shin) - 0.2, 0);
  const axis = v3(0, 1, 0);
  const neck = add(pelvis, v3(0, B.torso + 0.55 * b, 0));
  const head = add(neck, v3(0, B.headY + 0.35 * bLag, 0));
  const legs = [0, 1].map(i => {
    const side = i === 0 ? -1 : 1;
    const hip = add(pelvis, v3(side * B.hipHalf, 0, 0));
    const { knee, ankle } = solveLeg(hip, v3(side * (B.hipHalf + 0.6), B.ankle, i === 0 ? 0.6 : -0.6), B.thigh, B.shin);
    return { hip, knee, ankle, pitch: 0, planted: true, sole: v3(ankle.x, ankle.y - B.ankle, ankle.z) };
  }) as [Leg, Leg];
  const shoulderBase = add(pelvis, v3(0, B.torso - B.shoulderDrop + 0.45 * b, 0));
  const arms = [0, 1].map(i => {
    const side = i === 0 ? -1 : 1;
    return armPose(add(shoulderBase, v3(side * B.shoulderHalf, 0, 0)), 4 + 1.6 * bLag, 10, B, side);
  }) as [Arm, Arm];
  const pack = B.pack ? add(pelvis, v3(0, B.pack.y0 + B.pack.h / 2 + 0.4 * Math.sin(2 * Math.PI * (t - 0.18)), -(B.torsoD / 2 + B.pack.d / 2 - 2.5))) : null;
  return { pelvis, axis, neck, head, legs, arms, pack, breath: b };
}

// ── Projection ─────────────────────────────────────────────────────────────────
const KL = 0.45;
export interface P2 { x: number; y: number; d: number }
export function project(v: V3, dir: LocoDir, depth: number): P2 {
  // Soles sit 2 px above the pivot so the shoe outline, not the sole centre line, meets the floor point.
  const X = LOCO_PIVOT.x, Y = LOCO_PIVOT.y - 2;
  switch (dir) {
    case 'right': return { x: X + v.z, y: Y - v.y + v.x * KL, d: v.x };
    case 'left': return { x: X - v.z, y: Y - v.y - v.x * KL, d: -v.x };
    case 'down': return { x: X - v.x, y: Y - v.y + v.z * depth, d: v.z };
    case 'up': return { x: X + v.x, y: Y - v.y - v.z * depth, d: -v.z };
  }
}
