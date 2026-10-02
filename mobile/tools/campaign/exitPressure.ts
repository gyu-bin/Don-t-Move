/** QA: after a theft with the thief hidden, how much of the next 60s is the exit watched?
 *  Usage: node --import tsx tools/campaign/exitPressure.ts <stages.json> <id...> */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {pointVisible} from '../../src/game/guards/guardVision';
import {BODY} from '../../src/game/guards/guardTuning';
const [file,...ids]=process.argv.slice(2);
const stages=JSON.parse(fs.readFileSync(file,'utf8')) as StageDefinition[];
for(const id of ids){
 const def=stages.find(s=>s.id===id)!,stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const hidden={x:-9999,y:-9999,gait:0},ex=stage.exit,ecx=ex.x+ex.w/2,ecy=ex.y+ex.h/2;
 s.theft.empty=true;let t=0,alertAt=-1,seen=0,near=0,frames=0,longestGap=0,gap=0,moving=0;
 while(t<200&&(alertAt<0||t<alertAt+60)){
  t+=1/60;stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,t,true,1,s.theft);
  if(alertAt<0){if(s.events.theftAlert)alertAt=t;continue;}
  frames++;const watched=s.guards.some(g=>pointVisible(g,ecx,ecy,stage.visionBlockers));
  if(watched){seen++;gap=0;}else{gap+=1/60;longestGap=Math.max(longestGap,gap);}
  if(s.guards.some(g=>Math.hypot(g.x-ecx,g.y-ecy)<200))near++;
  moving+=s.guards.filter(g=>g.speed>1).length/s.guards.length;
 }
 console.log(id,'alert at',alertAt.toFixed(1),'| exit in a guard cone',(seen*100/frames).toFixed(0)+'%','| guard within 5 tiles of exit',(near*100/frames).toFixed(0)+'%','| longest unwatched gap',longestGap.toFixed(1)+'s','| guards moving',(moving*100/frames).toFixed(0)+'%');
}
