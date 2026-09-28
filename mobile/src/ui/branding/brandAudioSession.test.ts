import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startBrandAudioSession} from './brandAudioSession';
import type {BrandClock,BrandPlayer} from './brandAudioSession';

function fixture(){
 const callbacks:(()=>void)[]=[],log:string[]=[],resolvers:(()=>void)[]=[],errors:unknown[]=[];
 const timers={later:(fn:()=>void)=>{callbacks.push(fn);return callbacks.length;},
  repeat:(fn:()=>void)=>{callbacks.push(fn);return callbacks.length;},
  cancelLater:()=>{},cancelRepeat:()=>{}} as unknown as BrandClock;
 const create=(name:string):BrandPlayer=>{
  log.push(name+':create');let released=false;
  const call=(op:string)=>{assert(!released,'native call after release: '+name+':'+op);log.push(name+':'+op);};
  return {
   set volume(value:number){call('volume');},get volume(){return 0;},
   set loop(value:boolean){call('loop');},get loop(){return false;},
   play(){call('play');},pause(){call('pause');},
   seekTo(){call('seek');return new Promise<void>(resolve=>resolvers.push(resolve));},
   release(){call('release');released=true;},
  };
 };
 const start=(intro=true,enabled=true)=>startBrandAudioSession(intro,enabled,create,()=>log.push('haptic'),timers,e=>errors.push(e));
 return {callbacks,log,resolvers,errors,start,create,timers};
}
test('unmount/skip releases owned players after pause, once; late seeks cannot play',async()=>{
 const f=fixture(),dispose=f.start();
 f.callbacks.forEach(fn=>fn()); // Native seek promises are still in flight.
 dispose();dispose();
 const before=f.log.slice();f.callbacks.forEach(fn=>fn());f.resolvers.forEach(resolve=>resolve());
 await Promise.resolve();await Promise.resolve();
 assert.deepEqual(f.log,before);assert.equal(f.errors.length,0);
 assert.equal(f.log.filter(s=>s.endsWith(':release')).length,4);
 for(const name of ['footstep','turn','freeze','logo']){
  assert(f.log.indexOf(name+':pause')<f.log.indexOf(name+':release'));
  assert(!f.log.includes(name+':play'));
 }
});
test('Start ambience cleanup cancels stale fades and mute allocates nothing',()=>{
 const f=fixture(),dispose=f.start(false);f.callbacks[0]();dispose();
 const before=f.log.slice();f.callbacks[0]();assert.deepEqual(f.log,before);
 assert.equal(f.log.filter(s=>s.endsWith(':release')).length,1);assert.equal(f.errors.length,0);
 const muted=fixture();muted.start(true,false)();assert.equal(muted.log.length,0);assert.equal(muted.callbacks.length,0);
});
test('replay / Strict Mode setup-cleanup-setup uses fresh native objects',()=>{
 const f=fixture();for(let i=0;i<3;i++)f.start()();
 assert.equal(f.log.filter(s=>s.endsWith(':create')).length,12);
 assert.equal(f.log.filter(s=>s.endsWith(':release')).length,12);
 assert.equal(f.errors.length,0);
});
test('partial initialization failure releases earlier players without failing render',()=>{
 const f=fixture();let count=0;
 const dispose=startBrandAudioSession(true,true,name=>{
  if(++count===3)throw new Error('audio unavailable');return f.create(name);
 },()=>{},f.timers,e=>f.errors.push(e));
 dispose();assert.equal(f.errors.length,1);
 assert.equal(f.log.filter(s=>s.endsWith(':release')).length,2);
});
