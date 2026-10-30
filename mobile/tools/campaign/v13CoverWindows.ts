/** QA only: real patrol + CCTV sweeps, with no player to interrupt their normal tour. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createGuardState,createGuardEvents,observeGuard} from '../../src/game/guards/guardBrain';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {createSecurityCamera,stepSecurityCameras} from '../../src/game/security/cctv';
import {pointVisible} from '../../src/game/guards/guardVision';
import {COVER_CHECKPOINTS} from './v13CoverCheckpoints';

export function coverWindows(def:StageDefinition,seconds=180){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius);
 const guards=stage.guards.map(createGuardState),cameras=(stage.cameras??[]).map(createSecurityCamera),events=createGuardEvents();
 const points=COVER_CHECKPOINTS[def.id],longest=points.map(()=>0),current=points.map(()=>0);
 const missingPlayer={x:-10000,y:-10000,gait:0};
 for(let f=0;f<60*seconds;f++){
  stepGuards(guards,missingPlayer,stage.visionBlockers,nav,1/60,events,f/60,true);
  stepSecurityCameras(cameras,missingPlayer,stage.visionBlockers,events,1/60,f/60);
  if(f%6)continue;
  points.forEach((p,i)=>{
   const player={x:p.hidden.x*TILE,y:p.hidden.y*TILE,gait:0};
   const watched=guards.some(g=>{const view={...g};observeGuard(view,player,stage.visionBlockers);return view.canSee;})
    ||cameras.some(c=>pointVisible(c,player.x,player.y,stage.visionBlockers));
   current[i]=watched?0:current[i]+.1;longest[i]=Math.max(longest[i],current[i]);
  });
 }
 return points.map((p,i)=>({structure:p.structure,longestUnwatchedSeconds:+longest[i].toFixed(1)}));
}
