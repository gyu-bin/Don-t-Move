import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BANK_PRODUCTION,BANK_PLANS} from './bankProductionDesign';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';

import {MISSION_COUNT,missionId,missionIndex} from '../../src/game/levels/campaignCatalog';

test('ten authored Bank missions are selectable without changing stable later IDs',()=>{
 assert.equal(BANK_PRODUCTION.length,10);assert.equal(MISSION_COUNT,60);
 for(let i=0;i<10;i++){assert.equal(missionIndex(BANK_PRODUCTION[i].id),20+i);assert.equal(missionId(20+i),BANK_PRODUCTION[i].id);}
 assert.equal(missionIndex('04-01'),30);assert.equal(missionId(59),'09-05');
});
test('all twenty approved Bank assets are used; final focal mainvault occurs exactly once',()=>{
 const ids=new Set(BANK_PRODUCTION.flatMap(s=>s.props.map(p=>p.visualAssetId).filter(Boolean)));
 const expected=(JSON.parse(fs.readFileSync('assets/environment/environment-assets.json','utf8')).assets as {id:string}[]).filter(a=>a.id.startsWith('bank_')).map(a=>a.id);
 assert.equal(expected.length,20);for(const id of expected)assert(ids.has(id as never),id);
 assert.equal(BANK_PRODUCTION.flatMap(s=>s.props).filter(p=>p.kind==='bankMainVault').length,1);
 assert(BANK_PRODUCTION[9].props.some(p=>p.kind==='bankMainVault'));
});
test('authored approach and escape geometry supports body and Tilt margin, varied coverage budgets',()=>{
 for(const [i,plan]of BANK_PLANS.entries()){assert.equal(BANK_PRODUCTION[i].guards.length,plan.guardZones.length);assert(new Set(plan.guardZones).size===plan.guardZones.length,'roles distributed by purpose, not mission ordinal');assert(plan.rooms.every((r,zi)=>plan.guardZones.includes(zi)||plan.cameras.includes(zi)||r.safeReason),'all rooms intentionally assigned');}
 for(const def of BANK_PRODUCTION){const stage=compileStage(def),nav=buildNavigation(stage,18);
  for(const r of [...def.testRoutes!,...def.escapeRoutes!])for(let i=1;i<r.points.length;i++){
   const a=r.points[i-1],b=r.points[i];assert(clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18),`${def.id} ${r.name}`);
  }
  for(const guard of def.guards)for(const sector of guard.theftSearchSectors!)for(const a of sector.anchors){const path=findPath(nav,stage.playerSpawn.x,stage.playerSpawn.y,a.x*TILE,a.y*TILE);assert(path.length>0,`${def.id} theft ${sector.id}`);assert(Math.hypot(path.at(-2)!-a.x*TILE,path.at(-1)!-a.y*TILE)<.01);}
  for(const g of def.guards)assert.equal(g.visionHalfAngle,Math.PI/6);
 }
});
test('actual engine report matches final source and all30 continuous complete witnesses',()=>{
 const report=JSON.parse(fs.readFileSync('Reports/LevelDesignV3/bank-qa.json','utf8'));
 assert.equal(report.length,10);
 for(const [i,r] of report.entries()){
  assert.equal(r.sourceSha256,createHash('sha256').update(JSON.stringify(BANK_PRODUCTION[i])).digest('hex'));
  assert.equal(r.gaps.length,0);assert(r.patrol.every((g:{visited:number;total:number;collisionSamples:number})=>g.visited===g.total&&g.collisionSamples===0));
  assert(r.replays.every((w:{witness:{clear:boolean;caught:boolean}|null})=>w.witness?.clear&&!w.witness.caught));
  assert(r.hideability.hideWitnesses.filter((h:{reachableOccludedPoints:number})=>h.reachableOccludedPoints>0).length>=2,'at least two reachable sheltered sectors; soft work islands deliberately pass LOS');assert.equal(r.native,false);
 }
});

test('final heist is SHA-bound ordered actual Theft → CCTV Spotted → LOS break → escape',()=>{
 const report=JSON.parse(fs.readFileSync('Reports/LevelDesignV3/bank-final-heist.json','utf8'));
 assert.equal(report.sourceSha256,createHash('sha256').update(JSON.stringify(BANK_PRODUCTION[9])).digest('hex'));
 const w=report.witness;assert(w.clear&&!w.caught);assert.equal(report.native,false);
 const events=w.eventTrace as {event:string;at:number;source?:string;cameraIds?:string[]}[];
 const event=(name:string)=>{const found=events.find(e=>e.event===name);assert(found,name);return found;};
 const pickup=event('OBJECTIVE'),theft=event('THEFT_ALERT'),global=event('GLOBAL_THEFT_SEARCH'),spotted=event('PLAYER_SPOTTED'),lost=event('LOS_BREAK'),complete=event('COMPLETE');
 assert(pickup.at<theft.at&&theft.at<=global.at&&global.at<=spotted.at&&spotted.at<lost.at&&lost.at<complete.at);
 assert(BANK_PRODUCTION[9].cameras!.some(c=>c.id===spotted.source));assert(spotted.cameraIds?.includes(spotted.source!));
 const zones=w.zoneVisits as {zone:string;at:number;phase:string}[];
 for(const name of ['Public South','Staff Transition','Inner Security','Vault Antechamber','Main Vault'])assert(zones.some(z=>z.zone===name&&z.at<pickup.at),name);
 for(const name of ['East Auxiliary Service','Auxiliary Return Corridor','Service Records Refuge','Records Evacuation'])assert(zones.some(z=>z.zone===name&&z.phase==='escape'),name);
 assert(events.some(e=>e.event==='INPUT_ESCAPE_REACTION'));assert(events.some(e=>e.event==='NEUTRAL_COVER_WAIT'));
});

test('Bank mission silhouettes and Entry/Exit room relations are authored independently',()=>{
 assert.equal(new Set(BANK_PRODUCTION.map(d=>d.layout.join('\n'))).size,10);
 for(const p of BANK_PLANS)assert.notEqual(p.entry.zone,p.exit.zone,p.title);
 assert.equal(BANK_PRODUCTION[9].guards.length,6);assert.equal(BANK_PRODUCTION[9].cameras!.length,3);
 const vault=BANK_PRODUCTION[9].landmark!,goal=BANK_PRODUCTION[9].objective!;assert.equal(vault.kind,'bankMainVault');assert(Math.hypot(vault.x-goal.x,vault.y-goal.y)<=1.5);
});
