import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {assertGameplayPreserved} from './museumDressingQA';
const fixture=()=>structuredClone(campaignStages.find(d=>d.id==='01-08')!);
test('dressing contract retains unmodified mission and compiled vision',()=>{
 const def=fixture();delete def.dressing;const r=assertGameplayPreserved(def,structuredClone(def));assert.equal(r.additionalCollisionBoxes,0);
});
for(const mode of ['cover','guard','route','objective','exit'] as const)test(`dressing QA rejects changed ${mode}`,()=>{
 const before=fixture(),after=structuredClone(before);
 if(mode==='cover')after.props[0].x+=.1;
 if(mode==='guard')after.guards[0].pace=(after.guards[0].pace??1)+.1;
 if(mode==='route')after.testRoutes![0].points[0].x+=.1;
 if(mode==='objective')after.objective!.x+=.1;
 if(mode==='exit')after.exit!.x+=.1;
 assert.throws(()=>assertGameplayPreserved(before,after),/changed protected/);
});
test('low dressing adds only its physical box and wall art adds no collision or LOS',()=>{
 const before=fixture();delete before.dressing;const after=structuredClone(before);
 after.dressing=[{id:'fixture',zoneId:'01-08-A',identity:'Exhibit',items:[{kind:'bench_museum',x:2,y:2},{kind:'painting_wall',x:3,y:2}]}];
 const r=assertGameplayPreserved(before,after);assert.equal(r.additionalCollisionBoxes,1);
});
