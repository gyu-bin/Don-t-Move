import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {moveWithCollision} from '../../src/game/world/collision';
import {northBoundaryColumns} from '../../src/rendering/environment/northBoundary';
import {auditV5Geometry} from './v5Geometry';
const before=JSON.parse(fs.readFileSync('Reports/V5VisualHotfix/before-campaign.json','utf8')) as StageDefinition[];
const current=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8')) as StageDefinition[];
test('Visual hotfix preserves every mission definition, Guard/CCTV, route and objective',()=>assert.deepEqual(current,before));
test('North virtual row joins flanking walls only in the two exposed rooms',()=>{
 for(const d of current){const cols=northBoundaryColumns(d);if(d.id==='01-08')assert.deepEqual(cols,Array.from({length:10},(_,i)=>11+i));else if(d.id==='02-06')assert.deepEqual(cols,Array.from({length:12},(_,i)=>12+i));else assert.deepEqual(cols,[],d.id);}
});
test('Real Player collision blocks both north boundaries without obstructing inside floor',()=>{
 for(const id of ['01-08','02-06']){
  const d=current.find(d=>d.id===id)!,s=compileStage(d);
  for(const x of northBoundaryColumns(d).filter(x=>d.layout[0][x]==='.')){
   const p={x:(x+.5)*TILE,y:10};moveWithCollision(p,0,-20,9,s.movementBlockers);assert(p.y>=9,`${id} north ${x}`);
   const q={x:(x+.5)*TILE,y:35};moveWithCollision(q,0,-10,9,s.movementBlockers);assert.equal(q.y,25,`${id} interior ${x}`);
  }
 }
});
test('All30 still satisfy actual Guard Nav, portals, radius18 routes and chapter asset audit',()=>{
 for(const d of current.filter(d=>(d.chapter??0)<=3))assert.deepEqual(auditV5Geometry(d).issues,[],d.id);
});
