import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compileStage, TILE } from '../../world/compileStage';
import { buildNavigation, clearSegment, findPath } from '../../world/navigation';
import type { StageDefinition } from '../../levels/StageDefinition';
import { createGuardState,createGuardEvents,stepGuard } from '../guardBrain';
import { BODY } from '../guardTuning';
import { facingToDir } from '../../core/locomotion';
import { prePolishStages,playableStages } from '../../levels/stages/tiltTestMaps';
import { stepGuards } from '../guardSystem';
import { pointVisible } from '../guardVision';

function fixture(roaming=false){
 const layout=Array.from({length:14},(_,y)=>Array.from({length:18},(_,x)=>x===0||y===0||x===17||y===13||(x===8&&y>=3&&y<=10)?'#':'.').join(''));
 const def:StageDefinition={id:'test',number:1,title:'test',theme:'museum',layout,props:[],lights:[],
  playerSpawn:{x:6,y:5,facing:0},guards:[{id:'g',x:4,y:5,facing:0,routeId:'r'}],
  patrolRoutes:[{id:'r',mode:roaming?'roaming':'pingpong',points:roaming?
   [{x:4,y:5},{x:13,y:5},{x:13,y:8},{x:4,y:8}]:[{x:4,y:5,wait:10},{x:4,y:8,wait:2}]}]};
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),g=createGuardState(stage.guards[0]),ev=createGuardEvents();
 let t=0;
 const tick=(p:{x:number;y:number;gait:number})=>{t+=1/60;stepGuard(g,p,stage.visionBlockers,1/60,ev,t,true,1,nav);};
 return {stage,nav,g,ev,tick};
}
test('visible exposure lures guard; hidden player never updates personal LKP; look/decay/return completes',()=>{
 const f=fixture(),visible={x:6*TILE,y:5*TILE,gait:3};
 for(let i=0;i<180 && f.g.suspicion<0.55;i++)f.tick(visible);
 assert(f.g.suspicion>=0.5 && f.g.suspicion<1);
 const lkp=[f.g.lkpX,f.g.lkpY],startX=f.g.x;
 const hidden={x:13*TILE,y:6*TILE,gait:3};
 let investigated=false,looked=false,returned=false;
 for(let i=0;i<1500;i++){
  const x=f.g.x,y=f.g.y;f.tick(hidden);
  assert(clearSegment(x,y,f.g.x,f.g.y,f.nav.blockers,BODY.guardRadius));
  assert.deepEqual([f.g.lkpX,f.g.lkpY],lkp,'hidden position leaked');
  investigated ||= f.g.localInvestigating && f.g.x>startX+10;
  looked ||= f.g.localArrived && f.g.localLookT>1;
  if(looked && !f.g.localReturning && !f.g.localInvestigating && f.g.suspicion===0){returned=true;break;}
 }
 assert(investigated&&looked&&returned);
 assert(!f.ev.globalAlert && f.ev.whistleCount===0);
});
test('roaming is deterministic, avoids walls, mixes near/far stops and pauses',()=>{
 const a=fixture(true),b=fixture(true),hidden={x:-1000,y:-1000,gait:0};
 const visits:number[]=[];let last=0,paused=0;
 for(let i=0;i<60*90;i++){
  const x=a.g.x,y=a.g.y;a.tick(hidden);b.tick(hidden);
  assert(clearSegment(x,y,a.g.x,a.g.y,a.nav.blockers,BODY.guardRadius));
  assert.equal(a.g.x,b.g.x);assert.equal(a.g.facing,b.g.facing);
  assert.equal(facingToDir(a.g.facing),facingToDir(b.g.facing));
  if(a.g.wait>0&&a.g.speed===0)paused++;
  if(a.g.roamVisits!==last){visits.push(a.g.roamPrevious);last=a.g.roamVisits;}
 }
 assert(visits.length>=4 && paused>120);
 for(let i=1;i<visits.length;i++)assert.notEqual(visits[i],visits[i-1]);
 assert(a.g.pathPlans<300,'A* must not run each frame');
});
test('all venues compact actual floor area and provide themed structures/objective guard',()=>{
 for(let i=0;i<10;i++){
  const s=playableStages[i],old=prePolishStages[i];
  const area=(d:StageDefinition)=>d.layout.join('').split('').filter(c=>c==='.').length;
  const reduction=1-area(s)/area(old);assert(reduction>=0.2&&reduction<=0.3);
  assert(s.props.length>old.props.length);
  assert(s.props.some(p=>p.kind==='objectiveCase'));
  assert(s.guards.some(g=>g.id===s.objectiveZone?.guardId&&g.routeId==='objective-watch'));
  assert.equal(s.patrolRoutes.filter(r=>r.mode==='roaming').length,i<2?0:1+Math.floor((i-2)/3));
 }
});

for(const def of playableStages)test(`${def.number}: objective watcher offers observable unguarded timing windows`,()=>{
 const s=compileStage(def),nav=buildNavigation(s,BODY.guardRadius),guards=s.guards.map(g=>createGuardState(g)),ev=createGuardEvents();
 const watch=guards.find(g=>g.id===def.objectiveZone!.guardId)!;
 let gap=0,longest=0;
 for(let frame=0;frame<60*60;frame++){
  stepGuards(guards,{x:-1000,y:-1000,gait:0},s.visionBlockers,nav,1/60,ev,frame/60,true);
  if(!pointVisible(watch,s.objective.x,s.objective.y,s.visionBlockers)){gap+=1/60;longest=Math.max(longest,gap);}else gap=0;
 }
 assert(longest>=1,`no one-second window: ${longest}`);
});

test('all authored roaming destination pairs have body-clear navigation paths',()=>{
 for(const def of playableStages){
  const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
  for(const guard of stage.guards.filter(g=>g.routeMode==='roaming')){
   for(const start of guard.route)for(const end of guard.route){
    if(start===end)continue;
    const path=findPath(nav,start.x,start.y,end.x,end.y);
    assert.equal(path.at(-2),end.x,`${def.number}/${guard.id}: destination x`);
    assert.equal(path.at(-1),end.y,`${def.number}/${guard.id}: destination y`);
    let x=start.x,y=start.y;
    for(let i=0;i<path.length;i+=2){
     assert(clearSegment(x,y,path[i],path[i+1],nav.blockers,BODY.guardRadius));
     x=path[i];y=path[i+1];
    }
   }
  }
 }
});
