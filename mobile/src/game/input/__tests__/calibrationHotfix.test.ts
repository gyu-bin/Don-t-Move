import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTiltState,DEFAULT_TILT,stepTilt,recenterTilt,CALIBRATION_TIMEOUT_MS} from '../tilt';
import {createIOSTiltSession,requestMotionPermission} from '../iosTiltSession';
import type {AttitudeSample} from '../tilt';
const identity={x:0,y:0,z:0,w:1};
const sample=(now:number,q=identity):AttitudeSample=>({q,timestamp:now/1000,receivedAt:now,rotationRate:1,acceleration:.3});
const settle=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};

test('Shaking calibration reaches READY once at 2.5 seconds with recent sign-aligned median',()=>{
 const s=createTiltState();
 for(let now=0;now<=2500;now+=20){
  const q=now%60===0?{x:0,y:.5,z:0,w:Math.sqrt(.75)}:now%40===0?{x:0,y:0,z:0,w:-1}:identity;
  stepTilt(s,sample(now,q),now,.02,DEFAULT_TILT);
 }
 assert.equal(s.calibrationMethod,'recent-median');assert.equal(s.status,'READY');assert(s.neutral);assert(Math.abs(s.neutral.w)===1);assert(Math.hypot(s.neutral.x,s.neutral.y,s.neutral.z)<1e-8);
 const neutral={...s.neutral!};
 for(let now=2520;now<6000;now+=20)stepTilt(s,sample(now,{x:0,y:.1,z:0,w:Math.sqrt(.99)}),now,.02,DEFAULT_TILT);
 assert.equal(s.status,'PLAY');assert.deepEqual(s.neutral,neutral);
});
test('Missing/stale/duplicate/invalid samples never fabricate a neutral at deadline',()=>{
 for(const kind of ['missing','stale','invalid','duplicate']){
  const s=createTiltState();
  for(let now=0;now<=CALIBRATION_TIMEOUT_MS+100;now+=20){
   const value=kind==='missing'?null:kind==='invalid'?sample(now,{x:NaN,y:0,z:0,w:1}):sample(0);
   stepTilt(s,value,now,.02,DEFAULT_TILT);
  }
  assert.equal(s.neutral,null,kind);assert.equal(s.status,'SENSOR PAUSED',kind);assert.equal(s.x,0);
 }
});
test('Manual recenter clears calibration history and smoothing without later fallback replacing it',()=>{
 const s=createTiltState();for(let now=0;now<1000;now+=20)stepTilt(s,sample(now),now,.02,DEFAULT_TILT);
 s.smoothX=1;s.x=1;
 const q={x:0,y:.2,z:0,w:Math.sqrt(.96)};
 assert(recenterTilt(s,sample(1000,q),1000));assert.equal(s.calibrationSamples.length,0);assert.equal(s.candidate,null);assert.equal(s.stableSince,0);assert.equal(s.x,0);assert.equal(s.smoothX,0);
 for(let now=1020;now<5000;now+=20)stepTilt(s,sample(now),now,.02,DEFAULT_TILT);
 assert.deepEqual(s.neutral,q);assert.equal(s.calibrationMethod,'manual');
});
test('READY survives temporary missing samples and cannot enter PLAY before its feedback deadline',()=>{
 const s=createTiltState();
 for(let now=0;now<=500;now+=20)stepTilt(s,{...sample(now),rotationRate:0,acceleration:0},now,.02,DEFAULT_TILT);
 assert.equal(s.status,'READY');stepTilt(s,null,520,.02,DEFAULT_TILT);assert.equal(s.status,'SENSOR PAUSED');
 stepTilt(s,sample(600),600,.02,DEFAULT_TILT);assert.equal(s.status,'READY');assert.equal(s.x,0);
 stepTilt(s,sample(900),900,.02,DEFAULT_TILT);assert.equal(s.status,'PLAY');
});

function harness(hung=false){
 let clock=0,id=0,starts=0,stops=0,resets=0,calibrating=true;
 const timers=new Map<number,{at:number;fn:()=>void}>(),samples:AttitudeSample[]=[],errors:string[]=[],active:boolean[]=[];
 const session=createIOSTiltSession({
  start:()=>{starts++;return hung?new Promise<void>(()=>{}):Promise.resolve();},stop:()=>{stops++;return Promise.resolve();},
  isCalibrating:()=>calibrating,onCalibrationStart:()=>{resets++;},onSample:s=>samples.push(s),onActive:v=>active.push(v),onError:e=>errors.push(e),
  now:()=>clock,setTimer:(fn,ms)=>{timers.set(++id,{at:clock+ms,fn});return id as unknown as ReturnType<typeof setTimeout>;},clearTimer:timer=>{timers.delete(timer as unknown as number);},
 });
 const advance=async(ms:number)=>{
  const end=clock+ms;
  while(true){const next=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;
   clock=next[1].at;timers.delete(next[0]);next[1].fn();await settle();
  }clock=end;await settle();
 };
 return{session,advance,samples,errors,active,timers,clock:()=>clock,starts:()=>starts,stops:()=>stops,resets:()=>resets,setCalibrating:(v:boolean)=>{calibrating=v;}};
}
test('Missing stream or hung native start reconnects once and ends waiting by 3 seconds',async()=>{
 for(const hung of [false,true]){
  const h=harness(hung);h.session.setAppState('active');await settle();await h.advance(1500);assert.equal(h.starts(),2);
  await h.advance(1500);assert(h.errors.at(-1)?.includes('RETRY SENSOR'));assert.equal(h.active.at(-1),false);assert.equal(h.timers.size,0);
  h.session.receive(sample(3000));assert.equal(h.samples.length,0);await h.advance(10000);assert.equal(h.starts(),2);h.session.dispose();
 }
});
test('Background during calibration restarts safely; background after PLAY waits for explicit Retry',async()=>{
 const h=harness();h.session.setAppState('active');await settle();h.session.receive(sample(0));
 h.session.setAppState('background');await h.advance(10000);assert.equal(h.starts(),1);h.session.receive(sample(10000));assert.equal(h.samples.length,1);
 h.session.setAppState('active');await settle();assert.equal(h.starts(),2);assert.equal(h.resets(),2);
 h.session.receive(sample(10000));h.setCalibrating(false);h.session.setAppState('background');h.session.setAppState('active');await settle();
 assert.equal(h.starts(),2);assert.equal(h.resets(),2);assert(h.errors.at(-1)?.includes('session ended'));h.session.dispose();
});
test('Temporary inactivity retains neutral and stale PLAY stream fails without automatic recalibration',async()=>{
 const h=harness();h.session.setAppState('active');await settle();h.session.receive(sample(0));h.setCalibrating(false);
 h.session.setAppState('inactive');await h.advance(10000);h.session.setAppState('active');await settle();
 assert.equal(h.starts(),1);assert.equal(h.resets(),1);h.session.receive(sample(10000));await h.advance(1500);
 assert.equal(h.starts(),1);assert.equal(h.active.at(-1),false);assert(h.errors.at(-1)?.includes('RETRY SENSOR'));h.session.dispose();
});
test('Background remembers unfinished READY transition even when pause changes current UI status',async()=>{
 const h=harness();h.session.setAppState('active');await settle();
 h.session.setAppState('background');h.setCalibrating(false);h.session.setAppState('active');await settle();
 assert.equal(h.starts(),2);assert.equal(h.resets(),2);h.session.dispose();
});
test('Real JS watchdog expires absent stream even without UI frames or resolved native promise',async()=>{
 let starts=0;const began=Date.now();
 await new Promise<void>((resolve,reject)=>{
  const guard=setTimeout(()=>reject(new Error('Watchdog failed to terminate calibration')),4500);
  const session=createIOSTiltSession({start:()=>{starts++;return new Promise<void>(()=>{});},stop:async()=>{},isCalibrating:()=>true,
   onCalibrationStart:()=>{},onSample:()=>{},onActive:()=>{},onError:message=>{if(message.includes('RETRY SENSOR')){clearTimeout(guard);session.dispose();resolve();}},
  });session.setAppState('active');
 });
 assert.equal(starts,2);assert(Date.now()-began>=3000);
});
test('Hung permission ends with timeout; late grant cannot start that stale attempt',async()=>{
 let grant:(value:{granted:boolean})=>void=()=>{},starts=0;
 const pending=new Promise<{granted:boolean}>(resolve=>{grant=resolve;});
 const attempt=requestMotionPermission(()=>pending,10);
 void attempt.result.then(value=>{if(value.status==='granted')starts++;});
 assert.equal((await attempt.result).status,'timeout');grant({granted:true});await settle();
 assert.equal(starts,0);
});
test('Cancel/disposal invalidates old permission generation while explicit Retry accepts its own grant',async()=>{
 let grantOld:(value:{granted:boolean})=>void=()=>{},starts=0;
 const old=requestMotionPermission(()=>new Promise(resolve=>{grantOld=resolve;}),1000);
 void old.result.then(value=>{if(value.status==='granted')starts++;});old.cancel();
 assert.equal((await old.result).status,'cancelled');
 const retry=requestMotionPermission(async()=>({granted:true}),1000);
 void retry.result.then(value=>{if(value.status==='granted')starts++;});assert.equal((await retry.result).status,'granted');
 grantOld({granted:true});await settle();assert.equal(starts,1);
});
test('Denied or rejected permission never fabricates approval',async()=>{
 assert.equal((await requestMotionPermission(async()=>({granted:false}),1000).result).status,'denied');
 const failure=await requestMotionPermission(()=>Promise.reject(new Error('permission bridge failure')),1000).result;
 assert.equal(failure.status,'error');assert.match(failure.message!,/bridge failure/);
 const thrown=await requestMotionPermission(()=>{throw new Error('native missing');},1000).result;
 assert.equal(thrown.status,'error');
});
