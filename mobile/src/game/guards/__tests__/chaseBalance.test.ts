import assert from 'node:assert/strict';
import {test} from 'node:test';
import {measureSpeeds,straightChase,cornerEscape,corridor} from '../../../../tools/campaign/chaseBalanceQA';
import {stepGuards} from '../guardSystem';
import {Awareness} from '../../core/types';

test('final displacement: direct witness outruns max Run; support and theft do not stack',()=>{
 const s=measureSpeeds();
 assert(Math.abs(s.run-150)<1e-6);assert(Math.abs(s.tiltRun-s.run)<1e-6);
 assert(s.direct/s.run>=1.10&&s.direct/s.run<=1.15);
 assert(s.support<s.run&&s.theft<s.support);
 assert(Math.abs(s.theft/s.normal-1.25)<1e-6);
 assert(Math.abs(s.lockdown/s.normal-1.30)<1e-6);
});
test('continuous straight Run loses distance at both five and ten seconds',()=>{
 const r=straightChase();assert(r.gaps[1]<r.gaps[0]);assert(r.gaps[2]<r.gaps[1]);
 assert(!r.caught,'a 280-unit initial gap must leave escape reaction time');
});
test('continuous wall-corner escape cuts sight, freezes LKP, reaches Search without capture',()=>{
 const r=cornerEscape();assert(!r.caught);assert(r.firstBreak!==null);assert(r.searched);
 assert(r.hiddenSamples>60);assert.equal(r.wrongHiddenUpdates,0);
});
test('theft plus actual sight uses the direct final speed once, despite patrol pace',()=>{
 const{stage,nav,s}=corridor(),g=s.guards[0],ev=s.events;
 ev.globalAlert=true;ev.theftAlert=true;ev.theftRevision=1;ev.globalRevision=1;g.awareness=Awareness.Chase;g.pace=1.3;
 let distance=0;
 for(let f=0;f<240;f++){
  const x=g.x,y=g.y;
  stepGuards([g],{x:g.x+200,y:g.y,gait:3},stage.visionBlockers,nav,1/60,ev,f/60,true,1,{empty:true,x:4800,y:200,roles:['zone'],posts:[[{x:4800,y:g.y}]]});
  if(f>=120)distance+=Math.hypot(g.x-x,g.y-y);
 }
 assert(Math.abs(distance/2-168)<1e-6);
});

test('01-10 actual corridor: fleeing player loses gap under ordinary sight, then corner breaks LOS',async()=>{
 const{museumCorridorPursuit}=await import('../../../../tools/campaign/chaseMissionQA');
 const r=museumCorridorPursuit(),a=r.trace[1],b=r.trace[2];
 assert(a.visible&&b.visible);assert(a.movingAway>0&&b.movingAway>0);
 assert(Math.abs(a.playerSpeed-150)<1e-6&&Math.abs(b.guardSpeed-168)<1e-6);
 assert(b.gap<a.gap);assert(r.firstBreak!==null);assert(!r.caught);
});
