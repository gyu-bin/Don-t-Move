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

const doors=load(path.join(root,'game/doors/doorSystem.ts'));
const simulation=load(path.join(root,'game/playground/playgroundState.ts'));
const compiler=load(path.join(root,'game/world/compileStage.ts'));
const navigation=load(path.join(root,'game/world/navigation.ts'));

test('serialized door closures pause for actor occupancy then commit collision once',()=>{
 const door=doors.createDoor({id:'quick',type:'solid',x:100,y:100,width:80,thickness:8,orientation:'horizontal'});
 const step=onUI(doors.stepDoors),geometry=onUI(doors.doorBlockers);
 assert.equal(step([door],1,['quick'],[{x:100,y:100,radius:9}]),0);
 assert.equal(door.progress,0);
 assert.equal(step([door],1,['quick'],[]),1);
 assert.equal(geometry([door]).visionBlockers.length,4);
 assert.equal(step([door],1,['quick'],[]),0);
});

test('serialized actual simulation closes designated door and rebuilds effective nav at 28 seconds',()=>{
 const stage=compiler.compileStage({id:'serialized-door',number:1,title:'Door',chapter:1,theme:'museum',
 layout:['########','#......#','#......#','#......#','#......#','########'],props:[],lights:[],guards:[],patrolRoutes:[],
 playerSpawn:{x:2,y:2,facing:0},doors:[{id:'quick',type:'solid',x:4,y:3,width:2,thickness:.2,orientation:'vertical',closeDuration:.1}],lockdownDoors:['quick']});
 const s=simulation.createPlaygroundState(stage),nav=navigation.buildNavigation(stage,8);s.playerMode=0;
 s.events.theftAlert=true;s.events.theftActivatedAt=0;s.t=27.99;
 onUI(simulation.stepPlayground)(s,.12,40,300,500,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
 assert.equal(s.doors[0].state,'CLOSED');assert.equal(s.events.lockdownActive,true);
 assert.ok(s.effectiveNavigation);assert.equal(s.doorGeometryRevision,1);
});
