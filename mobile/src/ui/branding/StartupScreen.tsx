import { useCallback, useEffect, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { BrandingScreen } from './BrandingScreen';
import { markStartup } from './startupMetrics';
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
 const [progress, setProgress] = useState<StageProgress>();
 const [Game, setGame] = useState<ComponentType<GameProps>>();
 const [started, setStarted] = useState(false);
 const [route,setRoute]=useState<'home'|'stages'|'settings'>('home');
 const [introVersion,setIntroVersion]=useState(0);
 const [skipIntro,setSkipIntro]=useState(false);
 const [saveError,setSaveError]=useState(false);
 const progressRef=useRef<StageProgress>(DEFAULT_PROGRESS);
 const prepared=useRef(false);
 const updateProgress=useCallback((next:StageProgress)=>{
  progressRef.current=next; setProgress(next); setSaveError(false);
  void saveProgress(next).catch(()=>setSaveError(true));
 },[]);
 const home=useCallback(()=>{setStarted(false);setRoute('home');setSkipIntro(true);},[]);
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
 const prepare = useCallback(() => {
  if(prepared.current) return;
  prepared.current=true;
  const current = ++generation.current;
  const alive = () => mounted.current && generation.current === current;
  setError(undefined);
  markStartup('background-preload-start');
  // Storage does not block the first painted scene; existing records are preserved.
  markStartup('storage-start');
  const storage = loadProgress().then(value => {
   markStartup('storage-ready');
   if (alive()) {progressRef.current=value;setProgress(value);}
   return value;
  });
  const code = import('../VisualPlaygroundScreen').then(async module => {
   markStartup('game-modules-ready');
   const [{ preloadGameAssets }, { PLAYTEST_MANIFEST }] = await Promise.all([
    import('../../assets/useGameAssets'), import('../../assets/manifest'),
   ]);
   await preloadGameAssets(PLAYTEST_MANIFEST);
   return module.VisualPlaygroundScreen;
  });
  const timeout = setTimeout(() => {
   if (alive()) setError('Preparation is taking longer than expected. Check the development server, then retry.');
  }, 12000);
  void Promise.all([storage, code]).then(([, screen]) => {
   if (!alive()) return;
   setError(undefined); setGame(() => screen);
   markStartup('game-ready');
  }).catch(reason => {
   prepared.current=false;
   if (alive()) setError(String(reason));
   console.error('Startup preparation failed', reason);
  }).finally(() => clearTimeout(timeout));
 }, []);
 const play=(index:number)=>{
  if(!Game||!progress)return;
  const campaign=migrateCampaign(progress);
  if(!canPlayMission(campaign,index,__DEV__))return;
  updateProgress({...progress,campaign:{...campaign,lastMission:missionId(index)},hasStarted:true});
  markStartup('start-tapped'); setSkipIntro(true);setStarted(true);
 };
 const campaign=migrateCampaign(progress??DEFAULT_PROGRESS);
 const lastIndex=missionIndex(campaign.lastMission);
 const continueIndex=canPlayMission(campaign,lastIndex,__DEV__)?lastIndex:campaign.highestUnlocked;
 const replay=()=>{setRoute('home');setSkipIntro(false);setIntroVersion(version=>version+1);};
 const retryPrepare=()=>{prepared.current=false;prepare();};
 return <MenuContext.Provider value={{progress:progress??DEFAULT_PROGRESS,home,
  preferences:patch=>updateProgress({...progressRef.current,...patch})}}>
  {started&&Game&&progress?<Game initialProgress={progress} onProgressChange={updateProgress}/>:
   <View style={{flex:1}}>
    <View style={{flex:1}} accessibilityElementsHidden={route!=='home'} importantForAccessibility={route==='home'?'auto':'no-hide-descendants'} pointerEvents={route==='home'?'auto':'none'}>
    <BrandingScreen key={introVersion} skipInitial={skipIntro} soundEnabled={progress?.soundEnabled??false}
     musicEnabled={progress?.musicEnabled??false} onSceneReady={prepare} ready={!!Game&&!!progress}
     loadingError={error} onRetry={retryPrepare} onStart={()=>play(continueIndex)}>
     <HomeMenu ready={!!Game&&!!progress} error={error} onRetry={retryPrepare}
      onPlay={()=>play(continueIndex)} onStages={()=>setRoute('stages')} onSettings={()=>setRoute('settings')}/>
    </BrandingScreen>
    </View>
    {route!=='home'&&<View style={StyleSheet.absoluteFill}>
     {route==='settings'?<SettingsScreen onBack={()=>setRoute('home')} onIntro={replay}/>:
       <StageSelectScreen onBack={()=>setRoute('home')} onSelect={play}/>}
    </View>}
   </View>}
  {saveError&&<Text onPress={()=>updateProgress(progressRef.current)} style={{position:'absolute',bottom:30,left:20,right:20,color:'#FFF4D6',backgroundColor:'#102331',padding:12}}>{translate(progress?.language??'en','saveError')}</Text>}
 </MenuContext.Provider>;
}
