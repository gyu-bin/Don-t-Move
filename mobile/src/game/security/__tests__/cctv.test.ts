import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSecurityCamera,stepSecurityCameras,CAMERA_ALERT_AUDIO_STATUS} from '../cctv';
import {createGuardEvents} from '../../guards/guardBrain';
import {compileStage} from '../../world/compileStage';
import type {StageDefinition} from '../../levels/StageDefinition';
import {createPlaygroundState,stepPlayground} from '../../playground/playgroundState';
import {buildNavigation} from '../../world/navigation';
import {Awareness} from '../../core/types';
import {BODY} from '../../guards/guardTuning';
function camera(){return createSecurityCamera({id:'camera-A',x:120,y:200,centerFacing:0,sweepAngle:0,sweepSpeed:.3,pauseAtEnds:.5,range:220,visionAngle:.7,suspicionRate:.62});}
function fixture():StageDefinition{return{id:'security-fixture',number:0,title:'Security fixture',theme:'bank',lights:[],layout:Array.from({length:20},(_,y)=>Array.from({length:28},(_,x)=>x===0||x===27||y===0||y===19?'#':'.').join('')),props:[],guards:[{id:'guardA',x:20,y:14,facing:Math.PI/2,routeId:'routeA',theftRole:'roaming',theftSearchSectors:[{id:'public',anchors:[{x:20,y:14},{x:15,y:14}]},{id:'staff',anchors:[{x:15,y:10},{x:10,y:10}]}]}],patrolRoutes:[{id:'routeA',mode:'loop',points:[{x:20,y:14},{x:20,y:16}]}],playerSpawn:{x:5,y:5,facing:0},cameras:[{id:'camera-A',x:3,y:5,centerFacing:0,sweepAngle:0,sweepSpeed:.3,pauseAtEnds:.5,range:5.5,visionAngle:.7}],objective:{x:24,y:16,kind:'vaultGem'},exit:{x:24,y:17,w:1,h:1}};}
test('A avoiding sweep remains invisible, endpoint pause and bounded sweep remain deterministic',()=>{
 const c=camera(),ev=createGuardEvents();c.sweepAngle=.6;
 let pauses=0;
 for(let f=0;f<600;f++){stepSecurityCameras([c],{x:120,y:100,gait:3},[],ev,1/60,f/60);assert(Math.abs(c.sweepOffset)<=.6);if(c.pauseRemaining>0)pauses++;}
 assert(pauses>0);assert.equal(c.suspicion,0);assert.equal(ev.globalAlert,false);
});
test('B brief cone entry produces partial suspicion then memory delay and decay without alert',()=>{
 const c=camera(),ev=createGuardEvents();
 for(let f=0;f<20;f++)stepSecurityCameras([c],{x:240,y:200,gait:2},[],ev,1/60,f/60);
 assert(c.suspicion>0&&c.suspicion<1);const partial=c.suspicion;
 for(let f=0;f<10;f++)stepSecurityCameras([c],{x:120,y:100,gait:2},[],ev,1/60,1+f/60);
 assert.equal(c.suspicion,partial);
 for(let f=0;f<180;f++)stepSecurityCameras([c],{x:120,y:100,gait:2},[],ev,1/60,2+f/60);
 assert.equal(c.suspicion,0);assert.equal(ev.globalAlert,false);
});
test('C full detection publishes real Global LKP once, with separate silent audio asset slot',()=>{
 const c=camera(),ev=createGuardEvents();
 for(let f=0;f<300;f++)stepSecurityCameras([c],{x:240,y:200,gait:3},[],ev,1/60,f/60);
 assert(c.alerted);assert.equal(ev.cameraAlertRevision,1);assert.equal(ev.globalAlert,true);
 assert.deepEqual([ev.globalX,ev.globalY],[240,200]);assert.equal(ev.spottedSource,'camera-A');assert.equal(ev.spottedWhistleRevision,0);
 assert.equal(CAMERA_ALERT_AUDIO_STATUS,'CAMERA_ALERT_SFX_REQUIRED');
});
test('D wall occlusion halts current-player updates and retains only the last observed location',()=>{
 const c=camera(),ev=createGuardEvents();
 for(let f=0;f<240;f++)stepSecurityCameras([c],{x:240,y:200,gait:3},[],ev,1/60,f/60);
 const revision=ev.globalRevision;
 stepSecurityCameras([c],{x:260,y:200,gait:3},[160,0,200,400],ev,1/60,5);
 assert.equal(c.canSee,false);assert.equal(ev.cameraSeesPlayer,false);assert.equal(ev.globalRevision,revision);
 assert.deepEqual([ev.globalX,ev.globalY,c.lastKnownX,c.lastKnownY],[240,200,240,200]);
});
test('E actual playground theft escalation makes guards investigate camera LKP, never unseen live target',()=>{
 const stage=compileStage(fixture()),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;s.patrol=false;
 s.events.theftAlert=true;s.events.theftActivatedAt=0;s.mission.treasure=true;
 const tick=()=>stepPlayground(s,1/60,40,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
 for(let f=0;f<1800&&!s.events.globalAlert;f++)tick();
 assert.equal(s.events.theftAlert,true);assert.equal(s.events.globalAlert,true);assert.equal(s.events.cameraAlertRevision,1);
 const known=[s.events.globalX,s.events.globalY];s.player.x=stage.width-80;s.player.y=80;
 tick();assert.equal(s.securityCameras[0].canSee,false);assert.deepEqual([s.events.globalX,s.events.globalY],known);
 assert.notDeepEqual([s.guards[0].targetX,s.guards[0].targetY],[s.player.x,s.player.y]);
});
test('Camera authoring rejects malformed angles/range before entering a worklet',()=>{
 for(const invalid of[NaN,-1,0]){const def=fixture();def.cameras![0].range=invalid;assert.throws(()=>compileStage(def),/Invalid security camera/);}
});
test('Full playground camera alert → LOS break → investigation/search/return clears global pursuit and resumes theft sectors',()=>{
 const stage=compileStage(fixture()),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 s.events.theftAlert=true;s.events.theftActivatedAt=0;s.mission.treasure=true;
 const tick=()=>stepPlayground(s,1/60,40,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
 for(let f=0;f<1800&&!s.events.globalAlert;f++)tick();
 assert.equal(s.events.cameraAlertSource,'camera-A');assert.equal(s.events.globalAlert,true);
 const lastKnown=[s.events.globalX,s.events.globalY],hidden=[stage.width-80,80];
 s.player.x=hidden[0];s.player.y=hidden[1];
 const states=new Set<number>();let cleared=false;
 for(let f=0;f<240*60;f++){
  tick();states.add(s.guards[0].awareness);
  assert.deepEqual([s.events.globalX,s.events.globalY],lastKnown,'Unseen player must never update shared position');
  assert.notDeepEqual([s.guards[0].targetX,s.guards[0].targetY],hidden);
  if(!s.events.globalAlert){cleared=true;break;}
 }
 assert(cleared,'All guards must finish their actual investigation/search/return');
 assert(states.has(Awareness.Investigate),'investigate state visited');assert(states.has(Awareness.Search),'search state visited');assert(states.has(Awareness.Return),'return state visited');
 assert.equal(s.events.theftAlert,true);assert.equal(s.events.spottedEpisode,false);
 const index=s.guards[0].searchIndex;for(let f=0;f<60*50;f++)tick();
 assert.equal(s.events.globalAlert,false);assert.equal(s.events.theftAlert,true);assert(s.guards[0].searchIndex>index,'Authored theft circuit must resume after pursuit clears');
});
test('Multiple cameras publish one consistent visible-player location and no hidden-source overwrite',()=>{
 const a=camera(),b=camera();b.id='camera-B';b.x=300;b.centerFacing=Math.PI;b.facing=Math.PI;
 const ev=createGuardEvents(),player={x:240,y:200,gait:3};
 for(let f=0;f<300;f++)stepSecurityCameras([a,b],player,[],ev,1/60,f/60);
 assert.equal(ev.cameraAlertRevision,2);assert.deepEqual([ev.globalX,ev.globalY],[player.x,player.y]);
 // A is blocked but B still has real sight. Only visible B refreshes.
 stepSecurityCameras([a,b],{x:250,y:200,gait:3},[160,0,200,400],ev,1/60,6);
 assert.equal(a.canSee,false);assert.equal(b.canSee,true);assert.equal(ev.cameraSeesPlayer,true);
 assert.deepEqual([ev.globalX,ev.globalY],[250,200]);assert.deepEqual([a.lastKnownX,a.lastKnownY],[240,200]);
 const revision=ev.globalRevision;
 stepSecurityCameras([a,b],{x:120,y:100,gait:3},[],ev,1/60,7);
 assert.equal(ev.cameraSeesPlayer,false);assert.equal(ev.globalRevision,revision);assert.deepEqual([ev.globalX,ev.globalY],[250,200]);
});
test('Camera-only stage maintains alert during real sight and clears pursuit after sight is lost without phantom guards',()=>{
 const def=fixture();def.guards=[];def.patrolRoutes=[];
 const stage=compileStage(def),s=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.guardRadius);s.playerMode=0;
 const tick=()=>stepPlayground(s,1/60,40,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
 for(let f=0;f<1800&&!s.events.globalAlert;f++)tick();assert(s.events.globalAlert);
 for(let f=0;f<30;f++)tick();assert(s.events.globalAlert,'Actual camera visibility keeps alert alive without guards');
 const known=[s.events.globalX,s.events.globalY];s.player.x=1000;s.player.y=80;tick();
 assert.equal(s.events.globalAlert,false);assert.equal(s.events.spottedEpisode,false);assert.deepEqual([s.events.globalX,s.events.globalY],known);
});
