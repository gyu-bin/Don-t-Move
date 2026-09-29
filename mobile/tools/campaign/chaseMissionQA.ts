import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {Awareness} from '../../src/game/core/types';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {measureSpeeds,straightChase,cornerEscape} from './chaseBalanceQA';
import type {ReplayPoint} from './theftPhaseReplay';

export function missionChaseReplay(id:string,points:ReplayPoint[],mode:number,delay:number){
 const def=campaignStages.find(d=>d.id===id)!,stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 let leg=1,wait=0,arrived=false,pickup:number|null=null,theft:number|null=null,lockdown:number|null=null,spotted:number|null=null;
 const phases:{phase:string;t:number}[]=[];let last='';
 const trace:{t:number;phase:string;playerSpeed:number;guards:{id:string;visible:boolean;awareness:number;speed:number;distance:number;target:number[];lkp:number[]}[]}[]=[];
 for(let f=0;f<60*150&&!s.events.caught&&!s.mission.complete;f++){
  s.playerMode=0;s.player.hasTarget=false;
  if(f>=delay*60){
   if(wait>0){wait-=1/60;if(wait<=0&&leg<points.length-1){leg++;arrived=false;}}
   else if(!arrived){const p=points[leg];s.playerMode=p.mode??mode;s.player.tx=p.x*TILE;s.player.ty=p.y*TILE;s.player.hasTarget=true;}
  }
  const old=s.guards.map(g=>({x:g.x,y:g.y}));
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(f>=delay*60&&!arrived&&Math.hypot(s.player.x-points[leg].x*TILE,s.player.y-points[leg].y*TILE)<2){arrived=true;wait=points[leg].wait??0;if(wait<=0&&leg<points.length-1){leg++;arrived=false;}}
  if(s.mission.treasure&&pickup===null)pickup=s.t;
  if(s.events.theftAlert&&theft===null)theft=s.t;
  if(s.events.lockdownActive&&lockdown===null)lockdown=s.t;
  if(s.events.spottedWhistleRevision&&spotted===null)spotted=s.t;
  const changed=s.events.phase!==last;
  if(changed){last=s.events.phase;phases.push({phase:last,t:s.t});}
  if(spotted!==null&&(changed||f%15===0))trace.push({t:s.t,phase:s.events.phase,playerSpeed:s.player.speed,guards:s.guards.map((g,i)=>({id:g.id,visible:g.canSee,awareness:g.awareness,speed:Math.hypot(g.x-old[i].x,g.y-old[i].y)*60,distance:Math.hypot(g.x-s.player.x,g.y-s.player.y),target:[g.targetX,g.targetY],lkp:[g.lkpX,g.lkpY]}))});
 }
 return {id,clear:s.mission.complete,caught:s.events.caught,time:s.t,pickup,theft,lockdown,spotted,phases,trace};
}
if(process.argv[1]?.endsWith('chaseMissionQA.ts')){
 const witness=JSON.parse(readFileSync('/tmp/dm-theft-phase-witness.json','utf8'));
 const runs=['01-05','01-07','01-10'].map(id=>{
  const d=campaignStages.find(d=>d.id===id)!;
  const points=id==='01-10'?witness.points:[...d.testRoutes![0].points,...d.escapeRoutes![0].points.slice(1)];
  const mode=id==='01-10'?witness.mode:id==='01-07'?3:2,delay=id==='01-05'?9:id==='01-07'?0:witness.delay;
  return{points,mode,delay,result:missionChaseReplay(id,points,mode,delay)};
 });
 mkdirSync('Reports/ChaseV2',{recursive:true});
 const report={units:'world units/second; 40 units = one tile',source:'actual engine displacement at 60Hz; automated waypoint input, not human Tilt',before:{speeds:{sneak:38,walk:72,run:150,normal:52,theft:65,direct:116,support:88},straightGaps:[280,448.76666666667813,618.7666666666762]},after:{speeds:measureSpeeds(),straight:straightChase(),corner:cornerEscape(),museumCorridor:museumCorridorPursuit()},runs};
 writeFileSync('Reports/ChaseV2/engine-measurements.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({...report,runs:runs.map(r=>({...r.result,trace:undefined}))},null,2));
}

/** Explicit seeded pursuit fixture in unchanged 01-10 geometry, not a spawn-to-exit witness. */
export function museumCorridorPursuit(){
 const stage=compileStage(campaignStages.find(d=>d.id==='01-10')!),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const g=s.guards[0];s.guards=[g];s.guardPlayback=[s.guardPlayback[0]];
 Object.assign(g,{x:580,y:60,facing:Math.PI/2,baseFacing:Math.PI/2,speed:0,awareness:Awareness.Chase,path:[],pathIndex:0,repathAt:0});
 Object.assign(s.player,{x:580,y:180,vx:0,vy:0,speed:0,facing:Math.PI/2});
 s.events.globalAlert=true;s.events.globalRevision=1;s.mission.enabled=false;
 const points=[[580,400],[400,400]];let leg=0,firstBreak:number|null=null;
 const trace:{t:number;gap:number;visible:boolean;playerSpeed:number;guardSpeed:number;movingAway:number}[]=[];
 for(let f=0;f<720&&!s.events.caught;f++){
  s.playerMode=3;s.player.tx=points[leg][0];s.player.ty=points[leg][1];s.player.hasTarget=true;
  const bx=g.x,by=g.y;
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1)leg++;
  if(!g.canSee&&f>30)firstBreak=s.t;
  if(f%30===29||firstBreak!==null)trace.push({t:s.t,gap:Math.hypot(s.player.x-g.x,s.player.y-g.y),visible:g.canSee,playerSpeed:s.player.speed,guardSpeed:Math.hypot(g.x-bx,g.y-by)*60,movingAway:s.player.vx*(s.player.x-g.x)+s.player.vy*(s.player.y-g.y)});
  if(firstBreak!==null)break;
 }
 return{source:'seeded positions and global Chase, one real guard, normal176vision, actual01-10 geometry; no authored map/guard edits',initialGap:120,caught:s.events.caught,firstBreak,trace};
}
