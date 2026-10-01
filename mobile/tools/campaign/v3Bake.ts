/** Bake level data only after checking the explicitly protected task scope. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildCampaign} from './buildCampaign';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
const dir='Reports/LevelDesignV3';
const before:StageDefinition[]=JSON.parse(fs.readFileSync(`${dir}/before/campaignStages.json`,'utf8'));
const hashes:Record<string,string>=JSON.parse(fs.readFileSync(`${dir}/before/protected-system-sha.json`,'utf8'));
// Compare the serialized runtime contract: JSON omits optional undefined fields.
const stages:StageDefinition[]=JSON.parse(JSON.stringify(buildCampaign()));
assert.deepEqual(stages.filter(s=>(s.chapter??0)>3),before.filter(s=>(s.chapter??0)>3),'Chapter04–09 must remain unchanged');
assert.deepEqual(stages.map(s=>[s.id,s.number,s.chapter,s.mission]),before.map(s=>[s.id,s.number,s.chapter,s.mission]),'No campaign progression or stable ID change');
for(const [file,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,`Protected system changed: ${file}`);
const target='src/game/levels/stages/campaignStages.json';
fs.writeFileSync(`${target}.v3.tmp`,JSON.stringify(stages,null,2)+'\n');
fs.renameSync(`${target}.v3.tmp`,target);
fs.writeFileSync(`${dir}/candidate.json`,JSON.stringify(stages,null,2)+'\n');
console.log(`Baked ${stages.length} stages; ${Object.keys(hashes).length} protected files and Chapter04–09 unchanged.`);
