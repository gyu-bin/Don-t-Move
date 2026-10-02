import {freshSample} from './tilt';
import type {AttitudeSample} from './tilt';
type Timer=ReturnType<typeof setTimeout>;
export const MOTION_PERMISSION_TIMEOUT_MS=8000;
type PermissionResult={status:'granted'|'denied'|'timeout'|'error'|'cancelled';message?:string};
/** Timing out ends only this JS attempt. It never grants permission, starts
 * sensors, dismisses the OS prompt, or accepts a result from a stale Retry.
 */
export function requestMotionPermission(request:()=>Promise<{granted:boolean}>,timeoutMs=MOTION_PERMISSION_TIMEOUT_MS){
 let settled=false,finish:(value:PermissionResult)=>void=()=>{};
 const result=new Promise<PermissionResult>(resolve=>{
  const timer=setTimeout(()=>finish({status:'timeout'}),timeoutMs);
  finish=value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);};
  try{void request().then(value=>finish({status:value.granted?'granted':'denied'}),error=>finish({status:'error',message:String(error)}));}
  catch(error){finish({status:'error',message:String(error)});}
 });
 return{result,cancel:()=>finish({status:'cancelled'})};
}
type Options={
 start():Promise<void>;stop():Promise<void>;isCalibrating():boolean;
 onCalibrationStart():void;onSample(value:AttitudeSample):void;onActive(value:boolean):void;onError(message:string):void;
 now?:()=>number;setTimer?:(callback:()=>void,ms:number)=>Timer;clearTimer?:(timer:Timer)=>void;
};
/** Core Motion's arbitrary reference changes after stop/start. Only unfinished
 * calibration may reconnect automatically; PLAY requires an explicit user Retry.
 */
export function createIOSTiltSession(options:Options){
 const now=options.now??Date.now,schedule=options.setTimer??setTimeout,cancel=options.clearTimer??clearTimeout;
 let disposed=false,foreground=false,running=false,started=false,token=0,reconnected=false,wanted=false,pausedCalibration=false;
 let watchdog:Timer|null=null,lastTimestamp=-1,lastValidAt=0,publishedActive:boolean|null=null,publishedError:string|null=null;
 const publishActive=(value:boolean)=>{if(value!==publishedActive){publishedActive=value;options.onActive(value);}};
 const publishError=(message:string)=>{if(message!==publishedError){publishedError=message;options.onError(message);}};
 const clear=()=>{if(watchdog!==null)cancel(watchdog);watchdog=null;};
 const valid=(generation:number)=>!disposed&&foreground&&generation===token;
 const stop=()=>{void options.stop().catch(()=>{});};
 const fail=(message:string)=>{if(disposed)return;token++;clear();running=false;wanted=false;publishActive(false);publishError(message);stop();};
 function arm(generation:number){
  clear();watchdog=schedule(()=>{
   watchdog=null;
   if(!valid(generation))return;
   if(now()-lastValidAt<1500){arm(generation);return;}
   if(options.isCalibrating()&&!reconnected){
    reconnected=true;token++;running=false;publishActive(false);
    void connect(false,true);
   }else fail('Motion updates unavailable · RETRY SENSOR or Recenter');
  },Math.max(1,1500-(now()-lastValidAt)));
 }
 async function connect(resetCalibration:boolean,reconnect=false){
  const generation=++token;started=true;wanted=true;lastTimestamp=-1;lastValidAt=now();
  if(resetCalibration)options.onCalibrationStart();
  // Deadline starts before the native promise: a hung start cannot hide the UI forever.
  arm(generation);
  try{
   if(reconnect){await options.stop();if(!valid(generation))return;}
   await options.start();
   if(!valid(generation))return;
   running=true;publishActive(true);publishError('');
  }catch(error){if(valid(generation))fail(String(error));}
 }
 function receive(value:AttitudeSample){
  if(disposed||!wanted||!foreground||!freshSample(value,now())||value.timestamp<=lastTimestamp)return;
  lastTimestamp=value.timestamp;lastValidAt=now();running=true;
  options.onSample(value);publishActive(true);publishError('');if(watchdog===null)arm(token);
 }
 function setAppState(state:string){
  if(disposed)return;
  const active=state==='active';
  if(active===foreground && state!=='background')return;
  foreground=active;
  if(state==='background'){
   pausedCalibration=options.isCalibrating();
   token++;clear();running=false;wanted=false;publishActive(false);stop();
   if(!pausedCalibration)publishError('Sensor session ended · RETRY SENSOR to recalibrate');
  }else if(!active){clear();publishActive(false);}
  else if(running){publishActive(true);lastValidAt=now();arm(token);}
  else if(!started||pausedCalibration||options.isCalibrating()){
   pausedCalibration=false;reconnected=false;void connect(true);
  }
 }
 function dispose(){disposed=true;token++;clear();running=false;wanted=false;publishActive(false);stop();}
 return {receive,setAppState,fail,dispose};
}
