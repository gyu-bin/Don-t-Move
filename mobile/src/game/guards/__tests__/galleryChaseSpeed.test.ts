import assert from 'node:assert/strict';
import {test} from 'node:test';
import {directChaseSpeed} from '../guardChaseSpeed';
import {galleryStraight,controllerProfile} from '../../../../tools/environment/galleryChaseSpeedQA';
import {measureSpeeds} from '../../../../tools/campaign/chaseBalanceQA';
import {galleryCoverEscape} from '../../../../tools/environment/galleryChaseEscapeQA';
import {Awareness} from '../../core/types';

test('Gallery visual-contact pursuit is faster; Museum/other chapters and unknown mission preserve168',()=>{
 for(const mission of ['02-01','02-06','02-10'])assert.equal(directChaseSpeed(mission),178);
 for(const mission of [undefined,'01-10','03-01','09-10'])assert(Math.abs(directChaseSpeed(mission)-168)<1e-9);
 const s=measureSpeeds();assert(Math.abs(s.run-150)<1e-8);assert(Math.abs(s.support-80.6)<1e-8);assert(Math.abs(s.theft-70.2)<1e-8);
});
test('Gallery actual world speed178 closes gap every2s; near-player no braking, eventual contact capture',()=>{
 const r=galleryStraight();assert(Math.abs(r.steadyGuardSpeed-178)<1e-8);assert(Math.abs(r.steadyPlayerSpeed-150)<1e-8);
 assert(!Number.isNaN(r.minNearSpeed));assert(r.minNearSpeed>177.9);assert(r.caught);assert(r.caughtAt>6);
 for(let i=2;i<r.samples.length;i++)assert(Math.abs(r.samples[i-1].gap-r.samples[i].gap-56)<1e-6);
});
test('Gallery pursue obstacle/corner controller reaches178 without steady speed reset',()=>{
 for(const r of controllerProfile(178)){
  assert(Math.abs(r.maxActualSpeed-178)<1e-6,r.mode);assert(r.fullSpeedFrames>100,r.mode);
  if(r.mode!=='reversal')assert.equal(r.zeroFrames,0,r.mode);
 }
});
test('Gallery06 central island and10 chamber cover break full178 chase without hidden position updates',()=>{
 for(const mission of [6,10]){
  const r=galleryCoverEscape(mission);assert(r.passed,`02-${mission}`);
  if(!r.passed)return;
  assert(r.peakActualSpeed!>177.9);assert.equal(r.caught,false);assert.equal(r.wrongHiddenUpdates,0);assert.equal(r.collisionSamples,0);
  assert(r.firstPhysicalLosBreak!==null,'actual blocker ray, not just turning the cone away');
  for(const state of [Awareness.Chase,Awareness.Investigate,Awareness.Search])assert(r.states!.includes(state));
 }
});
