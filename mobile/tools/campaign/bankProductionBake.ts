import fs from 'node:fs';
import {BANK_PRODUCTION} from './bankProductionDesign';
import {applySecurityData} from './bankSecurityOverlay';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
export function bankProductionCampaign(source:StageDefinition[]){
 const before=source.filter(d=>!d.id.startsWith('03-'));
 const after=[...before.filter(d=>(d.chapter??0)<=2).map(applySecurityData),...BANK_PRODUCTION.map(applySecurityData),...before.filter(d=>(d.chapter??0)>3)];
 return after;
}
const baseline:StageDefinition[]=JSON.parse(fs.readFileSync('Reports/SecurityBankV1/before/campaignStages.json','utf8'));
const after=bankProductionCampaign(baseline),out=process.argv.includes('--apply')?'src/game/levels/stages/campaignStages.json':'Reports/SecurityBankV1/candidate/campaignStages.json';
fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});fs.writeFileSync(out,JSON.stringify(after)+'\n');console.log(out);
