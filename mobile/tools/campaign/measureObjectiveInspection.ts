import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {pointVisible} from '../../src/game/guards/guardVision';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
export function measureObjectiveInspection(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage),hidden={x:-1000,y:-1000,gait:0};
 let visibleFrames=0,blindFrames=0,firstSeen:number|null=null;const inspectGuardFrames:Record<string,number>={};
 for(let frame=0;frame<2700;frame++){
  stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,frame/60,true,1,s.theft);
  const guards=s.guards.filter(g=>pointVisible(g,stage.objective.x,stage.objective.y,stage.visionBlockers));
  if(guards.length){visibleFrames++;firstSeen??=frame/60;for(const g of guards)inspectGuardFrames[g.id]=(inspectGuardFrames[g.id]??0)+1;}else blindFrames++;
 }
 return{mission:def.id,method:'Actual shared Guard AI 45s at60Hz, Player outside perception. Objective point LOS/cone measured each frame; offline, not Simulator.',firstSeen,visibleSeconds:visibleFrames/60,blindSeconds:blindFrames/60,inspectGuardFrames};
}
