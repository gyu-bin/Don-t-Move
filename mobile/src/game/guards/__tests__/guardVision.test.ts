/**
 * Guard vision / facing / suspicion tests (headless, no Skia).
 * Run: npm run test:guards
 *
 * Covers the V2 acceptance cases A–J plus a property test proving the drawn
 * cone polygon equals the real detection region.
 */
import { facingToDir } from '../../core/locomotion';
import { wrapAngle } from '../../core/math';
import { Awareness, GuardAction } from '../../core/types';
import type { StageDefinition } from '../../levels/StageDefinition';
import { compileStage, TILE } from '../../world/compileStage';
import { castRay } from '../../world/visibility';
import { createGuardEvents, createGuardState, stepGuard } from '../guardBrain';
import type { GuardState, PlayerView } from '../guardBrain';
import { GUARD_TUNING } from '../guardTuning';
import { buildVisionFan, pointInFan } from '../guardVision';

// ------------------------------------------------------------- tiny runner
let failed = 0;
let passed = 0;
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
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// ------------------------------------------------------------- fixture
//  20×12 room; a 2×2 wall block at cols 7–8, rows 5–6 for occlusion tests.
const RIGHT = 0;
const def: StageDefinition = {
  id: 'test',
  number: 0,
  title: 'test',
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
    { id: 'open', x: 3, y: 2.5, facing: RIGHT },
    { id: 'wall', x: 5, y: 6, facing: RIGHT },
    { id: 'patrol', x: 3, y: 9, facing: RIGHT, routeId: 'r' },
  ],
  patrolRoutes: [
    {
      id: 'r',
      mode: 'pingpong',
      points: [
        { x: 3, y: 9, wait: 0.5, look: Math.PI / 2 },
        { x: 15, y: 9, wait: 0.8, look: -Math.PI / 2 },
      ],
    },
  ],
};
const stage = compileStage(def);
const blockers = stage.visionBlockers;
const DT = 1 / 60;

function guard(id: string): GuardState {
  return createGuardState(stage.guards.find((g) => g.id === id)!);
}
/** Player at polar offset from guard (world units, radians relative to guard facing). */
function polar(g: GuardState, dist: number, ang: number, gait: number): PlayerView {
  return { x: g.x + Math.cos(g.facing + ang) * dist, y: g.y + Math.sin(g.facing + ang) * dist, gait };
}
function run(g: GuardState, p: PlayerView, seconds: number, patrol = false, ev = createGuardEvents()) {
  for (let i = 0; i < Math.round(seconds / DT); i++) stepGuard(g, p, blockers, DT, ev, i * DT, patrol);
  return ev;
}
const HALF = stage.guards[0].visionHalfAngle;
const RANGE = stage.guards[0].visionRange;

console.log(`Guard vision tests (range ${RANGE}, half-angle ${((HALF * 180) / Math.PI).toFixed(0)}°)`);

// ------------------------------------------------------------- A–G
test('A: player behind guard → no detection', () => {
  const g = guard('open');
  run(g, polar(g, 60, Math.PI, 3), 2);
  assert(!g.canSee && g.suspicion === 0, `canSee=${g.canSee} suspicion=${g.suspicion}`);
});

test('B: player outside cone angle → no detection', () => {
  const g = guard('open');
  run(g, polar(g, 100, HALF + 0.25, 3), 2);
  assert(!g.canSee && g.suspicion === 0, `canSee=${g.canSee} suspicion=${g.suspicion}`);
});

test('B2: player beyond vision range → no detection', () => {
  const g = guard('open');
  run(g, polar(g, RANGE + 12, 0, 3), 2);
  assert(!g.canSee && g.suspicion === 0, `canSee=${g.canSee} suspicion=${g.suspicion}`);
});

test('C: player inside cone → "?" immediately, not "!"', () => {
  const g = guard('open');
  run(g, polar(g, 110, 0.1, 2), DT);
  assert(g.canSee, 'canSee false');
  assert(g.awareness === Awareness.Suspicious, `awareness=${g.awareness}`);
  assert(g.suspicion > 0 && g.suspicion < 0.1, `suspicion=${g.suspicion}`);
});

test('D: inside cone angle/range but behind a wall → no detection', () => {
  const g = guard('wall'); // at (200,240) facing right; wall x 280–360
  const p = { x: 380, y: 240, gait: 3 };
  assert(Math.hypot(p.x - g.x, p.y - g.y) < RANGE, 'fixture: player must be in range');
  run(g, p, 2);
  assert(!g.canSee && g.suspicion === 0 && !g.los, `canSee=${g.canSee} los=${g.los} s=${g.suspicion}`);
});

test('E: cone edge + sneak → slow rise', () => {
  const g = guard('open');
  run(g, polar(g, 150, HALF * 0.85, 1), 2);
  assert(g.suspicion > 0 && g.suspicion < 0.2, `suspicion after 2s = ${g.suspicion.toFixed(3)}`);
});

test('F: front + run → fast rise (≤ 1.5 s to 100 %)', () => {
  const g = guard('open');
  const ev = run(g, polar(g, 100, 0, 3), 1.5);
  assert(ev.alertCount === 1, `alerts=${ev.alertCount} suspicion=${g.suspicion.toFixed(3)}`);
});

test('G: right in front + idle → eventually detected; far + idle → barely', () => {
  const close = guard('open');
  const ev = run(close, polar(close, 40, 0, 0), 3);
  assert(ev.alertCount === 1, `close idle suspicion=${close.suspicion.toFixed(3)}`);
  const far = guard('open');
  run(far, polar(far, 180, 0, 0), 3);
  assert(far.suspicion < 0.1, `far idle suspicion=${far.suspicion.toFixed(3)}`);
});

// ------------------------------------------------------------- H–I facing
test('H: walking right → facing = velocity = right; sprite dir Right; cone centred on facing', () => {
  const g = guard('patrol');
  const p = { x: 40 * 18, y: 40 * 1.5, gait: 0 }; // far away, not visible
  const ev = createGuardEvents();
  let movingSteps = 0;
  for (let i = 0; i < 120; i++) {
    const px = g.x;
    const py = g.y;
    stepGuard(g, p, blockers, DT, ev, i * DT, true);
    const vx = g.x - px;
    const vy = g.y - py;
    if (Math.hypot(vx, vy) > 1e-6) {
      movingSteps++;
      const vel = Math.atan2(vy, vx);
      assert(Math.abs(wrapAngle(g.facing - vel)) < 1e-6, `facing ${g.facing} ≠ velocity ${vel}`);
      assert(facingToDir(g.facing) === 2, `dir=${facingToDir(g.facing)}`);
      const a0 = Math.atan2(g.fan[1] - g.y, g.fan[0] - g.x);
      assert(Math.abs(wrapAngle(a0 - (g.facing - g.visionHalfAngle))) < 1e-3, 'fan not built from facing');
    }
  }
  assert(movingSteps > 30, `guard barely moved (${movingSteps} steps)`);
});

test('I: turning at patrol points is smooth and the cone turns with it', () => {
  const g = guard('patrol');
  const p = { x: 40 * 18, y: 40 * 1.5, gait: 0 };
  const ev = createGuardEvents();
  const maxStep = GUARD_TUNING.turnRatePatrol * DT + 1e-6;
  let prev = g.facing;
  let turned = 0;
  const dirs = new Set<number>();
  for (let i = 0; i < 60 * 40; i++) {
    stepGuard(g, p, blockers, DT, ev, i * DT, true);
    const d = Math.abs(wrapAngle(g.facing - prev));
    assert(d <= maxStep, `snap of ${d.toFixed(3)} rad at step ${i}`);
    turned += d;
    prev = g.facing;
    dirs.add(facingToDir(g.facing));
    const a0 = Math.atan2(g.fan[1] - g.y, g.fan[0] - g.x);
    const n = g.fanCount - 1;
    const a1 = Math.atan2(g.fan[n * 2 + 1] - g.y, g.fan[n * 2] - g.x);
    assert(Math.abs(wrapAngle(a0 - (g.facing - g.visionHalfAngle))) < 1e-3, `cone start off at ${i}`);
    assert(Math.abs(wrapAngle(a1 - (g.facing + g.visionHalfAngle))) < 1e-3, `cone end off at ${i}`);
  }
  assert(turned > Math.PI, `guard never turned (${turned.toFixed(2)} rad)`);
  assert(dirs.size >= 3, `sprite directions seen: ${[...dirs].join(',')}`);
});

// ------------------------------------------------------------- J alert
test('J: 100 % → guard faces player → "!" → whistle → global alert', () => {
  const g = guard('open');
  const p = polar(g, 110, HALF * 0.6, 3); // off-centre so the guard must turn
  const ev = createGuardEvents();
  let alertStep = -1;
  let whistleFacingErr = -1;
  for (let i = 0; i < 60 * 4; i++) {
    const beforeWhistles = ev.whistleCount;
    stepGuard(g, p, blockers, DT, ev, i * DT, false);
    if (alertStep < 0 && g.awareness === Awareness.Alert) {
      alertStep = i;
      assert(g.canSee, '"!" fired while the player was not visible');
    }
    if (ev.whistleCount > beforeWhistles) {
      whistleFacingErr = Math.abs(wrapAngle(Math.atan2(p.y - g.y, p.x - g.x) - g.facing));
      assert(g.action === GuardAction.Whistle, 'whistle event without whistle action');
    }
  }
  assert(alertStep >= 0, 'never alerted');
  assert(whistleFacingErr >= 0, 'never whistled');
  assert(
    whistleFacingErr < GUARD_TUNING.whistleFacingTolerance,
    `whistled facing ${whistleFacingErr.toFixed(3)} rad off`,
  );
  assert(ev.globalAlert, 'no global alert after whistle');
  assert(Math.hypot(ev.globalX - p.x, ev.globalY - p.y) < 0.01, 'global alert not at last known position');
});

test('Suspicion stops rising out of sight, holds ~0.5 s, then decays', () => {
  const g = guard('open');
  run(g, polar(g, 110, 0, 2), 0.4);
  const peak = g.suspicion;
  const hidden = polar(g, 60, Math.PI, 3);
  run(g, hidden, 0.45);
  assert(Math.abs(g.suspicion - peak) < 1e-9, `changed during memory: ${peak} → ${g.suspicion}`);
  run(g, hidden, 1);
  assert(g.suspicion < peak, 'did not decay');
});

test('Last known position updates only while seen', () => {
  const g = guard('wall'); // wall block ahead at x 280–360
  const seen = { x: 260, y: 200, gait: 2 };
  run(g, seen, 0.2);
  assert(g.canSee && g.hasLkp, 'fixture: should see player');
  const behind = { x: 390, y: 250, gait: 2 };
  run(g, behind, 0.5);
  assert(!g.canSee, 'player behind wall should be hidden');
  assert(g.lkpX === seen.x && g.lkpY === seen.y, `LKP followed hidden player to ${g.lkpX},${g.lkpY}`);
});

// ------------------------------------------------------------- drawn cone == detection
test('Drawn cone polygon == detection region (20k random points × 16 facings)', () => {
  let rng = 12345;
  const rnd = () => (rng = (rng * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const g = guard('wall');
  let checked = 0;
  let mismatches = 0;
  const truth = (px: number, py: number) => {
    const dx = px - g.x;
    const dy = py - g.y;
    const d = Math.hypot(dx, dy);
    if (d > g.visionRange) return false;
    if (Math.abs(wrapAngle(Math.atan2(dy, dx) - g.facing)) > g.visionHalfAngle) return false;
    return castRay(g.x, g.y, dx / d, dy / d, d, blockers) >= d - 0.5;
  };
  for (let f = 0; f < 16; f++) {
    g.facing = (f / 16) * Math.PI * 2;
    buildVisionFan(g, blockers);
    for (let i = 0; i < 1250; i++) {
      const px = g.x + (rnd() * 2 - 1) * (RANGE + 10);
      const py = g.y + (rnd() * 2 - 1) * (RANGE + 10);
      const t0 = truth(px, py);
      // Skip points within 1 unit of a visibility boundary (numeric edge).
      if (
        truth(px + 1, py) !== t0 ||
        truth(px - 1, py) !== t0 ||
        truth(px, py + 1) !== t0 ||
        truth(px, py - 1) !== t0
      ) {
        continue;
      }
      checked++;
      if (pointInFan(g, px, py) !== t0) mismatches++;
    }
  }
  assert(checked > 15000, `too few checked points (${checked})`);
  assert(mismatches === 0, `${mismatches}/${checked} points differ between drawn cone and detection`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
