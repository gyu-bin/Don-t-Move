/// <reference types="node" />
import assert from 'node:assert/strict';
import { Awareness as A } from '../../core/types';
import { wrapAngle } from '../../core/math';
import type { StageDefinition } from '../../levels/StageDefinition';
import { visualPlayground } from '../../levels/stages/visualPlayground';
import { compileStage } from '../../world/compileStage';
import { buildNavigation, clearSegment, findPath } from '../../world/navigation';
import { createGuardEvents, createGuardState } from '../guardBrain';
import { BODY, GUARD_TUNING as T } from '../guardTuning';
import { bodiesTouch, stepGuards } from '../guardSystem';
import { createPlaygroundState, stepPlayground } from '../../playground/playgroundState';
import { driveAlertReplay } from '../../playground/alertReplay';

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (error) { failed++; console.error(`  ✗ ${name}`, error); }
}
const DT = 1 / 60;
const def: StageDefinition = {
  id: 'global-test', number: 0, title: 'Global', theme: 'museum',
  layout: [
    '####################',
    '#..................#',
    '#..................#',
    '#..................#',
    '#.......##.........#',
    '#.......##.........#',
    '#.......##.........#',
    '#.......##.........#',
    '#..................#',
    '#..................#',
    '#..................#',
    '####################',
  ],
  props: [{ kind: 'crate', x: 13, y: 7 }], lights: [],
  playerSpawn: { x: 1.5, y: 1.5, facing: 0 },
  objective: { kind: 'diamond', x: 1, y: 1 }, exit: { x: 1, y: 1, w: 1, h: 1 },
  guards: [
    { id: 'a', x: 3, y: 2.5, facing: 0, routeId: 'r' },
    { id: 'b', x: 14, y: 6, facing: 0 },
    { id: 'c', x: 15, y: 9, facing: Math.PI / 2 },
    { id: 'd', x: 3, y: 9, facing: Math.PI },
  ],
  patrolRoutes: [{ id: 'r', mode: 'pingpong', points: [{ x: 3, y: 2.5 }, { x: 7, y: 2.5 }] }],
};
function fixture() {
  const stage = compileStage(def);
  const nav = buildNavigation(stage, BODY.guardRadius);
  const guards = stage.guards.map((g) => createGuardState(g));
  const ev = createGuardEvents();
  const player = { x: 230, y: 100, gait: 3 };
  let t = 0;
  const tick = (seconds = DT, difficulty = 1) => {
    for (let i = 0; i < Math.round(seconds / DT); i++) {
      t += DT;
      stepGuards(guards, player, stage.visionBlockers, nav, DT, ev, t, false, difficulty);
    }
  };
  const alert = () => {
    for (let i = 0; i < 600 && !ev.globalAlert; i++) tick();
    assert(ev.globalAlert, 'whistle must start the group alert');
  };
  const hide = () => { player.x = 700; player.y = 60; };
  return { stage, nav, guards, ev, player, tick, alert, hide };
}

test('A/B/E/F: one whistle → all four react in the same frame; no ?; visible CHASE, unseen INVESTIGATE', () => {
  const f = fixture(); f.alert();
  assert.equal(f.ev.whistleCount, 1);
  assert.equal(f.guards[0].awareness, A.Chase);
  for (const g of f.guards.slice(1)) assert.equal(g.awareness, A.Investigate);
  for (const g of f.guards) {
    assert.equal(g.suspicion, 0);
    assert.equal(g.targetX, f.ev.globalX);
    assert.equal(g.targetY, f.ev.globalY);
  }
  assert(!f.ev.caught, 'alert itself is not game over');
});

test('C: any guard can publish a new LKP; every unseen guard gets that target immediately', () => {
  const f = fixture(); f.alert();
  f.player.x = 640; f.player.y = 240;
  f.tick();
  assert(f.guards[1].canSee);
  assert.equal(f.guards[1].awareness, A.Chase);
  assert.equal(f.ev.globalX, 640);
  for (const g of f.guards) { assert.equal(g.targetX, 640); assert.equal(g.targetY, 240); }
});

test('D/G: occluded player stops updating global/personal LKP and CHASE becomes INVESTIGATE', () => {
  const f = fixture(); f.alert();
  const last = [f.ev.globalX, f.ev.globalY];
  f.player.x = 390; f.player.y = 340;
  f.tick();
  assert(f.guards.every((g) => !g.canSee));
  assert.deepEqual([f.ev.globalX, f.ev.globalY], last);
  assert.equal(f.guards[0].awareness, A.Investigate);
  assert.deepEqual([f.guards[0].lkpX, f.guards[0].lkpY], last);
  f.hide(); f.tick(0.5);
  assert.deepEqual([f.ev.globalX, f.ev.globalY], last);
});

test('navigation: deterministic wall/cover detour with body clearance and no corner cutting', () => {
  const f = fixture();
  const path = findPath(f.nav, 240, 240, 460, 240);
  assert.deepEqual(path, findPath(f.nav, 240, 240, 460, 240));
  assert(path.length > 2, 'direct route should be blocked');
  let x = 240; let y = 240;
  for (let k = 0; k < path.length; k += 2) {
    assert(clearSegment(x, y, path[k], path[k + 1], f.nav.blockers, BODY.guardRadius));
    x = path[k]; y = path[k + 1];
  }
  assert.deepEqual([x, y], [460, 240]);
});

test('H/J/K/L: actual travel → moving SEARCH → RETURN → PATROL; OFF only after last return; suspicion resumes', () => {
  const f = fixture(); f.alert(); f.hide();
  const seen = f.guards.map(() => new Set<number>());
  const searchDistance = f.guards.map(() => 0);
  let mixedReturn = false;
  for (let i = 0; i < 60 * 40 && f.ev.globalAlert; i++) {
    const prev = f.guards.map((g) => ({ x: g.x, y: g.y, state: g.awareness }));
    f.tick();
    f.guards.forEach((g, j) => {
      seen[j].add(g.awareness);
      assert(clearSegment(prev[j].x, prev[j].y, g.x, g.y, f.nav.blockers, BODY.guardRadius), `${g.id} crossed a blocker`);
      const d = Math.hypot(g.x - prev[j].x, g.y - prev[j].y);
      if (prev[j].state === A.Search) searchDistance[j] += d;
      if (d > 0.001) assert(Math.abs(wrapAngle(g.facing - Math.atan2(g.y - prev[j].y, g.x - prev[j].x))) < 0.01);
      if (f.ev.globalAlert) assert.equal(g.suspicion, 0);
    });
    if (f.guards.some((g) => g.awareness === A.Patrol) && f.guards.some((g) => g.awareness !== A.Patrol)) {
      mixedReturn = true; assert(f.ev.globalAlert);
    }
  }
  assert(!f.ev.globalAlert, 'alert never cleared');
  assert(mixedReturn, 'must exercise staggered returns');
  for (let j = 0; j < seen.length; j++) {
    assert(seen[j].has(A.Search) && seen[j].has(A.Return) && seen[j].has(A.Patrol), `guard ${j} skipped a state`);
    assert(searchDistance[j] > 10, `guard ${j} searched in place`);
    const g = f.guards[j];
    const homes = g.route.length ? g.route : [{ x: g.homeX, y: g.homeY }];
    assert(homes.some((p) => Math.hypot(g.x - p.x, g.y - p.y) <= T.arrivalDistance + 0.1));
  }
  const g = f.guards[0];
  f.player.x = g.x + Math.cos(g.facing) * 80;
  f.player.y = g.y + Math.sin(g.facing) * 80;
  f.tick();
  assert(g.suspicion > 0 && g.awareness === A.Suspicious, 'normal detection must resume');
});

test('I: SEARCH reacquires → immediate CHASE, no new whistle; other guards redirected', () => {
  const f = fixture(); f.alert(); f.hide();
  for (let i = 0; i < 1200 && f.guards[0].awareness !== A.Search; i++) f.tick();
  const g = f.guards[0];
  assert.equal(g.awareness, A.Search);
  f.player.x = g.x + Math.cos(g.facing) * 55;
  f.player.y = g.y + Math.sin(g.facing) * 55;
  f.tick();
  assert.equal(g.awareness, A.Chase);
  assert.equal(g.suspicion, 0);
  assert.equal(f.ev.whistleCount, 1);
  assert.equal(f.ev.globalX, f.player.x);
});

test('M/N: true contact only; no old 24-unit capture, and never capture through a wall', () => {
  const g = { x: 100, y: 100 };
  const r = BODY.playerRadius + BODY.guardRadius + BODY.captureTolerance;
  assert(!bodiesTouch(g, { x: 100 + r + 0.01, y: 100 }, []));
  assert(!bodiesTouch(g, { x: 124, y: 100 }, []));
  assert(bodiesTouch(g, { x: 100 + r, y: 100 }, []));
  assert(!bodiesTouch(g, { x: 114, y: 100 }, [106, 80, 108, 120]));
  const f = fixture();
  f.player.x = f.guards[0].x + r; f.player.y = f.guards[0].y;
  f.tick(); assert(f.ev.caught);
  const snapshot = JSON.stringify(f.guards);
  f.tick(1);
  assert.equal(JSON.stringify(f.guards), snapshot, 'CAUGHT freezes the group');
});

test('CAUGHT freezes playground time/player too; fresh state resets game', () => {
  const stage = compileStage(visualPlayground);
  const s = createPlaygroundState(stage);
  s.events.caught = true;
  const before = JSON.stringify(s);
  stepPlayground(s, DT, 40, 300, 600, { x: 0, y: 0, w: stage.width, h: stage.height }, stage.movementBlockers, stage.visionBlockers, buildNavigation(stage, BODY.guardRadius));
  assert.equal(JSON.stringify(s), before);
  assert(!createPlaygroundState(stage).events.caught);
});

test('moving targets replan at a bounded rate, not every frame; difficulty does not change chase speed', () => {
  const normal = fixture(); const hard = fixture();
  normal.alert(); hard.alert();
  for (let i = 0; i < 60; i++) {
    normal.player.x += 2; hard.player.x += 2;
    normal.tick(DT, 1); hard.tick(DT, 1.4);
  }
  for (let i = 0; i < normal.guards.length; i++) {
    const a = normal.guards[i]; const b = hard.guards[i];
    assert(a.pathPlans <= 4, `planned ${a.pathPlans} times in 1 second`);
    assert.deepEqual([a.x, a.y, a.speed], [b.x, b.y, b.speed]);
  }
});

test('hidden during whistle: publish last seen position, never the hidden current position', () => {
  const f = fixture();
  for (let i = 0; i < 600 && f.ev.whistleCount === 0; i++) f.tick();
  const g = f.guards[0];
  const last = [g.lkpX, g.lkpY];
  f.hide();
  for (let i = 0; i < 90 && !f.ev.globalAlert; i++) f.tick();
  assert(f.ev.globalAlert);
  assert.deepEqual([f.ev.globalX, f.ev.globalY], last);
});

test('visibility flicker cannot force an A* replan every frame', () => {
  const f = fixture(); f.alert();
  const g = f.guards[0];
  for (let i = 0; i < 60; i++) {
    f.player.x = g.x + (i % 2 ? -80 : 80);
    f.player.y = g.y;
    f.tick();
  }
  assert(g.pathPlans <= 4, `visibility flicker caused ${g.pathPlans} path plans in one second`);
});

test('unreachable LKP resolves to reachable floor and eventually releases alert', () => {
  const f = fixture(); f.alert(); f.hide();
  f.ev.globalX = 360; f.ev.globalY = 240; f.ev.globalRevision++; // inside the wall
  f.tick(40);
  assert(!f.ev.globalAlert, 'unreachable target left guards stuck forever');
  for (const g of f.guards) assert(clearSegment(g.x, g.y, g.x, g.y, f.nav.blockers, BODY.guardRadius));
});

test('guard array order does not delay initial group reaction', () => {
  const f = fixture(); f.guards.reverse(); f.alert();
  assert.equal(f.ev.whistleCount, 1);
  assert(f.guards.every((g) => g.awareness === (g.canSee ? A.Chase : A.Investigate)));
});

test('museum acceptance replay: normal input completes whistle → chase → occlusion → search → return', () => {
  const stage = compileStage(visualPlayground);
  const navigation = buildNavigation(stage, BODY.guardRadius);
  const s = createPlaygroundState(stage);
  const history = s.guards.map(() => new Set<number>());
  s.replayLeg = 0;
  let hadAlert = false;
  let hadWhistle = false;
  let hiddenSteps = 0;
  for (let i = 0; i < 60 * 30; i++) {
    s.replayLeg = driveAlertReplay(s, s.replayLeg);
    const oldX = s.events.globalX; const oldY = s.events.globalY;
    const previous = s.guards.map((g) => ({ x: g.x, y: g.y }));
    stepPlayground(s, DT, 40, 376, 810, { x: 0, y: 0, w: stage.width, h: stage.height }, stage.movementBlockers, stage.visionBlockers, navigation);
    s.guards.forEach((g, j) => {
      history[j].add(g.awareness);
      if (g.action === 1) hadWhistle = true;
      assert(clearSegment(previous[j].x, previous[j].y, g.x, g.y, navigation.blockers, BODY.guardRadius));
    });
    if (s.events.globalAlert) {
      if (hadAlert && !s.guards.some((g) => g.canSee)) {
        hiddenSteps++;
        assert.deepEqual([s.events.globalX, s.events.globalY], [oldX, oldY]);
      }
      hadAlert = true;
    }
    assert(!s.events.caught, 'replay should escape, not bypass capture');
    if (hadAlert && !s.events.globalAlert) break;
  }
  assert(hadWhistle && hadAlert && !s.events.globalAlert);
  assert(hiddenSteps > 60);
  for (const states of history) for (const state of [A.Patrol, A.Chase, A.Investigate, A.Search, A.Return]) assert(states.has(state));
  assert.equal(s.events.whistleCount, 1);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
