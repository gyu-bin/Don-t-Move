import {INTRO_CUES} from './introTimeline';
/** One cancelable cue lifetime. Skip, mute, replay teardown and background share it. */
export function scheduleIntroCues(
 enabled:boolean,emit:(name:typeof INTRO_CUES[number]['name'])=>void,
 schedule:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>=setTimeout,
 clear:(id:ReturnType<typeof setTimeout>)=>void=clearTimeout,
){
 let active=true;
 const timers=enabled?INTRO_CUES.map(c=>schedule(()=>{if(active)emit(c.name);},c.at)):[];
 return()=>{active=false;timers.forEach(clear);};
}
