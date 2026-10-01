/** Actual Gallery collision/LOS geometry and player/guard engine. Deliberately staged
 * Spotted starts isolate cover fairness; not a from-spawn mission playthrough or native test. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import campaignStages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {Awareness} from '../../src/game/core/types';
import {BODY} from '../../src/game/guards/guardTuning';
import {directChaseSpeed} from '../../src/game/guards/guardChaseSpeed';

export function galleryCoverEscape(mission:number){
 const id=`02-${String(mission).padStart(2,'0')}`;
 const def=campaignStages.find(stage=>stage.id===id) as StageDefinition|undefined;
 if(!def)throw Error(`Missing baked runtime stage ${id}`);
 const stage=compileStage(def);
 const pnav=buildNavigation(stage,BODY.playerRadius),gnav=buildNavigation(stage,BODY.guardRadius);
 const blockers=stage.visionBlockers;
 let attempts=0;
 const failedCases:{start:{x:number;y:number};guard:{x:number;y:number};end:{x:number;y:number};caught:boolean;states:number[];firstBreak:number|null;wrongHiddenUpdates:number;collisionSamples:number}[]=[];
 // Authored exhibit blockers only: test both horizontal escape shoulders and vertical counterparts.
 for(let b=0;b<blockers.length;b+=4){
  const [x0,y0,x1,y1]=blockers.slice(b,b+4);
  // 06 central viewing court; 10 Masterpiece Court, rather than an unrelated entry wall.
  if(mission===6&&(x0<360||x1>760||y0<240||y1>800))continue;
  if(mission===10&&(x0<560||y1>440))continue;
  if(x0<40||y0<40||x1>stage.width-40||y1>stage.height-40||x1-x0>180||y1-y0>180)continue;
  for(const swap of [false,true])for(const sign of [-1,1])for(const edgeMargin of [35,60,90])for(const endMargin of [65,110])for(const distance of [90,120,160,220,280]){
   const start=swap?{x:x0-edgeMargin,y:y1+distance}:{x:x1+distance,y:y0-edgeMargin};
   const guard=swap?{x:x0-edgeMargin,y:y0-distance}:{x:x0-distance,y:y0-edgeMargin};
   const end=swap?{x:x1+endMargin,y:y1+distance}:{x:x1+distance,y:y1+endMargin};
   if(sign===-1){if(swap){start.x=x1+edgeMargin;guard.x=x1+edgeMargin;end.x=x0-endMargin;}else{start.y=y1+edgeMargin;guard.y=y1+edgeMargin;end.y=y0-endMargin;}}
   const valid=[start,guard,end].every(p=>clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.playerRadius));
   if(!valid||!clearSegment(guard.x,guard.y,start.x,start.y,blockers)||clearSegment(guard.x,guard.y,end.x,end.y,blockers))continue;
   const path=findPath(pnav,start.x,start.y,end.x,end.y);
   if(!path.length||Math.hypot(path.at(-2)!-end.x,path.at(-1)!-end.y)>1)continue;
   if(mission===10){
    // Keep escaping after the first chamber cover instead of waiting at its exposed shoulder.
    const exit={x:stage.exit.x+stage.exit.w/2,y:stage.exit.y+stage.exit.h/2};
    const onward=findPath(pnav,end.x,end.y,exit.x,exit.y);
    if(!onward.length)continue;path.push(...onward);
   }
   attempts++;
   const s=createPlaygroundState(stage),g=s.guards[0];s.guards=[g];
   s.theft.roles=s.theft.roles?.slice(0,1);s.theft.posts=s.theft.posts.slice(0,1);s.theft.empty=true;
   s.events.theftAlert=true;s.events.theftRevision=1;s.events.globalAlert=true;s.events.globalRevision=1;
   s.events.globalX=start.x;s.events.globalY=start.y;
   g.x=guard.x;g.y=guard.y;g.awareness=Awareness.Chase;g.speed=directChaseSpeed(def.id);g.facing=Math.atan2(start.y-guard.y,start.x-guard.x);g.baseFacing=g.facing;g.visionRange=1000;
   s.player.x=start.x;s.player.y=start.y;s.playerMode=3;
   let firstBreak:number|null=null,firstPhysicalLosBreak:number|null=null,hiddenSamples=0,wrongHiddenUpdates=0,collisionSamples=0,peakActualSpeed=0,leg=0;
   const states=new Set<number>(),samples=[];
   for(let f=0;f<45*60&&!s.events.caught;f++){
    s.player.tx=path[leg];s.player.ty=path[leg+1];s.player.hasTarget=true;
    const previousHidden=!g.canSee,lx=s.events.globalX,ly=s.events.globalY,gx=g.x,gy=g.y;
    stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,gnav);
    peakActualSpeed=Math.max(peakActualSpeed,Math.hypot(g.x-gx,g.y-gy)*60);states.add(g.awareness);
    if(!clearSegment(g.x,g.y,s.player.x,s.player.y,stage.visionBlockers))firstPhysicalLosBreak??=s.t;
    if(Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<path.length-2)leg+=2;
    if(!g.canSee&&f>1){firstBreak??=s.t;hiddenSamples++;if(previousHidden&&(lx!==s.events.globalX||ly!==s.events.globalY))wrongHiddenUpdates++;}
    if(!clearSegment(g.x,g.y,g.x,g.y,stage.movementBlockers,BODY.guardRadius))collisionSamples++;
    if(f%60===59)samples.push({time:s.t,x:s.player.x,y:s.player.y,guardX:g.x,guardY:g.y,state:g.awareness,visible:g.canSee});
    if(states.has(Awareness.Search))break;
   }
   if(!s.events.caught&&states.has(Awareness.Search)&&firstPhysicalLosBreak!==null&&wrongHiddenUpdates===0&&collisionSamples===0){
    return {id:def.id,passed:true,attempts,failedCases,blocker:[x0,y0,x1,y1],start,guard,end,path,firstBreak,firstPhysicalLosBreak,hiddenSamples,wrongHiddenUpdates,collisionSamples,peakActualSpeed,states:[...states],caught:s.events.caught,samples};
   }
   failedCases.push({start,guard,end,caught:s.events.caught,states:[...states],firstBreak,wrongHiddenUpdates,collisionSamples});
  }
 }
 return {id:def.id,passed:false,attempts,failedCases};
}
if(process.argv[1]?.endsWith('galleryChaseEscapeQA.ts')){
 const results=[6,10].map(galleryCoverEscape),out=process.env.OUT_JSON??'Reports/GalleryEnrichmentV1/chase-cover-qa.json';
 fs.mkdirSync(out.slice(0,out.lastIndexOf('/')),{recursive:true});
 fs.writeFileSync(out,JSON.stringify({bakedStagesSha256:createHash('sha256').update(JSON.stringify(campaignStages)).digest('hex'),method:'Actual Gallery geometry and continuous Run navigation around an authored LOS blocker after a deliberately staged Theft/Spotted start, single authored guard already at full Direct Chase speed178. No teleport after start. This isolates cover fairness, not full mission/natural theft or native testing. Search includes alternative clear shoulders around the same central/chamber blockers; unsuccessful valid starts are recorded, not claimed safe.',results},null,2)+'\n');
 console.log(JSON.stringify(results));if(results.some(r=>!r.passed))process.exitCode=1;
}
