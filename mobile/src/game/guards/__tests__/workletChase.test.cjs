/* global __dirname */
/* Execute Expo's serialized UI closures: tsx alone cannot detect forward captures. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.resolve(__dirname, '../../..');
const modules = new Map();
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {};
  modules.set(file, exports);
  const code = babel.transformFileSync(file, { presets: [require.resolve('babel-preset-expo')] }).code;
  vm.runInNewContext(code, { exports, global, console, __DEV__: false, require(id) {
    if (!id.startsWith('.')) return require(id);
    return load(path.resolve(path.dirname(file), `${id}.ts`));
  } }, { filename: file });
  return exports;
}
const travelModule = load(path.join(root, 'game/guards/guardTravel.ts'));
const systemModule = load(path.join(root, 'game/guards/guardSystem.ts'));
function onUI(fn, cache = new Map()) {
  if (cache.has(fn)) return cache.get(fn);
  assert(fn.__initData, 'worklet must have serialized code');
  const closure = {};
  const evaluated = vm.runInNewContext(`(${fn.__initData.code})`, { console, __DEV__: false }, { filename: fn.__initData.location });
  const bound = evaluated.bind({ __closure: closure });
  cache.set(fn, bound);
  for (const [key, value] of Object.entries(fn.__closure)) {
    closure[key] = typeof value === 'function' && value.__initData ? onUI(value, cache) : value;
  }
  return bound;
}
function guard() {
  return { x: 0, y: 0, targetX: 100, targetY: 0, pathTargetX: 100, pathTargetY: 0,
    path: [], pathIndex: 0, repathAt: 2, speed: 10, facing: 0, baseFacing: 0, glance: 0, pathPlans: 0 };
}
function nav(blockers = []) {
  return { blockers, radius: 1, cols: 0, rows: 0, cell: 20, walkable: [], neighbors: [], components: [] };
}

test('serialized Chase captures a finite body contact distance before its first tick', () => {
  const move = systemModule.stepGuards.__closure.moveAlertGuard;
  assert.equal(move.__closure.CONTACT_DISTANCE, systemModule.CONTACT_DISTANCE);
  const g = { ...guard(), awareness: move.__closure.Awareness.Chase, stateT: 0, alertAge: 0,
    gait: 0, phase: 0, dist: 0, actionT: 0, action: 0 };
  onUI(move)(g, nav(), 1 / 60, 1, 0);
  assert(Number.isFinite(g.x) && Number.isFinite(g.y), `nonfinite Chase position: ${g.x}, ${g.y}`);
  assert(g.x > 0);
});

test('serialized pursuit cooldown with an empty blocked path invokes initialized fallback', () => {
  const g = guard();
  onUI(travelModule.pursue)(g, nav([40, -20, 60, 20]), 168, 1 / 60, 1, 20);
  assert(g.x > 0 && Number.isFinite(g.x), 'clear partial step keeps pursuit moving');
});

test('serialized pursuit safely waits when no path or partial step can be traversed', () => {
  const g = guard();
  const move = onUI(travelModule.pursue);
  move(g, nav([-2, -2, 2, 2]), 168, 1 / 60, 1, 20);
  assert.equal(g.x, 0); assert.equal(g.speed, 0);
  move(g, nav([-2, -2, 2, 2]), 168, 1 / 60, 3, 20);
  assert.equal(g.x, 0); assert.equal(g.speed, 0); assert.equal(g.path.length, 0);
});

test('serialized pursuit applies the same turn limit to path fallback and direct Chase', () => {
  assert(Number.isFinite(travelModule.travel.__closure.PURSUIT_TURN_IN_PLACE));
  const g = guard(); g.facing = Math.PI;
  onUI(travelModule.pursue)(g, nav([40, -20, 60, 20]), 168, 1 / 60, 1, 20);
  assert.equal(g.x, 0); assert.equal(g.speed, 0);
});

test('serialized guard update has no uninitialized worklet dependencies', () => {
  const seen = new Set();
  function check(fn, chain) {
    if (seen.has(fn)) return;
    seen.add(fn);
    for (const [key, value] of Object.entries(fn.__closure ?? {})) {
      assert.notEqual(value, undefined, `${chain}.${key} was captured before initialization`);
      if (typeof value === 'function' && value.__initData) check(value, `${chain}.${key}`);
    }
  }
  check(systemModule.stepGuards, 'stepGuards');
});

test('invalid contact distance safely stops without poisoning the position', () => {
  for (const distance of [undefined, NaN, Infinity, -1]) {
    const g = guard();
    onUI(travelModule.pursue)(g, nav(), 168, 1 / 60, 1, distance);
    assert.equal(g.x, 0); assert.equal(g.y, 0); assert.equal(g.speed, 0);
  }
});

test('missing live target uses known finite LKP or stops safely', () => {
  const move = onUI(travelModule.pursue);
  const g = { ...guard(), targetX: undefined, hasLkp: true, lkpX: 100, lkpY: 0 };
  move(g, nav(), 168, 1 / 60, 1, 20);
  assert.equal(g.targetX, 100); assert(g.x > 0);
  const missing = { ...guard(), targetY: NaN, hasLkp: false };
  move(missing, nav(), 168, 1 / 60, 1, 20);
  assert.equal(missing.x, 0); assert.equal(missing.speed, 0);
});

test('malformed path and invalid timing cannot produce nonfinite travel', () => {
  const move = onUI(travelModule.travel);
  for (const broken of [undefined, [4], [NaN, 0]]) {
    const g = { ...guard(), path: broken };
    move(g, nav(), 168, 1 / 60, 1, true);
    assert(Number.isFinite(g.x) && Number.isFinite(g.y));
  }
  for (const dt of [NaN, Infinity, 0]) {
    const g = guard();
    move(g, nav(), 168, dt, 1, true);
    assert.equal(g.x, 0); assert.equal(g.speed, 0);
  }
});
