/** QA: after a theft with the thief hidden, how many guards stand on the last stretch of the escape route?
 *  Usage: node --import tsx tools/campaign/escapeCrowding.ts <stages.json> <id...> */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {BODY} from '../../src/game/guards/guardTuning';
const [file,...ids]=process.argv.slice(2);
const stages=JSON.parse(fs.readFileSync(file,'utf8')) as StageDefinition[];
for(const id of ids){
 const def=stages.find(s=>s.id===id)!,stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 // Last 12 tiles of the authored escape route.
 const pts=def.escapeRoutes![0].points.map(p=>({x:p.x*TILE,y:p.y*TILE})),tail=[pts.at(-1)!];let len=0;
 for(let i=pts.length-2;i>=0&&len<12*TILE;i--){len+=Math.hypot(pts[i].x-pts[i+1].x,pts[i].y-pts[i+1].y);tail.push(pts[i]);}
 const onTail=(g:{x:number;y:number})=>{for(let i=1;i<tail.length;i++){const a=tail[i-1],b=tail[i],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((g.x-a.x)*dx+(g.y-a.y)*dy)/l));if(Math.hypot(g.x-a.x-dx*t,g.y-a.y-dy*t)<4*TILE)return true;}return false;};
 const hidden={x:-9999,y:-9999,gait:0};s.theft.empty=true;let t=0,alertAt=-1,frames=0,sum=0,peak=0,three=0;
 while(t<200&&(alertAt<0||t<alertAt+60)){
  t+=1/60;stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,t,true,1,s.theft);
  if(alertAt<0){if(s.events.theftAlert)alertAt=t;continue;}
  const n=s.guards.filter(onTail).length;frames++;sum+=n;peak=Math.max(peak,n);if(n>=3)three++;
 }
 console.log(id,'guards',def.guards.length,'| on last 12 tiles of escape: average',(sum/frames).toFixed(1),'peak',peak,'| 3+ guards',(three*100/frames).toFixed(0)+'% of the time');
}
