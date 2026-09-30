import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {Awareness} from '../../src/game/core/types';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';

export function corridor(){
 const d:StageDefinition={id:'chase-qa',number:1,title:'corridor',theme:'museum',props:[],lights:[],
 layout:Array.from({length:9},(_,y)=>Array.from({length:130},(_,x)=>x===0||x===129||y===0||y===8?'#':'.').join('')),
 playerSpawn:{x:12,y:4,facing:0},objective:{kind:'diamond',x:125,y:6},exit:{x:126,y:6,w:1,h:1},
 guards:[{id:'a',x:5,y:4,facing:0,routeId:'a'}],patrolRoutes:[{id:'a',mode:'pingpong',points:[{x:5,y:4},{x:120,y:4}]}]};
 const stage=compileStage(d),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 s.guards[0].visionRange=1000;s.guards[0].pace=1;s.guards[0].delay=0;s.guards[0].wait=0;
 return{stage,nav,s};
}
export function measureSpeeds(){
 const values:Record<string,number>={};
 for(const mode of [1,2,3]){
  const{stage,nav,s}=corridor();s.guards=[];s.playerMode=mode;s.player.tx=4800;s.player.ty=s.player.y;s.player.hasTarget=true;
  let distance=0;for(let f=0;f<240;f++){const x=s.player.x,y=s.player.y;stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);if(f>=120)distance+=Math.hypot(s.player.x-x,s.player.y-y);}
  values[['','sneak','walk','run'][mode]]=distance/2;
 }
 {
  const{stage,nav,s}=corridor();s.guards=[];let distance=0;
  for(let f=0;f<240;f++){
   const x=s.player.x,y=s.player.y;
   stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav,{x:1,y:0,paused:false,reset:0});
   if(f>=120)distance+=Math.hypot(s.player.x-x,s.player.y-y);
  }
  values.tiltRun=distance/2;
 }
 for(const mode of ['normal','theft','lockdown','direct','support']){
  const{stage,nav,s}=corridor(),g=s.guards[0],ev=s.events;
  if(mode==='direct'||mode==='support'){ev.globalAlert=true;ev.globalRevision=1;ev.globalX=4800;ev.globalY=g.y;g.awareness=Awareness.Investigate;}
  if(mode==='theft'||mode==='lockdown'){ev.theftAlert=true;ev.theftRevision=1;ev.theftActivatedAt=0;if(mode==='lockdown'){ev.lockdownActive=true;ev.lockdownDuration=.01;}}
  const theft={missionId:mode==='lockdown'?'01-10':undefined,empty:true,x:4800,y:240,roles:['zone' as const],posts:[[{x:4800,y:g.y,wait:0,look:0}]]};
  let distance=0;
  for(let f=0;f<240;f++){const x=g.x,y=g.y;const p=mode==='direct'?{x:g.x+200,y:g.y,gait:3}:{x:-1000,y:-1000,gait:0};stepGuards([g],p,stage.visionBlockers,nav,1/60,ev,f/60+(mode==='lockdown'?21:0),true,1,(mode==='theft'||mode==='lockdown')?theft:undefined);if(f>=120)distance+=Math.hypot(g.x-x,g.y-y);}
  values[mode]=distance/2;
 }
 return values;
}
export function straightChase(){
 const{stage,nav,s}=corridor(),g=s.guards[0];s.playerMode=3;s.player.tx=4800;s.player.ty=s.player.y;s.player.hasTarget=true;
 s.events.globalAlert=true;s.events.globalRevision=1;g.awareness=Awareness.Chase;
 const gaps=[Math.hypot(s.player.x-g.x,s.player.y-g.y)];
 for(let f=0;f<600;f++){stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);if(f===299||f===599)gaps.push(Math.hypot(s.player.x-g.x,s.player.y-g.y));}
 return{gaps,caught:s.events.caught};
}
/** Straight-corridor Run vs Direct Chase from `start` world units; samples every 0.5 s until capture. */
export function chaseTrace(start=280,seconds=30){
 const{stage,nav,s}=corridor(),g=s.guards[0];
 g.x=s.player.x-start;s.playerMode=3;s.player.tx=4800;s.player.ty=s.player.y;s.player.hasTarget=true;
 s.events.globalAlert=true;s.events.globalRevision=1;g.awareness=Awareness.Chase;
 const gaps=[Math.hypot(s.player.x-g.x,s.player.y-g.y)];let minGuardSpeedNear=Infinity,caughtAt=-1,playerSpeed=0;
 for(let f=0;f<seconds*60;f++){
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const gap=Math.hypot(s.player.x-g.x,s.player.y-g.y);
  if(s.events.caught){caughtAt=s.t;break;}
  if(f>90&&gap<80)minGuardSpeedNear=Math.min(minGuardSpeedNear,g.speed);
  if(f>90)playerSpeed=Math.max(playerSpeed,s.player.speed);
  if(f%30===29)gaps.push(gap);
 }
 return{gaps,caught:s.events.caught,caughtAt,minGuardSpeedNear,playerSpeed,endX:s.player.x};
}
if(process.argv[1]?.endsWith('chaseBalanceQA.ts'))console.log(JSON.stringify({speeds:measureSpeeds(),straight:straightChase()},null,2));

/** Continuous player movement around one opaque corner; all AI decisions remain live. */
export function cornerEscape(){
 const{stage,s}=corridor(),g=s.guards[0];
 const wall=[0,200,720,240];stage.movementBlockers.push(...wall);stage.visionBlockers.push(...wall);
 const cornerNav=buildNavigation(stage,BODY.guardRadius);
 s.player.x=760;s.player.y=160;g.x=400;g.y=160;s.events.globalAlert=true;s.events.globalRevision=1;g.awareness=Awareness.Chase;
 const points=[[760,160],[760,280],[300,280]];let leg=0,firstBreak:number|null=null,searched=false,hiddenSamples=0,wrongHiddenUpdates=0;
 for(let f=0;f<1800&&!s.events.caught;f++){
  s.playerMode=3;s.player.tx=points[leg][0];s.player.ty=points[leg][1];s.player.hasTarget=true;
  const wasHidden=!g.canSee,lkpX=s.events.globalX,lkpY=s.events.globalY;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,cornerNav);
  if(Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
  if(!g.canSee&&f>1){firstBreak??=s.t;hiddenSamples++;if(wasHidden&&(s.events.globalX!==lkpX||s.events.globalY!==lkpY))wrongHiddenUpdates++;}
  if(g.awareness===Awareness.Search)searched=true;
  if(searched)break;
 }
 return{caught:s.events.caught,firstBreak,searched,hiddenSamples,wrongHiddenUpdates,time:s.t,gap:Math.hypot(s.player.x-g.x,s.player.y-g.y)};
}

/** cornerEscape, continued: after Search the alert must wind down through Return to Patrol. */
export function cornerEscapeFull(){
 const{stage,s}=corridor(),g=s.guards[0];
 const wall=[0,200,720,240];stage.movementBlockers.push(...wall);stage.visionBlockers.push(...wall);
 const cornerNav=buildNavigation(stage,BODY.guardRadius);
 s.player.x=760;s.player.y=160;g.x=400;g.y=160;s.events.globalAlert=true;s.events.globalRevision=1;g.awareness=Awareness.Chase;
 const points=[[760,160],[760,280],[300,280]];let leg=0;const states=new Set<number>();
 for(let f=0;f<60*60&&!s.events.caught;f++){
  s.playerMode=3;s.player.tx=points[leg][0];s.player.ty=points[leg][1];s.player.hasTarget=true;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,cornerNav);
  if(Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
  states.add(g.awareness);
  if(states.has(Awareness.Return)&&!s.events.globalAlert)break;
 }
 return{caught:s.events.caught,states,alertEnded:!s.events.globalAlert,finalState:g.awareness};
}
