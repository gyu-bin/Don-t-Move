import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignStages } from '../levels/campaignStages';
import { BODY } from '../guards/guardTuning';
import { compileStage, TILE } from './compileStage';
import { clearSegment } from './navigation';
import { createPlayableBoundary, enforcePlayableStage, isPlayableBody } from './museumBoundary';

test('Museum boundaries reject huge movement through walls/void and preserve body radius at all corners', () => {
  const fixture = { ...campaignStages[0], layout: ['......', '.. ...', '..#...', '......'],
    props: [], playerSpawn: { x: 1.5, y: 1.5, facing: 0 } };
  const b = createPlayableBoundary(compileStage(fixture));
  const radius = BODY.playerRadius;
  for (const [x, y] of [[-10000,-10000],[10000,10000],[-10000,10000],[10000,-10000],[220,60],[60,10000]]) {
    const p = { x, y };
    enforcePlayableStage(p, 60, 60, radius, b);
    assert(isPlayableBody(p.x,p.y,radius,b), `Escaped at ${p.x},${p.y}`);
    assert(p.x>=radius && p.x<=b.width-radius && p.y>=radius && p.y<=b.height-radius);
  }
  const p = { x: 220, y: 60 };
  enforcePlayableStage(p,60,60,radius,b);
  assert(p.x < 80-radius, 'Cannot tunnel across the void into valid floor on the other side');
  assert(!isPlayableBody(80-radius+1,60,radius,b), 'Whole body must fit, not only center');
});

test('Boundary preserves valid movement, slides along walls, and recovers invalid saved positions', () => {
  const b = createPlayableBoundary(compileStage({ ...campaignStages[0], layout:['......','..#...','..#...','......'],
    props:[], playerSpawn:{x:1.5,y:1.5,facing:0} }));
  const p={x:61,y:61};
  assert.equal(enforcePlayableStage(p,60,60,9,b),false);
  assert.deepEqual(p,{x:61,y:61});
  p.x=150;p.y=110;
  assert(enforcePlayableStage(p,60,60,9,b));
  assert(p.x<71 && p.y>100, 'Wall contact preserves tangential sliding');
  p.x=NaN;p.y=Infinity;
  enforcePlayableStage(p,-100,-100,9,b);
  assert.deepEqual(p,b.spawn);
});

for(const def of campaignStages.filter(d=>d.chapter===1)) test(`${def.id}: boundaries keep spawn, objective, exit and all authored routes playable`,()=>{
  const stage=compileStage(def),b=createPlayableBoundary(stage),r=BODY.playerRadius;
  assert(isPlayableBody(stage.playerSpawn.x,stage.playerSpawn.y,r,b));
  assert(isPlayableBody(stage.objective.x,stage.objective.y,r,b));
  assert(isPlayableBody(stage.exit.x+stage.exit.w/2,stage.exit.y+stage.exit.h/2,r,b));
  for(const route of [...def.testRoutes??[],...def.escapeRoutes??[]]) {
    for(let i=1;i<route.points.length;i++) {
      const a=route.points[i-1],z=route.points[i];
      assert(clearSegment(a.x*TILE,a.y*TILE,z.x*TILE,z.y*TILE,b.blockers,r),`${route.name} segment ${i}`);
    }
  }
  // Push repeatedly into every cardinal/diagonal direction at a stalled-frame
  // displacement. The body must always remain on the authored playable floor.
  for(let direction=0;direction<8;direction++) {
    const p={...b.spawn},angle=direction*Math.PI/4;
    for(let step=0;step<8;step++) {
      const x=p.x,y=p.y;p.x+=Math.cos(angle)*2000;p.y+=Math.sin(angle)*2000;
      enforcePlayableStage(p,x,y,r,b);
      assert(isPlayableBody(p.x,p.y,r,b));
    }
  }
});

// Integration: final safety clamp must also clamp animation/velocity, even when
// the ordinary collision list is accidentally missing a boundary collider.
test('Playground boundary keeps actual speed and animation distance synchronized', async()=>{
 const {createPlaygroundState,stepPlayground}=await import('../playground/playgroundState');
 const {buildNavigation}=await import('./navigation');
 const stage=compileStage({...campaignStages[0],layout:['......','......','......','......'],props:[],playerSpawn:{x:1.5,y:1.5,facing:0}});
 const s=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius);
 s.guards=[];s.guardPlayback=[];s.mission.enabled=false;s.playerMode=3;s.player.tx=10000;s.player.ty=60;s.player.hasTarget=true;
 for(let i=0;i<600;i++){
  const {x,y,dist}=s.player;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},[],[],nav);
  const d=Math.hypot(s.player.x-x,s.player.y-y);
  assert(isPlayableBody(s.player.x,s.player.y,BODY.playerRadius,s.boundary!));
  assert(Math.abs(s.player.speed-d*60)<1e-8);
  assert(Math.abs(s.player.dist-dist-d)<1e-8);
 }
 assert(s.player.speed<0.5);assert.equal(s.player.visualGait,0);
});
