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
const cameras = load(path.join(root, 'game/security/cctv.ts'));
const theft = load(path.join(root, 'game/guards/theftAlert.ts'));
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

test('serialized Camera sweep/LOS/alert has initialized worklet dependencies and freezes hidden LKP', () => {
  const seen = new Set();
  function check(fn) {
    if (seen.has(fn)) return;seen.add(fn);
    assert(fn.__initData, 'UI-callable helper must be a worklet');
    for (const [key,value] of Object.entries(fn.__closure)) {
      assert.notEqual(value,undefined, `Uninitialized UI closure: ${key}`);
      if (typeof value === 'function') {assert(value.__initData, `${key} missing worklet directive`);check(value);}
    }
  }
  check(cameras.stepSecurityCameras);
  const camera=cameras.createSecurityCamera({id:'camera',x:100,y:100,centerFacing:0,sweepAngle:0,sweepSpeed:.4,pauseAtEnds:.5,range:220,visionAngle:.7});
  const events={cameraSeesPlayer:false,cameraAlertRevision:0,globalRevision:0,globalAlert:false,globalX:0,globalY:0,alertCount:0};
  const step=onUI(cameras.stepSecurityCameras);
  for(let f=0;f<300;f++)step([camera],{x:200,y:100,gait:3},[],events,1/60,f/60);
  assert(events.globalAlert);assert.equal(events.cameraAlertRevision,1);assert.equal(events.globalX,200);
  step([camera],{x:260,y:100,gait:3},[150,0,180,200],events,1/60,6);
  assert.equal(camera.canSee,false);assert.equal(events.globalX,200);
});
test('serialized theft sector dispatch helper is callable on UI and never uses player data', () => {
  const get=onUI(theft.theftSearchPosts);
  const context={posts:[[{x:0,y:0}]],sectors:[[{id:'a',anchors:[{x:40,y:50}]},{id:'b',anchors:[{x:70,y:80}]}]]};
  assert.deepEqual(JSON.parse(JSON.stringify(get(context,0,[]))),[{x:40,y:50},{x:70,y:80}]);
});
