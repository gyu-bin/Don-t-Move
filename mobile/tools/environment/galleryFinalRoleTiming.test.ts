/** Actual controller movement/timers: enabling final-gallery roles must not inherit Museum pacing. */
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {campaignStages} from '../../src/game/levels/campaignStages';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {Awareness} from '../../src/game/core/types';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepTheft} from '../../src/game/guards/theftAlert';
import {stepGuards} from '../../src/game/guards/guardSystem';

const hidden={x:-1000,y:-1000,gait:0};
const dt=1/60;
function fixture(id:string){
 const d:StageDefinition={id,number:1,chapter:id.startsWith('01-')?1:2,title:'role timing corridor',theme:'gallery',props:[],lights:[],
  layout:Array.from({length:9},(_,y)=>Array.from({length:130},(_,x)=>x===0||x===129||y===0||y===8?'#':'.').join('')),
  playerSpawn:{x:12,y:6,facing:0},objective:{x:125,y:6,kind:'painting'},exit:{x:126,y:6,w:1,h:1},
  guards:[{id:'timing-guard',x:5,y:4,facing:0,routeId:'timing-route',pace:.8,theftRole:'zone',theftPosts:[{x:120,y:4}]}],
  patrolRoutes:[{id:'timing-route',mode:'pingpong',points:[{x:5,y:4},{x:120,y:4}]}]};
 const stage=compileStage(d),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 s.theft.empty=true;s.events.theftAlert=true;s.events.theftActivatedAt=0;
 return{stage,nav,s,g:s.guards[0]};
}
function sweepSpeed(id:string,lockdown:boolean){
 const f=fixture(id);f.s.events.lockdownActive=lockdown;
 // Step the real theft controller directly, retaining forced lockdown to exercise
 // its pace/wait branch even though Gallery currently has no timed lockdown.
 let travelled=0;
 for(let frame=0;frame<240;frame++){
  const {x,y}=f.g;stepTheft(f.s.guards,hidden,f.stage.visionBlockers,f.nav,f.s.events,f.s.theft,dt,frame*dt);
  if(frame>=120)travelled+=Math.hypot(f.g.x-x,f.g.y-y);
 }
 return travelled/2;
}
function arrivalWait(id:string,lockdown:boolean){
 const f=fixture(id);f.s.events.lockdownActive=lockdown;
 f.s.theft.posts=[[{x:f.g.x,y:f.g.y}]];
 stepTheft(f.s.guards,hidden,f.stage.visionBlockers,f.nav,f.s.events,f.s.theft,dt,dt);
 assert.equal(f.g.awareness,Awareness.Investigate);
 return f.g.searchWait;
}
function searchUntilReturn(id:string,lockdown:boolean){
 const f=fixture(id),offset=lockdown?25:0;
 f.s.theft.empty=false;f.s.events.globalAlert=true;f.s.events.globalRevision=1;
 f.s.events.lockdownActive=lockdown;
 f.g.knownRevision=1;f.g.awareness=Awareness.Search;f.g.stateT=0;
 f.g.searchWait=30;f.g.searchBase=f.g.facing;
 // Keep it visibly searching in place; controller duration, not navigation or
 // seeded stateT, must produce the first Return transition.
 for(let frame=1;frame<=900;frame++){
  stepGuards(f.s.guards,hidden,f.stage.visionBlockers,f.nav,dt,f.s.events,offset+frame*dt,true,1,f.s.theft);
  if(f.g.awareness===Awareness.Return)return frame*dt;
  assert.equal(f.g.awareness,Awareness.Search,'unexpected state before duration expiry');
 }
 throw Error(`${id}: Search never returned`);
}
const near=(actual:number,expected:number)=>assert(Math.abs(actual-expected)<1e-7,`${actual} != ${expected}`);

test('02-10 retains actual 49.92 sweep velocity and 1-second arrival wait with roles, including forced lockdown',()=>{
 assert(fixture('02-10').s.theft.roles,'test must exercise real compile/state role opt-in');
 for(const lockdown of[false,true]){near(sweepSpeed('02-10',lockdown),49.92);near(arrivalWait('02-10',lockdown),1);}
});
test('02-10 Search returns after 4 seconds instead of inherited Museum 9/12 seconds',()=>{
 for(const lockdown of[false,true])assert(Math.abs(searchUntilReturn('02-10',lockdown)-4)<=dt+.000001);
});
test('other Gallery and Museum retain their previous actual pace/wait/Search contracts',()=>{
 assert.equal(fixture('02-06').s.theft.roles,undefined);
 assert(fixture('01-10').s.theft.roles);
 for(const lockdown of[false,true]){
  near(sweepSpeed('02-06',lockdown),49.92);near(arrivalWait('02-06',lockdown),1);
  assert(Math.abs(searchUntilReturn('02-06',lockdown)-4)<=dt+.000001);
  near(sweepSpeed('01-10',lockdown),lockdown?60.32:56.16);
  near(arrivalWait('01-10',lockdown),lockdown?.35:.65);
  assert(Math.abs(searchUntilReturn('01-10',lockdown)-(lockdown?12:9))<=dt+.000001);
 }
});
test('deployed final Gallery still publishes six independent role/post assignments, with one objective confirmer',()=>{
 const d=campaignStages.find(d=>d.id==='02-10')!,s=createPlaygroundState(compileStage(d));
 assert.equal(s.guards.length,6);assert.deepEqual(s.theft.roles,d.guards.map(g=>g.theftRole));
 assert.equal(s.theft.roles!.filter(r=>r==='objective').length,1);
 assert.equal(s.theft.roles![5],'roaming');
 assert(new Set(s.theft.roles).size>=4);
 s.theft.posts.forEach((posts,i)=>assert.deepEqual(posts,d.guards[i].theftPosts!.map(p=>({x:p.x*TILE,y:p.y*TILE}))));
 assert(new Set(s.theft.posts.map(posts=>`${posts[0].x},${posts[0].y}`)).size===6,'all responders must not share the objective position');
});
