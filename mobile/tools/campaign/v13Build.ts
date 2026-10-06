/** V13 bake: every chapter is composed from architecture-first plans (Chapter 5–8 reuse mirrored plans, Chapter 9 has its own in v13Vault.ts). */
import fs from 'node:fs';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditV124bCampaign,auditV124bTopology,pathLength} from './v124bTopologyQA';
import {composeV13,v13Draft} from './v13Builder';
import {V13_MUSEUM} from './v13Museum';
import {V13_GALLERY} from './v13Gallery';
import {V13_BANK} from './v13Bank';
import {V13_LAB} from './v13Lab';
import {V13_CASINO} from './v13Casino';
import {V13_MANSION,V13_WAREHOUSE,V13_HQ} from './v13Late';
import {V13_VAULT_CH9} from './v13Vault';
import {previewStage} from './v13Preview';
import {DERIVED_FROM} from './v13Sources';
import type {V13Mission} from './v13Types';
/** The campaign, chapter by chapter, in bake order. `plans` is where the missions are authored; a derived chapter's
 *  base plans (and whether it inherits the Phase 7 layer) are set in v13Sources.ts. */
export const CHAPTER_SOURCE:{chapter:number;missions:V13Mission[];plans:string;derivedFrom?:number}[]=[
 {chapter:1,missions:V13_MUSEUM,plans:'v13Museum.ts'},
 {chapter:2,missions:V13_GALLERY,plans:'v13Gallery.ts'},
 {chapter:3,missions:V13_BANK,plans:'v13Bank.ts'},
 {chapter:4,missions:V13_LAB,plans:'v13Lab.ts'},
 {chapter:5,missions:V13_CASINO,plans:'v13Casino.ts',derivedFrom:DERIVED_FROM[5].chapter},
 {chapter:6,missions:V13_MANSION,plans:'v13Late.ts',derivedFrom:DERIVED_FROM[6].chapter},
 {chapter:7,missions:V13_WAREHOUSE,plans:'v13Late.ts',derivedFrom:DERIVED_FROM[7].chapter},
 {chapter:8,missions:V13_HQ,plans:'v13Late.ts',derivedFrom:DERIVED_FROM[8].chapter},
 {chapter:9,missions:V13_VAULT_CH9,plans:'v13Vault.ts'},
];
export const V13_MISSIONS:V13Mission[]=CHAPTER_SOURCE.flatMap(c=>c.missions);
/** Every mission is composed from its V13 plan; SOURCE_STAGES only supplies the approved guard and camera constants. */
export function buildV13Campaign():StageDefinition[]{
 const source=raw as StageDefinition[];
 return V13_MISSIONS.map(m=>JSON.parse(JSON.stringify(composeV13(m,source))) as StageDefinition);
}
if(process.argv[1]?.endsWith('v13Build.ts')){
 const only=process.env.ONLY?.split(',');
 if(only){
  // Authoring loop: compose the named missions alone and print plan + topology audit.
  for(const id of only){const m=V13_MISSIONS.find(m=>m.id===id)!;
   try{const def=composeV13(m,raw as StageDefinition[]),audit=auditV124bTopology(def);
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
  console.log(`Baked ${audit.pass}/45 with V13 architecture on ${V13_MISSIONS.length} missions. Simulator and play gates remain separate.`);
 }
}
