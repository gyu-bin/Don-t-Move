import {guardPhysicalContract} from './guardPhysicalContract';
/** Placement QA runs the real shared engine; rendered bounds are conservative,
 * including transparent margins. Visual acceptance still requires paired captures. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';
import {DRESSING_KIT} from '../../src/game/world/dressingKit';
import {BODY} from '../../src/game/guards/guardTuning';
import {SECURITY_CORE_REACTION_SECONDS,theftSearchPosts} from '../../src/game/guards/theftAlert';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {auditHideability} from './museumHideabilityQA';
import {auditCentralCover,auditCentralPatrol,auditIslandBypasses,assertCentralProtected,probeCentralHideRoutes} from './museumCentralCoverQA';
import {runMission} from './museumFinalPlayQA';
export const fixture=JSON.parse(readFileSync(new URL('./fixtures/museumSecurityBefore.json',import.meta.url),'utf8')) as {mission:StageDefinition;otherMissionDigest:string};
const digest=(a:StageDefinition[])=>createHash('sha256').update(JSON.stringify(a)).digest('hex');
export function assertSecurityScope(defs:StageDefinition[]){
 // Locks protected Museum geometry/tuning and Chapter04–09 after authorized Bank/security expansion.
 // Chapter 02 is separately reauthored/expanded by the authorized Gallery environment pilot.
 const protectedMissions=defs.filter(d=>d.id!=='01-08'&&/^(01|0[4-9])-/.test(d.id)).map(d=>{const v=structuredClone(d);if(v.chapter===1){delete v.cameras;v.guards=guardPhysicalContract(v.guards);}return v;}).sort((a,b)=>a.id.localeCompare(b.id));
 assert.equal(protectedMissions.length,39,'Museum other9 / Chapter04–09 scope changed');
 assert.equal(digest(protectedMissions),'aff25d66bd0caa6bf7e4283a8553fc87be92aff0068c907baf28c3d44b052890','protected Museum/Chapter3+ mission data changed');
 const d=defs.find(d=>d.id==='01-08')!,before=fixture.mission;assertCentralProtected(before,d);
 const withoutPlacement=(v:StageDefinition)=>Object.fromEntries(Object.entries({...v,guards:guardPhysicalContract(v.guards)}).filter(([key])=>!['props','dressing','cameras'].includes(key)));
 assert.deepEqual(withoutPlacement(d),withoutPlacement(before),'non-placement mission fields changed');
 assert.equal(d.props.length,before.props.length,'no new gameplayprops');
 d.props.forEach((p,i)=>{const immutable=(v:typeof p)=>Object.fromEntries(Object.entries(v).filter(([key])=>!['x','y','scale','collisionScale'].includes(key)));assert.deepEqual(immutable(p),immutable(before.props[i]));});
 assert.equal(d.dressing?.length,before.dressing?.length,'no new dressingclusters');
 for(const old of before.dressing??[]){const cluster=d.dressing?.find(c=>c.id===old.id);assert(cluster);assert.deepEqual({...cluster,items:[]},{...old,items:[]},'dressing metadata/light changed');for(const item of cluster.items)assert(old.items.some(i=>JSON.stringify(i)===JSON.stringify(item)),'new or changed decoration');for(const item of old.items.filter(i=>!cluster.items.some(j=>JSON.stringify(i)===JSON.stringify(j))))assert(DRESSING_KIT[item.kind].category==='decoration'&&!DRESSING_KIT[item.kind].blocksMovement&&!DRESSING_KIT[item.kind].blocksVision,'deleted gameplay structure');}
 return d;
}
// Actual Security venueArt.ts draw extents, including stroke allowance. Atlas
// frame dimensions elsewhere follow buildStageArt.drawFrame bottom-centre anchor.
const venue:Record<string,[number,number]>={counter:[58,37],table:[49,33],shelf:[51,57],partition:[58,51],equipment:[44,52],sofa:[58,39],objectiveCase:[42,47],door:[35,47]};
const atlas:Record<string,[number,number]>={statue:[145,259],statuePedestal:[148,182],displayCase:[202,230],bench:[255,148],plant:[188,244],crate:[177,184],painting:[225,178],lamp:[127,138],cctv:[118,139]};
export function visualBounds(def:StageDefinition){return def.props.map((p,index)=>{const k=PROP_KIT[p.kind],scale=p.scale??1,v=venue[p.kind],frame=atlas[p.kind];const w=p.kind==='pillar'?32*scale+1.2:v?v[0]*scale:k.drawWidth*TILE*scale;const h=p.kind==='pillar'?49*scale+1.2:v?v[1]*scale:frame?w*frame[1]/frame[0]:w;const bottom=p.kind==='pillar'?p.y*TILE+scale+.6:v?p.y*TILE:p.y*TILE-k.mountHeight+h*(k.wallMounted?0:.03);return {index,kind:p.kind,left:p.x*TILE-w/2,top:bottom-h,right:p.x*TILE+w/2,bottom,width:w,height:h,mounted:k.wallMounted,shadowRadius:k.shadow*TILE*scale};});}
export function auditSecurityVisual(def:StageDefinition){const bounds=visualBounds(def),overlaps=[];for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const a=bounds[i],b=bounds[j];if(a.mounted||b.mounted)continue;const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(w>2&&h>2)overlaps.push({a:a.index,b:b.index,kinds:[a.kind,b.kind],width:w/TILE,height:h/TILE,area:w*h/(TILE*TILE)});}return {method:'Actual procedural security-prop extents and atlas-frame projection, conservative transparent margins. Shadow radii recorded separately; screenshots must verify shadow/lighting/alpha overlap.',bounds,overlaps,overlappingStructureCount:new Set(overlaps.flatMap(o=>[o.a,o.b])).size};}
export function auditSecurityFairness(def:StageDefinition){const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.theft.empty=true;let t=0;const dt=1/60,hidden={x:-9999,y:-9999,gait:0};while(!s.events.theftAlert&&t<120){t+=dt;stepGuards(s.guards,hidden,stage.visionBlockers,nav,dt,s.events,t,true,1,s.theft);}assert(s.events.theftAlert);assert.equal(SECURITY_CORE_REACTION_SECONDS,.85);assert.deepEqual([...s.theft.roles!].sort(),['corridor','exit','objective','zone']);const at=t,positions=s.guards.map(g=>({x:g.x,y:g.y}));for(let f=0;f<2400;f++){t+=dt;stepGuards(s.guards,hidden,stage.visionBlockers,nav,dt,s.events,t,true,1,s.theft);assert(!s.events.globalAlert&&s.events.globalRevision===0);s.guards.forEach((g,i)=>{assert(!g.hasLkp);assert(theftSearchPosts(s.theft,i,s.theft.posts[i]).some(p=>p.x===g.targetX&&p.y===g.targetY));if(t-at<.85)assert(g.x===positions[i].x&&g.y===positions[i].y);});}return {pass:true,roles:s.theft.roles,secondsObserved:40,reactionDelay:.85,globalLkpCreated:false};}
export function traceTheftSearch(def:StageDefinition){
 const stage=compileStage(def),s=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius),entry=def.testRoutes![0].points,points=[...entry,...def.escapeRoutes![0].points.slice(1)];s.playerMode=0;let leg=1;
 for(let f=0;f<9000&&!s.events.caught&&!s.mission.complete;f++){
  const targetIssued=s.t>=9.5;
  if(targetIssued){s.playerMode=leg>=entry.length?3:1;s.player.tx=points[leg].x*TILE;s.player.ty=points[leg].y*TILE;s.player.hasTarget=true;}
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(s.mission.treasure&&s.events.theftAlert&&s.events.phase==='SEARCH')return {time:s.t,point:{x:s.player.x/TILE,y:s.player.y/TILE},leg,treasure:true,theftAlert:true,phase:'SEARCH',method:'Actual continuous Sneak approach then Run escape, not forced state. This witness stops at first Search; not a survival claim.'};
  if(targetIssued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
 }
 return null;
}
export const centralScenario={structure:0,point:{x:7.875,y:10.525},approach:{x:11.125,y:10.525},delay:0,gait:3,pocketChoice:0};
export function auditSecurityCleanup(def:StageDefinition){assertCentralProtected(fixture.mission,def);const old=auditHideability(fixture.mission),now=auditHideability(def),central=auditCentralCover(def);assert.equal(now.fullCover,old.fullCover);assert.equal(now.losBreakers,old.losBreakers);assert(Math.abs(now.hidePoints-old.hidePoints)<=1);assert.equal(central.gaps.length,0);assert(now.routes.every(r=>r.bodyClear));now.routes.forEach((r,i)=>assert(r.minimumBodyMargin>=old.routes[i].minimumBodyMargin-.01,'existing authored route margin shrank'));assert(auditIslandBypasses(def).every(b=>b.localTwoSideWitness));const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);for(const g of stage.guards)for(const p of [...g.route,...g.theftPosts??[]]){const path=findPath(nav,g.x,g.y,p.x,p.y);assert(path.length>=2&&Math.hypot(path.at(-2)!-p.x,path.at(-1)!-p.y)<.01,`guard ${g.id} unreachable anchor`);assert(clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.guardRadius));}const patrol=auditCentralPatrol(def);assert(patrol.every(g=>g.pass));const exit=runMission(def,{route:0,escape:1,mode:1,delay:.5});assert(exit.clear&&!exit.caught);assert(exit.pickupAt!==null&&(exit.spottedAt===null||exit.pickupAt<exit.spottedAt));const theftSearch=runMission(def,{route:0,escape:0,mode:1,delay:9.5});assert(theftSearch.pickupAt!==null&&theftSearch.theftAt!==null&&theftSearch.search,'theft pickup→Search regression');const centralSearch=probeCentralHideRoutes(def,false,centralScenario);assert(centralSearch.witness?.pass,'natural spotted central ray→fresh Search regression');return {before:{hide:old,visual:auditSecurityVisual(fixture.mission)},after:{hide:now,visual:auditSecurityVisual(def)},geometry:central,patrol,scenarios:{stealthObjectiveAndExit:exit,theftSearch,theftSearchPosition:traceTheftSearch(def),centralSearch},fairness:auditSecurityFairness(def),nativeVerification:false};}
export function writeSecurityCleanupQA(){const def=assertSecurityScope(campaignStages),report=auditSecurityCleanup(def);mkdirSync('Reports/MuseumSecurityCleanupV1',{recursive:true});writeFileSync('Reports/MuseumSecurityCleanupV1/qa.json',JSON.stringify(report,null,2)+'\n');return report;}
if(process.argv[1]?.endsWith('museumSecurityCleanupQA.ts'))console.log(JSON.stringify(writeSecurityCleanupQA().scenarios,null,2));
