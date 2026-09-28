import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bodiesTouch,stepGuards} from '../guards/guardSystem';
import {BODY} from '../guards/guardTuning';
import {createGuardEvents,createGuardState} from '../guards/guardBrain';
import {Awareness} from '../core/types';
import {buildNavigation} from '../world/navigation';
import {compileStage,TILE} from '../world/compileStage';
import {campaignStages} from '../levels/campaignStages';
import {createPlaygroundState,stepPlayground} from '../playground/playgroundState';
import {advancePlayerSpritePhase,playerSpriteGait} from '../core/locomotion';
import {rightWalkTrialStride} from '../core/rightWalkTrial';
import {motionAudit} from '../../rendering/characters/motionAudit';
import {buildCharacterSet} from '../../assets/buildSprites';
import type {CharacterManifest} from '../../assets/manifest';
import {resolveClip} from '../../rendering/sprites/spriteAnimation';

test('V6.1 capture is body contact, not idle, visibility, full suspicion or global alert',()=>{
 const radius=BODY.playerRadius+BODY.guardRadius+BODY.captureTolerance;
 assert.equal(radius,17.5);
 assert(!bodiesTouch({x:0,y:0},{x:radius+0.01,y:0},[]));
 assert(bodiesTouch({x:0,y:0},{x:radius,y:0},[]));
 assert(!bodiesTouch({x:0,y:0},{x:radius,y:0},[8,-20,9,40]));
 const stage=compileStage(campaignStages[0]),nav=buildNavigation(stage,BODY.guardRadius);
 for(const state of [Awareness.Patrol,Awareness.Alert,Awareness.Chase,Awareness.Search]){
  const g=createGuardState(stage.guards[0]);g.awareness=state;g.suspicion=1;
  const ev=createGuardEvents();ev.globalAlert=state!==Awareness.Patrol;
  stepGuards([g],{x:stage.playerSpawn.x,y:stage.playerSpawn.y,gait:0},stage.visionBlockers,nav,0,ev,0,false);
  assert(!ev.caught);
 }
});

test('Touch phase and velocity use collision-resolved distance during diagonal wall sliding',()=>{
 const stage=compileStage(campaignStages[0]),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 s.guards=[];s.guardPlayback=[];s.playerMode=2;s.player.x=100;s.player.y=100;
 s.player.tx=250;s.player.ty=220;s.player.hasTarget=true;
 const blockers=[130,0,150,500];let slid=false;
 for(let i=0;i<150;i++){
  const {x,y,dist,spritePhase}=s.player;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:1000,h:1000},blockers,[],nav);
  const d=Math.hypot(s.player.x-x,s.player.y-y);
  assert(Math.abs(s.player.dist-dist-d)<1e-8);
  assert(Math.abs(s.player.speed-d*60)<1e-8);
  const expected=advancePlayerSpritePhase(spritePhase,d,s.player.speed,rightWalkTrialStride(s.player.speed,s.player.facing));
  assert(Math.abs(s.player.spritePhase-expected)<1e-8);
  if(Math.abs(s.player.vx)<0.01&&s.player.vy>0.1)slid=true;
 }assert(slid);
});

test('Motion diagnostics reports actual fallback/frame rather than requested guard animation',()=>{
 const image={} as never;
 const manifest:CharacterManifest={scale:1,clips:{idle:{right:{image:'legacyGuard',frames:[{x:785,y:700,w:290,h:470}]}}}};
 const set=buildCharacterSet(manifest,{legacyGuard:image});
 for(const anim of [0,2,3,4,5]){
  const v=motionAudit(set,anim,0,0.73,2,50);
  assert.equal(v.source,'legacyGuard');assert.equal(v.resolved,'idle');assert.equal(v.frame,1);assert.equal(v.count,1);
 }
});

test('Roundoff at WALK speed cannot flicker to RUN or disable the RIGHT trial',()=>{
 assert.equal(playerSpriteGait(72.0000000000001),2);
 assert.equal(playerSpriteGait(38.0000000000001),1);
 assert.equal(playerSpriteGait(72.01),3);
 assert.equal(rightWalkTrialStride(72.0000000000001,0,true),rightWalkTrialStride(72,0,true));
});

test('Actual production registry exposes all 16 Player combinations and honest static Guard fallback',async()=>{
 const previous=require.extensions['.png'];
 require.extensions['.png']=(module)=>{module.exports=0;};
 try{
  const {ASSET_MANIFEST}=await import('../../assets/manifest');
  const image={} as never;
  assert(ASSET_MANIFEST.characters.player);
  assert(ASSET_MANIFEST.characters.guard);
  const player=buildCharacterSet(ASSET_MANIFEST.characters.player,{playerWalk:image});
  const guard=buildCharacterSet(ASSET_MANIFEST.characters.guard,{legacyGuard:image});
  for(let dir=0;dir<4;dir++){
   for(let anim=0;anim<4;anim++){
    const clip=resolveClip(player,anim,dir);
    assert(clip);
    assert.equal(clip.source,'playerWalk');
    assert.equal(clip.frames.length,anim===0?1:8);
    assert.equal(clip.frames[0].sx,anim===0?768:0);
    assert.equal(clip.frames[0].sy,[0,256,768,512][dir]);
   }
   for(const anim of [0,2,3,4,5]){
    const clip=resolveClip(guard,anim,dir);
    assert(clip);
    assert.equal(clip.source,'legacyGuard');assert.equal(clip.frames.length,1);
   }
  }
 }finally{if(previous)require.extensions['.png']=previous;else delete require.extensions['.png'];}
});
