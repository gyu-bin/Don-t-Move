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
import {advancePlayerSpritePhase,playerLocoStride,playerSpriteGait,stablePlayerSpriteGait} from '../core/locomotion';
import {LOCO_ROWS,locoStride} from '../core/locomotionAtlas';
import {DIR_NAMES} from '../../rendering/sprites/spriteTypes';
import {motionAudit} from '../../rendering/characters/motionAudit';
import {locomotionBodyLift} from '../../rendering/characters/locomotionPolish';
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
 const stage=compileStage({...campaignStages[0],doors:undefined,lockdownDoors:undefined}),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 // Synthetic open-plane locomotion fixture; Museum bounds are tested separately.
 s.boundary=undefined;s.guards=[];s.guardPlayback=[];s.playerMode=2;s.player.x=100;s.player.y=100;
 s.player.tx=250;s.player.ty=220;s.player.hasTarget=true;
 const blockers=[130,0,150,500];let slid=false;
 for(let i=0;i<150;i++){
  const {x,y,dist,spritePhase}=s.player;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:1000,h:1000},blockers,[],nav);
  const d=Math.hypot(s.player.x-x,s.player.y-y);
  assert(Math.abs(s.player.dist-dist-d)<1e-8);
  assert(Math.abs(s.player.speed-d*60)<1e-8);
  const expected=advancePlayerSpritePhase(spritePhase,d,s.player.speed,playerLocoStride(s.player.visualGait,s.player.facing),s.player.visualGait);
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

test('Roundoff at WALK speed cannot flicker to RUN or change the planted stride',()=>{
 assert.equal(playerSpriteGait(72.0000000000001),2);
 assert.equal(playerSpriteGait(38.0000000000001),1);
 assert.equal(playerSpriteGait(72.01),3);
 assert.equal(playerLocoStride(playerSpriteGait(72.0000000000001),0),playerLocoStride(playerSpriteGait(72),0));
 assert.equal(playerLocoStride(2,0),locoStride('player','walk','right'));
 assert.equal(playerLocoStride(2,Math.PI/2),locoStride('player','walk','down'));
 assert.equal(playerLocoStride(3,Math.PI),locoStride('player','run','left'));
 assert.equal(playerLocoStride(1,-Math.PI/2),locoStride('player','sneak','up'));
});

test('Visual gait resists threshold jitter but stops on actual zero velocity',()=>{
 let gait=1;
 for(const speed of [39,40,38,41,40]) gait=stablePlayerSpriteGait(speed,gait);
 assert.equal(gait,1);
 gait=stablePlayerSpriteGait(42,gait);assert.equal(gait,2);
 for(const speed of [37,36,38,35]) gait=stablePlayerSpriteGait(speed,gait);
 assert.equal(gait,2);
 gait=stablePlayerSpriteGait(34,gait);assert.equal(gait,1);
 gait=stablePlayerSpriteGait(77,gait);assert.equal(gait,3);
 gait=stablePlayerSpriteGait(69,gait);assert.equal(gait,3);
 gait=stablePlayerSpriteGait(67,gait);assert.equal(gait,2);
 assert.equal(stablePlayerSpriteGait(0,gait),0);
});

test('Whole-body lift is subtle and disappears at rest without moving the ground anchor',()=>{
 for(const anim of [1,2,3]) {
  assert.equal(locomotionBodyLift(0,anim,100),0);
  assert.equal(locomotionBodyLift(0.25,anim,0),0);
  assert(locomotionBodyLift(0.25,anim,100)>0);
  assert(locomotionBodyLift(0.25,anim,100)<=0.75);
 }
 assert.equal(locomotionBodyLift(0.25,0,100),0);
});

test('Production Locomotion Atlas registry: every Player/Guard state × direction, row order DOWN/LEFT/RIGHT/UP',async()=>{
 const previous=require.extensions['.png'];
 require.extensions['.png']=(module)=>{module.exports=0;};
 try{
  const {ASSET_MANIFEST}=await import('../../assets/manifest');
  const image={} as never;
  assert(ASSET_MANIFEST.characters.player);
  assert(ASSET_MANIFEST.characters.guard);
  const player=buildCharacterSet(ASSET_MANIFEST.characters.player,{playerIdle:image,playerSneak:image,playerWalk:image,playerRun:image});
  const guard=buildCharacterSet(ASSET_MANIFEST.characters.guard,{
    guardIdle:image,guardWalk:image,guardRun:image,guardWhistle:image,guardSearch:image,
  });
  assert(ASSET_MANIFEST.characters.player!.runtimeReady&&ASSET_MANIFEST.characters.guard!.runtimeReady);
  assert(!ASSET_MANIFEST.characters.player!.finalApproved&&!ASSET_MANIFEST.characters.guard!.finalApproved,'no Production Lock without visual review');
  assert(player.bakedMotion&&guard.bakedMotion,'bob is baked, no runtime lift');
  assert(player.strict&&guard.strict,'runtime-ready atlas uses strict clip lookup');
  for(let dir=0;dir<4;dir++){
   const row=LOCO_ROWS.indexOf(DIR_NAMES[dir])*128;
   ['playerIdle','playerSneak','playerWalk','playerRun'].forEach((source,anim)=>{
    const clip=resolveClip(player,anim,dir);
    assert(clip);assert.equal(clip.source,source);assert.equal(clip.mirror,false);
    assert.equal(clip.frames.length,[6,8,14,12][anim]);
    assert.equal(clip.frames[0].sy,row);assert.equal(clip.frames[1].sx,128);
    assert.equal(clip.frames[0].ax,64);assert.equal(clip.frames[0].ay,112);
    if(anim>0)assert.equal(clip.strideLength,locoStride('player',(['sneak','walk','run'] as const)[anim-1],DIR_NAMES[dir]));
   });
   for(const [anim,source,frames] of [[0,'guardIdle',6],[2,'guardWalk',12],[3,'guardRun',12],[4,'guardWhistle',6],[5,'guardSearch',6]] as const){
    const clip=resolveClip(guard,anim,dir);
    assert(clip);assert.equal(clip.source,source);assert.equal(clip.frames.length,frames);assert.equal(clip.frames[0].sy,row);
   }
  }
 }finally{if(previous)require.extensions['.png']=previous;else delete require.extensions['.png'];}
});

test('Developer touch modes sustain actual-distance animation for ten seconds and stop against a wall',()=>{
 // Synthetic changing blockers isolate locomotion from the static door-geometry cache.
 const stage=compileStage({...campaignStages[0],doors:undefined,lockdownDoors:undefined}),nav=buildNavigation(stage,BODY.guardRadius);
 for(const mode of [1,2,3]){
  const s=createPlaygroundState(stage);s.boundary=undefined;s.guards=[];s.guardPlayback=[];s.playerMode=mode;
  s.player.x=100;s.player.y=100;s.player.tx=5000;s.player.ty=100;s.player.hasTarget=true;
  for(let frame=0;frame<600;frame++){
   const {dist,spritePhase}=s.player;
   stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:10000,h:10000},[],[],nav);
   if(frame>60)assert.equal(s.player.visualGait,mode);
   const d=s.player.dist-dist;
   assert(Math.abs(s.player.spritePhase-advancePlayerSpritePhase(spritePhase,d,s.player.speed,
    playerLocoStride(s.player.visualGait,s.player.facing),s.player.visualGait))<1e-8);
  }
  const wallX=s.player.x+20;
  for(let frame=0;frame<120;frame++)stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:10000,h:10000},[wallX,0,wallX+20,1000],[],nav);
  assert(s.player.speed<=0.5);assert.equal(s.player.visualGait,0);
  const phase=s.player.spritePhase;
  for(let frame=0;frame<60;frame++)stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:10000,h:10000},[wallX,0,wallX+20,1000],[],nav);
  assert.equal(s.player.spritePhase,phase);
 }
});
