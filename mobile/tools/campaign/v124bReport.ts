/** Evidence report from the actual baked runtime JSON. Native/human evidence separate. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import type{StageDefinition}from '../../src/game/levels/StageDefinition';
import{auditV124bCampaign}from './v124bTopologyQA';
import{chapterDifficulty}from '../../src/game/levels/chapterDifficulty';
const current=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8')) as StageDefinition[];
const before=JSON.parse(fs.readFileSync('docs/design/v12/phase4b/SOURCE_STAGES.json','utf8')) as StageDefinition[];
const protectedHashes=JSON.parse(fs.readFileSync('docs/design/v12/phase4b/PROTECTED_HASHES.json','utf8')) as Record<string,string>;
const sha=(file:string)=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const protectedResults=Object.entries(protectedHashes).map(([file,hash])=>({file,unchanged:sha(file)===hash}));
const area=(d:StageDefinition)=>d.layout.join('').split('').filter(c=>c==='.').length;
const rows=current.map(d=>{const old=before.find(s=>s.id===d.id)!;return{id:d.id,title:d.title,tier:chapterDifficulty(d.chapter!).difficultyTier,family:d.topologyPlan!.family,beforeSize:[old.layout[0].length,old.layout.length],afterSize:[d.layout[0].length,d.layout.length],beforeFloor:area(old),afterFloor:area(d),floorChangePercent:+((area(d)/area(old)-1)*100).toFixed(1),entry:d.entryPosition,objective:d.objective,exit:d.exitPosition,zones:d.functionalZones,routes:{approach:d.testRoutes?.[0],risk:d.testRoutes?.[1],quick:d.escapeRoutes?.[0],alternate:d.escapeRoutes?.[1]},structures:d.props,guards:d.guards.map(g=>({id:g.id,role:g.role,x:g.x,y:g.y,routeId:g.routeId})),cameras:d.cameras,doors:d.doors,lockdownDoors:d.lockdownDoors};});
const report={campaignSHA256:sha('src/game/levels/stages/campaignStages.json'),method:'Compiled physical geometry + authored data. Overview is offline production renderer; not native or Tilt certification.',topology:auditV124bCampaign(current),protectedResults,rows};
fs.writeFileSync('Reports/V12Phase4B/runtime-report.json',JSON.stringify(report,null,2)+'\n');
if(protectedResults.some(r=>!r.unchanged))throw Error('Protected system hashes changed');
console.log(report.topology.pass,report.topology.fail,'protected systems unchanged',protectedResults.length);
