/**
 * Core Game Rules V1 (GAME_RULES.md) — tests for implemented rules that are
 * not already covered by guards/__tests__/guardVision.test.ts or
 * core/__tests__/footPlanting.test.ts. Rules not implemented yet are listed
 * as PENDING (never faked). Run: npm run test:rules
 */
import { wrapAngle } from '../core/math';
import { Awareness } from '../core/types';
import { createGuardEvents, createGuardState, stepGuard, suspicionGain } from '../guards/guardBrain';
import type { GuardState, PlayerView } from '../guards/guardBrain';
import { DIFFICULTY_GAIN, GUARD_TUNING } from '../guards/guardTuning';
import type { StageDefinition } from '../levels/StageDefinition';
import { compileStage } from '../world/compileStage';

let passed = 0;
let failed = 0;
let pending = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`);
  }
}
function todo(name: string, why: string) {
  pending++;
  console.log(`  ○ PENDING ${name}\n      ${why}`);
}
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Open room + a 2×2 wall block (cols 7–8, rows 5–6) for occlusion.
const def: StageDefinition = {
  id: 'rules',
  number: 0,
  title: 'rules',
  theme: 'museum',
  layout: [
    '####################',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#......##..........#',
    '#......##..........#',
    '#..................#',
    '#..................#',
    '#..................#',
    '#..................#',
    '####################',
  ],
  props: [],
  lights: [],
  playerSpawn: { x: 1.5, y: 1.5, facing: 0 },
  objective: { kind: 'diamond', x: 1, y: 1 },
  exit: { x: 1, y: 1, w: 1, h: 1 },
  guards: [
    { id: 'open', x: 3, y: 2.5, facing: 0 },
    { id: 'wall', x: 5, y: 6, facing: 0 },
    { id: 'patrol', x: 3, y: 9, facing: 0, routeId: 'r' },
  ],
  patrolRoutes: [
    {
      id: 'r',
      mode: 'pingpong',
      points: [
        { x: 3, y: 9, wait: 0 },
        { x: 16, y: 9, wait: 0 },
      ],
    },
  ],
};
const stage = compileStage(def);
const blockers = stage.visionBlockers;
const DT = 1 / 60;
const guard = (id: string): GuardState => createGuardState(stage.guards.find((g) => g.id === id)!);
const polar = (g: GuardState, dist: number, ang: number, gait: number): PlayerView => ({
  x: g.x + Math.cos(g.facing + ang) * dist,
  y: g.y + Math.sin(g.facing + ang) * dist,
  gait,
});
/** Suspicion gain/s for a guard that has just perceived `p` (one step, standing). */
function gainAt(p: PlayerView, difficulty = 1, id = 'open'): number {
  const g = guard(id);
  stepGuard(g, p, blockers, DT, createGuardEvents(), 0, false, difficulty);
  return suspicionGain(g, p.gait, difficulty);
}

console.log('Core Game Rules V1 — added coverage');

// §11 Movement factor
test('§11 movement risk: Idle < Sneak < Walk < Run (same spot, outside close radius)', () => {
  const g = guard('open');
  const gains = [0, 1, 2, 3].map((gait) => gainAt(polar(g, 120, 0, gait)));
  assert(gains[0] > 0, 'idle must not be invisible in the cone');
  for (let i = 1; i < 4; i++)
    assert(gains[i] > gains[i - 1], `gains not increasing: ${gains.map((v) => v.toFixed(3))}`);
});

// §12 Distance factor
test('§12 distance: right in front ≫ near > mid > vision edge (clearly felt)', () => {
  const g = guard('open');
  const r = g.visionRange;
  const d = [0.15, 0.35, 0.6, 0.95].map((k) => gainAt(polar(g, r * k, 0, 2)));
  for (let i = 1; i < d.length; i++)
    assert(d[i] < d[i - 1], `not decreasing with distance: ${d.map((v) => v.toFixed(3))}`);
  assert(d[0] / d[3] > 3, `front vs edge only ×${(d[0] / d[3]).toFixed(2)} — not clearly felt`);
});

// §14 Vision position factor
test('§14 cone position: centre > middle > edge', () => {
  const g = guard('open');
  const h = g.visionHalfAngle;
  const c = [0, 0.5, 0.92].map((k) => gainAt(polar(g, 120, h * k, 2)));
  assert(c[0] > c[1] && c[1] > c[2], `not decreasing toward the edge: ${c.map((v) => v.toFixed(3))}`);
});

// §15 Visibility (partial occlusion)
test('§15 body partly behind a wall gains slower than the same spot unoccluded', () => {
  // Guard (200,240) facing right; wall block x 280–360, y 200–280. Its top edge
  // hides part of the body for players at x=380 around y≈150.
  let found = false;
  for (let y = 130; y <= 170 && !found; y += 0.5) {
    const p = { x: 380, y, gait: 2 };
    const occluded = guard('wall');
    stepGuard(occluded, p, blockers, DT, createGuardEvents(), 0, false);
    if (!occluded.canSee || occluded.samplesSeen === 3) continue;
    found = true;
    const open = guard('wall');
    stepGuard(open, p, [], DT, createGuardEvents(), 0, false);
    assert(open.samplesSeen === 3, 'fixture: unoccluded body should be fully visible');
    const a = suspicionGain(occluded, 2);
    const b = suspicionGain(open, 2);
    assert(
      a > 0 && a < b,
      `partial ${a.toFixed(3)} vs full ${b.toFixed(3)} (${occluded.samplesSeen}/3 visible)`,
    );
  }
  assert(found, 'fixture: no partially visible position found at the wall edge');
});

// §33–34 Difficulty
test('§33 difficulty: Easy < Normal < Hard (×0.65 / ×1.0 / ×1.4)', () => {
  const g = guard('open');
  const p = polar(g, 120, 0, 2);
  const [e, n, h] = (['easy', 'normal', 'hard'] as const).map((k) => gainAt(p, DIFFICULTY_GAIN[k]));
  assert(e < n && n < h, `${e} ${n} ${h}`);
  assert(
    Math.abs(e / n - 0.65) < 1e-9 && Math.abs(h / n - 1.4) < 1e-9,
    'multipliers not applied to final gain',
  );
});

test('§13/§34 close detection: even on Easy, standing still right in front is found', () => {
  const g = guard('open');
  const ev = createGuardEvents();
  const p = polar(g, GUARD_TUNING.closeDetectionRadius * 0.6, 0, 0);
  for (let i = 0; i < 60 * 6 && ev.alertCount === 0; i++) {
    stepGuard(g, p, blockers, DT, ev, i * DT, false, DIFFICULTY_GAIN.easy);
  }
  assert(ev.alertCount === 1, `not found within 6 s on Easy (suspicion ${g.suspicion.toFixed(2)})`);
});

// §9 independence (before Global Alert)
test('§9 suspicion is per guard: an unseeing guard stays at 0', () => {
  const a = guard('open');
  const b = guard('patrol');
  const ev = createGuardEvents();
  const p = polar(a, 120, 0, 2);
  for (let i = 0; i < 30; i++) {
    stepGuard(a, p, blockers, DT, ev, i * DT, false);
    stepGuard(b, p, blockers, DT, ev, i * DT, false);
  }
  assert(
    a.suspicion > 0 && !b.canSee && b.suspicion === 0,
    `a ${a.suspicion} b ${b.suspicion} (b sees ${b.canSee})`,
  );
});

// §16 reactions
test('§16 25–60 %: patrol slows and glances toward the player (cone turns with it)', () => {
  const g = guard('patrol');
  const ev = createGuardEvents();
  const far = { x: 40 * 18, y: 40 * 1.5, gait: 0 };
  for (let i = 0; i < 90; i++) stepGuard(g, far, blockers, DT, ev, i * DT, true); // up to walking speed
  // Just lost sight of the player ahead-left (inside the 0.5 s memory window).
  g.suspicion = 0.4;
  g.unseenT = 0;
  g.hasLkp = true;
  g.lkpX = g.x + 60;
  g.lkpY = g.y - 60;
  for (let i = 0; i < 24; i++) stepGuard(g, far, blockers, DT, ev, i * DT, true);
  assert(g.speed <= GUARD_TUNING.walkSpeed * GUARD_TUNING.glanceSpeedScale + 1e-6, `speed ${g.speed}`);
  const off = wrapAngle(g.facing - g.baseFacing);
  assert(off < -0.1 && Math.abs(off) <= GUARD_TUNING.glanceMaxAngle + 1e-6, `glance ${off.toFixed(2)} rad`);
  const a0 = Math.atan2(g.fan[1] - g.y, g.fan[0] - g.x);
  assert(Math.abs(wrapAngle(a0 - (g.facing - g.visionHalfAngle))) < 1e-3, 'cone did not follow the glance');
});

test('§16 60–99 %: patrol stops and the guard turns to the player', () => {
  const g = guard('patrol');
  const ev = createGuardEvents();
  const far = { x: 40 * 18, y: 40 * 1.5, gait: 0 };
  for (let i = 0; i < 90; i++) stepGuard(g, far, blockers, DT, ev, i * DT, true);
  // Just lost sight of the player straight "up"; memory then slow decay keeps it ≥ 60 %.
  g.suspicion = 0.7;
  g.unseenT = 0;
  g.hasLkp = true;
  g.lkpX = g.x;
  g.lkpY = g.y - 100;
  for (let i = 0; i < 54; i++) stepGuard(g, far, blockers, DT, ev, i * DT, true);
  assert(g.suspicion >= GUARD_TUNING.stopThreshold, `fixture: suspicion fell to ${g.suspicion.toFixed(2)}`);
  assert(g.speed < 1, `still moving at ${g.speed}`);
  assert(
    Math.abs(wrapAngle(g.facing - -Math.PI / 2)) < 0.05,
    `facing ${g.facing.toFixed(2)} not toward the player`,
  );
});

// §17 decay to zero
test('§17 out of sight: decays to 0, "?" removed, back to PATROL', () => {
  const g = guard('open');
  const ev = createGuardEvents();
  const seen = polar(g, 120, 0, 2);
  for (let i = 0; i < 20; i++) stepGuard(g, seen, blockers, DT, ev, i * DT, false);
  assert(g.awareness === Awareness.Suspicious && g.suspicion > 0, 'fixture: should be suspicious');
  const hidden = polar(g, 60, Math.PI, 2);
  for (let i = 0; i < 60 * 3; i++) stepGuard(g, hidden, blockers, DT, ev, i * DT, false);
  assert(g.suspicion === 0 && g.awareness === Awareness.Patrol, `s ${g.suspicion} awareness ${g.awareness}`);
});

// Invariant C/D
test('Invariant C: no "!" before 100 % (slow edge sneak, 10 s)', () => {
  const g = guard('open');
  const ev = createGuardEvents();
  const p = polar(g, 170, g.visionHalfAngle * 0.8, 1);
  for (let i = 0; i < 600; i++) {
    stepGuard(g, p, blockers, DT, ev, i * DT, false);
    if (g.awareness === Awareness.Alert) assert(g.suspicion >= 1, `ALERT at ${g.suspicion}`);
  }
});

test('§19 whistle fires exactly once per alert (player stays visible 6 s)', () => {
  const g = guard('open');
  const ev = createGuardEvents();
  const p = polar(g, 100, 0, 3);
  for (let i = 0; i < 60 * 6; i++) stepGuard(g, p, blockers, DT, ev, i * DT, false);
  assert(
    ev.alertCount === 1 && ev.whistleCount === 1 && ev.globalAlert,
    `alerts ${ev.alertCount}, whistles ${ev.whistleCount}`,
  );
});

// ---------------------------------------------------------------- PENDING
console.log('\nPhysical acceptance still pending');
// Guard/global/capture cases run in test:global and mission cases run in test:playable.
todo('§2/§3 Tilt physical iPhone acceptance', 'implementation covered by test:tilt; physical direction, drift and feel verification pending');

console.log(`\n${passed} passed, ${failed} failed, ${pending} pending`);
if (failed > 0) process.exit(1);
