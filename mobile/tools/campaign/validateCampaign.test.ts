import assert from 'node:assert/strict';
import {test} from 'node:test';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {PROP_KIT} from '../../src/game/world/propKit';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {createGuardEvents,createGuardState,stepGuard} from '../../src/game/guards/guardBrain';
import {pointVisible} from '../../src/game/guards/guardVision';
import {buildCampaign} from './buildCampaign';
import {freshCampaign,migrateCampaign,normalizeCampaign,completeMission,canPlayMission} from '../../src/game/progress/campaignProgress';
import {MISSION_COUNT,missionId,missionIndex,CHAPTERS,missionName} from '../../src/game/levels/campaignCatalog';
import {silentEscapeWindow} from './escapeProbe';
import {DEFAULT_PROGRESS,normalizeProgress} from '../../src/game/progress/stageProgress';
import {oppositeEdge} from '../../src/game/levels/missionContinuity';
import {createHash} from 'node:crypto';
import {museumPlaythrough} from './museumPlaythrough';
import {MUSEUM_02_PATHS,MUSEUM_PATHS} from './museumProduction';
import v3Before from './fixtures/v3MuseumGalleryBefore.json';
import v3Final from './fixtures/v3MuseumGalleryFinal.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import phase3Source from '../../docs/design/v12/phase3/SOURCE_STAGES.json';
import phase4aSnapshot from '../../docs/design/v12/phase4b/SOURCE_STAGES.json';
const historicalStages=phase3Source as StageDefinition[];
const historicalCampaign=[...(v3Final as StageDefinition[]),...historicalStages.slice(20)];

test('Museum safe and timed risk routes clear with continuous real movement from spawn',()=>{
 // Same departure and speed: measure the route choice, not different gait speeds.
 const safe=museumPlaythrough(0,2,0),risk=museumPlaythrough(1,2,0);
 for(const result of [safe,risk]){
  assert(result.clear&&!result.caught&&!result.alert&&!result.theft);
 }
 assert(risk.time<safe.time,'Risk route is a shorter journey, with a timing choice');
 assert(risk.maxSuspicion>safe.maxSuspicion,'Shortcut crosses real guard perception; safe approach uses cover');
});

test('historical Museum 01-01 path-first design retains authored semantic approaches before V3 clearance expansion',()=>{
 const def=(v3Before as StageDefinition[])[0],stage=compileStage(def),nav=buildNavigation(stage,BODY.playerRadius);
 for(const [i,key] of (['safe','risk','main'] as const).entries())assert.deepEqual(def.testRoutes![i].points,MUSEUM_PATHS[key].map(([x,y])=>({x,y})));
 assert.deepEqual(def.escapeRoutes![0].points,MUSEUM_PATHS.escape.map(([x,y])=>({x,y})));
 const lastSafe=def.testRoutes![0].points.at(-2)!,lastRisk=def.testRoutes![1].points.at(-2)!;
 assert(lastSafe.x<def.objective!.x&&lastRisk.y>def.objective!.y,'West and south approaches');
 for(const p of [lastSafe,lastRisk])assert(clearSegment(p.x*TILE,p.y*TILE,stage.objective.x,stage.objective.y,nav.blockers,BODY.playerRadius));
 assert(def.escapeRoutes![0].points.slice(1).every(p=>p.x>def.objective!.x),'Independent east escape, not backtracking');
 assert.equal(def.props.filter(p=>p.kind==='bench'||p.kind==='plant').length,0);
 const cover=def.props.filter(p=>p.collisionScale);
 assert.equal(cover.length,4,'Four purposeful structures; architecture supplies the remaining cover');
 for(const p of cover){
  assert.equal(p.scale,p.collisionScale);
  const spec=PROP_KIT[p.kind],x=p.x*TILE,y=p.y*TILE,w=spec.footprint.w*TILE*p.collisionScale!,h=spec.footprint.h*TILE*p.collisionScale!;
  assert(!clearSegment(x-w,y-h/2,x+w,y-h/2,stage.visionBlockers),'Large cover blocks actual sight');
  assert(!clearSegment(x,y-h/2,x,y-h/2,nav.blockers,BODY.playerRadius),'Large cover blocks actual bodies');
 }
});

test('Historical compact Museum 01-01 has a gallery fork, off-axis reveal, localized light and assigned inspection subjects',()=>{
 const s=historicalStages[0];
 assert(s.layout.length<=15&&s.layout[0].length<=22,'Stay inside the approved provisional size budget');
 assert.equal(s.layout[6][11],'#','Objective Room is separated from First Exhibition');
 assert.equal(s.layout[8][11],'.','Direct exhibition doorway');
 assert.equal(s.layout[4][9],'.','North gallery entry arch');
 assert.equal(s.layout[4][13],'.','North gallery objective approach');
 assert(s.testRoutes![0].points.some(p=>p.y<4),'Protected northern arc');
 assert(s.testRoutes![1].points.some(p=>p.x>=10&&p.y>=8),'Exposed central shortcut');
 const diamond=s.lights.find(l=>l.x===s.objective!.x&&l.y===s.objective!.y)!;
 assert(s.lights.filter(l=>l!==diamond).every(l=>l.intensity<diamond.intensity));
 assert.deepEqual(s.patrolPlan!.assignments[0].zones,['A','B','C','D']);
 assert.deepEqual(s.patrolPlan!.assignments[1].zones,['E','F']);
 for(const zone of s.safeZones!){
  const stage=compileStage(s),nav=buildNavigation(stage,BODY.playerRadius);
  assert(clearSegment(zone.x*TILE,zone.y*TILE,zone.x*TILE,zone.y*TILE,nav.blockers,BODY.playerRadius+zone.radius*TILE));
 }
});

test('Historical Security/Bank pass preserved Chapter04–09 mission definitions',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(phase4aSnapshot.filter(s=>(s.chapter??0)>3))).digest('hex'),'7481da3a8dc431d0fe2c229828247bb0551229b27eb6ca40b92a5530272b2c74');
 const s=(v3Before as StageDefinition[])[0];
 const length=(r:NonNullable<typeof s.testRoutes>[number])=>r.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-r.points[i].x,p.y-r.points[i].y),0);
 assert(length(s.testRoutes![0])>length(s.testRoutes![1]),'Safe route must be longer than risk route');
 assert.equal(s.guards.length,2);
 assert.equal(s.entryEdge,'left');assert.equal(s.exitEdge,'right');
 for(const kind of ['pillar','statue','painting','displayCase','partition','lamp'])assert(s.props.some(p=>p.kind===kind));
 const second=(v3Before as StageDefinition[])[1];
 assert.equal(second.layout.length,15);assert.equal(second.layout[0].length,15);
 assert.deepEqual((v3Before as StageDefinition[])[1].testRoutes![0].points,MUSEUM_02_PATHS.safe.map(([x,y])=>({x,y})));
 assert.deepEqual((v3Before as StageDefinition[])[1].testRoutes![1].points,MUSEUM_02_PATHS.risk.map(([x,y])=>({x,y})));
 assert.deepEqual((v3Before as StageDefinition[])[1].escapeRoutes![0].points,MUSEUM_02_PATHS.escape.map(([x,y])=>({x,y})));
 assert.equal(second.props.filter(p=>p.kind==='bench'||p.kind==='plant').length,0);
});

test('Historical01-02 NORMAL suspicion uses the shared runtime model and meets distance/action benchmarks',()=>{
 const stage=compileStage(historicalStages[1]),source=stage.guards[0],dt=1/60;
 assert.equal(source.visionRange,3.68*TILE);
 const measure=(distance:number,angle:number,gait:number)=>{
  const g=createGuardState(source),ev=createGuardEvents();
  const p={x:g.x+Math.cos(g.facing+angle)*distance,y:g.y+Math.sin(g.facing+angle)*distance,gait};
  let frames=0;for(;frames<60*180&&!ev.alertCount;frames++)stepGuard(g,p,[],dt,ev,frames*dt,false,1);
  assert(ev.alertCount,`01-02 detection timed out: distance=${distance}, gait=${gait}`);
  return frames*dt;
 };
 const far=measure(source.visionRange*.9,source.visionHalfAngle*.9,0);
 const sneak=measure(source.visionRange*.55,0,1);
 const walk=measure(source.visionRange*.55,0,2);
 const close=measure(40,0,2);
 const run=measure(20,0,3);
 // RC UX hotfix: a motionless thief in view is the base rate, not an exemption. At the far edge it is slow
 // (longer than any guard pauses to look), but it ends in an alert; moving benchmarks below are unchanged.
 assert(far>10&&far<20,`far edge idle ${far.toFixed(2)}s`);
 const still=measure(source.visionRange*.55,0,0);
 assert(still>sneak&&still<=7,`medium still ${still.toFixed(2)}s vs sneak ${sneak.toFixed(2)}s`);
 assert(sneak>=3&&sneak<=5,`medium sneak ${sneak.toFixed(2)}s`);
 assert(walk>=2&&walk<=3,`medium walk ${walk.toFixed(2)}s`);
 assert(close>=1&&close<=1.5,`close walk ${close.toFixed(2)}s`);
 assert(run>=.5&&run<=.8,`very close run ${run.toFixed(2)}s`);
});

test('45 baked StageDefinitions equal reviewed authoring data; no duplicate layouts even after rotation',()=>{
 assert.equal(campaignStages.length,MISSION_COUNT);assert.deepEqual(campaignStages,JSON.parse(JSON.stringify(buildCampaign())));
 const shapes=new Set<string>();
 for(const def of campaignStages){
  let rows=def.layout;const signatures=[];
  for(let r=0;r<4;r++){signatures.push(rows.join('\n'));rows=Array.from({length:rows[0].length},(_,y)=>Array.from({length:rows.length},(_,x)=>rows[rows.length-1-x][y]).join(''));}
  const key=signatures.sort()[0];assert(!shapes.has(key),def.id);shapes.add(key);
 }
});
test('V12 all fifteen authored safe pockets fit their stated body-and-pose margin',()=>{
 const core=campaignStages.filter(d=>(d.chapter??0)<=3);assert.equal(core.length,15);
 for(const def of core){const stage=compileStage(def);assert(def.safeZones?.length,def.id+' missing cover pockets');
  for(const zone of def.safeZones!)assert(clearSegment(zone.x*TILE,zone.y*TILE,zone.x*TILE,zone.y*TILE,stage.movementBlockers,BODY.playerRadius+zone.radius*TILE),`${def.id}: safe pocket radius extends into collision at ${zone.x},${zone.y}`);
 }
});
for(const def of campaignStages)test(`${def.id}: spawn/approach/escape/props/patrol/zones and alert rules`,(t)=>{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.playerRadius),guardNav=buildNavigation(stage,BODY.guardRadius);
 const walk=(p:{x:number;y:number},radius:number=BODY.playerRadius)=>assert(clearSegment(p.x,p.y,p.x,p.y,nav.blockers,radius),`${def.id}: blocked ${JSON.stringify(p)}`);
 const path=(a:{x:number;y:number},b:{x:number;y:number})=>{const p=findPath(nav,a.x,a.y,b.x,b.y);assert.deepEqual(p.slice(-2),[b.x,b.y]);return p;};
 walk(stage.playerSpawn);walk(stage.objective);const exit={x:stage.exit.x+stage.exit.w/2,y:stage.exit.y+stage.exit.h/2};walk(exit);
 assert(def.entryEdge&&def.exitEdge&&def.entryPosition&&def.exitPosition&&def.landmark);
 assert.equal(stage.playerSpawn.x,def.entryPosition.x*TILE);assert.equal(stage.playerSpawn.y,def.entryPosition.y*TILE);
 assert(Math.abs(exit.x-def.exitPosition.x*TILE)<0.001&&Math.abs(exit.y-def.exitPosition.y*TILE)<0.001);
 assert(def.props.some(p=>p.kind===def.landmark!.kind&&p.x===def.landmark!.x&&p.y===def.landmark!.y));
 const entrance=createPlaygroundState(stage);entrance.playerMode=0;
 for(let f=0;f<120;f++){
  stepPlayground(entrance,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,guardNav);
  assert(entrance.guards.every(g=>g.suspicion===0&&!g.canSee),`${def.id}: immediate entry exposure`);
 }
 path(stage.playerSpawn,stage.objective);path(stage.objective,exit);
 const locked=createPlaygroundState(stage);locked.playerMode=0;locked.player.x=exit.x;locked.player.y=exit.y;
 stepPlayground(locked,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,guardNav);
 assert(!locked.mission.complete&&!locked.mission.treasure,'Exit is locked before pickup');
 if(def.chapter===3)assert(def.props.some(p=>p.kind.startsWith('bank')&&PROP_KIT[p.kind].blocksMovement),'Bank architecture needs a functional bank structure, not a decoration quota');
 else if((def.chapter??0)<=2){
  assert(def.props.some(p=>PROP_KIT[p.kind].blocksMovement),'Exhibition needs a physical themed structure');
  assert(def.props.some(p=>p.visualAssetId),'Exhibition structure must use approved artwork');
  assert(def.chapter===1?def.props.length>=3:def.topologyPlan?def.props.some(p=>p.visualAssetId?.startsWith('gallery_')):(def.dressing?.length??0)>0,'Gallery needs approved authored exhibits');
 }else if(def.chapter===4&&def.topologyPlan?.visualRevision==='v12-4c'){
  // Authored Lab cells need functional exhibits, not a prop quota that rewards
  // redundant glass panels intersecting benches (04-03 live visual evidence).
  for(const role of ['public','transition','restricted','objective'] as const){
   const room=def.topologyPlan.rooms.find(r=>r.role===role);assert(room,`${def.id}: missing ${role} room`);
   assert(def.props.some(p=>p.x>=room.x&&p.x<room.x+room.w&&p.y>=room.y&&p.y<room.y+room.h&&PROP_KIT[p.kind].blocksMovement&&p.visualAssetId?.startsWith('lab_')),`${def.id}: ${role} room needs an approved functional Lab exhibit`);
  }
 }else assert(def.props.length>=8,'Later chapter needs functional room structures');
 assert.equal(def.guards.filter(g=>g.role==='objective').length,1);
 if(def.chapter===3)assert(def.landmark!.kind.startsWith('bank'),'Bank objective has authored Bank focal structure');
 else assert(def.props.some(p=>p.kind==='objectiveCase'));
 assert(def.lights.some(l=>l.kind==='warm'&&l.intensity>0),'Focused warm practical light must exist; final intensity is reviewed in the V5 pixel gate');
 for(const prop of def.props){const spec=PROP_KIT[prop.kind];assert(typeof spec.blocksMovement==='boolean'&&typeof spec.blocksVision==='boolean');}
 if(def.chapter===3){assert(def.securityZones!.length>=def.guards.length);for(const g of def.guards)assert(def.securityZones!.some(z=>z.guardId===g.id),'Each guard has a semantic coverage sector');}
 else for(const g of def.guards)assert(def.securityZones?.some(z=>z.guardId===g.id),'Each guard must have authored coverage');assert(def.safeZones?.length);
 assert.notDeepEqual(def.testRoutes![0].points,def.testRoutes![1].points);
 for(const route of [...def.testRoutes!,...def.escapeRoutes!])for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i];assert(clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,nav.blockers,BODY.playerRadius),`${def.id}: blocked route ${route.name}`);
 }
 for(const guard of stage.guards){walk(guard,BODY.guardRadius);assert(guard.route.length>=2);
  if(def.chapter===3&&!guard.semanticPatrol)for(let i=0;i<guard.route.length;i++){const a=guard.route[i],b=guard.route[(i+1)%guard.route.length];assert(clearSegment(a.x,a.y,b.x,b.y,guardNav.blockers,BODY.guardRadius),'Actual sequential Bank patrol leg must be clear');}
  for(const a of guard.route)for(const b of guard.route){
   // Sequential paths may turn around V5 architecture. Check the actual navigation legs below, not every straight chord between patrol points.
   const route=findPath(guardNav,a.x,a.y,b.x,b.y);assert.deepEqual(route.slice(-2),[b.x,b.y]);
   let x=a.x,y=a.y;for(let k=0;k<route.length;k+=2){assert(clearSegment(x,y,route[k],route[k+1],guardNav.blockers,BODY.guardRadius));x=route[k];y=route[k+1];}
   // These are Guard anchors, so Guard-radius navigation above is the contract. Player objective/exit paths are checked separately.
  }
 }
 const s=createPlaygroundState(stage),hidden={x:-1000,y:-1000,gait:0};
 let sees=false,blind=false;
 for(let frame=0;frame<60*45;frame++){
  stepGuards(s.guards,hidden,stage.visionBlockers,guardNav,1/60,s.events,frame/60,true,1,s.theft);
  if(frame%30===0)for(const guard of s.guards)assert(clearSegment(guard.x,guard.y,guard.x,guard.y,guardNav.blockers,BODY.guardRadius),`${def.id}: moving patrol collision`);
  const visible=s.guards.some(g=>pointVisible(g,stage.objective.x,stage.objective.y,stage.visionBlockers));sees ||= visible;blind ||= !visible;
 }
 assert(sees,'Empty Case must have an inspection opportunity');assert(blind,'Case cannot be permanently watched');
 const silentWitness=silentEscapeWindow(def);
 if(def.chapter===1||def.chapter===3){
  // Sampling the primary route at two-second departures is evidence, not an
  // existence proof for all routes. Silent Escape eligibility is independently
  // covered by theftV3.test.ts; full-AI continuous clears live in museumQA.test.ts.
  t.diagnostic(silentWitness===null
   ? `${def.id}: primary-route silent escape UNPROVEN in bounded 0–60s / 2s departure search`
   : `${def.id}: primary-route silent escape witness at ${silentWitness}s`);
 }else t.diagnostic(silentWitness===null?`${def.id}: silent escape unproven by bounded primary-route sampling; V5 continuous TheftEscape witnesses are separate`:`${def.id}: silent escape witness at ${silentWitness}s`);
 const theft=createPlaygroundState(stage);theft.theft.empty=true;
 for(let frame=0;frame<60*45&&!theft.events.theftAlert;frame++)stepGuards(theft.guards,hidden,stage.visionBlockers,guardNav,1/60,theft.events,frame/60,true,1,theft.theft);
 assert(theft.events.theftAlert,'Theft alert must eventually occur');assert(!theft.events.globalAlert);assert.equal(theft.events.globalRevision,0);
 for(const alert of [false,true]){
  const run=createPlaygroundState(stage);run.playerMode=0;run.mission.treasure=true;run.player.x=exit.x;run.player.y=exit.y;run.events.globalAlert=alert;
  stepPlayground(run,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,guardNav);
  assert(run.mission.complete);assert(!run.events.caught);assert.equal(run.events.theftRevision,0);
 }
 const caught=createPlaygroundState(stage);caught.playerMode=0;caught.player.x=caught.guards[0].x;caught.player.y=caught.guards[0].y;
 stepPlayground(caught,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,guardNav);assert(caught.events.caught);
 const retry=createPlaygroundState(stage);assert(!retry.events.caught&&!retry.mission.complete&&!retry.mission.treasure&&!retry.events.theftAlert);
});
test('Historical V3 portals use all four edges and connect opposite sides within each chapter',()=>{
 assert.deepEqual([...new Set(historicalCampaign.map(s=>s.entryEdge))].sort(),['bottom','left','right','top']);
 assert.deepEqual([...new Set(historicalCampaign.map(s=>s.exitEdge))].sort(),['bottom','left','right','top']);
 for(let i=0;i<historicalCampaign.length;i++){
  const s=historicalCampaign[i];
  // Gallery spans separate exhibition floors; 07 and 10 deliberately use south arrivals.
  if(s.chapter!==2&&s.chapter!==3&&historicalCampaign[i+1]?.chapter===s.chapter)assert.equal(historicalCampaign[i+1].entryEdge,oppositeEdge[s.exitEdge!]);
  for(const [edge,p] of [[s.entryEdge,s.entryPosition],[s.exitEdge,s.exitPosition]] as const){
   if(s.chapter===2||s.chapter===3){
    // V3 Bank heists use independent exit sides. Independent rooms
    // and stepped Gallery footprints have an exterior wall before the rectangular
    // bounding box ends. Follow the portal normal; an interior divider must fail.
    const [dx,dy]=edge==='left'?[-1,0]:edge==='right'?[1,0]:edge==='top'?[0,-1]:[0,1];
    let boundary:number|null=null;
    for(let step=.25;step<=Math.max(s.layout.length,s.layout[0].length)+1;step+=.25){
     const cell=s.layout[Math.floor(p!.y+dy*step)]?.[Math.floor(p!.x+dx*step)];
     if(boundary===null&&cell!=='.')boundary=step;
     if(boundary!==null)assert.notEqual(cell,'.',`${s.id}: portal points into another room`);
    }
    assert(boundary!==null&&boundary<=2,`${s.id}: portal not near exterior wall`);
    continue;
   }
   const distance=edge==='left'?p!.x:edge==='right'?s.layout[0].length-p!.x:edge==='top'?p!.y:s.layout.length-p!.y;
   assert(distance<=2,`${s.id}: portal not at outer edge`);
  }
 }
});
test('Chapter/Mission migration preserves legacy records, new bests are not compared with different old layouts',()=>{
 const p=migrateCampaign({currentStage:8,highestUnlocked:9,clearedStages:[0,8,9],bestTimes:{0:20,8:55,9:90},bestAlerts:{0:0,8:1,9:2}});
 assert.equal(p.lastMission,'08-05');assert.equal(p.records['09-01'].bestTime,90);assert.equal(p.records['08-05'].legacy,true);
 const next=completeMission(p,missionIndex('09-01'),100,4);assert.equal(next.records['09-01'].bestTime,100);assert(!next.records['09-01'].legacy);
 assert.deepEqual(normalizeCampaign(JSON.parse(JSON.stringify(next))),next);
 for(let i=0;i<MISSION_COUNT;i++)assert(canPlayMission(freshCampaign(),i,true));
 assert(!canPlayMission(freshCampaign(),1,false));assert(!canPlayMission(p,MISSION_COUNT,true));
 let sequential=freshCampaign();for(let i=0;i<MISSION_COUNT;i++){assert(canPlayMission(sequential,i,false));sequential=completeMission(sequential,i,50,0);}
 assert.equal(sequential.lastMission,missionId(MISSION_COUNT-1));assert.equal(Object.keys(sequential.records).length,MISSION_COUNT);
});
test('all campaign names and Chapter themes are localized; final mission is Vault, not Black Site',()=>{
 assert.equal(CHAPTERS.length,9);assert.equal(CHAPTERS[8].theme,'vault');
 for(let i=0;i<MISSION_COUNT;i++)for(const language of ['ko','en'] as const)assert(missionName(i,language)?.length);
});
test('campaign and old archive/preferences round-trip; replay remembers last mission without losing unlocks',()=>{
 const campaign=completeMission(freshCampaign(),missionIndex('04-05'),70,2);
 const replay={...campaign,lastMission:'02-03'};
 const progress={...DEFAULT_PROGRESS,hasStarted:true,campaign:replay,language:'ko' as const,soundEnabled:false,bestTimes:{0:12},clearedStages:[0]};
 const saved=normalizeProgress(JSON.parse(JSON.stringify(progress)));
 assert.deepEqual(saved,progress);assert.equal(saved.campaign!.lastMission,'02-03');assert.equal(saved.campaign!.highestUnlocked,missionIndex('04-05')+1);
 assert.equal(saved.bestTimes[0],12);assert.equal(saved.campaign!.records['04-05'].bestTime,70);
});

test('Historical Museum V2 chapter has ten distinct authored missions with real routes and semantic patrol responsibilities',()=>{
 const museum=(v3Before as StageDefinition[]).filter(s=>s.chapter===1);
 assert.equal(museum.length,10);
 const guards=[2,2,2,3,3,3,3,4,5,6];
 for(const [i,s] of museum.entries()){
  assert.equal(s.id,`01-${String(i+1).padStart(2,'0')}`);assert.equal(s.guards.length,guards[i]);
  assert.equal(s.title,historicalStages.find(d=>d.id===s.id)!.title);
  assert.equal(s.patrolPlan?.assignments.length,s.guards.length);
  assert(!s.props.some(p=>p.kind==='bench'||p.kind==='plant'),'No filler props');
  assert(s.escapeRoutes?.[0].points.length!>=3,'Escape is an authored route');
  if(i>=4){
   const route=s.escapeRoutes![0].points;
   const length=route.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p.x-route[j].x,p.y-route[j].y),0);
   assert(length>=8,`${s.id}: distinct escape leg after theft`);
  }
 }
 assert.equal(museum[1].landmark!.name,'Central Rotunda');
 assert(museum[2].props.filter(p=>p.kind==='shelf').length>=2);
 assert.equal(museum[9].objective!.kind,'masterDiamond');
 let progress=freshCampaign();
 for(let i=0;i<10;i++){
  assert(canPlayMission(freshCampaign(),i,true),'Development allows all Museum missions');
  progress=completeMission(progress,i,30+i,i%2);
  assert.equal(progress.lastMission,missionId(i+1));
 }
 const restored=normalizeCampaign(JSON.parse(JSON.stringify(progress)));
 for(let i=0;i<10;i++)assert.deepEqual(restored.records[missionId(i)],{cleared:true,bestTime:30+i,alerts:i%2});
});

test('Museum v1 expansion precedes V12 compression exactly once',()=>{
 const before={version:1,lastMission:'02-03',highestUnlocked:7,records:{'01-05':{cleared:true,bestTime:30,alerts:0},'02-02':{cleared:true,bestTime:70,alerts:1}}};
 const after=normalizeCampaign(before);
 assert.equal(after.version,5);assert.equal(after.highestUnlocked,7);assert.equal(after.lastMission,'02-01');
 assert.deepEqual(after.records,{'01-05':{cleared:true,legacy:true},'02-02':{cleared:true,legacy:true}});
 assert.deepEqual(after.legacyArchive?.original,before);assert.deepEqual(normalizeCampaign(after),after);
 assert.equal(normalizeCampaign({version:1,highestUnlocked:4,records:{}}).highestUnlocked,4);
 assert.equal(normalizeCampaign({version:1,highestUnlocked:44,records:{}}).highestUnlocked,44);
 assert.equal(missionId(4),'01-05');assert.equal(missionId(5),'02-01');assert.equal(missionIndex('09-05'),44);
 for(let index=0;index<MISSION_COUNT;index++)assert.equal(missionIndex(missionId(index)),index);
 for(const id of ['01-00','01-06','02-06','03-06','00-01','10-01','01-1'])assert.equal(missionIndex(id),-1);
 for(let index=0;index<5;index++)assert(canPlayMission(freshCampaign(),index,true));
 assert(!canPlayMission(freshCampaign(),4,false),'QA unlock does not remove release progression');
 const next=completeMission(freshCampaign(),4,100,1);assert.equal(next.lastMission,'02-01');
});

test('Gallery v2 expansion precedes V12 compression and archives benchmark records',()=>{
 const before={version:2,lastMission:'03-01',highestUnlocked:15,records:{'02-05':{cleared:true,bestTime:40,alerts:0},'03-01':{cleared:true,bestTime:55,alerts:1}}};
 const after=normalizeCampaign(before);assert.equal(after.version,5);assert.equal(after.highestUnlocked,11);
 assert.deepEqual(after.records,{'02-02':{cleared:true,legacy:true},'03-01':{cleared:true,legacy:true}});
 assert.deepEqual(after.legacyArchive?.original,before);assert.equal(after.lastMission,'03-01');assert.deepEqual(normalizeCampaign(after),after);
 assert.equal(normalizeCampaign({version:2,highestUnlocked:14,records:{}}).highestUnlocked,7);assert.equal(normalizeCampaign({version:2,highestUnlocked:49,records:{}}).highestUnlocked,44);
 assert.equal(missionId(9),'02-05');assert.equal(missionId(10),'03-01');
 const next=completeMission(freshCampaign(),9,50,0);assert.equal(next.lastMission,'03-01');
});

test('Bank v3 expansion retains Lab unlock and archives old Bank bests',()=>{
 const before={version:3,lastMission:'04-01',highestUnlocked:25,records:{'02-10':{cleared:true,bestTime:40,alerts:0},'03-05':{cleared:true,bestTime:55,alerts:1}}};
 const after=normalizeCampaign(before);assert.equal(after.version,5);assert.equal(after.highestUnlocked,15);assert.equal(after.lastMission,'04-01');
 assert.deepEqual(after.records['02-05'],{cleared:true,legacy:true});assert.deepEqual(after.records['03-03'],{cleared:true,legacy:true});
 assert.deepEqual(after.legacyArchive?.original,before);assert.deepEqual(normalizeCampaign(after),after);
 assert.equal(normalizeCampaign({version:3,highestUnlocked:24,records:{}}).highestUnlocked,12);
 assert.equal(normalizeCampaign({version:3,highestUnlocked:54,records:{}}).highestUnlocked,44);
 assert.equal(missionId(14),'03-05');assert.equal(missionId(15),'04-01');
 const next=completeMission(after,missionIndex('03-03'),80,2);assert.equal(next.records['03-03'].bestTime,80);assert(!next.records['03-03'].legacy);
});
