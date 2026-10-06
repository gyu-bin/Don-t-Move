import {test} from 'node:test';
import assert from 'node:assert/strict';
import rawSource from '../../docs/design/v12/phase4c/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V124B_EARLY_PLANS} from './v124bEarlyPlans';
import current from '../../src/game/levels/stages/campaignStages.json';
import type {V124bPlan} from './v124bTypes';
import {composeV124bPlan,physicalRoute} from './v124bBuilder';
import {auditV124bTopology,routeRooms} from './v124bTopologyQA';
import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {pointVisible} from '../../src/game/guards/guardVision';
import {stepSecurityCameras} from '../../src/game/security/cctv';
const source=rawSource as StageDefinition[];
const plans=current.map(d=>d.topologyPlan as V124bPlan);
test('45 individually authored mission plans, stable campaign ids',()=>{assert.equal(plans.length,45);assert.equal(new Set(plans.map(p=>p.id)).size,45);assert.deepEqual(plans.map(p=>p.id).sort(),source.map(p=>p.id).sort());});
for(const p of plans)test(`${p.id}: physical topology, open infiltration and CLOSED independent escape`,()=>{
 const def=composeV124bPlan(p,source as StageDefinition[]),report=auditV124bTopology(def);assert.deepEqual(report.errors,[],JSON.stringify(report));
 const old=source.find(s=>s.id===p.id)!;assert.equal(def.guards.length,p.guardCount??({4:3,5:4,6:4,7:5,8:5,9:6} as Record<number,number>)[old.chapter!]??old.guards.length);assert.equal(def.cameras?.length,p.cameras?.length??old.cameras?.length??0);
 for(let i=0;i<def.guards.length;i++)for(const k of ['pace','visionRange','visionHalfAngle','escapePatrol'] as const)assert.deepEqual(def.guards[i][k],old.chapter!>=4&&k==='pace'?.8:old.chapter!>=4&&k==='visionRange'?({4:4.1,5:4.3,6:4.4,7:4.6,8:4.8,9:5} as Record<number,number>)[old.chapter!]:old.guards[Math.min(i,old.guards.length-1)][k]);
 for(let i=0;i<(def.cameras?.length??0);i++)for(const k of ['range','visionAngle','sweepAngle','sweepSpeed','pauseAtEnds','suspicionRate'] as const)assert.equal(def.cameras![i][k],(old.cameras?.[Math.min(i,(old.cameras?.length??0)-1)]??source.flatMap(s=>s.chapter===3?s.cameras??[]:[])[0])[k]);
 const bad={x:-20,y:-20};assert.throws(()=>physicalRoute(def,[def.playerSpawn,bad]),/blocked waypoint|disconnected/);
 // Room classification samples whole segments: labels cannot hide a shortcut through another room.
 assert(routeRooms(p,def.testRoutes![0].points).includes(p.objectiveRoom));
});

const specimen=()=>composeV124bPlan(V124B_EARLY_PLANS.find(p=>p.id==='01-01')!,source);
test('negative: same-zone and adjacent entry/exit cannot pass semantic labels',()=>{const d=specimen();d.topologyPlan!.exitRoom=d.topologyPlan!.entryRoom;d.exitPosition={...d.playerSpawn};const r=auditV124bTopology(d);assert(r.errors.some(e=>e.includes('distinct zones')));assert(r.errors.some(e=>e.includes('separation')));});
test('negative: arbitrary room labels cannot disguise a direct open-floor shortcut',()=>{const d=specimen();d.layout=d.layout.map((row,y)=>row.split('').map((_,x)=>x===0||y===0||x===row.length-1||y===d.layout.length-1?'#':'.').join(''));const r=auditV124bTopology(d);assert(r.errors.some(e=>e.includes('shortest approach')||e.includes('new service zones')));});
test('negative: closed escape does not accept findPath nearest fallback endpoint',()=>{const d=specimen();d.exitPosition={x:-10,y:-10};const r=auditV124bTopology(d);assert.equal(r.closedReachable,false);});
test('negative: floating gate, missing designated closure and colliding guard are rejected',()=>{const d=specimen();d.doors![0].x=d.playerSpawn.x;d.doors![0].y=d.playerSpawn.y;d.lockdownDoors=[];d.guards[0].x=0;d.guards[0].y=0;const r=auditV124bTopology(d);assert(r.errors.some(e=>e.includes('Floating door')));assert(r.errors.includes('No designated lockdown door'));assert(r.errors.some(e=>e.includes('Guard body')));});

for(const p of plans)test(`${p.id}: actual Guard/CCTV 45s, inspection, blind window, patrol collision and protected entry`,()=>{
 const def=composeV124bPlan(p,source),stage=compileStage(def),nav=buildNavigation(stage,8),s=createPlaygroundState(stage),hidden={x:-1000,y:-1000,gait:0};let sees=false,blind=false;const cameraCoverage=new Map(s.securityCameras.map(c=>[c.id,false]));
 for(let f=0;f<2700;f++){
  stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
  const visible=s.guards.some(g=>pointVisible(g,stage.objective.x,stage.objective.y,stage.visionBlockers));sees ||=visible;blind ||= !visible;
  if(f%30===0)for(const g of s.guards)assert(clearSegment(g.x,g.y,g.x,g.y,nav.blockers,8),'Moving patrol body must clear actual geometry');
  stepSecurityCameras(s.securityCameras,f<120?{...stage.playerSpawn,gait:0}:hidden,stage.visionBlockers,s.events,1/60,f/60);
  for(const c of s.securityCameras){let floorRays=0;for(let i=0;i<c.fanCount;i++){const x=c.fan[i*2],y=c.fan[i*2+1];if(Math.hypot(x-c.x,y-c.y)>40&&def.layout[Math.floor((y+c.y)/80)]?.[Math.floor((x+c.x)/80)]==='.')floorRays++;}if(floorRays>=3)cameraCoverage.set(c.id,true);}
  if(f<120){assert(!s.securityCameras.some(c=>c.canSee),'Entry exposed to CCTV in first2seconds');assert(!s.guards.some(g=>pointVisible(g,stage.playerSpawn.x,stage.playerSpawn.y,stage.visionBlockers)),'Entry exposed to Guard first2seconds');}
 }
 for(const [id,covered]of cameraCoverage)assert(covered,`${id}: camera must have real positive cone/floor coverage during actual sweep`);
 assert(sees,'Objective needs actual inspection opportunity');assert(blind,'Objective needs actual blind window');
 const theft=createPlaygroundState(stage);theft.theft.empty=true;for(let f=0;f<2700&&!theft.events.theftAlert;f++)stepGuards(theft.guards,hidden,stage.visionBlockers,nav,1/60,theft.events,f/60,true,1,theft.theft);assert(theft.events.theftAlert,'An empty case is eventually inspected');assert(!theft.events.globalAlert,'Theft alone must not invent player position');
});

test('negative: visible firstBreak label and solid waiting pocket fail geometric certification',()=>{const d=specimen();d.safeZones![1]={...d.objective!,radius:.2};assert(auditV124bTopology(d).errors.some(e=>e.includes('First break')));d.safeZones![1]={x:0,y:0,radius:.2};assert(auditV124bTopology(d).errors.some(e=>e.includes('waiting pocket')));});
test('negative: sealed risk corridor cannot silently reroute through the public approach',()=>{const p=structuredClone(V124B_EARLY_PLANS.find(p=>p.id==='01-01')!);p.islands=[...(p.islands??[]),{x:6,y:12,w:4,h:1}];assert.throws(()=>composeV124bPlan(p,source),/declared risk edge.*own corridor/);});

test('negative: CCTV inside an opaque structure cannot masquerade as safe coverage',()=>{const d=specimen(),template=source.flatMap(s=>s.chapter===3?s.cameras??[]:[])[0];d.cameras=[{...template,x:d.props[0].x,y:d.props[0].y,id:'invalid-camera'}];assert(auditV124bTopology(d).errors.some(e=>e.includes('CCTV origin')));});

test('negative: blocking a labeled quick route is insufficient when best escape is unchanged',()=>{const d=specimen();d.exitPosition={x:d.safeZones![1].x,y:d.safeZones![1].y};const r=auditV124bTopology(d);assert(!r.errors.includes('Designated CLOSED door does not block quick route'));assert(Math.abs(r.closedEscapeLength-r.openEscapeLength)<1e-6);assert(r.errors.some(e=>e.includes('actual shortest escape')));});
test('negative: alternate already shorter than labeled quick escape is rejected',()=>{const d=specimen();d.escapeRoutes![0].points=[...d.escapeRoutes![1].points];const r=auditV124bTopology(d);assert(r.errors.some(e=>e.includes('Authored quick escape')));});
