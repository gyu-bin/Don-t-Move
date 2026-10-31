/** Offline observation of the existing exit camera. No game-time work added. */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {createSecurityCamera,stepSecurityCameras} from '../../src/game/security/cctv';
import {createGuardEvents} from '../../src/game/guards/guardBrain';

export const VAULT_EXIT_PROBES=[
 {name:'behind lobby wall',x:24,y:22.5},
 {name:'east-stair doorway',x:25.5,y:21.5},
 {name:'exposed exit approach',x:25,y:22.5},
 {name:'exit centre',x:26.8,y:24},
] as const;

/** Each point gets a fresh identical sweep; stationary gait is intentional.
 * These are camera-only observation windows, not guaranteed safe crossings. */
export function exitCameraWindows(def:StageDefinition,seconds=60){
 const stage=compileStage(def);
 const source=stage.cameras?.find(c=>c.id==='09-05-cam2');
 if(!source||!Number.isFinite(seconds)||seconds<=0)throw Error('Expected final Vault camera and positive duration');
 const frames=Math.ceil(seconds*60),round=(n:number)=>+n.toFixed(4);
 return VAULT_EXIT_PROBES.map(p=>{
  const camera=createSecurityCamera(source),events=createGuardEvents(),player={x:p.x*TILE,y:p.y*TILE,gait:0};
  let seen=0,clear=0,longestClear=0,firstAlert:number|null=null;
  for(let f=0;f<frames;f++){
   stepSecurityCameras([camera],player,stage.visionBlockers,events,1/60,(f+1)/60);
   seen+=camera.canSee?1:0;clear=camera.canSee?0:clear+1/60;longestClear=Math.max(longestClear,clear);
   if(events.cameraAlertRevision&&firstAlert===null)firstAlert=round((f+1)/60);
  }
  return {...p,visibleFraction:round(seen/frames),longestUnwatchedSeconds:round(longestClear),
   stationaryAlertSeconds:firstAlert,hasPlayerLocation:camera.hasLastKnown};
 });
}
