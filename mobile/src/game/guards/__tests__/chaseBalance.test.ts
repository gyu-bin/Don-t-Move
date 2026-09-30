import assert from 'node:assert/strict';
import {test} from 'node:test';
import {measureSpeeds,straightChase,cornerEscape,cornerEscapeFull,corridor,chaseTrace} from '../../../../tools/campaign/chaseBalanceQA';
import {CAPTURE_DISTANCE,CONTACT_DISTANCE,stepGuards} from '../guardSystem';
import {Awareness} from '../../core/types';

test('final displacement: direct witness outruns max Run; support and theft do not stack',()=>{
 const s=measureSpeeds();
 assert(Math.abs(s.run-150)<1e-6);assert(Math.abs(s.tiltRun-s.run)<1e-6);
 assert(s.direct/s.run>=1.10&&s.direct/s.run<=1.15);
 assert(s.support<s.run&&s.theft<s.support);
 assert(Math.abs(s.theft/s.normal-1.35)<1e-6);
 assert(Math.abs(s.lockdown/s.normal-1.45)<1e-6);
 assert(s.support/s.normal>=1.5,'support is clearly faster than pre-alert patrol');
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

test('direct chase never brakes near the player: gap closes steadily down to contact, then CAUGHT',()=>{
 assert(CONTACT_DISTANCE<CAPTURE_DISTANCE,'pursuit stop distance sits inside the capture distance');
 const r=chaseTrace(280);
 assert(r.caught,'straight Run without breaking LOS is eventually caught');
 assert(r.caughtAt<17,`caught at ${r.caughtAt}`); // 280 start, player accelerates first: gap peaks ≈297, then −18/s
 // After reaching full speed, every 0.5 s the gap shrinks by ≈ (168-150)·0.5 = 9, including the last metres.
 for(let i=3;i<r.gaps.length;i++)assert(r.gaps[i-1]-r.gaps[i]>8,`gap stalled at ${r.gaps[i-1].toFixed(1)} → ${r.gaps[i].toFixed(1)}`);
 assert(r.minGuardSpeedNear>=167,`guard slowed to ${r.minGuardSpeedNear} within 80 of the player`);
});

test('fair escape: breaking LOS at a corner goes Chase → LKP → Search → Return → Patrol, uncaught',()=>{
 const r=cornerEscapeFull();
 assert(!r.caught);assert(r.alertEnded);
 for(const state of [Awareness.Chase,Awareness.Investigate,Awareness.Search,Awareness.Return])assert(r.states.has(state),`missing state ${state}`);
});

test('01-10 Grand Heist: in-sight gap shrinks, a corner breaks LOS, then LKP → Search → Return uncaught',async()=>{
 const{heistLosBreak}=await import('../../../../tools/campaign/heistChaseQA');
 const r=heistLosBreak();
 assert(!r.caught);assert(r.firstBreak!==null);assert(r.alertEnded);
 assert(r.gaps[2]<r.gaps[1]&&r.gaps[3]<r.gaps[2],'closing while the chaser can see the player');
 for(const s of ['Chase','Investigate','Search','Return'])assert(r.states.includes(s),`missing ${s}`);
});
