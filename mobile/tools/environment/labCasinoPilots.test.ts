import test from 'node:test';
import assert from 'node:assert/strict';
import {LAB_PILOT,LAB_CASINO_PILOTS} from './labCasinoPilots';
import {labCasinoPilotQA} from './labCasinoPilotQA';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {MIN_COMFORT_GAP} from '../campaign/museumCentralCoverQA';
for(const def of LAB_CASINO_PILOTS){const report=labCasinoPilotQA(def);
test(def.id+' separate pilot uses26independent assets and leavesall55campaign unchanged',()=>{assert.equal(new Set(def.props.map(p=>p.visualAssetId)).size,26);assert.equal(report.campaignPreserved,55);});
test(def.id+' Main/Safe/Risk and escape paths preserve actual body and Tilt overshoot margin',()=>{for(const r of report.routes)for(const s of r.segments){assert(s.bodyClear,`${r.name} body`);assert(s.overshootMarginClear,`${r.name} margin`);}assert(report.probes.every(p=>p.bodyPass&&p.marginPass));assert.equal(report.gaps.length,0);});
test(def.id+' bothguards actualPatrolChaseSearchReturn have no collisions or invalid paths',()=>{for(const g of report.cycles){assert.equal(g.patrol.visited,g.patrol.total);assert.equal(g.patrol.recoveries,0);assert(g.spotted&&g.chase&&g.search&&g.return&&g.returned&&g.globalAlertCleared);assert(g.finite);assert.equal(g.collisionSamples,0);}});
test(def.id+' Main/Safe/Risk have fullAI continuous objective/escape witnesses',()=>{for(const r of report.replays)assert(r.witness?.clear&&!r.witness.caught,r.route);});
}

test('Lab pilot glass corridor is a real blocked transparent barrier with clear flanks',()=>{
 const s=compileStage(LAB_PILOT),glass=LAB_PILOT.props.find(p=>p.kind==='labGlassCorridor')!;
 const x=glass.x*TILE,y=glass.y*TILE;
 assert(!clearSegment(x,y-40,x,y+40,s.movementBlockers,BODY.playerRadius));
 assert(clearSegment(x,y-40,x,y+40,s.visionBlockers),'glass must transmit actual guard LOS');
 for(const side of[-1,1])assert(clearSegment(x+side*2.2*TILE,y-40,x+side*2.2*TILE,y+40,s.movementBlockers,MIN_COMFORT_GAP/2),'both glass flanks must allow a comfortable detour');
});
