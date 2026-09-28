import { useEffect } from 'react';
import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { startBrandAudioSession } from './brandAudioSession';
import { markStartup } from './startupMetrics';

/** Replace assets here; effects remain independent of the gameplay audio manager. */
const CUES={
 footstep:require('../../../assets/audio/intro-footstep.wav'),
 turn:require('../../../assets/audio/intro-turn.wav'),
 freeze:require('../../../assets/audio/intro-freeze.wav'),
 logo:require('../../../assets/audio/intro-logo.wav'),
 ambience:require('../../../assets/audio/intro-ambience.wav'),
};
export function useBrandAudio(intro:boolean,enabled:boolean){
 useEffect(()=>startBrandAudioSession(intro,enabled,
  name=>{
   const start=performance.now();
   const player=createAudioPlayer(CUES[name]);
   markStartup('audio-created:'+name,{duration:performance.now()-start});
   return player;
  },
  ()=>{void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});},
  undefined,error=>console.warn('Brand audio unavailable',error)
 ),[intro,enabled]);
}
