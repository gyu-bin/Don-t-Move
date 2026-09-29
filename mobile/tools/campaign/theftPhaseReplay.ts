import {writeFileSync} from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {findWitness} from './museumPlaythrough';
export interface ReplayPoint {x:number;y:number;wait?:number;mode?:number;}
export function replay(id:string,points:ReplayPoint[],mode:number,delay:number){
 const def=campaignStages.find(d=>d.id===id)!,stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 let leg=1,wait=0,arrived=false,pickup:number|null=null,theft:number|null=null,lockdown:number|null=null,spotted:number|null=null;
 const phases:{phase:string;t:number}[]=[];let last='';
 for(let f=0;f<60*150&&!s.events.caught&&!s.mission.complete;f++){
  s.playerMode=0;s.player.hasTarget=false;
  if(f>=delay*60){
   if(wait>0){wait-=1/60;if(wait<=0&&leg<points.length-1){leg++;arrived=false;}}
   else if(!arrived){const p=points[leg];s.playerMode=p.mode??mode;s.player.tx=p.x*TILE;s.player.ty=p.y*TILE;s.player.hasTarget=true;}
  }
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(f>=delay*60&&!arrived&&Math.hypot(s.player.x-points[leg].x*TILE,s.player.y-points[leg].y*TILE)<2){arrived=true;wait=points[leg].wait??0;if(wait<=0&&leg<points.length-1){leg++;arrived=false;}}
  if(s.mission.treasure&&pickup===null)pickup=s.t;
  if(s.events.theftAlert&&theft===null)theft=s.t;
  if(s.events.lockdownActive&&lockdown===null)lockdown=s.t;
  if(s.events.spottedWhistleRevision&&spotted===null)spotted=s.t;
  if(s.events.phase!==last){last=s.events.phase;phases.push({phase:last,t:s.t});}
 }
 return {id,clear:s.mission.complete,caught:s.events.caught,time:s.t,leg,pickup,theft,lockdown,spotted,theftWhistle:s.events.theftWhistleRevision,spottedWhistle:s.events.spottedWhistleRevision,phases,x:s.player.x/TILE,y:s.player.y/TILE};
}
if(process.argv[1]?.endsWith('theftPhaseReplay.ts')){
 if(process.argv.includes('--standard')){
  for(const id of ['01-03','01-05','01-07','01-09']){
   const d=campaignStages.find(d=>d.id===id)!;const w=findWitness(d,0);console.log(JSON.stringify({id,...w}));
  }
 }else{
  const d=campaignStages.find(d=>d.id==='01-10')!;let attempts=0,best=0;
  outer:for(const route of [0,1])for(const escape of [0,1])for(const mode of [3,2])for(const delay of [0,2,3,5,7,9,11,14,20,28])for(const waitLegOffset of [2,3,4,5,6,7])for(const duration of [23,30]){
   const points:ReplayPoint[]=[...d.testRoutes![route].points.map(p=>({...p})),...d.escapeRoutes![escape].points.slice(1).map(p=>({...p}))];
   const waitLeg=d.testRoutes![route].points.length-1+waitLegOffset;if(waitLeg>=points.length-1)continue;points[waitLeg].wait=duration;
   const r=replay(d.id,points,mode,delay);attempts++;
   const rank=(r.theft!==null?1:0)+(r.lockdown!==null?2:0)+(r.clear?2:0)+(r.spotted!==null&&r.lockdown!==null&&r.spotted>=r.lockdown?4:0);
   if(rank>best){best=rank;console.log(JSON.stringify({attempts,best,route,escape,mode,delay,waitLeg,duration,...r}));}
   if(r.clear&&r.lockdown!==null&&r.spotted!==null&&r.spotted>=r.lockdown){const result={points,mode,delay,route,escape,attempts,result:r};writeFileSync('/tmp/dm-theft-phase-witness.json',JSON.stringify(result,null,2));console.log('FOUND');break outer;}
  }
  console.log({attempts,best});
 }
}
