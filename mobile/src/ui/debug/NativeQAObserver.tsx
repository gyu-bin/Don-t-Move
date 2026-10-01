import {useEffect,useState} from 'react';
import {View} from 'react-native';
import {useFrameCallback,useSharedValue} from 'react-native-reanimated';
import type {SharedValue} from 'react-native-reanimated';
import type {PlaygroundState} from '../../game/playground/playgroundState';

type Cadence={frames:number;elapsedMs:number;maxMs:number;over33Ms:number;lastMs:number};
type Props={state:SharedValue<PlaygroundState>;zoom:number;width:number;height:number;paused:boolean;transitioning:boolean;cadence:SharedValue<Cadence>};
const round=(n:number)=>Math.round(n*100)/100;

/** DEV observation only. Own frame counters are separate from the simulation.
 * Native HID tests read this label; every movement still enters via touch input.
 * Callback cadence measures the UI thread, not GPU presentation or device FPS.
 */
export function useNativeQACadence(paused:boolean,transitioning:boolean){
 const cadence=useSharedValue({frames:0,elapsedMs:0,maxMs:0,over33Ms:0,lastMs:0});
 useFrameCallback(frame=>{
  const dt=frame.timeSincePreviousFrame;
  if(dt===null||dt<=0||paused||transitioning)return;
  cadence.modify(value=>{
   'worklet';
   value.frames++;value.elapsedMs+=dt;value.maxMs=Math.max(value.maxMs,dt);
   value.over33Ms+=dt>33.34?1:0;value.lastMs=dt;
   return value;
  });
 },__DEV__);
 return cadence;
}

export function NativeQAObserver({state,zoom,width,height,paused,transitioning,cadence}:Props){
 const [label,setLabel]=useState('NATIVE_QA {}');
 useEffect(()=>{
  const sample=()=>{
   const s=state.get(),p=s.player,c=cadence.get();
   setLabel('NATIVE_QA '+JSON.stringify({
    missionId:s.theft.missionId,time:round(s.t),sampleWallMs:Date.now(),paused,transitioning,
    zoom,dimensions:{width,height,worldWidth:round(width/zoom),worldHeight:round(height/zoom)},
    cam:{x:round(s.cam.x),y:round(s.cam.y)},touchSeq:s.touchSeq,playerMode:s.playerMode,
    player:{x:round(p.x),y:round(p.y),vx:round(p.vx),vy:round(p.vy),speed:round(p.speed),facing:round(p.facing),tx:round(p.tx),ty:round(p.ty),hasTarget:p.hasTarget},
    mission:s.mission,
    events:{caught:s.events.caught,caughtBy:s.events.caughtBy,phase:s.events.phase,alerts:s.events.alertCount,whistles:s.events.whistleCount,lockdown:s.events.lockdownActive,lockdownRemaining:round(s.events.lockdownRemaining),cameraAlertRevision:s.events.cameraAlertRevision??0},
    guards:s.guards.map(g=>({id:g.id,x:round(g.x),y:round(g.y),facing:round(g.facing),speed:round(g.speed),awareness:g.awareness,suspicion:round(g.suspicion),canSee:g.canSee,visionRange:g.visionRange,visionHalfAngle:g.visionHalfAngle})),
    cameras:s.securityCameras.map(c=>({id:c.id,x:round(c.x),y:round(c.y),facing:round(c.facing),suspicion:round(c.suspicion),canSee:c.canSee,alerted:c.alerted,visionRange:c.visionRange,visionHalfAngle:c.visionHalfAngle})),
    uiCallbackCadence:{frames:c.frames,elapsedMs:round(c.elapsedMs),hz:c.elapsedMs?round(c.frames*1000/c.elapsedMs):0,meanMs:c.frames?round(c.elapsedMs/c.frames):0,maxMs:round(c.maxMs),over33Ms:c.over33Ms,lastMs:round(c.lastMs)},
   }));
  };
  sample();const timer=setInterval(sample,250);return()=>clearInterval(timer);
 },[state,cadence,zoom,width,height,paused,transitioning]);
 return <View accessible collapsable={false} pointerEvents="none" accessibilityLabel={label} testID="native-qa-observer"
  style={{position:'absolute',left:0,top:0,width:1,height:1,backgroundColor:'transparent'}}/>;
}
