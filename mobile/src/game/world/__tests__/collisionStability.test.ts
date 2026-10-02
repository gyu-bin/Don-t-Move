import assert from 'node:assert/strict';
import {test} from 'node:test';
import {moveWithCollision} from '../collision';
import {compileStage,TILE} from '../compileStage';
import {campaignStages} from '../../levels/campaignStages';
import {createPlaygroundState,stepPlayground} from '../../playground/playgroundState';
import {stepTiltPlayer} from '../../input/tiltMovement';
import {buildNavigation} from '../navigation';
import {BODY} from '../../guards/guardTuning';
import {enforcePlayableStage,createPlayableBoundary} from '../museumBoundary';

function fixture(){
 const stage=compileStage({...campaignStages[0],layout:['......','..#...','..#...','......'],props:[],guards:[],cameras:[],playerSpawn:{x:1.5,y:1.5,facing:0}});
 return {stage,s:createPlaygroundState(stage),nav:buildNavigation(stage,BODY.guardRadius)};
}
test('invalid collision inputs cancel the whole frame without leaking NaN',()=>{
 for(const blockers of [[0,0,NaN,20],[0,0,Infinity,20],[0,0,10],[10,0,0,20]]){
  const p={x:60,y:60};moveWithCollision(p,4,5,9,blockers);assert.deepEqual(p,{x:60,y:60});
 }
 for(const delta of [NaN,Infinity,-Infinity]){
  const p={x:60,y:60};moveWithCollision(p,delta,5,9,[]);assert.deepEqual(p,{x:60,y:60});
 }
 const p={x:Number.MAX_VALUE,y:60};moveWithCollision(p,Number.MAX_VALUE,0,9,[]);assert.equal(p.x,Number.MAX_VALUE);
});
test('invalid and zero delta cannot poison collision velocity or animation',()=>{
 for(const dt of [0,NaN,Infinity,-1]){
  const {s}=fixture(),before={x:s.player.x,y:s.player.y};
  stepTiltPlayer(s.player,{x:1,y:1,paused:false,reset:0},dt,[]);
  assert.equal(s.player.speed,0);assert.equal(s.player.spritePhase,0);assert.deepEqual({x:s.player.x,y:s.player.y},before);
 }
});
test('simulation rejects invalid time and restores previously valid coordinates',()=>{
 const {stage,s,nav}=fixture();
 for(const dt of [0,NaN,Infinity,-1]){
  stepPlayground(s,dt,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  assert.equal(s.t,0);assert.equal(s.player.speed,0);
 }
 const initial={x:s.player.x,y:s.player.y};s.player.x=NaN;s.player.vx=Infinity;s.player.spritePhase=NaN;
 stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
 assert.deepEqual({x:s.player.x,y:s.player.y},initial);assert.equal(s.player.vx,0);assert.equal(s.player.spritePhase,0);
});
test('boundary recovery cancels pathological traversal instead of unbounded iteration',()=>{
 const {stage}=fixture(),b=createPlayableBoundary(stage),p={x:Number.MAX_VALUE,y:60};
 enforcePlayableStage(p,60,60,9,b);assert(Number.isFinite(p.x)&&Number.isFinite(p.y));
});
test('repeated diagonal Run wall contact remains finite and movement drives animation',()=>{
 const {s,stage}=fixture();
 for(let i=0;i<3600;i++){
  const x=s.player.x,y=s.player.y;
  stepTiltPlayer(s.player,{x:1,y:i%120<60?1:-1,paused:false,reset:0},1/60,stage.movementBlockers);
  assert([s.player.x,s.player.y,s.player.speed,s.player.phase,s.player.spritePhase].every(Number.isFinite));
  assert(Math.abs(s.player.speed-Math.hypot(s.player.x-x,s.player.y-y)*60)<1e-8);
 }
});
