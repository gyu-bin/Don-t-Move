/** V5 continuous route inputs. Deliberate exposure and neutral cover waits are player inputs. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {Awareness} from '../../src/game/core/types';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {V5_MG_PLANS} from './v5MuseumGalleryPlans';
import {v5MGRoute} from './v5MuseumGallery';
export type V5MGScenario={route:number;escape:number;mode:number;delay:number;peekCycles?:number;objectiveHold?:number;hideIndex?:number;hideHold?:number};
export function playV5MG(def:StageDefinition,scenario:V5MGScenario){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 const approach=def.testRoutes![scenario.route].points,escape=def.escapeRoutes![scenario.escape].points.slice(1);let points=[...approach];let peekEnd=-1,hideLeg=-1;
 if(scenario.peekCycles){const corner=escape.find(p=>Math.hypot(p.x-def.objective!.x,p.y-def.objective!.y)>2.5)!;for(let i=0;i<scenario.peekCycles;i++)points.push(...v5MGRoute(def,[def.objective!,corner,def.objective!]).slice(1));peekEnd=points.length;}
 if(scenario.hideIndex!==undefined){const hide=V5_MG_PLANS[def.id].hide[scenario.hideIndex],path=v5MGRoute(def,[def.objective!,hide]);points.push(...path.slice(1));hideLeg=points.length-1;points.push(...v5MGRoute(def,[hide,escape[0]]).slice(1));}
 points.push(...escape);let leg=1,waitUntil=0,hideWaitUsed=false,pickupAt:number|null=null,theftAt:number|null=null,spottedAt:number|null=null,losBreakAt:number|null=null,searchAt:number|null=null,saw=false,maxSuspicion=0,collisions=0;
 const events:{event:string;at:number;source?:string;guardIds?:string[];cameraIds?:string[]}[]=[],cameras=s.securityCameras.map(c=>({id:c.id,maxSuspicion:0,seenSeconds:0,alertRevision:0,hasLastKnown:false}));
 const trace=(event:string,source?:string)=>events.push({event,at:Math.round(s.t*1000)/1000,source,guardIds:s.guards.filter(g=>g.canSee).map(g=>g.id),cameraIds:s.securityCameras.filter(c=>c.canSee).map(c=>c.id)});
 for(let f=0;f<10800&&!s.events.caught&&!s.mission.complete;f++){
  if(s.events.globalAlert&&peekEnd>0&&leg<peekEnd){leg=peekEnd;trace('INPUT_LOS_ESCAPE');}
  const holding=s.t<waitUntil||pickupAt!==null&&s.t<pickupAt+(scenario.objectiveHold??0);
  const issued=f>=scenario.delay*60&&!holding;
  if(holding){s.playerMode=0;s.player.hasTarget=false;}
  if(issued){const p=points[leg];if(!p)break;s.playerMode=scenario.mode;s.player.tx=p.x*TILE;s.player.ty=p.y*TILE;s.player.hasTarget=true;}
  const before={x:s.player.x,y:s.player.y};
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(!clearSegment(before.x,before.y,s.player.x,s.player.y,stage.movementBlockers,BODY.playerRadius))collisions++;
  cameras.forEach((c,i)=>{const source=s.securityCameras[i];c.maxSuspicion=Math.max(c.maxSuspicion,source.suspicion);c.seenSeconds+=source.canSee?1/60:0;c.alertRevision=source.alertRevision;c.hasLastKnown=source.hasLastKnown;});
  if(s.mission.treasure&&pickupAt===null){pickupAt=s.t;trace('OBJECTIVE');}
  if(s.events.theftAlert&&theftAt===null){theftAt=s.t;trace('THEFT_ALERT',s.events.theftGuard);}
  if(s.events.globalAlert&&spottedAt===null){spottedAt=s.t;trace('PLAYER_SPOTTED',s.events.spottedSource||s.events.cameraAlertSource||s.events.whistleGuard);}
  const seen=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
  if(saw&&!seen&&spottedAt!==null&&losBreakAt===null){losBreakAt=s.t;trace('LOS_BREAK');}
  if(spottedAt!==null&&losBreakAt!==null&&s.guards.some(g=>g.awareness===Awareness.Search)&&searchAt===null){searchAt=s.t;trace('GUARD_SEARCH_ACTIVE');}
  saw=seen;maxSuspicion=Math.max(maxSuspicion,...s.guards.map(g=>g.suspicion));
  if(issued&&Math.hypot(s.player.x-s.player.tx,s.player.y-s.player.ty)<2&&leg<points.length-1){if(leg===hideLeg&&!hideWaitUsed){hideWaitUsed=true;waitUntil=s.t+(scenario.hideHold??0);trace('INPUT_NEUTRAL_COVER_WAIT');}leg++;}
 }
 if(s.events.caught)trace('CAUGHT',s.events.caughtBy);if(s.mission.complete)trace('COMPLETE');
 return {...scenario,clear:s.mission.complete,caught:s.events.caught,time:s.t,pickupAt,theftAt,spottedAt,losBreakAt,searchAt,maxSuspicion,collisions,cameras,events};
}
if(process.argv[1]?.endsWith('v5MuseumGalleryReplay.ts')){
 const defs=(JSON.parse(readFileSync(process.env.CAMPAIGN_JSON??'Reports/LevelDesignV5/mg-candidate.json','utf8'))as StageDefinition[]).filter(d=>!!V5_MG_PLANS[d.id]&&(!process.env.MISSION_IDS||process.env.MISSION_IDS.split(',').includes(d.id))),out:{id:string;sourceSha256:string;attempts:number;theftFound:boolean;spottedLOSFound:boolean;theft:ReturnType<typeof playV5MG>|null;spotted:ReturnType<typeof playV5MG>|null;failures:ReturnType<typeof playV5MG>[]}[]=[];
 for(const def of defs){
  let theft:ReturnType<typeof playV5MG>|null=null,spotted:ReturnType<typeof playV5MG>|null=null,attempts=0;const failures=[];
  for(const delay of Array.from({length:41},(_,i)=>i)){for(const escape of [0,1]){for(const hold of [0,8,16]){
   const base={route:0,escape,mode:2,delay,objectiveHold:hold};let result=playV5MG(def,base);attempts++;
   if(result.clear&&result.theftAt!==null&&!theft)theft=result;
   if(result.pickupAt!==null&&result.spottedAt!==null&&result.spottedAt>result.pickupAt&&result.losBreakAt!==null&&!spotted)spotted=result;
   if(!spotted){result=playV5MG(def,{...base,mode:3,objectiveHold:0,peekCycles:4});attempts++;if(result.pickupAt!==null&&result.spottedAt!==null&&result.spottedAt>result.pickupAt&&result.losBreakAt!==null)spotted=result;}
   if(result.caught&&failures.length<3)failures.push(result);
   if(theft&&spotted)break;
  }if(theft&&spotted)break;}if(theft&&spotted)break;}
  if(!theft){
   const routeReport=JSON.parse(readFileSync('Reports/LevelDesignV5/museum-gallery-gameplay.json','utf8')).replays.find((r:{id:string})=>r.id===def.id);
   for(const w of routeReport.routes){if(w.found&&w.theft){const result=playV5MG(def,{route:w.routeIndex,escape:w.escapeIndex,mode:w.mode,delay:w.departureDelaySeconds});attempts++;if(result.clear&&result.theftAt!==null){theft=result;break;}}}
  }
  if(!theft)outer:for(const route of [1,2])for(const mode of [3,2])for(const delay of Array.from({length:41},(_,i)=>i))for(const escape of [0,1]){
   const result=playV5MG(def,{route,mode,delay,escape});attempts++;if(result.clear&&result.theftAt!==null){theft=result;break outer;}
  }
  const row={id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),attempts,theftFound:!!theft,spottedLOSFound:!!spotted,theft,spotted,failures};out.push(row);console.log(JSON.stringify({id:def.id,attempts,theftFound:row.theftFound,spottedLOSFound:row.spottedLOSFound,theftClear:theft?.clear,spottedClear:spotted?.clear}));
 }
 const previous=process.env.MISSION_IDS?JSON.parse(readFileSync('Reports/LevelDesignV5/mg-transition-witnesses.json','utf8')).missions:[];const merged=previous.filter((r:{id:string})=>!out.some(o=>o.id===r.id)).concat(out).sort((a:{id:string},b:{id:string})=>a.id.localeCompare(b.id));
 writeFileSync('Reports/LevelDesignV5/mg-transition-witnesses.json',JSON.stringify({missions:merged,limits:['No events or sensors forced. Every transition comes from real continuous target-input and actual sight/empty-case AI.','Spotted→LOS break witness may end in capture later; it proves transition/escape-leg mechanics, not a complete stealth route.','Shared temporal fixture separately records 60s theft search and phase footprints.']},null,2));
}
