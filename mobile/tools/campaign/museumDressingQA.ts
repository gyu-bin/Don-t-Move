import {guardPhysicalContract} from './guardPhysicalContract';
/** Dressing regression evidence from current engine geometry; never native/human acceptance. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {DRESSING_KIT} from '../../src/game/world/dressingKit';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {auditHideability} from './museumHideabilityQA';
import {writeRuntimeCctvQA} from './museumRuntimeCctvQA';

export function assertGameplayPreserved(before:StageDefinition,after:StageDefinition){
 for(const key of ['layout','playerSpawn','objective','exit','props','guards','patrolRoutes','testRoutes','escapeRoutes','patrolPlan','securityZones'] as const)
  assert.deepEqual(key==='guards'?guardPhysicalContract(after.guards):after[key],key==='guards'?guardPhysicalContract(before.guards):before[key],`${after.id} changed protected ${key}`);
 const a=compileStage(before),b=compileStage(after);
 assert.deepEqual(b.visionBlockers,a.visionBlockers,`${after.id} changed LOS`);
 const appended:number[]=[];
 for(const cluster of after.dressing??[])for(const item of cluster.items){
  const spec=DRESSING_KIT[item.kind],scale=item.scale??1;
  assert(spec&&!spec.blocksVision,`${after.id} dressing must not occlude LOS`);
  if(!spec.blocksMovement)continue;
  const x=item.x*TILE,y=item.y*TILE,w=spec.footprint.w*scale*TILE,h=spec.footprint.h*scale*TILE;
  appended.push(x-w/2,y-h,x+w/2,y);
 }
 assert.deepEqual(b.movementBlockers,[...a.movementBlockers,...appended],`${after.id} dressing collision disagrees with shared kit`);
 return {originalProps:a.props.length,visionBoxes:a.visionBlockers.length/4,additionalCollisionBoxes:(b.movementBlockers.length-a.movementBlockers.length)/4};
}
function reachable(n:ReturnType<typeof buildNavigation>,from:{x:number;y:number},to:{x:number;y:number}){
 const p=findPath(n,from.x,from.y,to.x,to.y);return p.length>=2&&Math.hypot(p.at(-2)!-to.x,p.at(-1)!-to.y)<.01;
}
export function auditDressingMission(before:StageDefinition,after:StageDefinition){
 const protectedState=assertGameplayPreserved(before,after),stage=compileStage(after),nav=buildNavigation(stage,BODY.guardRadius),playerNav=buildNavigation(stage,BODY.playerRadius);
 const old=auditHideability(before),current=auditHideability(after);
 assert.equal(current.fullCover,old.fullCover);assert.equal(current.losBreakers,old.losBreakers);
 for(let i=0;i<old.routes.length;i++){assert(current.routes[i].bodyClear,`${after.id} blocked route`);assert(current.routes[i].minimumBodyMargin>=old.routes[i].minimumBodyMargin-.01,`${after.id} route margin shrunk ${old.routes[i].name}`);}
 const oldWitnesses=[...old.witnesses,...old.architecturalRefuges];
 for(const w of oldWitnesses){const p={x:w.point.x*TILE,y:w.point.y*TILE};assert(clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.playerRadius),`${after.id} blocked old hide point`);assert(reachable(playerNav,stage.playerSpawn,p),`${after.id} unreachable old hide point`);}
 for(const g of stage.guards)for(const p of [...g.route,...g.theftPosts??[]])assert(reachable(nav,g,p),`${after.id} guard anchor unreachable ${g.id}`);
 const s=createPlaygroundState(stage),metrics=s.guards.map(g=>({id:g.id,visited:new Set<number>(),collisionFrames:0,recoveries:0}));
 for(let f=0;f<7200;f++){
  stepGuards(s.guards,{x:-9999,y:-9999,gait:0},stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
  s.guards.forEach((g,i)=>{assert([g.x,g.y,g.speed,g.facing].every(Number.isFinite));const m=metrics[i];if(!clearSegment(g.x,g.y,g.x,g.y,nav.blockers,BODY.guardRadius))m.collisionFrames++;m.recoveries=g.patrolRecoveries;g.route.forEach((p,j)=>{if(Math.hypot(g.x-p.x,g.y-p.y)<10)m.visited.add(j);});});
 }
 const patrol=metrics.map((m,i)=>({id:m.id,visited:m.visited.size,total:s.guards[i].route.length,collisionFrames:m.collisionFrames,recoveries:m.recoveries}));
 for(const m of patrol){assert.equal(m.collisionFrames,0,`${after.id} guard collision`);assert.equal(m.visited,m.total,`${after.id} guard anchor unvisited`);assert.equal(m.recoveries,0,`${after.id} guard recovered from stall`);}
 const items=(after.dressing??[]).flatMap(c=>c.items);
 return {id:after.id,clusters:after.dressing?.length??0,soft:items.filter(i=>DRESSING_KIT[i.kind].category==='soft').length,decoration:items.filter(i=>DRESSING_KIT[i.kind].category==='decoration').length,accentLights:(after.dressing??[]).filter(c=>c.light).length,...protectedState,oldHideWitnessesPreserved:oldWitnesses.length,routes:current.routes,fullCover:current.fullCover,losBreakers:current.losBreakers,patrol};
}
export function writeDressingQA(){
 const before:StageDefinition[]=JSON.parse(readFileSync('Reports/MuseumDressingV1/before/campaignStages.json','utf8'));
 const defs=campaignStages.filter(d=>d.chapter===1);
 for(const def of defs)assert(def.dressing?.length,`${def.id} dressing must be baked before QA report`);
 const missions=defs.map(d=>auditDressingMission(before.find(b=>b.id===d.id)!,d));
 const replays=writeRuntimeCctvQA();
 const report={method:['Protected original props, walls, vision, guards, route, objective and exit compared exactly against immediate pre-dressing snapshot.','Existing player-radius route margins cannot shrink; every old hide witness remains body-clear and reachable.','120s real patrol each mission, finite poses, no collision or recovery and every patrol anchor visited.','Dynamic replays use current runtime mission data, not historical baseline cameras.','No native Simulator/iPhone, human Tilt or visual approval implied.'],missions,replays};
 mkdirSync('Reports/MuseumDressingV1',{recursive:true});writeFileSync('Reports/MuseumDressingV1/qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));return report;
}
if(process.argv[1]?.endsWith('museumDressingQA.ts'))writeDressingQA();
