import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStage,TILE } from '../../world/compileStage';
import { buildNavigation,clearSegment } from '../../world/navigation';
import { createGuardState,createGuardEvents } from '../guardBrain';
import { stepGuards } from '../guardSystem';
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
 const c={empty:true,x:stage.objective.x,y:stage.objective.y,posts:guards.map(g=>g.route)};
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
test('actual sight during theft promotes immediately to Chase without another whistle',()=>{
 const f=fixture();for(let i=0;i<90;i++)f.tick();assert(f.ev.theftAlert);
 const g=f.guards[0],p={x:g.x+Math.cos(g.facing)*45,y:g.y+Math.sin(g.facing)*45,gait:0};
 f.tick(p);assert(f.ev.globalAlert);assert.equal(g.awareness,Awareness.Chase);
 assert.equal(f.ev.globalX,p.x);assert.equal(f.ev.globalY,p.y);assert.equal(f.ev.whistleCount,1);
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
