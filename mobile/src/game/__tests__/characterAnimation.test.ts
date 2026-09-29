/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Awareness, GuardAction } from '../core/types';
import { Anim } from '../../rendering/sprites/spriteTypes';
import { createGuardPlayback, guardAnimation, stepGuardPlayback,guardStrideContract } from '../../rendering/characters/guardAnimation';
import { finalCharacterIssues } from '../../assets/characterReadiness';
import type { AssetManifest } from '../../assets/manifest';

const pose={x:100,y:100,speed:0,awareness:Awareness.Patrol as number,action:GuardAction.None as number,whistleT:0};
test('Guard animation reads AI state without changing facing or behavior',()=>{
  for(const [awareness,speed,expected] of [
    [Awareness.Patrol,0,Anim.Idle],[Awareness.Patrol,50,Anim.Walk],
    [Awareness.Suspicious,20,Anim.Walk],[Awareness.Suspicious,0,Anim.Idle],
    [Awareness.Alert,50,Anim.Idle],[Awareness.Chase,80,Anim.Run],
    [Awareness.Investigate,100,Anim.Walk],[Awareness.Investigate,55,Anim.Walk],
    [Awareness.Search,0,Anim.Search],[Awareness.Search,30,Anim.Walk],
    [Awareness.Return,60,Anim.Walk],
  ]) {
    const p={...pose,awareness,speed}; const before={...p};
    assert.equal(guardAnimation(p),expected); assert.deepEqual(p,before);
  }
  assert.equal(guardAnimation({...pose,action:GuardAction.Whistle}),Anim.Whistle);
});
test('Guard playback uses actual distance, preserves phase and aligns whistle to its event clock',()=>{
  const a=createGuardPlayback(pose);
  stepGuardPlayback(a,{...pose,x:110,speed:60},1/60);
  assert.equal(a.phase,0.25);
  stepGuardPlayback(a,{...pose,x:110,speed:150,awareness:Awareness.Chase},1/60);
  assert.equal(a.phase,0.25,'blocked guard must not step');
  assert.equal(a.animation,Anim.Idle,'blocked guard must hold a still pose');
  stepGuardPlayback(a,{...pose,x:123,speed:150,awareness:Awareness.Chase},1/60);
  assert.equal(a.phase,0.5);
  assert.equal(a.animation,Anim.Run);
  stepGuardPlayback(a,{...pose,x:123,action:GuardAction.Whistle,whistleT:0.32},1/60);
  assert.equal(a.time,0.32); assert.equal(a.phase,0.5);
});
test('Release detects missing, reused and unapproved final sheets',()=>{
  const m:AssetManifest={characters:{player:null,guard:null},environment:{museum:null},ui:{indicators:null}};
  assert(finalCharacterIssues(m).some((s)=>s.includes('guard/run')));
  assert(finalCharacterIssues(m).some((s)=>s.includes('player/sneak')));
  m.characters.player={scale:1,clips:{idle:{down:{image:'playerWalk',frames:{count:4,frameW:256,frameH:256}}},
    walk:{down:{image:'playerWalk',frames:{count:8,frameW:256,frameH:256}}}}};
  assert(finalCharacterIssues(m).some((s)=>s.includes('reused')));
  assert(finalCharacterIssues(m).some((s)=>s.includes('approval')));
});

test('Production locomotion atlas clears the release gate',async()=>{
  const previous=require.extensions['.png'];
  require.extensions['.png']=(module)=>{module.exports=0;};
  try{
    const {ASSET_MANIFEST}=await import('../../assets/manifest');
    assert.deepEqual(finalCharacterIssues(ASSET_MANIFEST),[]);
  }finally{
    if(previous)require.extensions['.png']=previous;else delete require.extensions['.png'];
  }
});

test('Guard uses registry artwork stride per direction, not a fixed runtime cadence',()=>{
  const strides=guardStrideContract({scale:0.25,clips:{walk:{right:{image:'legacyGuard',
    frames:{count:8,frameW:256,frameH:256},mode:'distance',strideLength:64}}}});
  const a=createGuardPlayback(pose,strides);
  stepGuardPlayback(a,{...pose,x:108,speed:52,facing:0},1/60);
  assert.equal(a.phase,1/8);
  stepGuardPlayback(a,{...pose,x:108,speed:62.4,facing:0},1/60);
  assert.equal(a.phase,1/8,'speed intent or time cannot animate blocked feet');
});
