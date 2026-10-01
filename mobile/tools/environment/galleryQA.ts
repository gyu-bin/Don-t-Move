/** Real offline game loop; human Tilt and native performance remain pending. */
import fs from 'node:fs';
import {galleryEnvironmentMission} from '../campaign/galleryEnvironmentDesign';
import {measureMuseum} from '../campaign/museumQA';
import {validateMuseumV2} from '../campaign/museumV2Validation';
async function main(){
 const results=[];
 for(let mission=1;mission<=10;mission++){
  const def=galleryEnvironmentMission(mission),validation=validateMuseumV2(def),patrol=measureMuseum(def,120);
  const errors:string[]=[];
  if(!validation.spawnValid)errors.push('Player body spawn blocked');
  for(const g of validation.guards)if(!g.spawnClear||!g.anchors.every(a=>a.clear&&a.reachable&&a.lookValid&&a.waitValid))errors.push(`${g.id}: invalid guard spawn/anchors`);
  for(const route of validation.geometryOnly)if(!route.clear||route.collisionFailures)errors.push('Continuous body route failed');
  for(const run of validation.fullAi)if(!run.found||!run.clear||run.caught)errors.push('No continuous full-AI completion witness');
  for(const g of patrol.guards)if(g.collisionSamples||g.recoveries||g.visitedAnchors<g.totalAnchors||g.maxStationarySeconds>=12)errors.push(`${g.id}: patrol collision/recovery/unvisited/idle`);
  if(!patrol.routes.every(r=>r.allSegmentsClear)||!patrol.escape.allSegmentsClear||!patrol.escape.endsAtExit)errors.push('Body/nav route or exit invalid');
  const result={id:def.id,guards:def.guards.length,errors,validation,patrol};results.push(result);
  console.log(JSON.stringify({id:def.id,errors,fullAi:validation.fullAi.map(r=>({found:r.found,clear:r.clear,caught:r.caught})),guards:patrol.guards.map(g=>({id:g.id,collision:g.collisionSamples,recoveries:g.recoveries,visited:g.visitedAnchors,total:g.totalAnchors}))}));
 }
 fs.mkdirSync('Reports/EnvironmentKitV1',{recursive:true});fs.writeFileSync('Reports/EnvironmentKitV1/gallery-runtime-qa.json',JSON.stringify({method:'120s actual guard patrol + real60Hz body traversal and bounded full-AI completion search, current input engine; not humanTilt/nativeFPS verification.',results},null,2)+'\n');
 if(results.some(r=>r.errors.length))process.exitCode=1;
}
void main();
