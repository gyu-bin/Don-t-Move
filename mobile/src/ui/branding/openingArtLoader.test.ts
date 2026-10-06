import assert from 'node:assert/strict';
import test from 'node:test';
import { createOpeningArtLoader, OPTIONAL_OPENING_KEYS } from './openingArtLoader';
import { INTRO_MS, introFrame } from './introTimeline';
const deferred = <T>() => {
 let resolve!: (value:T)=>void, reject!: (error:Error)=>void;
 const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});
 return {promise,resolve,reject};
};

test('ten cold loader instances expose background before all six optional decodes finish',async()=>{
 for(let launch=0;launch<10;launch++){
  const optional=deferred<string>();
  const loader=createOpeningArtLoader(key=>key==='bg'?Promise.resolve('museum'):optional.promise);
  await loader.preload();
  assert.deepEqual(loader.snapshot(),{bg:'museum'});
  optional.resolve('layer');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(Object.keys(loader.snapshot()).length,7);
 }
});

test('each optional decode can reject independently without rejecting Home readiness',async()=>{
 for(const failed of OPTIONAL_OPENING_KEYS){
  const errors:string[]=[];
  const loader=createOpeningArtLoader(key=>key===failed?Promise.reject(new Error('decode')):Promise.resolve(key),100,key=>errors.push(key));
  await loader.preload();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(loader.snapshot().bg,'bg');
  assert.equal(loader.snapshot()[failed],undefined);
  assert.equal(Object.keys(loader.snapshot()).length,6);
  assert.deepEqual(errors,[failed]);
 }
});

test('optional timeout is bounded and late completion does not replace a published snapshot',async()=>{
 const late=deferred<string>();
 const errors:string[]=[];
 const loader=createOpeningArtLoader(key=>key==='guardTurn'?late.promise:Promise.resolve(key),5,key=>errors.push(key));
 await loader.preload();
 await new Promise(resolve=>setTimeout(resolve,15));
 const snapshot=loader.snapshot();
 assert.deepEqual(errors,['guardTurn']);
 late.resolve('late guard');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(loader.snapshot(),snapshot);
 assert.equal(snapshot.bg,'bg');
});

test('critical background failure does not claim readiness and can retry without re-decoding good optional layers',async()=>{
 let calls=0;
 const loader=createOpeningArtLoader(key=>key==='bg'&&calls++===0?Promise.reject(new Error('background failed')):Promise.resolve(key));
 await assert.rejects(loader.preload(),/background failed/);
 assert.equal(loader.snapshot().bg,undefined);
 const listenerSnapshots:unknown[]=[];
 const unsubscribe=loader.subscribe(value=>listenerSnapshots.push(value));
 await loader.preload();
 assert.equal(loader.snapshot().bg,'bg');
 assert.equal(listenerSnapshots.length,2);
 unsubscribe();
});

test('critical timeout is retryable; original late response cannot publish obsolete artwork',async()=>{
 const late=deferred<string>();let attempt=0;
 const loader=createOpeningArtLoader(key=>key==='bg'&&attempt++===0?late.promise:Promise.resolve(key),5);
 await assert.rejects(loader.preload(),/timed out/);
 await loader.preload();late.resolve('obsolete');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(loader.snapshot().bg,'bg');
});

test('intro final and Home retain identical scene with reduced veil',()=>{
 assert.deepEqual(introFrame(INTRO_MS),introFrame(INTRO_MS+500));
 assert.equal(introFrame(INTRO_MS).veil,.28);
});
