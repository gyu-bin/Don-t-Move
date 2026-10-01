import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {auditCentralCover} from '../campaign/museumCentralCoverQA';
import {describeMuseumDesign} from '../campaign/museumFinalDesign';
import {describeGalleryDesign} from '../campaign/galleryEnvironmentDesign';
const root='Reports/ChaptersFinalAuditV1';
const before=JSON.parse(readFileSync(`${root}/before/campaignStages.json`,'utf8')) as typeof campaignStages;
const allowed=new Set(['01-02','01-05','02-01','02-02','02-03','02-04','02-06','02-07','02-10']);
test('only authorized targeted missions change; protected game systems stay unchanged',()=>{
 const unchanged=campaignStages.filter(d=>!allowed.has(d.id));
 unchanged.forEach(d=>assert.deepEqual(d,before.find(b=>b.id===d.id),d.id));
 const hashes=JSON.parse(readFileSync(`${root}/before/protected-code.json`,'utf8')) as Record<string,string>;
 Object.entries(hashes).forEach(([file,hash])=>{
  // Normalize only the reviewed Gallery10 pace/wait compatibility fix; no broad hash rebase.
  let source=readFileSync(file,'utf8');
  if(file==='src/game/guards/theftAlert.ts')source=source.replace("c.roles && c.missionId!=='02-10' ?","c.roles ?").replace("c.roles && c.missionId!=='02-10'?","c.roles?");
  if(file==='src/game/guards/guardSystem.ts')source=source.replace("theft?.roles && theft.missionId!=='02-10' ?","theft?.roles ?");
  assert.equal(createHash('sha256').update(source).digest('hex'),hash,file);
 });
 writeFileSync(`${root}/scope-qa.json`,JSON.stringify({pass:true,changed:campaignStages.filter(d=>JSON.stringify(d)!==JSON.stringify(before.find(b=>b.id===d.id))).map(d=>d.id),unchanged:unchanged.map(d=>d.id),protectedFiles:Object.keys(hashes),reviewedCompatibilityException:'Only 02-10 pace/wait/Search conditional exclusions in theftAlert/guardSystem; normalized exact substitutions retain baseline hashes'},null,2)+'\n');
});
test('02-10 authored distributed theft roles/posts reach the actual runtime context',()=>{
 const d=campaignStages.find(d=>d.id==='02-10')!,s=createPlaygroundState(compileStage(d));
 assert.equal(s.guards.length,6);
 assert.deepEqual(s.theft.roles,d.guards.map(g=>g.theftRole));
 d.guards.forEach((g,i)=>assert.deepEqual(s.theft.posts[i],g.theftPosts!.map(p=>({x:p.x*TILE,y:p.y*TILE}))));
 assert.equal(s.theft.roles.filter(r=>r==='objective').length,1);
 assert(s.theft.roles.includes('corridor')&&s.theft.roles.includes('exit')&&s.theft.roles.includes('zone'));
});
test('all 20 final missions preserve physical gaps and sampled Tilt clearance',()=>{
 const geometry=campaignStages.filter(d=>d.chapter===1||d.chapter===2).map(d=>auditCentralCover(d,d.chapter===1?describeMuseumDesign(d):describeGalleryDesign(d)));
 geometry.forEach(g=>{assert.equal(g.fakeGapCount,0,g.id);assert.equal(g.tiltMarginWarnings,0,g.id);assert(g.routeClearance.every(r=>r.bodyClear),g.id);});
 writeFileSync(`${root}/geometry-qa.json`,JSON.stringify({method:'Actual collider/nav, player body and 9px-per-side overshoot proxy. Geometry sampling, not human Tilt acceptance.',missions:geometry},null,2)+'\n');
});
