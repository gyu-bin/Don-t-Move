import assert from 'node:assert/strict';
import {test} from 'node:test';
import {usesTiltInput} from '../inputPolicy';

import {androidMotionToAttitude} from '../androidMotion';
import type {AndroidMotionMeasurement} from '../androidMotion';
import {createTiltState,DEFAULT_TILT,multiply,recenterTilt,relativeTilt,stepTilt} from '../tilt';
import type {Quaternion,AttitudeSample} from '../tilt';
import {movementName} from '../tiltMovement';

import {createAndroidTiltSession} from '../androidTiltSession';
import type {AndroidTiltStatus} from '../androidTiltSession';

test('Android Tilt follows actual availability/failure; release iOS contract stays strict',()=>{
 for(const dev of [false,true]){
  assert.equal(usesTiltInput('android',dev,null,false,false),false);
  assert.equal(usesTiltInput('android',dev,null,false,true),true);
  assert.equal(usesTiltInput('android',dev,null,true,true),false);
  assert.equal(usesTiltInput('web',dev,null,false,true),false);
 }
 assert.equal(usesTiltInput('ios',false,null),true);
 assert.equal(usesTiltInput('ios',true,null),false);
 assert.equal(usesTiltInput('ios',false,{isSimulator:true,available:true}),false);
 assert.equal(usesTiltInput('ios',false,{isSimulator:false,available:true}),true);
});
const identity={x:0,y:0,z:0,w:1};
const near=(a:number,b:number,e=1e-6)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
function axis(x:number,y:number,z:number,degrees:number):Quaternion{const k=Math.sin(degrees*Math.PI/360)/Math.hypot(x,y,z);return{x:x*k,y:y*k,z:z*k,w:Math.cos(degrees*Math.PI/360)};}
/** Independent Android SensorManager extraction from a known orientation matrix. */
function nativeMeasurement(q:Quaternion=identity,t=1):AndroidMotionMeasurement{
 const{x,y,z,w}=q,r1=2*(x*y-z*w),r4=1-2*(x*x+z*z),r6=2*(x*z-y*w),r7=2*(y*z+x*w),r8=1-2*(x*x+y*y);
 return {rotation:{alpha:-Math.atan2(r1,r4),beta:Math.asin(Math.max(-1,Math.min(1,r7))),gamma:Math.atan2(-r6,r8),timestamp:t},rotationRate:{alpha:0,beta:0,gamma:0,timestamp:t},acceleration:{x:0,y:0,z:0,timestamp:t},orientation:0};
}
function converted(q=identity,t=1){const a=androidMotionToAttitude(nativeMeasurement(q,t),t*1000);assert(a);return a;}
test('Android native orientation matrix reconstructs active quaternion for arbitrary comfortable pose',()=>{
 for(const q of[identity,axis(1,0,0,88),axis(1,0,0,180),axis(1,2,3,123),axis(0,0,1,-179)]){
  const a=converted(q).q;near(Math.abs(q.x*a.x+q.y*a.y+q.z*a.z+q.w*a.w),1);
 }
});
test('Android unit conversion matches shared radians/sec and g calibration contract',()=>{
 const m=nativeMeasurement();m.rotationRate={alpha:180,beta:0,gamma:0,timestamp:1};m.acceleration={x:9.80665,y:0,z:0,timestamp:1};
 const a=androidMotionToAttitude(m,1000);assert(a);near(a.rotationRate,Math.PI);near(a.acceleration,1);assert.equal(a.timestamp,1);
});
test('Android relative left/right/forward/back remains stable at reclined and inverted Neutral',()=>{
 for(const neutral of[identity,axis(1,0,0,80),axis(1,0,0,180),axis(1,2,3,125)])for(const sign of[-1,1]){
  const base=converted(neutral).q;
  const roll=relativeTilt(base,converted(multiply(neutral,axis(0,1,0,12*sign))).q);
  const pitch=relativeTilt(base,converted(multiply(neutral,axis(1,0,0,12*sign))).q);
  near(roll.roll,12*sign);near(roll.pitch,0);near(pitch.pitch,12*sign);near(pitch.roll,0);
 }
});
test('Android yaw crossing +/-180 and screen-normal twist do not cause movement',()=>{
 const base=axis(0,0,1,179);near(relativeTilt(converted(base).q,converted(axis(0,0,1,-179)).q).magnitude,0);
 const neutral=axis(1,2,3,85),tilted=multiply(neutral,axis(0,1,0,10));
 const a=relativeTilt(converted(neutral).q,converted(tilted).q),b=relativeTilt(converted(neutral).q,converted(multiply(tilted,axis(0,0,1,140))).q);
 near(a.roll,b.roll);near(a.pitch,b.pitch);
});
test('Android samples use shared calibration, radial response, smoothing and manual recenter',()=>{
 const s=createTiltState();for(let i=0;i<=32;i++)stepTilt(s,converted(identity,i/60),i/60*1000,1/60,DEFAULT_TILT);assert(s.neutral);
 const baseline={...s.neutral};stepTilt(s,converted(axis(0,1,0,1),1),1000,1/60,DEFAULT_TILT);near(s.x,0);
 stepTilt(s,converted(axis(0,1,0,16),1.1),1100,1/60,DEFAULT_TILT);assert(s.x>0&&s.x<1);
 stepTilt(s,converted(axis(0,1,0,16),1.2),1200,1,{...DEFAULT_TILT,smoothing:0});near(s.x,1);
 stepTilt(s,converted(axis(1,1,0,16),1.3),1300,1,{...DEFAULT_TILT,smoothing:0});near(Math.hypot(s.x,s.y),1);
 assert.deepEqual(s.neutral,baseline);assert(recenterTilt(s,converted(axis(1,1,0,16),1.3),1300));near(s.x,0);near(s.y,0);
 for(const[speed,state]of[[0,'IDLE'],[20,'SNEAK'],[60,'WALK'],[120,'RUN']]as const)assert.equal(movementName(speed),state);
});
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
function harness(availability:()=>Promise<boolean>=async()=>true){
 let time=0,next=0,removed=0;const timers=new Map<number,{at:number;fn:()=>void}>();
 const listeners:((m:AndroidMotionMeasurement)=>void)[]=[],samples:AttitudeSample[]=[],statuses:AndroidTiltStatus[]=[],errors:string[]=[],active:boolean[]=[],available:boolean[]=[];
 const session=createAndroidTiltSession({motion:{isAvailableAsync:availability,setUpdateInterval:(ms)=>assert(ms>=16),addListener(fn){listeners.push(fn);return{remove(){removed++;}};}},onSample:s=>samples.push(s),onStatus:s=>statuses.push(s),onError:e=>errors.push(e),onActive:a=>active.push(a),onAvailable:a=>available.push(a),now:()=>time,
  setTimer(fn,ms){const id=++next;timers.set(id,{at:time+ms,fn});return id as unknown as ReturnType<typeof setTimeout>;},clearTimer(t){timers.delete(t as unknown as number);},startupTimeoutMs:3000,staleTimeoutMs:1000,retryIntervalMs:150});
 async function advance(ms:number){const end=time+ms;while(true){const n=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!n)break;time=n[1].at;timers.delete(n[0]);n[1].fn();await settle();}time=end;await settle();}
 return{session,listeners,samples,statuses,errors,active,available,timers,advance,removed:()=>removed};
}
test('Android partial/invalid/unsynchronized native events do not fabricate samples',()=>{
 for(const m of[{}, {...nativeMeasurement(),rotation:null},{...nativeMeasurement(),acceleration:null},{...nativeMeasurement(),orientation:45},{...nativeMeasurement(),rotation:{alpha:NaN,beta:0,gamma:0,timestamp:1}},{...nativeMeasurement(),rotationRate:{alpha:0,beta:0,gamma:0,timestamp:0}}])assert.equal(androidMotionToAttitude(m,1000),null);
});
test('Android startup waits for delayed availability and a valid first sample',async()=>{
 let attempts=0;const h=harness(async()=>++attempts>=3);h.session.setAppState('active');await settle();assert.equal(h.listeners.length,0);await h.advance(300);assert.equal(h.listeners.length,1);assert(!h.statuses.includes('ready'));
 h.listeners[0]({});assert.equal(h.samples.length,0);h.listeners[0](nativeMeasurement());assert.equal(h.samples.length,1);assert.equal(h.statuses.at(-1),'ready');assert.equal(h.available.at(-1),true);assert.equal(h.active.at(-1),true);h.session.dispose();assert.equal(h.active.at(-1),false);assert.equal(h.timers.size,0);
});
test('Android absent sensors fall back after bounded startup and disposal stops retry',async()=>{
 const h=harness(async()=>false);h.session.setAppState('active');await settle();await h.advance(3000);assert.equal(h.statuses.at(-1),'unavailable');assert.equal(h.listeners.length,0);assert.equal(h.available.at(-1),false);assert.equal(h.active.at(-1),false);assert(h.errors.at(-1)?.includes('unavailable'));assert.equal(h.timers.size,0);h.session.dispose();
});
test('Android stale availability promise cannot subscribe after background or disposal',async()=>{
 const resolves:((v:boolean)=>void)[]=[];const h=harness(()=>new Promise(r=>resolves.push(r)));h.session.setAppState('active');h.session.setAppState('background');resolves[0](true);await settle();assert.equal(h.listeners.length,0);
 h.session.setAppState('active');h.session.dispose();resolves[1](true);await settle();assert.equal(h.listeners.length,0);assert.equal(h.timers.size,0);
});
test('Android unsubscribe/resubscribe drops old listener and cached timestamp',async()=>{
 const h=harness();h.session.setAppState('active');await settle();h.listeners[0](nativeMeasurement(identity,1));h.session.setAppState('background');assert.equal(h.removed(),1);h.listeners[0](nativeMeasurement(identity,2));assert.equal(h.samples.length,1);
 await h.advance(2000);h.session.setAppState('active');await settle();assert.equal(h.listeners.length,2);h.listeners[1](nativeMeasurement(identity,1));assert.equal(h.samples.length,1);h.listeners[1](nativeMeasurement(identity,3));assert.equal(h.samples.length,2);assert.equal(h.statuses.at(-1),'ready');h.session.dispose();assert.equal(h.removed(),2);
});
test('Android duplicate cached updates cannot keep a stalled stream alive',async()=>{
 const h=harness();h.session.setAppState('active');await settle();h.listeners[0](nativeMeasurement());await h.advance(900);h.listeners[0](nativeMeasurement());await h.advance(100);assert.equal(h.statuses.at(-1),'unavailable');assert.equal(h.samples.length,1);assert.equal(h.removed(),1);h.session.dispose();
});
test('Android changed display axes end session instead of silently moving Neutral',async()=>{
 const h=harness();h.session.setAppState('active');await settle();h.listeners[0](nativeMeasurement(identity,1));h.listeners[0]({...nativeMeasurement(identity,2),orientation:90});assert.equal(h.statuses.at(-1),'unavailable');assert(h.errors.at(-1)?.includes('orientation'));assert.equal(h.samples.length,1);h.session.dispose();
});
test('Android resume rejects increasing but bridge-delayed samples until clock catches up',async()=>{
 const h=harness();h.session.setAppState('active');await settle();h.listeners[0](nativeMeasurement(identity,1));h.session.setAppState('background');await h.advance(800);
 h.session.setAppState('active');await settle();h.listeners[1](nativeMeasurement(identity,1.1));assert.equal(h.samples.length,1);
 h.listeners[1](nativeMeasurement(identity,1.8));assert.equal(h.samples.length,2);assert.equal(h.samples[1].receivedAt,800);h.session.dispose();
});
test('Android available API without complete sensor samples expires safely',async()=>{
 const h=harness();h.session.setAppState('active');await settle();h.listeners[0]({rotation:nativeMeasurement().rotation});await h.advance(3000);
 assert.equal(h.statuses.at(-1),'unavailable');assert.equal(h.samples.length,0);assert.equal(h.removed(),1);h.session.dispose();
});
test('Android natural-landscape display remapping preserves portrait forward tilt axes',()=>{
 for(const orientation of[90,-90]){
  const neutral=androidMotionToAttitude({...nativeMeasurement(),orientation},1000)!;
  const tipped=androidMotionToAttitude({...nativeMeasurement(axis(0,1,0,orientation===90?12:-12)),orientation},1000)!;
  const v=relativeTilt(neutral.q,tipped.q);near(v.pitch,12);near(v.roll,0);
 }
});
