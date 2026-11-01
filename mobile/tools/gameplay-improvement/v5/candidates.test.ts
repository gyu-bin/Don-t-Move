import assert from 'node:assert/strict';
import {test} from 'node:test';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment} from '../../../src/game/world/navigation';
import {BODY} from '../../../src/game/guards/guardTuning';
import {candidatesFor} from './candidates';

for(const id of ['07-01','06-03']) test(`${id}: offline cover candidates preserve security, architecture, old routes and endpoints`,()=>{
  const source=(campaign as StageDefinition[]).find(d=>d.id===id)!;
  const serialized=JSON.stringify(source);
  const candidates=candidatesFor(source);
  assert.equal(candidates.length,4);
  assert.deepEqual(candidates[0].def,source);
  for(const c of candidates){
    const {props:beforeProps,topologyPlan:beforeTopology,...before}=source;
    const {props:afterProps,topologyPlan:afterTopology,...after}=c.def;
    assert.deepEqual(after,before,`${c.id}: only cover and matching metadata may change`);
    assert.deepEqual({...afterTopology,structures:undefined},{...beforeTopology,structures:undefined});
    assert.equal(afterProps.length,beforeProps.length);
    afterProps.forEach((p,i)=>assert.deepEqual({...p,x:0,y:0},{...beforeProps[i],x:0,y:0}));
    const stage=compileStage(c.def),nav=buildNavigation(stage,BODY.playerRadius+1);
    for(const route of [...source.testRoutes!,...source.escapeRoutes!]){
      for(let i=1;i<route.points.length;i++){
        const a=route.points[i-1],b=route.points[i];
        const path=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);
        assert.ok(path.length>=2,`${c.id}: ${route.name} leg ${i} still connects`);
        assert.ok(Math.hypot(path[path.length-2]-b.x*TILE,path[path.length-1]-b.y*TILE)<TILE,`${c.id}: path reaches requested route point`);
      }
    }
    for(const g of stage.guards) for(const p of g.route){
      assert.ok(clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.guardRadius),`${c.id}: patrol anchor is clear`);
    }
  }
  assert.equal(JSON.stringify(source),serialized,'candidate construction never mutates campaign');
});

test('08-03 remains a diagnosis-only baseline',()=>{
  const source=(campaign as StageDefinition[]).find(d=>d.id==='08-03')!;
  const candidates=candidatesFor(source);
  assert.equal(candidates.length,1);
  assert.deepEqual(candidates[0].def,source);
});
