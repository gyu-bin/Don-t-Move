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
import {missionId} from '../../src/game/levels/campaignCatalog';
import {silentEscapeWindow} from './escapeProbe';
import {DEFAULT_PROGRESS,normalizeProgress} from '../../src/game/progress/stageProgress';
import {CHAPTERS,missionName} from '../../src/game/levels/campaignCatalog';
import {oppositeEdge} from '../../src/game/levels/missionContinuity';
import {createHash} from 'node:crypto';
import {museumMission02Playthrough,museumPlaythrough} from './museumPlaythrough';
import {MUSEUM_02_PATHS,MUSEUM_PATHS} from './museumProduction';

test('Museum safe and timed risk routes clear with continuous real movement from spawn',()=>{
 // Same departure and speed: measure the route choice, not different gait speeds.
 const safe=museumPlaythrough(0,2,0),risk=museumPlaythrough(1,2,0);
 for(const result of [safe,risk]){
  assert(result.clear&&!result.caught&&!result.alert&&!result.theft);
 }
 assert(risk.time<safe.time,'Risk route is a shorter journey, with a timing choice');
 assert(risk.maxSuspicion>safe.maxSuspicion,'Shortcut crosses real guard perception; safe approach uses cover');
});

test('Museum 01-02 safe and timed risk routes clear with continuous real movement from spawn',()=>{
 const safe=museumMission02Playthrough(0,1,16);
 const risk=museumMission02Playthrough(1,3,12);
 for(const result of [safe,risk])assert(result.clear&&!result.caught,JSON.stringify(result));
 assert(risk.time-12<safe.time-16,'01-02 risk route must remain the shorter exposed choice');
 assert(risk.maxSuspicion>safe.maxSuspicion,'01-02 shortcut must carry more detection pressure');
});

test('Museum 01-01 path-first routes, structural cover and two-sided climax are authored, not sampled or automatically repaired',()=>{
 const def=campaignStages[0],stage=compileStage(def),nav=buildNavigation(stage,BODY.playerRadius);
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

test('compact Museum 01-01 has a gallery fork, off-axis reveal, localized light and assigned inspection subjects',()=>{
 const s=campaignStages[0];
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

test('Museum compact pass changes only 01-01 and 01-02; the remaining 43 definitions are preserved',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(campaignStages.slice(2))).digest('hex'),'a920f302ebba4fc90205e7770047e6f2b91131b29828a1ab04a7c82b5bfd6451');
 const s=campaignStages[0];
 const length=(r:NonNullable<typeof s.testRoutes>[number])=>r.points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-r.points[i].x,p.y-r.points[i].y),0);
 assert(length(s.testRoutes![0])>length(s.testRoutes![1]),'Safe route must be longer than risk route');
 assert.equal(s.guards.length,2);
 assert.equal(s.entryEdge,'left');assert.equal(s.exitEdge,'right');
 for(const kind of ['pillar','statue','painting','displayCase','partition','lamp'])assert(s.props.some(p=>p.kind===kind));
 const second=campaignStages[1];
 assert.equal(second.layout.length,15);assert.equal(second.layout[0].length,15);
 assert.deepEqual(second.testRoutes![0].points,MUSEUM_02_PATHS.safe.map(([x,y])=>({x,y})));
 assert.deepEqual(second.testRoutes![1].points,MUSEUM_02_PATHS.risk.map(([x,y])=>({x,y})));
 assert.deepEqual(second.escapeRoutes![0].points,MUSEUM_02_PATHS.escape.map(([x,y])=>({x,y})));
 assert.equal(second.props.filter(p=>p.kind==='bench'||p.kind==='plant').length,0);
});

test('approved Entrance floor-plan implementation preserves every other mission including 01-02',()=>{
 assert.equal(createHash('sha256').update(JSON.stringify(campaignStages.slice(1))).digest('hex'),'7ee97b1504714d69b1630a8853a1f98bb1f6bbfa10ae50320ba0069173cd3ddc');
});

test('01-02 NORMAL suspicion uses the shared runtime model and meets distance/action benchmarks',()=>{
 const stage=compileStage(campaignStages[1]),source=stage.guards[0],dt=1/60;
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
 assert(far>20,`far edge idle ${far.toFixed(2)}s`);
 assert(sneak>=3&&sneak<=5,`medium sneak ${sneak.toFixed(2)}s`);
 assert(walk>=2&&walk<=3,`medium walk ${walk.toFixed(2)}s`);
 assert(close>=1&&close<=1.5,`close walk ${close.toFixed(2)}s`);
 assert(run>=.5&&run<=.8,`very close run ${run.toFixed(2)}s`);
});

test('45 baked StageDefinitions equal reviewed authoring data; no duplicate layouts even after rotation',()=>{
 assert.equal(campaignStages.length,45);assert.deepEqual(campaignStages,JSON.parse(JSON.stringify(buildCampaign())));
 const shapes=new Set<string>();
 for(const def of campaignStages){
  let rows=def.layout;const signatures=[];
  for(let r=0;r<4;r++){signatures.push(rows.join('\n'));rows=Array.from({length:rows[0].length},(_,y)=>Array.from({length:rows.length},(_,x)=>rows[rows.length-1-x][y]).join(''));}
  const key=signatures.sort()[0];assert(!shapes.has(key),def.id);shapes.add(key);
 }
});
for(const def of campaignStages)test(`${def.id}: spawn/approach/escape/props/patrol/zones and alert rules`,()=>{
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
 assert(def.props.length>=8);assert.equal(def.guards.filter(g=>g.role==='objective').length,1);
 assert(def.props.some(p=>p.kind==='objectiveCase'));assert(def.lights.some(l=>l.kind==='warm'&&l.intensity>=0.85));
 for(const prop of def.props){const spec=PROP_KIT[prop.kind];assert(typeof spec.blocksMovement==='boolean'&&typeof spec.blocksVision==='boolean');}
 assert.equal(def.securityZones?.length,def.guards.length);assert(def.safeZones?.length);
 assert.notDeepEqual(def.testRoutes![0].points,def.testRoutes![1].points);
 for(const route of [...def.testRoutes!,...def.escapeRoutes!])for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i];assert(clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,nav.blockers,BODY.playerRadius),`${def.id}: blocked route ${route.name}`);
 }
 for(const guard of stage.guards){walk(guard,BODY.guardRadius);assert(guard.route.length>=2);
  for(const a of guard.route)for(const b of guard.route){
   if(!guard.semanticPatrol)assert(clearSegment(a.x,a.y,b.x,b.y,guardNav.blockers,BODY.guardRadius));
   const route=findPath(guardNav,a.x,a.y,b.x,b.y);assert.deepEqual(route.slice(-2),[b.x,b.y]);
   let x=a.x,y=a.y;for(let k=0;k<route.length;k+=2){assert(clearSegment(x,y,route[k],route[k+1],guardNav.blockers,BODY.guardRadius));x=route[k];y=route[k+1];}
   path(a,b);
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
 assert.notEqual(silentEscapeWindow(def),null,'A continuous escape leg before case discovery must be possible');
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
test('45 authored portals use all four edges and connect opposite sides within each chapter',()=>{
 assert.deepEqual([...new Set(campaignStages.map(s=>s.entryEdge))].sort(),['bottom','left','right','top']);
 assert.deepEqual([...new Set(campaignStages.map(s=>s.exitEdge))].sort(),['bottom','left','right','top']);
 for(let i=0;i<45;i++){
  const s=campaignStages[i];
  if(i%5<4)assert.equal(campaignStages[i+1].entryEdge,oppositeEdge[s.exitEdge!]);
  for(const [edge,p] of [[s.entryEdge,s.entryPosition],[s.exitEdge,s.exitPosition]] as const){
   const distance=edge==='left'?p!.x:edge==='right'?s.layout[0].length-p!.x:edge==='top'?p!.y:s.layout.length-p!.y;
   assert(distance<=2,`${s.id}: portal not at outer edge`);
  }
 }
});
test('Chapter/Mission migration preserves legacy records, new bests are not compared with different old layouts',()=>{
 const p=migrateCampaign({currentStage:8,highestUnlocked:9,clearedStages:[0,8,9],bestTimes:{0:20,8:55,9:90},bestAlerts:{0:0,8:1,9:2}});
 assert.equal(p.lastMission,'08-05');assert.equal(p.records['09-01'].bestTime,90);assert.equal(p.records['08-05'].legacy,true);
 const next=completeMission(p,40,100,4);assert.equal(next.records['09-01'].bestTime,100);assert(!next.records['09-01'].legacy);
 assert.deepEqual(normalizeCampaign(JSON.parse(JSON.stringify(next))),next);
 for(let i=0;i<45;i++)assert(canPlayMission(freshCampaign(),i,true));
 assert(!canPlayMission(freshCampaign(),1,false));assert(!canPlayMission(p,45,true));
 let sequential=freshCampaign();for(let i=0;i<45;i++){assert(canPlayMission(sequential,i,false));sequential=completeMission(sequential,i,50,0);}
 assert.equal(sequential.lastMission,missionId(44));assert.equal(Object.keys(sequential.records).length,45);
});
test('all 45 names and Chapter themes are localized; final mission is Vault, not Black Site',()=>{
 assert.equal(CHAPTERS.length,9);assert.equal(CHAPTERS[8].theme,'vault');
 for(let i=0;i<45;i++)for(const language of ['ko','en'] as const)assert(missionName(i,language)?.length);
});
test('campaign and old archive/preferences round-trip; replay remembers last mission without losing unlocks',()=>{
 const campaign=completeMission(freshCampaign(),24,70,2);
 const replay={...campaign,lastMission:'02-03'};
 const progress={...DEFAULT_PROGRESS,hasStarted:true,campaign:replay,language:'ko' as const,soundEnabled:false,bestTimes:{0:12},clearedStages:[0]};
 const saved=normalizeProgress(JSON.parse(JSON.stringify(progress)));
 assert.deepEqual(saved,progress);assert.equal(saved.campaign!.lastMission,'02-03');assert.equal(saved.campaign!.highestUnlocked,25);
 assert.equal(saved.bestTimes[0],12);assert.equal(saved.campaign!.records['05-05'].bestTime,70);
});
