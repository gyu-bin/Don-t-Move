import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {V13_MUSEUM_EXPANSION} from './v13MuseumExpansion';
import type {V13Mission} from './v13Types';
import {canonical,sha256} from './v13QaLib';
import {expectedStageHash} from './v13LateReviewed';
import {placement} from './v13QA';
import {routeRooms} from './v124bTopologyQA';
import unaffected from '../../docs/design/museum-diversity/UNAFFECTED_STAGE_HASHES.json';
import reviewed from '../../docs/design/museum-diversity/REVIEWED_REBUILT_STAGE_HASHES.json';

const revised=['01-06','01-07','01-08'];
const plans=V13_MUSEUM_EXPANSION.filter(m=>revised.includes(m.id));
/** Room-name/coordinate independent role profile. Parallel door edges collapse;
 * refinement includes neighboring roles and arrival/extraction anchors. */
function roleGraph(m:V13Mission):string{
 const zones=Object.values(m.zones),start=m.approach[0],exit=m.quickEscape.at(-1);
 const role=(id:string)=>{const z=zones.find(z=>z.id===id)!;return `${z.role}${id===start?':arrival':''}${id===exit?':exit':''}`;};
 const neighbors=new Map(zones.map(z=>[z.id,new Set<string>()]));
 for(let y=0;y<m.map.length;y++)for(let x=0;x<m.map[y].length;x++){
  const from=m.zones[m.map[y][x]];if(!from)continue;
  for(const [dx,dy] of [[1,0],[0,1]]){
   const to=m.zones[m.map[y+dy]?.[x+dx]];
   if(to&&to.id!==from.id){neighbors.get(from.id)!.add(to.id);neighbors.get(to.id)!.add(from.id);}
  }
 }
 let labels=new Map(zones.map(z=>[z.id,role(z.id)]));
 for(let i=0;i<zones.length;i++)labels=new Map(zones.map(z=>[z.id,sha256([role(z.id),[...neighbors.get(z.id)!].map(id=>labels.get(id)).sort()])]));
 return [...labels.values()].sort().join('/');
}

test('Museum variety baseline is preserved except the two explicitly reviewed final missions',()=>{
 assert.equal(campaignStages.length,55);assert.equal(Object.keys(unaffected).length,52);
 for(const [id,hash] of Object.entries(unaffected)){
  const replacement=['01-09','01-10'].includes(id)?reviewed[id as keyof typeof reviewed]:undefined;
  if(replacement)assert.equal(replacement.beforeHash,hash,`${id}: preserve reviewed pre-rebuild baseline`);
  assert.equal(sha256(canonical(campaignStages.find(s=>s.id===id))),replacement?.afterHash??expectedStageHash(id,hash),id);
 }
 assert.deepEqual(plans.map(m=>m.id),revised);
 for(const [i,id] of revised.entries()){
  const def=campaignStages.find(d=>d.id===id)!;
  assert.equal(def.number,46+i);assert.equal(def.guards.length,i===2?3:2);assert.equal(def.cameras?.length??0,0);
  assert.equal(def.objective?.highSecurity,false);
 }
});

test('06–08 have different role graphs and actual arrival/prize/exit thirds, not resized copies',()=>{
 assert.equal(new Set(plans.map(roleGraph)).size,3,'parallel doors, renamed rooms or resized rectangles do not establish three new graphs');
 const placements=plans.map(m=>{
  const def=campaignStages.find(d=>d.id===m.id)!;
  const actual=[placement(def,def.playerSpawn),placement(def,def.objective!),placement(def,def.exitPosition!)];
  assert.deepEqual(actual,m.placement,m.id);return actual.join('/');
 });
 assert.equal(new Set(placements).size,3,'players must read three different overall destination arrangements');
});

test('At least two revised missions offer different actual rooms on safe and risky approaches',()=>{
 const choices=plans.map(m=>{
  const def=campaignStages.find(d=>d.id===m.id)!;
  const safe=new Set(routeRooms(def.topologyPlan!,def.testRoutes![0].points));
  const risk=new Set(routeRooms(def.topologyPlan!,def.testRoutes![1].points));
  return [...safe].some(id=>!risk.has(id))&&[...risk].some(id=>!safe.has(id));
 });
 assert(choices.filter(Boolean).length>=2,'different waypoints in the same chain of rooms are insufficient');
});
