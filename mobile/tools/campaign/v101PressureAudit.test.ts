import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditPressureMitigation} from './v101PressureMetrics';
import {auditDifficulty} from './chapterDifficultyAudit';
const stages=JSON.parse(fs.readFileSync('docs/design/v12/phase3/SOURCE_STAGES.json','utf8')) as StageDefinition[];
test('V10.1 post-theft audit exercises real alarm/search without supplying player LKP',()=>{
 const metrics=auditPressureMitigation(stages.find(d=>d.id==='03-10')!);
 assert(metrics.search.theftAlertAtSeconds!==null&&Math.abs(metrics.search.theftAlertAtSeconds-1.5)<=1/60+.0001);
 assert.equal(metrics.search.globalPlayerAlert,false);
 assert.equal(metrics.patrol.theftAlertAtSeconds,null);
 assert(metrics.search.routes.length>=2);
 for(const r of metrics.search.routes){assert.equal(r.pointExposure.length>0,true);assert(r.exposure>=0&&r.exposure<=1);}
 assert(metrics.objectiveApproachSampleCount>0);
 assert(metrics.narrowTileFraction>=0&&metrics.narrowTileFraction<=1);
});
test('Missing authored routes remain missing evidence rather than a safe escape route',()=>{
 const def={...stages.find(d=>d.id==='01-01')!,testRoutes:[],escapeRoutes:[]};
 const metrics=auditPressureMitigation(def);
 const difficulty=auditDifficulty(def);
 assert.equal(difficulty.evidenceComplete,false);
 assert.equal(difficulty.safeRouteSampleCount,0);
 assert.equal(metrics.authoredSafeRouteSampleCount,0);
 assert.equal(metrics.authoredEscapeRoutes,0);
 assert.deepEqual(metrics.search.routes,[]);
 assert.equal(metrics.alternateRouteDistinctness,null);
});
