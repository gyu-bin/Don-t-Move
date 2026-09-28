import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { advancePlayerSpritePhase, GAIT_SPEED, PLAYER_SPRITE_SCALE } from '../core/locomotion';
import { RIGHT_WALK_TRIAL_STRIDE, rightWalkTrialStride, fitStanceStep } from '../core/rightWalkTrial';
import * as locomotion from '../core/locomotion';

test('compiled UI worklet resolves default switch without module globals', () => {
  const require = createRequire(import.meta.url);
  const babel = require('@babel/core');
  for (const dev of [true, false]) {
    const compiled = babel.transformFileSync(new URL('../core/rightWalkTrial.ts', import.meta.url).pathname, {
      configFile: false, babelrc: false,
      presets: ['@babel/preset-typescript'],
      plugins: ['react-native-worklets/plugin', '@babel/plugin-transform-modules-commonjs'],
    });
    const exports: Record<string, any> = {};
    vm.runInNewContext(compiled.code, { exports, __DEV__: dev, global: { Error }, require: () => locomotion });
    const worklet = exports.rightWalkTrialStride;
    // Separate UI realm intentionally has no RIGHT_WALK_TRIAL_ENABLED global.
    const uiFn = vm.runInNewContext(`(${worklet.__initData.code})`, {});
    assert.equal(uiFn.call({ __closure: worklet.__closure }, 72, 0), dev ? RIGHT_WALK_TRIAL_STRIDE : undefined);
    assert.equal(uiFn.call({ __closure: worklet.__closure }, 72, 0, false), undefined);
  }
});
test('trial stride fits artwork, does not alter speed', () => {
  assert.equal(GAIT_SPEED[2], 72);
  assert.ok(Math.abs(RIGHT_WALK_TRIAL_STRIDE - 25.4 * 8 * PLAYER_SPRITE_SCALE) < 1e-9);
  assert.equal(fitStanceStep([28, 3.5, -32.5, -44]), 25.2);
});
test('only enabled right WALK selects trial; rollback and other clips unchanged', () => {
  assert.equal(rightWalkTrialStride(72, 0, true), RIGHT_WALK_TRIAL_STRIDE);
  for (const [speed, facing, enabled] of [[72, 0, false], [38, 0, true], [73, 0, true], [72, Math.PI, true], [72, Math.PI/2, true]] as const)
    assert.equal(rightWalkTrialStride(speed, facing, enabled), undefined);
});
test('distance phase freezes when blocked, preserves phase at clip switch', () => {
  const phase = 0.3;
  assert.equal(advancePlayerSpritePhase(phase, 0, 72, RIGHT_WALK_TRIAL_STRIDE), phase);
  assert.ok(Math.abs(advancePlayerSpritePhase(phase, RIGHT_WALK_TRIAL_STRIDE/8, 72, RIGHT_WALK_TRIAL_STRIDE) - 0.425) < 1e-9);
  assert.equal(advancePlayerSpritePhase(phase, 0, 72), phase);
  assert.equal(advancePlayerSpritePhase(0, 30, 72), 0.5);
});
