import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStage,TILE } from '../../world/compileStage';
import { buildNavigation,clearSegment } from '../../world/navigation';
import { createGuardState,createGuardEvents } from '../guardBrain';
import { stepGuards } from '../guardSystem';
import { stepTheft, SECURITY_CORE_REACTION_SECONDS } from '../theftAlert';
import type { TheftContext } from '../theftAlert';
import { BODY } from '../guardTuning';
import { Awareness,GuardAction } from '../../core/types';
import { playableStages } from '../../levels/stages/tiltTestMaps';
import type { StageDefinition } from '../../levels/StageDefinition';
import { createPlaygroundState,stepPlayground } from '../../playground/playgroundState';

function fixture(wall=false){
 const def:StageDefinition={id:'theft',number:1,title:'test',theme:'museum',props:[],lights:[],
  layout:Array.from({length:14},(_,y)=>Array.from({length:20},(_,x)=>x===0||x===19||y===0||y===13||(wall&&x===7)?'#':'.').join('')),
  playerSpawn:{x:3,y:11,facing:0},objective:{kind:'diamond',x:8,y:5},exit:{x:2,y:10,w:2,h:2},
  guards:[{id:'a',x:5,y:5,facing:0,routeId:'a'},{id:'b',x:5,y:8,facing:0,routeId:'b'}],
  patrolRoutes:[{id:'a',mode:'pingpong',points:[{x:5,y:5},{x:5,y:6}]},{id:'b',mode:'pingpong',points:[{x:5,y:8},{x:5,y:9}]}]};
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),guards=stage.guards.map(g=>createGuardState(g)),ev=createGuardEvents();
 const c:TheftContext={empty:true,x:stage.objective.x,y:stage.objective.y,posts:guards.map(g=>g.route)};
 let t=0;const hidden={x:-1000,y:-1000,gait:0};
 const tick=(p=hidden)=>{t+=1/60;stepGuards(guards,p,stage.visionBlockers,nav,1/60,ev,t,false,1,c);};
 return{stage,nav,guards,ev,c,tick};
}
test('full case, cone back, range and occluding wall do not trigger theft',()=>{
 for(const mode of ['full','back','range','wall']){
  const f=fixture(mode==='wall');
  if(mode==='full')f.c.empty=false;
  if(mode==='back')for(const g of f.guards){g.facing=Math.PI;g.baseFacing=Math.PI;}
  if(mode==='range')f.c.x=10000;
  for(let i=0;i<120;i++)f.tick();
  assert.equal(f.ev.theftGuard,'',mode);assert(!f.ev.theftAlert);assert.equal(f.ev.whistleCount,0);
 }
});
test('visible empty case: stop/! -> whistle -> one theft alert; never publishes hidden player LKP',()=>{
 const f=fixture();f.tick();assert.equal(f.ev.theftGuard,'a');
 assert.equal(f.guards[0].awareness,Awareness.Alert);assert(!f.ev.theftAlert);
 let whistle=false;
 for(let i=0;i<180;i++){f.tick();whistle ||= f.guards[0].action===GuardAction.Whistle;}
 assert(whistle&&f.ev.theftAlert);assert.equal(f.ev.whistleCount,1);
 assert.equal(f.ev.globalRevision,0);assert(!f.ev.globalAlert);
 const targets=new Set(f.guards.map(g=>`${g.targetX},${g.targetY}`));assert(targets.size>1);
 for(let i=0;i<120;i++)f.tick({x:-2000,y:3000,gait:3});
 assert.equal(f.ev.globalRevision,0);assert.equal(f.ev.globalX,0);assert.equal(f.ev.globalY,0);
 assert(f.guards.every(g=>!g.hasLkp));assert.equal(f.ev.whistleCount,1);
});
test('actual sight during theft promotes immediately to Chase with one distinct spotted whistle',()=>{
 const f=fixture();for(let i=0;i<90;i++)f.tick();assert(f.ev.theftAlert);
 const g=f.guards[0],p={x:g.x+Math.cos(g.facing)*45,y:g.y+Math.sin(g.facing)*45,gait:0};
 f.tick(p);assert(f.ev.globalAlert);assert.equal(g.awareness,Awareness.Chase);
 assert.equal(f.ev.globalX,p.x);assert.equal(f.ev.globalY,p.y);assert.equal(f.ev.whistleCount,2);
 assert.equal(f.ev.theftWhistleRevision,1);assert.equal(f.ev.spottedWhistleRevision,1);
 f.tick({x:-1000,y:-1000,gait:0});assert.equal(f.ev.globalX,p.x);assert.equal(f.ev.globalY,p.y);
});
test('Exit completes before any empty-case detection, including during active alert; retry resets theft',()=>{
 for(const alert of [false,true]){
  const f=fixture(),s=createPlaygroundState(f.stage);s.playerMode=0;s.mission.treasure=true;
  s.player.x=s.mission.exitX+10;s.player.y=s.mission.exitY+10;s.events.globalAlert=alert;
  stepPlayground(s,1/60,TILE,400,400,{x:0,y:0,w:f.stage.width,h:f.stage.height},f.stage.movementBlockers,f.stage.visionBlockers,f.nav);
  assert(s.mission.complete);assert.equal(s.events.theftRevision,0);assert.equal(s.events.whistleCount,0);
  assert(!createPlaygroundState(f.stage).events.theftAlert);
 }
});
for(const def of playableStages)test(`${def.number}: distributed role zones and theft movement remain collision-safe`,()=>{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 assert.equal(def.guards.filter(g=>g.role==='objective').length,1);
 const objective=stage.objective;
 for(let i=0;i<stage.guards.length;i++)if(def.guards[i].role!=='objective'){
  const g=stage.guards[i];assert(Math.hypot(g.x-objective.x,g.y-objective.y)>=5*TILE);
  for(const pt of g.route)assert(Math.hypot(pt.x-objective.x,pt.y-objective.y)>=4*TILE);
 }
 s.theft.empty=true;s.events.theftAlert=true;s.events.theftRevision=1;
 for(let frame=0;frame<600;frame++){
  const before=s.guards.map(g=>({x:g.x,y:g.y}));
  stepGuards(s.guards,{x:-1000,y:-1000,gait:0},stage.visionBlockers,nav,1/60,s.events,frame/60,true,1,s.theft);
  s.guards.forEach((g,i)=>assert(clearSegment(before[i].x,before[i].y,g.x,g.y,nav.blockers,BODY.guardRadius)));
 }
 assert(!s.events.globalAlert);assert.equal(s.events.globalRevision,0);
});

test('simultaneous case witnesses elect one whistle regardless of guard array order',()=>{
 for(const reverse of [false,true]){
  const f=fixture();f.guards[1].x=f.guards[0].x;f.guards[1].y=f.guards[0].y;
  if(reverse){f.guards.reverse();f.c.posts.reverse();}
  for(let i=0;i<150;i++)f.tick();
  assert.equal(f.ev.theftGuard,'a');assert.equal(f.ev.whistleCount,1);assert.equal(f.ev.theftRevision,1);
 }
});

test('ten deployed patrols keep non-objective guards outside the case zone over time',()=>{
 for(const def of playableStages){
  const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
  for(let frame=0;frame<60*30;frame++){
   stepGuards(s.guards,{x:-1000,y:-1000,gait:0},stage.visionBlockers,nav,1/60,s.events,frame/60,true);
   assert(s.guards.filter(g=>Math.hypot(g.x-stage.objective.x,g.y-stage.objective.y)<3*TILE).length<=1,
    `Stage ${def.number}: objective crowding`);
  }
 }
});

test('Museum whistle completion broadcasts every assigned post in the same frame',()=>{
 const f=fixture();
 f.c.posts=[[{x:360,y:200},{x:400,y:200}],[{x:120,y:360},{x:160,y:360}]];
 for(let i=0;i<120&&!f.ev.theftAlert;i++)f.tick();
 assert(f.ev.theftAlert);
 for(let i=0;i<f.guards.length;i++){
  const g=f.guards[i];assert.equal(g.awareness,Awareness.Investigate);
  assert.equal(g.targetX,f.c.posts[i][0].x);assert.equal(g.targetY,f.c.posts[i][0].y);
  assert(!g.hasLkp);assert(!g.localInvestigating);
 }
 const initial=f.guards.map(g=>({x:g.x,y:g.y}));
 for(let i=0;i<120;i++)f.tick();
 f.guards.forEach((g,i)=>assert(Math.hypot(g.x-initial[i].x,g.y-initial[i].y)>10));
 assert.equal(f.ev.globalRevision,0);
});

test('Museum theft sighting keeps the unseen exit guard at its assigned interception post',()=>{
 const f=fixture();
 const c=f.c;
 c.roles=['objective','exit'];
 c.posts=[[{x:280,y:200},{x:320,y:200}],[{x:120,y:400},{x:160,y:400}]];
 for(let i=0;i<120&&!f.ev.theftAlert;i++)f.tick();
 const witness=f.guards[0],backup=f.guards[1];
 // Witness looks east; backup looks away. Only the witness sees this player.
 witness.facing=0;backup.facing=Math.PI;backup.baseFacing=Math.PI;
 const p={x:witness.x+50,y:witness.y,gait:1};
 f.tick(p);
 assert(f.ev.globalAlert);assert(witness.canSee);assert(!backup.canSee);
 assert.equal(witness.awareness,Awareness.Chase);
 assert.equal(witness.targetX,p.x);assert.equal(f.ev.globalX,p.x);
 assert.equal(backup.awareness,Awareness.Investigate);
 assert.equal(backup.targetX,120);assert.equal(backup.targetY,400);
 f.tick({x:-900,y:-800,gait:3});
 assert.equal(f.ev.globalX,p.x);assert.equal(f.ev.globalY,p.y);
 assert.equal(f.ev.whistleCount,2);
 assert.equal(f.ev.spottedWhistleRevision,1);
});


test('Museum phase/lockdown configuration never uses hidden coordinates or causes a timeout failure',()=>{
 for(let mission=1;mission<=10;mission++){
  const f=fixture();f.c.missionId=`01-${String(mission).padStart(2,'0')}`;
  f.c.roles=['objective','exit'];
  assert.equal(f.ev.phase,'STEALTH');
  f.c.empty=false;for(let i=0;i<60;i++)f.tick();
  assert.equal(f.ev.theftWhistleRevision,0);assert.equal(f.ev.lockdownDuration,mission<7?0:mission===10?20:28);
  assert(!f.ev.lockdownActive);
  f.c.empty=true;for(let i=0;i<150;i++)f.tick();
  assert.equal(f.ev.phase,'THEFT_ALERT');assert.equal(f.ev.theftWhistleRevision,1);
  assert.equal(f.ev.spottedWhistleRevision,0);assert.equal(f.ev.globalRevision,0);
  assert(!f.ev.caught);assert(!f.ev.lockdownActive);
  for(let i=0;i<60*31;i++)f.tick({x:-777,y:-888,gait:3});
  assert.equal(f.ev.lockdownActive,mission>=7);assert.equal(f.ev.lockdownRemaining,0);
  assert(!f.ev.caught,'zero countdown is never a game over');
  assert.equal(f.ev.globalX,0);assert.equal(f.ev.globalY,0);assert.equal(f.ev.globalRevision,0);
  assert.equal(f.ev.theftWhistleRevision,1);
 }
});

test('spotted episode publishes one whistle, retains frozen LKP through Search/Return, and can re-arm',()=>{
 const f=fixture();f.c.roles=['objective','exit'];
 for(let i=0;i<90;i++)f.tick();
 const g=f.guards[0];const p={x:g.x+Math.cos(g.facing)*45,y:g.y+Math.sin(g.facing)*45,gait:0};
 f.tick(p);assert.equal(f.ev.phase,'PLAYER_SPOTTED');assert.equal(f.ev.spottedWhistleRevision,1);
 const lkp={x:f.ev.globalX,y:f.ev.globalY};
 let search=false,returned=false;
 for(let i=0;i<60*60;i++){
  f.tick({x:-1000-i,y:-2000,gait:3});
  search ||= String(f.ev.phase)==='SEARCH'; returned ||= String(f.ev.phase)==='RETURN';
  assert.equal(f.ev.globalX,lkp.x);assert.equal(f.ev.globalY,lkp.y);
  assert.equal(f.ev.spottedWhistleRevision,1);
 }
 assert(search);assert(returned);assert(!f.ev.globalAlert);assert(!f.ev.spottedEpisode);
 const next={x:g.x+Math.cos(g.facing)*45,y:g.y+Math.sin(g.facing)*45,gait:0};
 f.tick(next);assert.equal(f.ev.spottedWhistleRevision,2);assert.equal(f.ev.theftWhistleRevision,1);
});

test('all ten actual Museum missions: natural empty-case discovery, independent signals, no hidden LKP and correct lockdown',async()=>{
 const {campaignStages}=await import('../../levels/campaignStages');
 for(const def of campaignStages.filter(d=>d.chapter===1)){
  const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
  let t=0;const dt=1/60,hidden={x:-10000,y:-20000,gait:0};
  const tick=()=>{t+=dt;stepGuards(s.guards,hidden,stage.visionBlockers,nav,dt,s.events,t,true,1,s.theft);};
  for(let i=0;i<120;i++)tick();
  assert.equal(s.events.theftWhistleRevision,0,def.id);assert.equal(s.events.phase,'STEALTH');
  s.theft.empty=true;
  for(let i=0;i<60*120&&!s.events.theftAlert;i++)tick();
  assert(s.events.theftAlert,`${def.id}: natural patrol never sees empty case`);
  assert.equal(s.events.theftWhistleRevision,1);assert.equal(s.events.spottedWhistleRevision,0);
  assert.equal(s.events.phase,'THEFT_ALERT');assert.equal(s.events.globalRevision,0);
  const activatedAt=s.events.theftActivatedAt;
  for(let i=0;i<60*31;i++)tick();
  assert.equal(s.events.theftActivatedAt,activatedAt);
  assert.equal(s.events.lockdownActive,Number(def.id.slice(-2))>=7,def.id);
  assert(!s.events.caught);assert.equal(s.events.globalRevision,0);
  assert(s.guards.every(g=>!g.hasLkp));
  assert.equal(s.events.theftWhistleRevision,1);assert.equal(s.events.spottedWhistleRevision,0);
 }
});


test('exit-role witness follows last sight to Search while uninformed colleague intercepts',()=>{
 const f=fixture();f.c.roles=['exit','corridor'];
 f.c.posts=[[{x:120,y:400},{x:160,y:400}],[{x:280,y:360},{x:200,y:360}]];
 for(let i=0;i<120&&!f.ev.theftAlert;i++)f.tick();
 const witness=f.guards[0],backup=f.guards[1];
 witness.facing=0;witness.baseFacing=0;backup.facing=Math.PI;backup.baseFacing=Math.PI;
 const p={x:witness.x+50,y:witness.y,gait:1};f.tick(p);
 assert(witness.canSee);assert(witness.hasLkp);assert(!backup.hasLkp);
 f.tick();
 assert.equal(witness.awareness,Awareness.Investigate);
 assert.equal(witness.targetX,p.x);assert.equal(witness.targetY,p.y);
 assert.notEqual(backup.targetX,p.x);
 let reachedSearch=false;
 for(let i=0;i<600&&!reachedSearch;i++){
  f.tick();reachedSearch=Number(witness.awareness)===Awareness.Search;
  if(witness.awareness===Awareness.Investigate){assert.equal(witness.targetX,p.x);assert.equal(witness.targetY,p.y);}
 }
 assert(reachedSearch);assert(Math.hypot(witness.x-p.x,witness.y-p.y)<4);
 assert.equal(f.ev.globalX,p.x);assert.equal(f.ev.globalY,p.y);
});


test('Security Core holds semantic assignments for 0.85s without publishing a hidden player',()=>{
 const f=fixture();f.c.missionId='01-08';f.c.roles=['objective','corridor'];
 f.c.posts=[[{x:360,y:200}],[{x:360,y:320}]];
 for(let i=0;i<120&&!f.ev.theftAlert;i++)f.tick();
 assert(f.ev.theftAlert);
 const initial=f.guards.map(g=>({x:g.x,y:g.y}));
 for(let frame=1;frame<SECURITY_CORE_REACTION_SECONDS*60;frame++){
  const t=f.ev.theftActivatedAt+frame/60;
  stepTheft(f.guards,{x:-1000-frame,y:-2000,gait:3},f.stage.visionBlockers,f.nav,f.ev,f.c,1/60,t);
  f.guards.forEach((g,i)=>{
   assert.deepEqual({x:g.x,y:g.y},initial[i]);assert.equal(g.speed,0);
   assert.equal(g.targetX,f.c.posts[i][0].x);assert.equal(g.targetY,f.c.posts[i][0].y);
   assert(!g.hasLkp);
  });
  assert(!f.ev.globalAlert);assert.equal(f.ev.globalRevision,0);
 }
 for(let frame=0;frame<60;frame++)stepTheft(f.guards,{x:-1000,y:-2000,gait:3},
  f.stage.visionBlockers,f.nav,f.ev,f.c,1/60,f.ev.theftActivatedAt+SECURITY_CORE_REACTION_SECONDS+frame/60);
 assert(f.guards.some((g,i)=>Math.hypot(g.x-initial[i].x,g.y-initial[i].y)>10));
});

test('Security Core sighting interrupts reaction hold in the very same frame',()=>{
 const f=fixture();f.c.missionId='01-08';f.c.roles=['objective','exit'];
 for(let i=0;i<120&&!f.ev.theftAlert;i++)f.tick();
 const g=f.guards[0];g.facing=0;g.baseFacing=0;
 const p={x:g.x+50,y:g.y,gait:0};
 f.tick(p);
 assert(f.ev.globalAlert);assert.equal(g.awareness,Awareness.Chase);
 assert.equal(g.targetX,p.x);assert.equal(g.targetY,p.y);
 assert.equal(f.ev.spottedWhistleRevision,1);
});

test('Grand Heist does not inherit Security Core reaction timing',()=>{
 const f=fixture();f.c.missionId='01-10';f.c.roles=['objective','corridor'];
 f.c.posts=[[{x:360,y:200}],[{x:360,y:320}]];
 for(let i=0;i<120&&!f.ev.theftAlert;i++)f.tick();
 const g=f.guards[0];g.facing=0;g.baseFacing=0;
 const x=g.x;
 stepTheft(f.guards,{x:-1000,y:-2000,gait:0},f.stage.visionBlockers,f.nav,f.ev,f.c,1/60,f.ev.theftActivatedAt+1/60);
 assert(g.x>x);assert(g.speed>0);
});


test('Security Core own-zone search retains authored posts after lockdown',()=>{
 const f=fixture();f.c.missionId='01-08';f.c.roles=['zone','exit'];
 f.c.posts=[[{x:360,y:200},{x:360,y:240}],[{x:120,y:400},{x:160,y:400}]];
 f.ev.theftAlert=true;f.ev.theftActivatedAt=0;f.ev.lockdownActive=true;
 for(let frame=0;frame<600;frame++){
  stepTheft(f.guards,{x:-1000-frame,y:-2000,gait:3},f.stage.visionBlockers,f.nav,f.ev,f.c,1/60,30+frame/60);
  f.guards.forEach((g,i)=>assert(f.c.posts[i].some(p=>p.x===g.targetX&&p.y===g.targetY)));
  assert(!f.ev.globalAlert);assert.equal(f.ev.globalRevision,0);
 }
});
