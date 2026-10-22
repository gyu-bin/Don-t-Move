import assert from 'node:assert/strict';
import test from 'node:test';
import {buildVisionFan,createFanBuffers,pointVisible} from '../guardVision';
import type {VisionFan} from '../guardVision';
import {createGuardState,observeGuard} from '../guardBrain';
import {castRay} from '../../world/visibility';

const observer = ():VisionFan => ({x: 0,y: 0,facing: 0,visionRange: 200,
  visionHalfAngle: .6,fanCount: 0,...createFanBuffers()});

test('same geometry reuses fan while newly moving player is perceived every time', () => {
  const g = createGuardState({id:'cache',x:0,y:0,facing:0,route:[],routeMode:'loop',startDelay:0,pace:1,
    visionRange:200,visionHalfAngle:.6});
  const blockers:number[]=[];
  observeGuard(g,{x:80,y:0,gait:0},blockers);
  assert.equal(g.canSee,true);
  const cache=g.fanCache;
  assert.equal(buildVisionFan(g,blockers),false);
  observeGuard(g,{x:-80,y:0,gait:0},blockers);
  assert.equal(g.canSee,false);
  assert.equal(g.fanCache,cache);
});

test('solid door coordinate changes invalidate fan even when array identity/length stays the same', () => {
  const g=observer(),blocks=[40,100,50,140];
  assert.equal(buildVisionFan(g,blocks),true);
  assert.equal(pointVisible(g,100,0,blocks),true);
  blocks[1]=-40; blocks[3]=40;
  assert.equal(buildVisionFan(g,blocks),true);
  assert.equal(pointVisible(g,100,0,blocks),false);
  assert.equal(buildVisionFan(g,blocks.slice()),false);
  blocks.length=0;
  assert.equal(buildVisionFan(g,blocks),true);
  assert.equal(pointVisible(g,100,0,blocks),true);
});

test('uncached sweeping geometry cannot reuse an old snapshot when a camera starts waiting',()=>{
  const g=observer(),blocks:number[]=[];
  buildVisionFan(g,blocks);
  blocks.push(40,-40,50,40);
  assert.equal(buildVisionFan(g,blocks,false),true);
  blocks.length=0;
  assert.equal(buildVisionFan(g,blocks),true);
  assert.equal(pointVisible(g,100,0,blocks),true);
  assert.equal(buildVisionFan(g,blocks),false);
});

test('cached and freshly rebuilt fans match through movement, turns, range and dynamic occlusion', () => {
  const cached=observer(),fresh=observer(),blocks=[60,-50,80,30,100,60,150,80];
  let hits=0;
  for(let frame=0;frame<240;frame++){
    for(const g of [cached,fresh]){
      g.x=Math.floor(frame/8);g.y=frame<120?0:10;
      g.facing=Math.floor(frame/12)*.03;g.visionRange=frame<180?200:160;
      g.visionHalfAngle=frame<200?.6:.45;
    }
    if(frame===100)blocks[0]=40;
    fresh.fanCache=undefined;
    if(!buildVisionFan(cached,blocks))hits++;
    buildVisionFan(fresh,blocks);
    assert.equal(cached.fanCount,fresh.fanCount);
    assert.deepEqual(cached.fan.slice(0,cached.fanCount*2),fresh.fan.slice(0,fresh.fanCount*2));
    for(const [x,y] of [[80,0],[130,30],[20,-20]])
      assert.equal(pointVisible(cached,x,y,blocks),pointVisible(fresh,x,y,blocks));
  }
  assert(hits>100);
});

test('near-blocker broad phase matches full blocker ray casts, including tangencies and distant structures',()=>{
  let seed=17;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let scene=0;scene<100;scene++){
    const g=observer();g.x=random()*100;g.y=random()*100;g.facing=random()*Math.PI*2;g.visionRange=40+random()*180;
    const blocks:number[]=[];
    for(let i=0;i<45;i++){
      const x=random()*900-400,y=random()*900-400;
      blocks.push(x,y,x+1+random()*100,y+1+random()*100);
    }
    // Rectangles on/just beyond the range boundary must not change the polygon.
    blocks.push(g.x+g.visionRange,g.y-1,g.x+g.visionRange+5,g.y+1);
    buildVisionFan(g,blocks);
    for(let i=0;i<g.fanCount;i++){
      const a=g.facing+g.fanAng[i],dx=Math.cos(a),dy=Math.sin(a);
      const full=castRay(g.x,g.y,dx,dy,g.visionRange,blocks);
      assert.equal(g.fan[i*2],g.x+dx*full);
      assert.equal(g.fan[i*2+1],g.y+dy*full);
    }
  }
});
