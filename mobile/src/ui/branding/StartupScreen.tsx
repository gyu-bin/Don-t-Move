import { GameAudioContext, useAppAudio } from '../../game/audio/useGameAudio';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { BrandingScreen, preloadOpeningArt } from './BrandingScreen';
import { SPLASH_MS } from './introTimeline';
import { SplashScreen } from './SplashScreen';
import { markStartup } from './startupMetrics';
import { withDeadline } from './initialization';
import { DEFAULT_PROGRESS, loadProgress, saveProgress } from '../../game/progress/stageProgress';
import type { StageProgress } from '../../game/progress/stageProgress';
import { MenuContext } from '../menu/MenuContext';
import { HomeMenu, SettingsScreen } from '../menu/MenuScreens';
import { translate } from '../menu/strings';
import { MonetizationProvider } from '../../game/monetization/MonetizationContext';
import { showsApplyingText, type OtaStatus } from '../../ota/startupFlow';

import {canPlayMission,migrateCampaign} from '../../game/progress/campaignProgress';
import {missionId,missionIndex} from '../../game/levels/campaignCatalog';
import StageSelectScreen from '../menu/StageSelectScreen';
type GameProps = { initialMissionIndex?: number; initialProgress?: StageProgress; onProgressChange?: (progress:StageProgress)=>void };
type StartupProps = {
 /** Startup is not ready yet (update check still running): stay on the startup screen. */
 holdSplash?: boolean;
 /** An update is being downloaded or applied: the startup screen stays in front until the runtime is replaced. */
 applying?: boolean;
 /** Where the update check is. Only an update in flight is shown, as "Applying update". */
 otaStatus?: OtaStatus | null;
 /** The applying status has been drawn. The reload waits for this. */
 onApplyingShown?: () => void;
 /** Home is on screen (its intro has finished), once per mount. */
 onHomeVisible?: () => void;
 onGameplayChange?: (playing: boolean) => void;
};
export function StartupScreen({ holdSplash = false, applying = false, otaStatus = null, onApplyingShown, onHomeVisible, onGameplayChange }: StartupProps) {
 const audio=useAppAudio();
 const [phase,setPhase]=useState<'BOOT'|'INTRO'|'HOME'>('BOOT');
 const homeVisible=phase==='HOME', splashDone=phase!=='BOOT';
 // The Home intro waits for this signal; mounting BrandingScreen does not start it.
 const startupReady=!holdSplash&&!applying;
 const [backgroundError,setBackgroundError]=useState(false);
 const [backgroundAttempt,setBackgroundAttempt]=useState(0);
 const [splashGone,setSplashGone]=useState(false);
 const hideSplash=useCallback(()=>setSplashGone(true),[]);
 const [lobbyAudioReady,setLobbyAudioReady]=useState(false);
 const [progress, setProgress] = useState<StageProgress>();
 const [Game, setGame] = useState<ComponentType<GameProps>>();
 const [started, setStarted] = useState(false);
 const gameplayRef=useRef(onGameplayChange);
 useEffect(()=>{gameplayRef.current=onGameplayChange;},[onGameplayChange]);
 const [initialMissionIndex,setInitialMissionIndex]=useState<number>();
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
 const startLobbyAudio=useCallback(()=>setLobbyAudioReady(true),[]);
 const home=useCallback(()=>{setStarted(false);gameplayRef.current?.(false);setRoute('home');setSkipIntro(true);setLobbyAudioReady(false);setPhase('HOME');},[]);
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
 useEffect(() => {
  markStartup('splash-start');
  let alive=true,minimum=false,art=false;
  const reveal=()=>{if(alive&&minimum&&art&&!holdSplash&&!applying){markStartup('splash-end');setPhase('INTRO');}};
  void preloadOpeningArt().then(()=>{art=true;reveal();}).catch(reason=>{
   console.error('Museum background unavailable',reason);
   if(alive)setBackgroundError(true);
  });
  if(holdSplash||applying)return ()=>{alive=false;};
  const timer=setTimeout(()=>{minimum=true;reveal();},SPLASH_MS);
  return ()=>{alive=false;clearTimeout(timer);};
 },[applying,backgroundAttempt,holdSplash]);
 // The status is written in the player's language, so it waits for the saved settings (a few milliseconds).
 const statusText=progress&&showsApplyingText(otaStatus)?translate(progress.language,'updateApplying'):null;
 const applyingDrawn=applying&&otaStatus==='applying'&&!!statusText;
 const shownRef=useRef(onApplyingShown),homeRef=useRef(onHomeVisible);
 useEffect(()=>{shownRef.current=onApplyingShown;homeRef.current=onHomeVisible;});
 // "Applying update…" is in the committed tree: two frames later it has been drawn, and the reload may go ahead.
 useEffect(()=>{
  if(!applyingDrawn)return;
  let second=0;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>shownRef.current?.());});
  return ()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
 },[applyingDrawn]);
 const homeAnnounced=useRef(false);
 useEffect(()=>{
  if(!homeVisible||started||homeAnnounced.current)return;
  homeAnnounced.current=true;homeRef.current?.();
 },[homeVisible,started]);
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
  setInitialMissionIndex(index);setGame(()=>screen);setSkipIntro(true);setLobbyAudioReady(false);setStarted(true);gameplayRef.current?.(true);setError(undefined);
 };
 const play=async(index:number)=>{
  if(!progress||pendingGame.current)return;
  pendingMission.current=index;pendingGame.current=true;setPreparing(true);setError(undefined);
  const current=++generation.current;
  try {
   const tapAt=Date.now();
   const screen=await withDeadline((async()=>{
    const module=Game?{VisualPlaygroundScreen:Game}:await import('../VisualPlaygroundScreen');
    const importedAt=Date.now();
    const [{preloadGameAssets},{PLAYTEST_MANIFEST}]=await Promise.all([
     import('../../assets/useGameAssets'),import('../../assets/manifest'),
    ]);
    const assets=await preloadGameAssets(PLAYTEST_MANIFEST);
    const assetsAt=Date.now();
    const [{prepareMission},{campaignStages}]=await Promise.all([
     import('../preparedMission'),import('../../game/levels/campaignStages'),
    ]);
    const definition=campaignStages[index];
    if(definition)prepareMission(definition,assets);
    if(__DEV__)console.info('[LOAD] mission',JSON.stringify({id:definition?.id,importMs:importedAt-tapAt,assetsMs:assetsAt-importedAt,prepareMs:Date.now()-assetsAt,totalMs:Date.now()-tapAt}));
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
 const replay=()=>{setPhase('INTRO');setLobbyAudioReady(false);setRoute('home');setSkipIntro(false);setIntroVersion(version=>version+1);};
 const retryPrepare=()=>{void play(pendingMission.current??continueIndex);};
 useEffect(()=>{
  if(!started)audio.update({sessionKey:'menu',phase:(homeVisible||lobbyAudioReady)?'LOBBY':'INTRO',theftRevision:0,spottedRevision:0,
   sfxEnabled:progress?.soundEnabled??false,bgmEnabled:progress?.musicEnabled??false,active:true,paused:false});
 },[started,homeVisible,lobbyAudioReady,progress?.soundEnabled,progress?.musicEnabled,audio]);
 return <GameAudioContext.Provider value={audio}><MonetizationProvider><MenuContext.Provider value={{progress:progress??DEFAULT_PROGRESS,home,
  preferences:patch=>updateProgress({...progressRef.current,...patch})}}>
  {started&&Game&&progress?<Game initialMissionIndex={initialMissionIndex} initialProgress={progress} onProgressChange={updateProgress}/>:
   <View style={{flex:1}}>
    {splashDone && <>
     <View style={{flex:1}} accessibilityElementsHidden={route!=='home'} importantForAccessibility={route==='home'?'auto':'no-hide-descendants'} pointerEvents={route==='home'?'auto':'none'}>
      <BrandingScreen key={introVersion} skipInitial={skipIntro} onFinished={()=>setPhase('HOME')}
       onLobbyAudioStart={startLobbyAudio} soundEnabled={progress?.soundEnabled??false}
       musicEnabled={progress?.musicEnabled??false} ready={!!progress&&!preparing} startReady={startupReady}
       loadingError={error} onRetry={retryPrepare} onStart={()=>play(continueIndex)}>
       <HomeMenu ready={!!progress&&!preparing} error={error} onRetry={retryPrepare}
        onPlay={()=>play(continueIndex)} onStages={()=>setRoute('stages')} onSettings={()=>setRoute('settings')}/>
      </BrandingScreen>
     </View>
     {route!=='home'&&<View style={StyleSheet.absoluteFill}>
      {route==='settings'?<SettingsScreen onBack={()=>setRoute('home')} onIntro={replay}/>:
        <StageSelectScreen onBack={()=>setRoute('home')} onSelect={play}/>}
     </View>}
    </>}
    {!splashGone && <SplashScreen leaving={splashDone} onGone={hideSplash} status={statusText}/>}
    {backgroundError && phase==='BOOT' && <Text accessibilityRole="button"
     onPress={()=>{setBackgroundError(false);setBackgroundAttempt(value=>value+1);}}
     style={{position:'absolute',bottom:80,left:24,right:24,textAlign:'center',color:'#FFF4D6',backgroundColor:'#102331',padding:16}}>
     {translate(progress?.language??'en','artError')} {translate(progress?.language??'en','retry')}
    </Text>}
   </View>}
  {applying&&<View style={[StyleSheet.absoluteFill,{zIndex:30}]}><SplashScreen animateIn status={statusText}/></View>}
  {saveError&&<Text onPress={retrySave} style={{position:'absolute',bottom:30,left:20,right:20,color:'#FFF4D6',backgroundColor:'#102331',padding:12}}>{translate(progress?.language??'en','saveError')}</Text>}
 </MenuContext.Provider></MonetizationProvider></GameAudioContext.Provider>;
}
