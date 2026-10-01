import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {applySecurityData} from './bankSecurityOverlay';
import {runBankMission} from './bankProductionReplay';
const baseline:StageDefinition=JSON.parse(fs.readFileSync('Reports/SecurityBankV1/before/campaignStages.json','utf8')).find((d:StageDefinition)=>d.id==='01-08');
test('Security Core preserves every original role inspection circuit before broader sectors',()=>{
 const after=applySecurityData(baseline);
 for(const guard of after.guards){assert.deepEqual(guard.theftSearchSectors![0].anchors,guard.theftPosts);assert(guard.theftSearchSectors!.length>=3);}
});
test('approved Security Core continuous Sneak escape survives exactly with new CCTV and expanded sectors',()=>{
 const scenario={route:0,escape:1,mode:1,delay:.5},after=runBankMission(applySecurityData(baseline),scenario),before=runBankMission(baseline,scenario);
 assert(before.clear);assert(after.clear);assert.deepEqual(after,before);assert.equal(after.caught,false);
});
