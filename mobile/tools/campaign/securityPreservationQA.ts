/** Compare against the frozen working tree, not Git HEAD from an earlier task. */
import {applyV3MuseumGallery} from './v3MuseumGallery';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
const root='Reports/SecurityBankV1';
const baseline:StageDefinition[]=JSON.parse(fs.readFileSync(`${root}/before/campaignStages.json`,'utf8'));
const current:StageDefinition[]=JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON??'src/game/levels/stages/campaignStages.json','utf8'));
const withoutSecurity=(stage:StageDefinition)=>{
 const result=structuredClone(stage);delete result.cameras;
 for(const guard of result.guards)delete guard.theftSearchSectors;
 return result;
};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const preserved=baseline.filter(d=>(d.chapter??0)!==3).map(before=>{
 const after=current.find(d=>d.id===before.id);assert.ok(after,`Missing ${before.id}`);
 if((before.chapter??0)<=2)assert.deepEqual(withoutSecurity(after),withoutSecurity(applyV3MuseumGallery(before)),`${before.id}: data outside the authorized V3/security changes changed`);
 else assert.deepEqual(after,before,`${before.id}: out-of-scope chapter changed`);
 return{id:before.id,scope:(before.chapter??0)<=2?'Exact approved V3 authoring, excluding additive cameras/search sectors':'Whole stage',equal:true,sha256:hash(withoutSecurity(before))};
});
const pilotIds=new Set(['01-08','01-10','02-08','02-09','02-10']);
for(const d of current.filter(d=>(d.chapter??0)<=2)){
 assert.equal(d.cameras?.length??0,pilotIds.has(d.id)?1:0,`${d.id}: sparse pilot camera contract`);
}
const bank=current.filter(d=>d.chapter===3);
assert.equal(bank.length,10,'Bank must contain ten authored missions');
const guardVision=current.filter(d=>(d.chapter??0)<=3).map(after=>{
 const before=baseline.find(d=>d.id===after.id);
 return{id:after.id,before:before?.guards.map(g=>({id:g.id,range:g.visionRange,halfAngle:g.visionHalfAngle})),after:after.guards.map(g=>({id:g.id,range:g.visionRange,halfAngle:g.visionHalfAngle})),unchanged:after.chapter!==3};
});
const approvedBankAssets=new Set(bank.flatMap(d=>[...d.props.map(p=>p.visualAssetId),...(d.dressing??[]).flatMap(c=>c.items.map(i=>i.visualAssetId))]).filter((id):id is NonNullable<typeof id>=>!!id));
assert.ok([...approvedBankAssets].every(id=>id.startsWith('bank_')),'Bank uses another chapter artwork');
const report={pass:true,method:'Exact deep comparison to frozen pre-task data, Chapters01/02 compare exactly with the authorized V3 overlay; additive security fields excluded.',preserved,pilotCameras:current.filter(d=>pilotIds.has(d.id)).map(d=>({id:d.id,cameras:d.cameras})),guardVision,bank:{missions:bank.length,distinctAssetIds:[...approvedBankAssets].sort()},native:false};
fs.writeFileSync(`${root}/preservation.json`,JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${preserved.length} preserved stages; 5 sparse pilots; 10 Bank missions; ${approvedBankAssets.size} Bank assets.`);
