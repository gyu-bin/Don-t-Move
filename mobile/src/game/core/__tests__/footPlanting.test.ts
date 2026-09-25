/**
 * Foot planting tests for the shared gait model (game/core/locomotion).
 * Run: npm run test:locomotion
 *
 * Simulates a character walking through the world with the same phase advance
 * the game uses (distance / strideCycleLength) and checks that each grounded
 * foot stays fixed in WORLD space for its whole stance.
 */
import { bodyBob, footCycle, GAIT_SPEED, GAIT_STANCE, plantedReach, strideCycleLength } from '../locomotion';

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

const NAMES = ['idle', 'sneak', 'walk', 'run'];
console.log('Foot planting (shared gait model)');

for (const gait of [1, 2, 3]) {
  test(`${NAMES[gait]}: grounded foot is fixed in world space through the stance`, () => {
    const dt = 1 / 240;
    const speed = GAIT_SPEED[gait];
    const reach = plantedReach(gait);
    const buf = [0, 0];
    let x = 0;
    let phase = 0;
    let worstSlip = 0;
    let stanceSamples = 0;
    let sweep = 0;
    for (const foot of [0, 0.5]) {
      let prevWorld = Number.NaN;
      let stanceStart = Number.NaN;
      x = 0;
      phase = 0;
      for (let k = 0; k < 240 * 4; k++) {
        footCycle(phase + foot, GAIT_STANCE[gait], buf);
        const world = x + buf[0] * reach;
        const grounded = buf[1] === 0;
        if (grounded) {
          stanceSamples++;
          if (!Number.isNaN(prevWorld)) worstSlip = Math.max(worstSlip, Math.abs(world - prevWorld));
          if (Number.isNaN(stanceStart)) stanceStart = buf[0];
          prevWorld = world;
        } else {
          if (!Number.isNaN(stanceStart)) sweep = Math.max(sweep, stanceStart - -1);
          prevWorld = Number.NaN;
          stanceStart = Number.NaN;
        }
        x += speed * dt;
        phase = (phase + (speed * dt) / strideCycleLength(gait)) % 1;
      }
    }
    assert(stanceSamples > 100, 'no stance samples');
    // Allow one sample of numeric drift at the stance boundary.
    assert(
      worstSlip < 1e-6 + speed * dt * 0.02,
      `grounded foot slid ${worstSlip.toFixed(4)} world units in one step`,
    );
    assert(sweep > 1.9, `stance does not sweep contact→toe-off (sweep ${sweep.toFixed(2)} of 2)`);
  });
}

test('walk: Contact at frame 1, Opposite Contact at frame 5 (8 frames)', () => {
  const buf = [0, 0];
  footCycle(0, GAIT_STANCE[2], buf);
  assert(buf[0] === 1 && buf[1] === 0, `L at frame 1: fwd ${buf[0]}, lift ${buf[1]}`);
  footCycle(0.5, GAIT_STANCE[2], buf);
  assert(buf[0] === -1 && buf[1] === 0, `R at frame 1 should be at toe-off: fwd ${buf[0]}`);
  footCycle(4 / 8 + 0.5, GAIT_STANCE[2], buf);
  assert(buf[0] === 1 && buf[1] === 0, `R at frame 5 should be Contact: fwd ${buf[0]}`);
});

test('walk: body Down after Contact, Up before the next Contact', () => {
  assert(bodyBob(1 / 8) > 0.49, `frame 2 (Down) bob ${bodyBob(1 / 8)}`);
  assert(bodyBob(3 / 8) < -0.49, `frame 4 (Up) bob ${bodyBob(3 / 8)}`);
  assert(bodyBob(5 / 8) > 0.49 && bodyBob(7 / 8) < -0.49, 'second half not mirrored');
});

test('run: flight phase exists (both feet off the ground)', () => {
  const buf = [0, 0];
  let flight = 0;
  for (let i = 0; i < 100; i++) {
    const p = i / 100;
    footCycle(p, GAIT_STANCE[3], buf);
    const a = buf[1];
    footCycle(p + 0.5, GAIT_STANCE[3], buf);
    if (a > 0 && buf[1] > 0) flight++;
  }
  assert(flight > 10, `only ${flight}% of the run cycle is airborne`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
