import { scheduleIntroCues } from './introCues';
import type { INTRO_CUES } from './introTimeline';

type Cue=typeof INTRO_CUES[number]['name'];
export type BrandSound=Cue|'ambience';
export interface BrandPlayer {
 volume:number;loop:boolean;
 play():void;pause():void;seekTo(seconds:number):Promise<void>;release():void;
}
export interface BrandClock {
 later:typeof setTimeout;cancelLater:typeof clearTimeout;
 repeat:typeof setInterval;cancelRepeat:typeof clearInterval;
}
const clock:BrandClock={later:setTimeout,cancelLater:clearTimeout,repeat:setInterval,cancelRepeat:clearInterval};

/** Sole owner of native objects. Cancel callbacks -> pause -> release, exactly once. */
export function startBrandAudioSession(intro:boolean,enabled:boolean,
 create:(name:BrandSound)=>BrandPlayer,haptic:()=>void,
 timers:BrandClock=clock,onError:(error:unknown)=>void=()=>{}):()=>void {
 let active=true;
 const owned:BrandPlayer[]=[];
 let cancelCues=()=>{};
 let fade:ReturnType<typeof setInterval>|undefined;
 const dispose=()=>{
  if(!active)return;
  active=false;cancelCues();
  if(fade!==undefined)timers.cancelRepeat(fade);
  for(const player of owned){
   try{player.pause();}catch(error){onError(error);}
   finally{try{player.release();}catch(error){onError(error);}}
  }
 };
 if(!enabled)return dispose;
 const make=(name:BrandSound)=>{const player=create(name);owned.push(player);return player;};
 try {
  if(intro){
   const players={footstep:make('footstep'),turn:make('turn'),freeze:make('freeze'),logo:make('logo')};
   cancelCues=scheduleIntroCues(true,name=>{
    if(!active)return;
    try{
     const player=players[name];player.volume=0.18;
     void player.seekTo(0).then(()=>{if(active)player.play();}).catch(error=>{if(active)onError(error);});
     if(name==='freeze')haptic();
    }catch(error){onError(error);}
   },timers.later,timers.cancelLater);
  }else{
   const ambience=make('ambience');ambience.loop=true;ambience.volume=0;ambience.play();
   let volume=0;
   fade=timers.repeat(()=>{
    if(!active)return;
    try{volume=Math.min(0.12,volume+0.01);ambience.volume=volume;}
    catch(error){onError(error);dispose();}
    if(volume>=0.12&&fade!==undefined)timers.cancelRepeat(fade);
   },60);
  }
 }catch(error){onError(error);dispose();}
 return dispose;
}
