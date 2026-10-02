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

const movement = load(path.join(root, 'game/input/tiltMovement.ts'));
const simulation = load(path.join(root, 'game/playground/playgroundState.ts'));
const collision = load(path.join(root, 'game/world/collision.ts'));
test('serialized collision and simulation captures have no undefined dependency', () => {
 const seen=new Set();
 function check(fn, chain){
  if(seen.has(fn))return;seen.add(fn);
  for(const [key,value] of Object.entries(fn.__closure??{})){
   assert.notEqual(value,undefined,chain+'.'+key);
   if(typeof value==='function'&&value.__initData)check(value,chain+'.'+key);
  }
 }
 check(simulation.stepPlayground,'stepPlayground');
 check(movement.stepTiltPlayer,'stepTiltPlayer');
 check(collision.moveWithCollision,'moveWithCollision');
});
test('serialized collision cancels bad vectors without invoking an RN-only helper',()=>{
 const p={x:60,y:60};onUI(collision.moveWithCollision)(p,Infinity,5,9,[]);
 assert.equal(p.x,60);assert.equal(p.y,60);
});
test('serialized Tilt zero-delta frame does not poison velocity or gait',()=>{
 const p={x:60,y:60,vx:0,vy:0,speed:0,phase:0,spritePhase:0,gait:0,visualGait:0,inputReset:0};
 onUI(movement.stepTiltPlayer)(p,{x:1,y:1,paused:false,reset:0},0,[]);
 assert.equal(p.vx,0);assert.equal(p.speed,0);assert.equal(p.spritePhase,0);
});
