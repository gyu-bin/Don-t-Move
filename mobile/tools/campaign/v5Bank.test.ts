import test from 'node:test';
import assert from 'node:assert/strict';
import {BANK_PRODUCTION,BANK_PLANS} from './bankProductionDesign';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
test('all ten Bank mission routes retain body and Tilt-margin clearance',()=>{
 for(const def of BANK_PRODUCTION){const stage=compileStage(def);for(const route of [...def.testRoutes!,...def.escapeRoutes!])for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i];assert(clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18),`${def.id} ${route.name}`);}}
});
test('Bank objectives have physical visual support from their own chapter family',()=>{
 for(const def of BANK_PRODUCTION){const goal=def.objective!;const support=def.props.find(p=>p.kind==='objectiveCase');assert(support,def.id);assert.equal(support.visualAssetId,'bank_small_safe');assert(Math.hypot(support.x-goal.x,support.y-goal.y)<.6,def.id);assert(def.props.every(p=>p.visualAssetId?.startsWith('bank_')),def.id);}
});
test('Main Vault target is inside a real secure chamber and alternate escape crosses staffed cells',()=>{
 const def=BANK_PRODUCTION[9],plan=BANK_PLANS[9],vault=plan.rooms[plan.goal],goal=def.objective!;
 assert(goal.x>vault.x+1&&goal.x<vault.x+vault.w-1);assert(goal.y>vault.y+1&&goal.y<vault.y+vault.h-1);
 assert.notEqual(plan.entry.zone,plan.exit.zone);assert(plan.escape.length>=4);assert(plan.escape.every((z,i)=>i===0||z!==plan.main.at(-2)));
 for(const name of ['East Cash Service','Dispatch Junction','Records Evacuation']){const r=plan.rooms.find(r=>r.name===name)!;assert(def.escapeRoutes![0].points.some(p=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h),name);}
 assert(def.props.some(p=>p.kind==='bankVaultCorridorWall'&&p.x>30&&p.y>30),'post-spotted dispatch refuge exists');
});
test('compiled guard patrol and map-wide search targets are reachable without invalid fallback',()=>{
 for(const def of BANK_PRODUCTION){const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);for(const g of stage.guards)for(const point of [...g.route,...(g.theftPosts??[]),...(g.theftSearchSectors??[]).flatMap(s=>s.anchors)]){const path=findPath(nav,g.x,g.y,point.x,point.y);assert(path.length>0,`${def.id} guard target`);assert(Math.hypot(path.at(-2)!-point.x,path.at(-1)!-point.y)<.01);}}
});
