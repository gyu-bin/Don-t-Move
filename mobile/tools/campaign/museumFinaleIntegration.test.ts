import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {V13_MUSEUM} from './v13Museum';
import {V13_MUSEUM_EXPANSION} from './v13MuseumExpansion';
import type {V13Mission} from './v13Types';
import {canonical,sha256} from './v13QaLib';
import {expectedStageHash} from './v13LateReviewed';
import {routeRooms} from './v124bTopologyQA';
import unaffected from '../../docs/design/museum-finale/UNAFFECTED_STAGE_HASHES.json';

/** Compare real touching ASCII zones, ignoring room names, dimensions and parallel doors. */
function architecture(m:V13Mission):string{
 const zones=Object.values(m.zones),neighbors=new Map(zones.map(z=>[z.id,new Set<string>()]));
 for(let y=0;y<m.map.length;y++)for(let x=0;x<m.map[y].length;x++){
  const from=m.zones[m.map[y][x]];if(!from)continue;
  for(const[dx,dy]of[[1,0],[0,1]]){
   const to=m.zones[m.map[y+dy]?.[x+dx]];
   if(to&&from.id!==to.id){neighbors.get(from.id)!.add(to.id);neighbors.get(to.id)!.add(from.id);}
  }
 }
 const role=(id:string)=>`${zones.find(z=>z.id===id)!.role}${id===m.approach[0]?':arrival':''}${id===m.quickEscape.at(-1)?':exit':''}`;
 let labels=new Map(zones.map(z=>[z.id,role(z.id)]));
 for(let i=0;i<zones.length;i++)labels=new Map(zones.map(z=>[z.id,sha256([role(z.id),[...neighbors.get(z.id)!].map(id=>labels.get(id)).sort()])]));
 return [...labels.values()].sort().join('/');
}

test('Finale rebuild changes only 09–10 and retains all other 53 stages exactly',()=>{
 assert.equal(campaignStages.length,55);assert.equal(Object.keys(unaffected).length,53);
 for(const[id,hash]of Object.entries(unaffected))assert.equal(sha256(canonical(campaignStages.find(s=>s.id===id))),expectedStageHash(id,hash),id);
});

test('Every Chapter 1 mission has a distinct actual room-role graph across all 45 pairs',()=>{
 const plans=[...V13_MUSEUM,...V13_MUSEUM_EXPANSION];assert.equal(plans.length,10);
 for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++){
  assert.notEqual(architecture(plans[i]),architecture(plans[j]),`${plans[i].id}/${plans[j].id}: renamed, resized or offset rooms alone are insufficient`);
 }
});

test('Both final missions offer real room choices and retain approved security counts',()=>{
 for(const[id,guards]of [['01-09',2],['01-10',3]] as const){
  const def=campaignStages.find(s=>s.id===id)!;
  const safe=new Set(routeRooms(def.topologyPlan!,def.testRoutes![0].points));
  const risk=new Set(routeRooms(def.topologyPlan!,def.testRoutes![1].points));
  assert([...safe].some(r=>!risk.has(r))&&[...risk].some(r=>!safe.has(r)),`${id}: different waypoint positions in the same room chain do not count`);
  assert.equal(def.guards.length,guards);assert.equal(def.cameras?.length,1);
 }
});
