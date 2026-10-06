/** Historical Phase4A runtime contracts, frozen before authorized full45 rebuild. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {createDoor,doorBlockers} from '../../src/game/doors/doorSystem';
import {navigationWithDoors} from '../../src/game/doors/doorNavigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {bruteNavigation} from './verifyNavigationRegression';

const baseline=JSON.parse(readFileSync('docs/design/v12/phase4a/SOURCE_STAGES.json','utf8')) as StageDefinition[];
const current=JSON.parse(readFileSync('docs/design/v12/phase4b/SOURCE_STAGES.json','utf8')) as StageDefinition[];
const rebuilt=current.filter(d=>(d.chapter??0)<=2);
const routeClear=(points:{x:number;y:number}[],blockers:number[],radius:number)=>points.length>=2&&points.slice(1).every((b,i)=>{
 const a=points[i];return clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,blockers,radius);
});

test('Phase4A actual 45-mission campaign preserves all35 Chapter3–9 definitions exactly',()=>{
 assert.equal(baseline.length,45);assert.equal(current.length,45);assert.equal(rebuilt.length,10);
 assert.deepEqual(current.filter(d=>(d.chapter??0)>=3),baseline.filter(d=>(d.chapter??0)>=3));
 assert.deepEqual(current.map(d=>d.id),baseline.map(d=>d.id));
});

for(const def of rebuilt){
 test(`${def.id}: physical lockdown removes a quick route but retains a 20px alternate to the actual Exit`,()=>{
  const stage=compileStage(def),doors=(stage.doors??[]).map(createDoor);
  assert(doors.length>0,'A rebuilt mission must contain actual compiled doors');
  const ids=def.lockdownDoors??[];assert(ids.length>0,'Lockdown needs designated doors');
  assert.equal(new Set(ids).size,ids.length,'Repeated lockdown ID');
  const open=doorBlockers(doors,stage.movementBlockers,stage.visionBlockers);
  for(const id of ids){const door=doors.find(d=>d.id===id);assert(door,`Unknown door ${id}`);assert.equal(door.state,'OPEN');door.state='CLOSED';door.progress=1;}
  const closed=doorBlockers(doors,stage.movementBlockers,stage.visionBlockers);
  const escapes=def.escapeRoutes??[];assert(escapes.length>=2,'Quick and alternate routes need independent authored paths');
  const exit={x:stage.exit.x+stage.exit.w/2,y:stage.exit.y+stage.exit.h/2};
  for(const route of [...def.testRoutes??[],...escapes])assert(routeClear(route.points,open.movementBlockers,20),`${route.name}: OPEN route lacks fixed Tilt clearance`);
  for(const route of escapes){const first=route.points[0],last=route.points.at(-1)!;
   assert.equal(first.x*TILE,stage.objective.x,`${route.name}: does not start at Objective`);
   assert.equal(first.y*TILE,stage.objective.y);
   assert(Math.hypot(last.x*TILE-exit.x,last.y*TILE-exit.y)<.001,`${route.name}: does not reach actual Exit`);
  }
  const alternate=escapes.filter(r=>routeClear(r.points,closed.movementBlockers,20));
  assert(alternate.length>0,'No authored 20px alternate escape survives CLOSED lockdown');
  assert(escapes.some(r=>!routeClear(r.points,closed.movementBlockers,BODY.playerRadius)),'Closing designated doors must physically remove a quick return route');
  const nav=navigationWithDoors(buildNavigation(stage,BODY.playerRadius),doorBlockers(doors).movementBlockers);
  const path=findPath(nav,stage.objective.x,stage.objective.y,exit.x,exit.y);
  assert.deepEqual(path.slice(-2),[exit.x,exit.y],'CLOSED runtime navigation cannot reach Exit');
  let x=stage.objective.x,y=stage.objective.y;
  for(let i=0;i<path.length;i+=2){assert(clearSegment(x,y,path[i],path[i+1],nav.blockers,BODY.playerRadius),'CLOSED nav returned a blocked leg');x=path[i];y=path[i+1];}
 });

 test(`${def.id}: closed runtime door graph matches independent full-blocker oracle`,()=>{
  const stage=compileStage(def),doors=(stage.doors??[]).map(createDoor);
  for(const door of doors)if(def.lockdownDoors?.includes(door.id)){door.state='CLOSED';door.progress=1;}
  const doorGeometry=doorBlockers(doors).movementBlockers;
  assert(doorGeometry.length>0,'No physical closed-door geometry');
  for(const radius of [BODY.playerRadius,BODY.guardRadius,20]){
   const actual=navigationWithDoors(buildNavigation(stage,radius),doorGeometry);
   const expected=bruteNavigation({...stage,movementBlockers:stage.movementBlockers.concat(doorGeometry)},radius);
   // Boundary blockers precede doors in the filtered graph and follow them in
   // the independently rebuilt oracle; topology is compared in full.
   assert.deepEqual(actual.walkable,expected.walkable,`radius${radius}: walkability`);
   assert.deepEqual(actual.neighbors,expected.neighbors,`radius${radius}: neighbors`);
   assert.deepEqual(actual.components,expected.components,`radius${radius}: components`);
  }
 });
}
