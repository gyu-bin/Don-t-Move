import test from 'node:test';
import assert from 'node:assert/strict';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {catchCause} from '../../src/game/mission/catchCause';
import type {CatchSnapshot} from '../../src/game/mission/catchCause';
import {runMission} from '../gameplay-audit/campaignAudit';
import type {Strategy} from '../gameplay-audit/campaignAudit';

const def=(id:string)=>(campaign as StageDefinition[]).find(d=>d.id===id)!;
const finalState=(id:string,st:Strategy,route:number,delay=0)=>{ let last:CatchSnapshot|null=null; const r=runMission(def(id),st,route,delay,'A',undefined,s=>{last=s as never;}); return {r,last:last!}; };

test('CAUGHT cause on real captures: investigating-guard contact, guard chase, camera-started chase', () => {
  const contact=finalState('01-01','walk',1,2); assert.equal(contact.r.outcome,'caught-contact'); assert.equal(catchCause(contact.last),'guardContact');
  const chase=finalState('01-02','run',0); assert.equal(chase.r.outcome,'caught-in-chase'); assert.equal(catchCause(chase.last),'guardChase');
  const camera=finalState('05-03','walk',0); assert.equal(camera.r.outcome,'caught-in-chase'); assert.equal(catchCause(camera.last),'cameraChase');
});
