import assert from 'node:assert/strict';
import {test} from 'node:test';
import before from './fixtures/v3MuseumGalleryBefore.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {auditV5Geometry} from './v5Geometry';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
const fixture=before as StageDefinition[];
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
test('V5 geometry rejects an objective in an actual wall',()=>{
 const d=clone(fixture[0]);const stage=compileStage(d);const i=stage.grid.findIndex(c=>c===2);assert(i>=0);
 d.objective={...d.objective!,x:i%stage.cols+.5,y:Math.floor(i/stage.cols)+.5};
 assert(auditV5Geometry(d).issues.some(i=>i.includes('Unreachable objective/exit')));
});
test('V5 geometry rejects a foreign Chapter4 major asset in Museum',()=>{
 const d=clone(fixture[0]);assert(d.props.length);d.props[0].visualAssetId='lab_cryo_unit';
 assert(auditV5Geometry(d).issues.some(i=>i.includes('Foreign asset')));
});
test('V5 geometry rejects visible reference route segments through a wall',()=>{
 const d=clone(fixture[0]);const s=compileStage(d);const i=s.grid.findIndex(c=>c===2);assert(i>=0);
 d.testRoutes=[{name:'fault injected wall passage',points:[{x:s.playerSpawn.x/TILE,y:s.playerSpawn.y/TILE},{x:i%s.cols+.5,y:Math.floor(i/s.cols)+.5}]}];
 assert(auditV5Geometry(d).issues.some(i=>i.includes('blocked leg')));
});

test('V5 geometry rejects foreign physical kinds even without explicit artwork',()=>{
 const d=clone(fixture[0]);d.props.push({kind:'labCryoUnit',x:5,y:5});
 assert(auditV5Geometry(d).issues.some(i=>i.includes('Foreign asset labCryoUnit')));
});

test('All current V5 runtime maps satisfy actual compiled navigation, approved art family and radius18 route clearance',()=>{
 const current=campaignStages.filter(d=>(d.chapter??0)<=3);assert.equal(current.length,30);
 for(const def of current)assert.deepEqual(auditV5Geometry(def).issues,[],def.id);
});
