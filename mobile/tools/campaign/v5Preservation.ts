/** V5 scope gate: frozen systems/assets, stable campaign IDs and later maps. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
export const V5_REPORT='Reports/LevelDesignV5';
export function canonical<T>(value:T):T{return JSON.parse(JSON.stringify(value));}
export function assertV5Preservation(stages:StageDefinition[]){
 const before:StageDefinition[]=JSON.parse(fs.readFileSync(`${V5_REPORT}/before/campaignStages.json`,'utf8'));
 const hashes:Record<string,string>=JSON.parse(fs.readFileSync(`${V5_REPORT}/before/protected-system-sha.json`,'utf8'));
 const actual=canonical(stages);
 assert.deepEqual(actual.filter(s=>(s.chapter??0)>3),before.filter(s=>(s.chapter??0)>3),'Later chapter maps changed');
 assert.deepEqual(actual.map(s=>[s.id,s.number,s.chapter,s.mission]),before.map(s=>[s.id,s.number,s.chapter,s.mission]),'Campaign IDs/progression changed');
 for(const [file,hash]of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,`Protected file changed: ${file}`);
 return {protectedFiles:Object.keys(hashes).length,changedProtected:[],changedLater:[],campaignCount:actual.length};
}
