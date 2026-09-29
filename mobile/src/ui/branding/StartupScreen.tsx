import { GameAudioContext, useAppAudio } from '../../game/audio/useGameAudio';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { BrandingScreen } from './BrandingScreen';
import { markStartup } from './startupMetrics';
import { withDeadline } from './initialization';
import { DEFAULT_PROGRESS, loadProgress, saveProgress } from '../../game/progress/stageProgress';
import type { StageProgress } from '../../game/progress/stageProgress';
import { MenuContext } from '../menu/MenuContext';
import { HomeMenu, SettingsScreen } from '../menu/MenuScreens';
import { translate } from '../menu/strings';

import {canPlayMission,migrateCampaign} from '../../game/progress/campaignProgress';
import {missionId,missionIndex} from '../../game/levels/campaignCatalog';
import StageSelectScreen from '../menu/StageSelectScreen';
type GameProps = { initialProgress?: StageProgress; onProgressChange?: (progress:StageProgress)=>void };
export function StartupScreen() {
 const audio=useAppAudio();
 const [homeVisible,setHomeVisible]=useState(false);
 const [progress, setProgress] = useState<StageProgress>();
 const [Game, setGame] = useState<ComponentType<GameProps>>();
 const [started, setStarted] = useState(false);
 const [route,setRoute]=useState<'home'|'stages'|'settings'>('home');
 const [introVersion,setIntroVersion]=useState(0);
 const [skipIntro,setSkipIntro]=useState(false);
 const [saveError,setSaveError]=useState(false);
 const progressRef=useRef<StageProgress>(DEFAULT_PROGRESS);
 const pendingGame=useRef(false);
 const [preparing,setPreparing]=useState(false);
 const pendingMission=useRef<number | undefined>(undefined);
 const storageWritable=useRef(false);
 const updateProgress=useCallback((next:StageProgress)=>{
  progressRef.current=next; setProgress(next); setSaveError(false);
  if(storageWritable.current) void saveProgress(next).catch(()=>setSaveError(true));
  else setSaveError(true);
 },[]);
 const home=useCallback(()=>{setStarted(false);setRoute('home');setSkipIntro(true);setHomeVisible(true);},[]);
 const [error, setError] = useState<string>();
 const mounted = useRef(true), generation = useRef(0);
 useEffect(() => {
  mounted.current = true;
  const sub = AppState.addEventListener('change', state => {
   markStartup('app-state:' + state);
   if (state === 'active') requestAnimationFrame(() => markStartup('foreground-frame'));
  });
  return () => { mounted.current = false; sub.remove(); };
 }, []);
 // Only settings/progress are needed by Home. Stage modules load on Play.
 const storageAttempt=useRef(0);
 const restoreProgress=useCallback(()=>{
  const attempt=++storageAttempt.current;
  return withDeadline(loadProgress(true),4000,'Settings/progress').then(value=>{
   if(!mounted.current||attempt!==storageAttempt.current)return;
   storageWritable.current=true;progressRef.current=value;setProgress(value);setSaveError(false);
  }).catch(reason=>{
   console.error('Home initialization failed',reason);
   if(mounted.current&&attempt===storageAttempt.current){setProgress(DEFAULT_PROGRESS);setSaveError(true);}
  });
 },[]);
 useEffect(()=>{void restoreProgress();},[restoreProgress]);
 const retrySave=()=>{
  if(!storageWritable.current){void restoreProgress();return;}
  updateProgress(progressRef.current);
 };
 const launch=(screen:ComponentType<GameProps>,index:number)=>{
  const current=progressRef.current;
  const campaign=migrateCampaign(current);
  if(!canPlayMission(campaign,index,__DEV__))return;
  updateProgress({...current,campaign:{...campaign,lastMission:missionId(index)},hasStarted:true});
  setGame(()=>screen);setSkipIntro(true);setStarted(true);setError(undefined);
 };
 const play=async(index:number)=>{
  if(!progress||pendingGame.current)return;
  if(Game){launch(Game,index);return;}
  pendingMission.current=index;pendingGame.current=true;setPreparing(true);setError(undefined);
  const current=++generation.current;
  try {
   const screen=await withDeadline((async()=>{
    const module=await import('../VisualPlaygroundScreen');
    const [{preloadGameAssets},{PLAYTEST_MANIFEST}]=await Promise.all([
     import('../../assets/useGameAssets'),import('../../assets/manifest'),
    ]);
    await preloadGameAssets(PLAYTEST_MANIFEST);
    return module.VisualPlaygroundScreen;
   })(),12000,'Stage preparation');
   if(mounted.current&&generation.current===current)launch(screen,index);
  } catch(reason) {
   console.error('Stage preparation failed',reason);
   if(mounted.current&&generation.current===current)setError('Unable to prepare the stage. Please retry.');
  } finally {
   if(generation.current===current){pendingGame.current=false;if(mounted.current)setPreparing(false);}
  }
 };
 const campaign=migrateCampaign(progress??DEFAULT_PROGRESS);
 const lastIndex=missionIndex(campaign.lastMission);
 const continueIndex=canPlayMission(campaign,lastIndex,__DEV__)?lastIndex:campaign.highestUnlocked;
 const replay=()=>{setHomeVisible(false);setRoute('home');setSkipIntro(false);setIntroVersion(version=>version+1);};
 const retryPrepare=()=>{void play(pendingMission.current??continueIndex);};
 useEffect(()=>{
  if(!started)audio.update({sessionKey:'menu',phase:homeVisible?'LOBBY':'INTRO',theftRevision:0,spottedRevision:0,
   sfxEnabled:progress?.soundEnabled??false,bgmEnabled:progress?.musicEnabled??false,active:true,paused:false});
 },[started,homeVisible,progress?.soundEnabled,progress?.musicEnabled,audio]);
 return <GameAudioContext.Provider value={audio}><MenuContext.Provider value={{progress:progress??DEFAULT_PROGRESS,home,
  preferences:patch=>updateProgress({...progressRef.current,...patch})}}>
  {started&&Game&&progress?<Game initialProgress={progress} onProgressChange={updateProgress}/>:
   <View style={{flex:1}}>
    <View style={{flex:1}} accessibilityElementsHidden={route!=='home'} importantForAccessibility={route==='home'?'auto':'no-hide-descendants'} pointerEvents={route==='home'?'auto':'none'}>
    <BrandingScreen key={introVersion} skipInitial={skipIntro} onFinished={()=>setHomeVisible(true)} soundEnabled={progress?.soundEnabled??false}
     musicEnabled={progress?.musicEnabled??false} ready={!!progress&&!preparing}
     loadingError={error} onRetry={retryPrepare} onStart={()=>play(continueIndex)}>
     <HomeMenu ready={!!progress&&!preparing} error={error} onRetry={retryPrepare}
      onPlay={()=>play(continueIndex)} onStages={()=>setRoute('stages')} onSettings={()=>setRoute('settings')}/>
    </BrandingScreen>
    </View>
    {route!=='home'&&<View style={StyleSheet.absoluteFill}>
     {route==='settings'?<SettingsScreen onBack={()=>setRoute('home')} onIntro={replay}/>:
       <StageSelectScreen onBack={()=>setRoute('home')} onSelect={play}/>}
    </View>}
   </View>}
  {saveError&&<Text onPress={retrySave} style={{position:'absolute',bottom:30,left:20,right:20,color:'#FFF4D6',backgroundColor:'#102331',padding:12}}>{translate(progress?.language??'en','saveError')}</Text>}
 </MenuContext.Provider></GameAudioContext.Provider>;
}
