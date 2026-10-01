/** Regression against the immediate pre-enrichment snapshot, not human Tilt approval. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {campaignStages} from '../../src/game/levels/campaignStages';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {BODY} from '../../src/game/guards/guardTuning';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {DRESSING_KIT} from '../../src/game/world/dressingKit';
import {describeGalleryDesign} from '../campaign/galleryEnvironmentDesign';
import {auditHideability} from '../campaign/museumHideabilityQA';
import {auditGalleryArchitecture} from '../campaign/galleryArchitectureQA';
import {playthrough} from '../campaign/museumPlaythrough';

const root='Reports/GalleryEnrichmentV1';
const before:StageDefinition[]=JSON.parse(fs.readFileSync(`${root}/before/campaignStages.json`,'utf8'));
const sha=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const preservation=before.filter(d=>d.chapter!==2).map(d=>{
 const current=campaignStages.find(s=>s.id===d.id);assert.deepEqual(current,d,`${d.id}: protected chapter changed`);
 return {id:d.id,unchanged:true,sha256:sha(d)};
});
const results=campaignStages.filter(d=>d.chapter===2).map(d=>{
 const old=before.find(s=>s.id===d.id)!;
 for(const key of ['layout','props','playerSpawn','guards','patrolRoutes','patrolPlan','objective','exit','entryPosition','exitPosition','testRoutes','escapeRoutes','safeZones','securityZones','structurePlan'] as const)
  assert.deepEqual(d[key],old[key],`${d.id}: protected ${key} changed`);
 const a=compileStage(old),b=compileStage(d);assert.deepEqual(b.visionBlockers,a.visionBlockers,`${d.id}: LOS changed`);
 const hideBefore=auditHideability(old,describeGalleryDesign(old)),hideAfter=auditHideability(d,describeGalleryDesign(d));
 assert.equal(hideAfter.fullCover,hideBefore.fullCover);assert.equal(hideAfter.losBreakers,hideBefore.losBreakers);
 const nav=buildNavigation(b,BODY.playerRadius);
 const reachable=(x:number,y:number)=>{const p=findPath(nav,b.playerSpawn.x,b.playerSpawn.y,x,y);return p.length>=2&&Math.hypot(p.at(-2)!-x,p.at(-1)!-y)<.01;};
 for(const witness of [...hideBefore.witnesses,...hideBefore.architecturalRefuges]){
  const {x,y}=witness.point;
  assert(clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,b.movementBlockers,BODY.playerRadius),`${d.id}: hide point covered`);
  assert(reachable(x*TILE,y*TILE),`${d.id}: hide point inaccessible`);
 }
 const routes=hideAfter.routes.map((r,i)=>{
  assert(r.bodyClear,`${d.id}: ${r.name} obstructed`);
  assert(r.minimumBodyMargin>=hideBefore.routes[i].minimumBodyMargin-.01,`${d.id}: route margin shrunk`);
  return {name:r.name,bodyClear:r.bodyClear,beforeMargin:hideBefore.routes[i].minimumBodyMargin,afterMargin:r.minimumBodyMargin};
 });
 const geometry=auditGalleryArchitecture(d);
 assert(geometry.clusters.every(c=>c.localTwoSide),`${d.id}: central two-side Tilt bypass lost`);
 assert.equal(geometry.central.fakeGapCount,0,`${d.id}: fake gap`);
 assert.equal(geometry.central.tiltMarginWarnings,0,`${d.id}: Tilt margin warning`);
 const newItems=(d.dressing??[]).slice(old.dressing?.length??0).flatMap(c=>c.items);
 const continuousGeometry=[0,1].map(route=>{
  const run=playthrough(d,route,2,0,true);assert(run.clear&&!run.collisionFailures,`${d.id}: continuous route ${route} failed`);
  return {route,...run};
 });
 return {id:d.id,addedClusters:(d.dressing?.length??0)-(old.dressing?.length??0),soft:newItems.filter(i=>DRESSING_KIT[i.kind].category==='soft').length,decoration:newItems.filter(i=>DRESSING_KIT[i.kind].category==='decoration').length,additionalMovementBoxes:(b.movementBlockers.length-a.movementBlockers.length)/4,fullCoverUnchanged:true,losUnchanged:true,hideWitnessesPreserved:hideBefore.witnesses.length+hideBefore.architecturalRefuges.length,routes,centralBypasses:geometry.clusters.length,fakeGapProxy:geometry.central.fakeGapCount,tiltMarginWarnings:geometry.central.tiltMarginWarnings,continuousGeometry,sourceSha256:sha(d)};
});
fs.writeFileSync(`${root}/enrichment-qa.json`,JSON.stringify({method:'Exact original structures/semantic routes/guards/LOS preservation, old hide witnesses preserved, real collider radius9 and central Tilt spare9, continuous geometry-only real-input replay. Fake-gap metric is a geometric proxy; visual/native/human Tilt require review.',preservation,results},null,2)+'\n');
console.log(JSON.stringify(results.map(({id,addedClusters,soft,decoration,centralBypasses,fakeGapProxy})=>({id,addedClusters,soft,decoration,centralBypasses,fakeGapProxy})),null,2));
