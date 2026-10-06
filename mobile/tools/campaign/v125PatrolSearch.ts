/** Phase 5 authoring aid for missions whose difficulty cannot be reached by timing alone: tries re-authored patrol
 *  stops inside each guard's own room (and a farther objective-guard away post) and lists the best by the scripted thief.
 *  Usage: node --import tsx tools/campaign/v125PatrolSearch.ts <id> <target> [json base tuning] */
import {buildV124dCampaign} from './v124dBuild';
import {applyPhase5,PHASE5,type Phase5Tuning} from './v125Tuning';
import {heistMatrix} from './v12Phase5Bot';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
const [id,targetText,baseText]=process.argv.slice(2),target=Number(targetText);
const def=JSON.parse(JSON.stringify(buildV124dCampaign())).find((d:any)=>d.id===id),plan=def.topologyPlan,stage=compileStage(def);
let tuning:Phase5Tuning={...(PHASE5[id]??{note:'search'}),...(baseText?JSON.parse(baseText):{})};
const score=(t:Phase5Tuning)=>{try{const m=heistMatrix(applyPhase5(def,t));return {rate:m.clearRate,safe:m.safeClears,risk:m.riskClears,post:m.caughtAfterPickup};}catch{return null;}};
const cost=(r:{rate:number;safe:number;risk:number})=>Math.abs(r.rate-target)+(r.safe&&r.risk?0:.06);
const clear=(x:number,y:number)=>stage.grid[Math.floor(y)*stage.cols+Math.floor(x)]===1&&clearSegment(x*TILE,y*TILE,x*TILE,y*TILE,stage.movementBlockers,14);
let best=score(tuning)!;console.log(id,'start',JSON.stringify(best),JSON.stringify(tuning));
const objectiveIndex=def.guards.findIndex((g:any)=>g.role==='objective');
for(let pass=0;pass<2;pass++)for(let gi=0;gi<def.guards.length;gi++){
 const roomId=gi===objectiveIndex?plan.objectiveRoom:plan.patrols?.[gi%plan.patrols.length]?.room,room=plan.rooms.find((r:any)=>r.id===roomId);if(!room)continue;
 const pts:{x:number;y:number}[]=[];
 for(let y=room.y+1.25;y<=room.y+room.h-1.25;y+=1.5)for(let x=room.x+1.25;x<=room.x+room.w-1.25;x+=1.5)if(clear(x,y))pts.push({x:+x.toFixed(2),y:+y.toFixed(2)});
 let improved=false;
 if(gi===objectiveIndex){
  // Also consider posts just outside the chamber, up to 4 tiles beyond it.
  for(let y=room.y-3;y<=room.y+room.h+3;y+=1.5)for(let x=room.x-3;x<=room.x+room.w+3;x+=1.5)if(clear(x,y)&&!pts.some(p=>p.x===+x.toFixed(2)&&p.y===+y.toFixed(2)))pts.push({x:+x.toFixed(2),y:+y.toFixed(2)});
  for(const away of pts){if(Math.hypot(away.x-def.objective.x,away.y-def.objective.y)<2.5)continue;const t={...tuning,objectiveAway:away},r=score(t);if(r&&cost(r)<cost(best)-1e-6){best=r;tuning=t;improved=true;}}
 }else for(const a of pts)for(const b of pts){
  if(Math.hypot(a.x-b.x,a.y-b.y)<2.5)continue;
  const t={...tuning,patrol:{...(tuning.patrol??{}),[gi]:[a,b]}},r=score(t);if(r&&cost(r)<cost(best)-1e-6){best=r;tuning=t;improved=true;}
 }
 console.log(id,'guard',gi+1,improved?'improved →':'kept     ',JSON.stringify(best),JSON.stringify({patrol:tuning.patrol,objectiveAway:tuning.objectiveAway}));
 if(Math.abs(best.rate-target)<=.05&&best.safe&&best.risk)break;
}
console.log(id,'FINAL',JSON.stringify(best),JSON.stringify(tuning));
