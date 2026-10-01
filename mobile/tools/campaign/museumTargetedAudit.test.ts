import assert from 'node:assert/strict';
import test from 'node:test';
import {museumMission02,museumMission05} from './museumProduction';
import {applyMuseumFinalDesign} from './museumFinalDesign';
import {applyMuseumDressing} from './museumDressing';
import {applyMuseumCentralCover} from './museumCentralCover';
import {applyMuseumTargetedAudit} from './museumTargetedAudit';
import {auditHideability} from './museumHideabilityQA';
import {auditCentralCover,auditCentralPatrol,auditIslandBypasses} from './museumCentralCoverQA';
import {auditSecurityVisual} from './museumSecurityCleanupQA';
import {runMission} from './museumFinalPlayQA';
import {PROP_KIT} from '../../src/game/world/propKit';

const baseline=()=>applyMuseumCentralCover(applyMuseumDressing(applyMuseumFinalDesign(museumMission05())));
test('Museum05 audit changes only one existing low pedestal and accurate focal landmark metadata',()=>{
 const before=baseline(),after=applyMuseumTargetedAudit(structuredClone(before));
 const pedestal=after.props.find(p=>p.kind==='diamondPedestal')!;assert.equal(pedestal.x,15.5);assert.equal(pedestal.y,7.72);
 const permitted=structuredClone(before);Object.assign(permitted.props.find(p=>p.kind==='diamondPedestal')!,{x:15.5,y:7.72});
 permitted.landmark={...permitted.landmark!,kind:'objectiveCase',x:14,y:5.62};assert.deepEqual(after,permitted);
 const untouched={...before,id:'01-10'};assert.strictEqual(applyMuseumTargetedAudit(untouched),untouched);
});
test('Museum05 separation reduces projected stacking without added cover, fake gap or lost escape',()=>{
 const before=baseline(),after=applyMuseumTargetedAudit(structuredClone(before));
 assert(auditSecurityVisual(after).overlaps.length<auditSecurityVisual(before).overlaps.length);
 const a=auditHideability(before),b=auditHideability(after);assert.equal(b.fullCover,a.fullCover);assert.equal(b.hidePoints,a.hidePoints);
 assert.equal(auditCentralCover(after).gaps.length,0);assert(auditIslandBypasses(after).every(p=>p.localTwoSideWitness?.bothClear));
 assert(auditCentralPatrol(after).every(g=>g.pass));
 const r=runMission(after,{route:0,escape:0,mode:1,delay:0});assert(r.clear&&!r.caught);assert(r.pickupAt!==null&&r.theftAt!==null);
});
test('Museum02 Rotunda sculpture increases silhouette height without extra LOS blocker or altered guard/routes',()=>{
 const before=applyMuseumCentralCover(applyMuseumDressing(applyMuseumFinalDesign(museumMission02()))),after=applyMuseumTargetedAudit(structuredClone(before));
 const old=before.props.find(p=>p.kind==='pillar'&&p.x===6.4)!,art=after.props.find(p=>p.kind==='statue'&&p.x===6.65)!;
 assert(art);assert.equal(art.scale,1.3);assert.equal(art.collisionScale,1.3);
 assert.equal(after.props.length,before.props.length);assert.equal(after.props.filter(p=>PROP_KIT[p.kind].blocksVision).length,before.props.filter(p=>PROP_KIT[p.kind].blocksVision).length);
 const oldBounds=auditSecurityVisual(before).bounds[before.props.indexOf(old)],newBounds=auditSecurityVisual(after).bounds[after.props.indexOf(art)];assert(newBounds.height>oldBounds.height*1.5);
 for(const key of ['layout','guards','patrolRoutes','testRoutes','escapeRoutes','objective','exit','playerSpawn'] as const)assert.deepEqual(after[key],before[key]);
 const a=auditHideability(before),b=auditHideability(after);assert.equal(b.hidePoints,a.hidePoints);assert.equal(auditCentralCover(after).gaps.length,0);
 assert(auditCentralPatrol(after).every(g=>g.pass));
 for(const route of [0,1]){const r=runMission(after,{route,escape:0,mode:1,delay:0});assert(r.clear&&!r.caught);}
});
