import test from 'node:test';
import assert from 'node:assert/strict';
import {BANK_PILOT} from './bankPilot';
import {bankPilotQA} from './bankPilotQA';
const report=bankPilotQA();
test('Bank separate pilot uses20independent assets and leavesall55campaign unchanged',()=>{assert.equal(new Set(BANK_PILOT.props.map(p=>p.visualAssetId)).size,20);assert.equal(report.campaignPreserved,55);});
test('Bank Main/Safe/Risk and escape paths preserve actual body and Tilt overshoot margin',()=>{for(const r of report.routes)for(const s of r.segments){assert(s.bodyClear,`${r.name} body`);assert(s.overshootMarginClear,`${r.name} margin`);}assert(report.probes.every(p=>p.bodyPass&&p.marginPass));assert.equal(report.gaps.length,0);});
test('Bank bothguards actualPatrolChaseSearchReturn have no collisions or invalid paths',()=>{for(const g of report.cycles){assert.equal(g.patrol.visited,g.patrol.total);assert.equal(g.patrol.recoveries,0);assert(g.spotted&&g.chase&&g.search&&g.return&&g.returned&&g.globalAlertCleared);assert(g.finite);assert.equal(g.collisionSamples,0);}});
test('Bank Main/Safe/Risk have fullAI continuous objective/escape witnesses',()=>{for(const r of report.replays)assert(r.witness?.clear&&!r.witness.caught,r.route);});
