import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {verifyNavigation} from './verifyNavigationRegression';

test('all campaign optimized navigation nodes, neighbors and components match full-blocker oracle for guard/player radii',()=>{
 // Repository source, not an ignored report fixture: runs in a fresh checkout.
 const stages=JSON.parse(readFileSync('src/game/levels/stages/campaignStages.json','utf8')) as StageDefinition[];
 const results=verifyNavigation(stages);
 assert.equal(results.length,stages.length*2);
 for(const row of results)assert.deepEqual(row.mismatches,{walkable:0,neighbors:0,components:0,metadata:0},`${row.id} ${row.label} radius=${row.radius}`);
});
