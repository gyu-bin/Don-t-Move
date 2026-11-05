/** V13 bake: compile the authored plans into the production campaign. */
import fs from 'node:fs';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditV124bCampaign,auditV124bTopology,pathLength} from './v124bTopologyQA';
import {composeV13,v13Draft} from './v13Builder';
import {V13_MUSEUM} from './v13Museum';
import {V13_MUSEUM_EXPANSION,MUSEUM_EXPANSION_ARCHETYPES} from './v13MuseumExpansion';
import {V13_GALLERY} from './v13Gallery';
import {V13_GALLERY_EXPANSION,GALLERY_EXPANSION_ARCHETYPES} from './v13GalleryExpansion';
import {V13_BANK} from './v13Bank';
import {V13_LAB} from './v13Lab';
import {V13_CASINO_DISTINCT} from './v13CasinoDistinct';
import {V13_MANSION_DISTINCT} from './v13MansionDistinct';
import {V13_WAREHOUSE} from './v13Late';
import {V13_WAREHOUSE_DISTINCT} from './v13WarehouseDistinct';
import {V13_HQ_DISTINCT} from './v13HqDistinct';
import {V13_VAULT_CH9} from './v13Vault';
import {V13_VAULT_DISTINCT} from './v13VaultDistinct';
import {previewStage} from './v13Preview';
import {LATE_LAYOUT_REVISION_IDS} from '../../src/game/progress/missionRevision';
import type {V13Mission} from './v13Types';
import {authorCoverCheckpoints} from './v13CoverCheckpoints';
import {polishPatrol} from './v13PatrolPolish';
import {watchExit} from './v13ExitWatch';
/** New floor plans reuse approved chapter security constants, never an old floor plan. */
export const V13_SECURITY_SOURCE:StageDefinition[]=[...(raw as StageDefinition[]),
 ...V13_MUSEUM_EXPANSION.map((m,index)=>{
  const template=(raw as StageDefinition[]).find(s=>s.id===MUSEUM_EXPANSION_ARCHETYPES[m.id]);
  if(!template)throw Error(`${m.id}: missing approved Museum security archetype`);
  return {...structuredClone(template),id:m.id,number:raw.length+index+1,chapter:1,mission:Number(m.id.slice(3))};
 }),
 ...V13_GALLERY_EXPANSION.map((m,index)=>{
  const template=(raw as StageDefinition[]).find(s=>s.id===GALLERY_EXPANSION_ARCHETYPES[m.id]);
  if(!template)throw Error(`${m.id}: missing approved Gallery security archetype`);
  return {...structuredClone(template),id:m.id,number:raw.length+V13_MUSEUM_EXPANSION.length+index+1,chapter:2,mission:Number(m.id.slice(3))};
 })];
const vaultReplacements=new Map(V13_VAULT_DISTINCT.map(m=>[m.id,m]));
const warehouseOpening=V13_WAREHOUSE.find(m=>m.id==='07-01');
if(!warehouseOpening)throw Error('Missing reviewed Warehouse opening');

/** The campaign, chapter by chapter, in bake order. */
export const CHAPTER_SOURCE:{chapter:number;missions:V13Mission[];plans:string}[]=[
 {chapter:1,missions:[...V13_MUSEUM,...V13_MUSEUM_EXPANSION],plans:'v13Museum.ts + v13MuseumExpansion.ts + v13MuseumDistinct.ts + v13MuseumFinale.ts'},
 {chapter:2,missions:[...V13_GALLERY,...V13_GALLERY_EXPANSION],plans:'v13Gallery.ts + v13GalleryExpansion.ts'},
 {chapter:3,missions:V13_BANK,plans:'v13Bank.ts'},
 {chapter:4,missions:V13_LAB,plans:'v13Lab.ts'},
 {chapter:5,missions:V13_CASINO_DISTINCT,plans:'v13CasinoDistinct.ts'},
 {chapter:6,missions:V13_MANSION_DISTINCT,plans:'v13MansionDistinct.ts'},
 {chapter:7,missions:[warehouseOpening,...V13_WAREHOUSE_DISTINCT],plans:'v13Late.ts + v13WarehouseDistinct.ts'},
 {chapter:8,missions:V13_HQ_DISTINCT,plans:'v13HqDistinct.ts'},
 {chapter:9,missions:V13_VAULT_CH9.map(m=>vaultReplacements.get(m.id)??m),plans:'v13Vault.ts + v13VaultDistinct.ts'},
].map(c=>({...c,missions:c.missions.map(m=>{
 const plan=LATE_LAYOUT_REVISION_IDS.includes(m.id)?{...m,layoutRevision:2}:m;
 return watchExit(polishPatrol(authorCoverCheckpoints(plan)));
})}));
export const V13_MISSIONS:V13Mission[]=CHAPTER_SOURCE.flatMap(c=>c.missions);
/** Every mission is composed from its V13 plan; SOURCE_STAGES only supplies the approved guard and camera constants. */
export function buildV13Campaign():StageDefinition[]{
 const source=V13_SECURITY_SOURCE;
 return V13_MISSIONS.map(m=>JSON.parse(JSON.stringify(composeV13(m,source))) as StageDefinition);
}
if(process.argv[1]?.endsWith('v13Build.ts')){
 const only=process.env.ONLY?.split(',');
 if(only){
  // Authoring loop: compose the named missions alone and print plan + topology audit.
  for(const id of only){const m=V13_MISSIONS.find(m=>m.id===id)!;
   try{const def=composeV13(m,V13_SECURITY_SOURCE),audit=auditV124bTopology(def);
    console.log(`\n${id} ${def.title}`);console.log(previewStage(def));
    console.log(JSON.stringify({errors:audit.errors,approach:audit.approachZones,escape:audit.escapeZones,open:+audit.openEscapeLength.toFixed(1),closed:+audit.closedEscapeLength.toFixed(1),entryExit:+audit.entryExitDistance.toFixed(1),firstBreak:def.topologyPlan!.firstBreak,
     safe:+pathLength(def.testRoutes![0].points).toFixed(1),risk:+pathLength(def.testRoutes![1].points).toFixed(1)}));
   }catch(err){
    const draft=v13Draft(m),plan=draft.topologyPlan!,marks=[...plan.edges.flatMap(e=>(e.via??[]).map(q=>({...q,ch:'x'}))),...plan.rooms.map(r=>({...(r.hub??{x:r.x+r.w/2,y:r.y+r.h/2}),ch:'+'}))];
    console.log(`\n${id} DRAFT (does not compose)`);console.log(previewStage(draft,2,marks));console.log(String(err));
   }}
 }else{
  const defs=buildV13Campaign(),audit=auditV124bCampaign(defs);
  fs.mkdirSync('Reports/V13Phase1',{recursive:true});fs.writeFileSync('Reports/V13Phase1/topology-audit.json',JSON.stringify(audit,null,2));
  if(audit.fail)throw Error(`${audit.fail} physical topology failures; not baked`);
  fs.writeFileSync(process.env.QA_CANDIDATE??'src/game/levels/stages/campaignStages.json',JSON.stringify(defs,null,2)+'\n');
  console.log(`Baked ${audit.pass}/${defs.length} with V13 architecture. Simulator and play gates remain separate.`);
 }
}
