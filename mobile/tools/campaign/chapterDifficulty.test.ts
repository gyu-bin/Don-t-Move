import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CHAPTERS,CHAPTER_MISSION_COUNTS} from '../../src/game/levels/campaignCatalog';
import {CHAPTER_DIFFICULTY,chapterDifficulty,missionDifficultyModifier} from '../../src/game/levels/chapterDifficulty';
import historicalSource from '../../docs/design/v12/phase3/SOURCE_STAGES.json';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {applyDifficultyTuning} from './difficultyTuning';
import {auditDifficulty,summarizeDifficulty,chapterOrderingAcceptance,type DifficultyAudit} from './chapterDifficultyAudit';

test('All 45 missions resolve the same single chapter profile regardless of mission index',()=>{
 assert.equal(CHAPTER_DIFFICULTY.length,9);assert.equal(campaignStages.length,45);
 assert.deepEqual(CHAPTER_MISSION_COUNTS,[5,5,5,5,5,5,5,5,5]);
 assert.deepEqual(CHAPTERS.map(c=>c.difficultyTier),['EASY','EASY_PLUS','MEDIUM','MEDIUM_PLUS','MEDIUM_HIGH','MEDIUM_HIGH_PLUS','HARD','VERY_HARD','FINAL']);
 for(const def of campaignStages){const config=chapterDifficulty(def.chapter!);assert.equal(config.difficultyTier,CHAPTERS[def.chapter!-1].difficultyTier);assert.equal(missionDifficultyModifier,1);assert(config.missionModifierBounds[0]>=.95&&config.missionModifierBounds[1]<=1.05);assert(!('difficultyRank' in def));}
 assert.throws(()=>chapterDifficulty(0));assert.throws(()=>chapterDifficulty(10));
});
test('Reviewed tuning is immutable, idempotent and changes only the explicit mission fields',()=>{
 for(const baked of historicalSource as import('../../src/game/levels/StageDefinition').StageDefinition[]){
  // Deliberately untuned inline inputs exercise the transform, rather than only
  // comparing an already-baked map to another no-op application.
  const def=structuredClone(baked);
  for(const guard of def.guards)guard.visionRange=9;
  if(def.id==='01-04'){
   def.guards[0].facing=-Math.PI/2;def.guards[0].initialFacing=-Math.PI/2;
   def.patrolRoutes[0].points[0].lookDirection=-Math.PI/2;
   def.patrolPlan!.anchors.find(a=>a.id==='0-0')!.look=-Math.PI/2;
  }
  if(def.id==='01-08')def.patrolRoutes[2].points[1].lookDirection=0;
  if(def.id==='02-09'){
   const point=def.patrolRoutes[2].points[1];point.y=24.75;point.waitDuration=0;point.lookDirection=0;
  }
  if(def.id==='02-10')def.guards.find(g=>g.id==='02-10-g7')!.theftSearchSectors![0].anchors=[{x:20.75,y:11.75}];
  const expected=structuredClone(def);
  for(const guard of expected.guards){
   if(def.id==='01-04')guard.visionRange=3.5;
   if(def.id==='01-05')guard.visionRange=3.727;
   if(def.id==='01-08'&&guard.id==='01-08-g2')guard.visionRange=4.224;
   if(def.id==='02-10'&&guard.id==='02-10-g7')guard.theftSearchSectors![0].anchors=[
    {x:32.75,y:29.75},{x:30.25,y:27.25},{x:29.25,y:23.75},
    {x:22.25,y:17.25},{x:20.75,y:14.25},{x:20.75,y:11.75},
   ];
  }
  if(def.id==='01-04'){
   expected.guards[0].facing=0;expected.guards[0].initialFacing=0;
   expected.patrolRoutes[0].points[0].lookDirection=0;
   expected.patrolPlan!.anchors.find(a=>a.id==='0-0')!.look=0;
  }
  if(def.id==='01-08')expected.patrolRoutes[2].points[1].lookDirection=Math.PI/2;
  if(def.id==='02-09'){
   const point=expected.patrolRoutes[2].points[1];point.y=26.75;point.waitDuration=.8;point.lookDirection=2.819842099193151;
  }
  const original=JSON.stringify(def),tuned=applyDifficultyTuning(def);
  assert.equal(JSON.stringify(def),original,`${def.id}: source mutation`);
  assert.deepEqual(tuned,expected,`${def.id}: unreviewed field change`);
  assert.deepEqual(applyDifficultyTuning(tuned),tuned,`${def.id}: repeated bake drift`);
 }
});
test('Generator security budget comes from chapter, not mission ordinal',()=>{
 const source=fs.readFileSync('tools/campaign/buildCampaign.ts','utf8');
 assert(source.includes('chapterDifficulty(chapter+1).authoring'));
 for(const old of ['2+Math.floor(chapter/3)+Math.floor(mission/2)','pace:0.8+mission*0.025','visionRange:3.5+mission*0.18','1+mission*0.2'])assert(!source.includes(old),old);
});
test('Outlier audit identifies a high axis without converting it into automatic difficulty tuning',()=>{
 const sample=auditDifficulty(campaignStages.find(d=>d.chapter===1&&(d.cameras?.length??0)>0)!);
 assert(sample.safeRouteExposure>=0&&sample.safeRouteExposure<=1);assert(sample.guardCoverage>0);assert(sample.cctvCoverage>0);assert(sample.escapeChoices>0);assert(sample.theft.roles.length>0);
 const rows=Array.from({length:10},(_,i)=>({...sample,id:`01-${i+1}`,guardCoverage:i===7?.9:.1})) as DifficultyAudit[];
 const result=summarizeDifficulty(rows)[0];assert(result.outliers.some(o=>o.id==='01-8'&&o.axis==='guardCoverage'&&o.status==='REVIEW_REQUIRED'));
 // An easy-tier label must never suppress measured pressure or unresolved outliers.
 assert.equal(result.target.difficultyTier,'EASY');assert(result.means.guardCoverage>.1);
});

test('Chapter ordering acceptance rejects reversed/missing evidence and accepts independently ordered axes',()=>{
 const base=auditDifficulty(campaignStages.find(d=>d.id==='01-05')!);
 const fixture=(values:number[])=>values.flatMap((value,i)=>Array.from({length:5},(_,j)=>({...base,id:`0${i+1}-${String(j+1).padStart(2,'0')}`,chapter:i+1,guardCoverage:value,safeRouteExposure:value,objectivePressure:value,cctvCoverage:value,escapePressure:value})));
 const negative=chapterOrderingAcceptance(fixture([.3,.1,.2]));
 assert.equal(negative.accepted,false);assert.equal(negative.status,'REVIEW_REQUIRED');assert(negative.findings.every(f=>!f.accepted&&!f.comparisons[0].ordered&&f.comparisons[1].ordered));
 const ordered=chapterOrderingAcceptance(fixture([.1,.2,.3]));
 assert.equal(ordered.accepted,true);assert.equal(ordered.status,'MEASURED_ORDERED');assert(ordered.findings.every(f=>f.accepted));assert.equal(ordered.humanPlaytestVerified,false);
 const oneAxisReversed=fixture([.1,.2,.3]);oneAxisReversed.filter(r=>r.chapter===1).forEach(r=>r.cctvCoverage=.4);
 assert.equal(chapterOrderingAcceptance(oneAxisReversed).accepted,false,'One good average cannot hide a reversed axis');
 assert.equal(chapterOrderingAcceptance(fixture([.1,.2])).accepted,false,'Missing chapter is not zero exposure or a pass');
 const truncated=fixture([.1,.2,.3]).filter(r=>r.id.endsWith('-01'));
 assert.equal(chapterOrderingAcceptance(truncated).accepted,false,'One mission per chapter is incomplete evidence');
 const duplicate=fixture([.1,.2,.3]);duplicate[1].id=duplicate[0].id;
 assert.equal(chapterOrderingAcceptance(duplicate).accepted,false,'Duplicate missions cannot replace missing evidence');
 const missingRoute=fixture([.1,.2,.3]);missingRoute[0].safeRouteSampleCount=0;missingRoute[0].evidenceComplete=false;
 assert.equal(chapterOrderingAcceptance(missingRoute).accepted,false,'Missing routes cannot certify zero exposure');
});
