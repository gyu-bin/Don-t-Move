import test from 'node:test';
import assert from 'node:assert/strict';
import baseline from './fixtures/v3MuseumGalleryBefore.json';
import {applyV5MuseumGallery,V5_MG_REDESIGNED_IDS,v5MGRoute} from './v5MuseumGallery';
import {applyV3MuseumGallery} from './v3MuseumGallery';
import {auditV5MG} from './v5MuseumGalleryQA';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
const defs=baseline.slice(0,20).map(d=>applyV5MuseumGallery(applyV3MuseumGallery(d as StageDefinition)));
test('V5 Museum/Gallery actual compiled patrol, search and radius18 routes are navigable',()=>{
 for(const def of defs)assert.deepEqual(auditV5MG(def).issues,[],def.id);
});
test('V5 goal draws after its case; approved chapter props never introduce Lab/Casino major assets',()=>{
 for(const def of defs){
  const c=def.props.find(p=>p.kind==='objectiveCase')!;assert(c,def.id);assert(c.y<=def.objective!.y,`${def.id}: case sorts over target`);
  for(const p of def.props){assert(!p.kind.startsWith('lab')&&!p.kind.startsWith('casino'),def.id);if(p.visualAssetId)assert(p.visualAssetId.startsWith(def.chapter===1?'museum_':'gallery_'),`${def.id}: ${p.visualAssetId}`);}
 }
});
test('V5 redesign means real silhouette plus a portal/objective/central composition change',()=>{
 for(const id of V5_MG_REDESIGNED_IDS){const old=baseline.find(d=>d.id===id)!,current=defs.find(d=>d.id===id)!;assert.notDeepEqual(current.layout,old.layout,id);assert.notDeepEqual([current.entryPosition,current.objective,current.exitPosition,current.props],[old.entryPosition,old.objective,old.exitPosition,old.props],id);assert(Math.hypot(current.entryPosition!.x-current.exitPosition!.x,current.entryPosition!.y-current.exitPosition!.y)>8,id);}
});
test('V5 closed glass island cannot become a reachable search or player path target',()=>{
 const def=defs.find(d=>d.id==='02-06')!;assert.throws(()=>v5MGRoute(def,[def.playerSpawn,{x:15.5,y:13}]),/inaccessible authored point/);
 const sectors=def.guards.flatMap(g=>g.theftSearchSectors?.flatMap(s=>s.anchors)??[]);assert(sectors.every(p=>!(p.x>13.5&&p.x<17.5&&p.y>10.3&&p.y<14.3)));
});
