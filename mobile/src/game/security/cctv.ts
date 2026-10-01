import type { SecurityCameraDef } from '../levels/StageDefinition';
import type { GuardEvents, PlayerView } from '../guards/guardBrain';
import {buildVisionFan,createFanBuffers,pointVisible} from '../guards/guardVision';
import type {VisionFan} from '../guards/guardVision';
import {clamp,wrapAngle} from '../core/math';
import {GUARD_TUNING as T} from '../guards/guardTuning';
/** Explicit asset slot: intentionally silent until a reviewed production SFX exists. */
export const CAMERA_ALERT_AUDIO_SLOT='camera_alert';
export const CAMERA_ALERT_AUDIO_STATUS='CAMERA_ALERT_SFX_REQUIRED';
export interface CompiledSecurityCamera extends Omit<SecurityCameraDef,'range'> {range:number;}
export interface SecurityCameraState extends VisionFan {
 id:string;centerFacing:number;sweepAngle:number;sweepSpeed:number;pauseAtEnds:number;
 sweepDirection:number;pauseRemaining:number;sweepOffset:number;suspicion:number;suspicionRate:number;
 canSee:boolean;alerted:boolean;lastKnownX:number;lastKnownY:number;hasLastKnown:boolean;
 alertRevision:number;unseenTime:number;detectionGain:number;
}
export function createSecurityCamera(camera:CompiledSecurityCamera):SecurityCameraState {
 return {id:camera.id,x:camera.x,y:camera.y,facing:camera.centerFacing,
  centerFacing:camera.centerFacing,sweepAngle:camera.sweepAngle,sweepSpeed:camera.sweepSpeed,pauseAtEnds:camera.pauseAtEnds,
  sweepDirection:1,pauseRemaining:0,sweepOffset:0,suspicion:0,suspicionRate:camera.suspicionRate??T.baseGain,
  canSee:false,alerted:false,lastKnownX:0,lastKnownY:0,hasLastKnown:false,alertRevision:0,unseenTime:0,detectionGain:0,
  visionRange:camera.range,visionHalfAngle:camera.visionAngle/2,fanCount:0,...createFanBuffers()};
}
/** No navigation, pathfinding, or player-facing tracking. Sweep keeps its authored rhythm. */
export function stepSecurityCameras(cameras:SecurityCameraState[],player:PlayerView,blockers:number[],events:GuardEvents,dt:number,time:number):void {
 'worklet';
 events.cameraSeesPlayer=false;
 for(const camera of cameras){
  if(camera.pauseRemaining>0)camera.pauseRemaining=Math.max(0,camera.pauseRemaining-dt);
  else if(camera.sweepAngle>0&&camera.sweepSpeed>0){
   camera.sweepOffset+=camera.sweepDirection*camera.sweepSpeed*dt;
   if(Math.abs(camera.sweepOffset)>=camera.sweepAngle){camera.sweepOffset=clamp(camera.sweepOffset,-camera.sweepAngle,camera.sweepAngle);camera.sweepDirection*=-1;camera.pauseRemaining=camera.pauseAtEnds;}
  }
  camera.facing=wrapAngle(camera.centerFacing+camera.sweepOffset);
  buildVisionFan(camera,blockers);
  camera.canSee=pointVisible(camera,player.x,player.y,blockers);
  camera.detectionGain=0;
  if(camera.canSee){
   camera.unseenTime=0;
   const gait=clamp(player.gait,0,3),i=Math.min(2,Math.floor(gait));
   const movement=T.movementFactor[i]+(T.movementFactor[i+1]-T.movementFactor[i])*(gait-i);
   const distance=clamp(Math.hypot(player.x-camera.x,player.y-camera.y)/camera.visionRange,0,1);
   const center=clamp(Math.abs(wrapAngle(Math.atan2(player.y-camera.y,player.x-camera.x)-camera.facing))/camera.visionHalfAngle,0,1);
   camera.detectionGain=camera.suspicionRate*movement*(T.distanceFactorNear+(T.distanceFactorFar-T.distanceFactorNear)*distance)*(1+(T.coneFactorEdge-1)*center);
   camera.suspicion=Math.min(1,camera.suspicion+camera.detectionGain*dt);
   if(camera.suspicion>=1&&!camera.alerted){
    camera.alerted=true;camera.alertRevision++;
    events.cameraAlertRevision=(events.cameraAlertRevision??0)+1;events.cameraAlertSource=camera.id;
    events.alertCount++;events.spottedEpisode=true;events.spottedSource=camera.id;events.whistleGuard='';
   }
   if(camera.alerted){
    camera.lastKnownX=player.x;camera.lastKnownY=player.y;camera.hasLastKnown=true;
    if(!events.globalAlert||events.globalX!==player.x||events.globalY!==player.y)events.globalRevision++;
    events.globalAlert=true;events.globalX=player.x;events.globalY=player.y;events.globalT=time;
    events.cameraSeesPlayer=true;events.sawPlayer=true;
   }
  }else{
   camera.unseenTime+=dt;
   if(camera.unseenTime>=T.memorySeconds)camera.suspicion=Math.max(0,camera.suspicion-T.decayPerSecond*dt);
   if(camera.suspicion===0)camera.alerted=false;
  }
 }
}
