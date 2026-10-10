import { LiveVisualQA, type InspectionView } from './debug/LiveVisualQA';
import { stepDoors } from '../game/doors/doorSystem';
import type { DoorRuntime } from '../game/doors/doorTypes';
import {resolveInitialMissionIndex} from './branding/missionLaunch';
import {QA_UNLOCK_ALL} from '../game/progress/qaUnlock';
import {createDoorArt} from '../rendering/environment/doorArt';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture, Skia, TileMode, matchFont } from '@shopify/react-native-skia';
import type { SkFont, SkPaint } from '@shopify/react-native-skia';
import Animated, {cancelAnimation,useAnimatedStyle,withTiming,useAnimatedReaction, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

import {campaignStages as playableStages} from '../game/levels/campaignStages';
import {CHAPTER_MISSION_COUNTS,MISSION_COUNT,missionId,missionIndex,missionName} from '../game/levels/campaignCatalog';
import {canPlayMission,migrateCampaign,completeMission} from '../game/progress/campaignProgress';
import type { StageDefinition } from '../game/levels/StageDefinition';
import { compileStage, TILE, WALL_HEIGHT } from '../game/world/compileStage';
import { createPlaygroundState, stepPlayground } from '../game/playground/playgroundState';
import { guardStrideContract } from '../rendering/characters/guardAnimation';
import { buildNavigation } from '../game/world/navigation';
import { BODY } from '../game/guards/guardTuning';
import { ASSET_MANIFEST, PLAYTEST_MANIFEST } from '../assets/manifest';
import { characterReleaseStatus } from '../assets/characterReadiness';
import { preloadGameAssets, useGameAssets } from '../assets/useGameAssets';
import { createCharacterVisual } from '../rendering/characters/characterVisual';
import { createDebugArt } from '../rendering/debug/guardDebug';
import { createIconArt } from '../rendering/effects/alertIcons';
import { createLightFx } from '../rendering/effects/lightFx';
import { createConeArt } from '../rendering/effects/visionCone';
import {createCctvArt} from '../rendering/effects/cctvArt';
import { GUARD_PALETTE, PLAYER_PALETTE } from '../rendering/fallback/characterPalettes';
import { createCharacterArt } from '../rendering/fallback/proceduralCharacter';
import { renderPlaygroundFrame } from '../rendering/renderFrame';
import type { RenderResources } from '../rendering/renderFrame';
import { StageHeader } from './hud/StageHeader';
import { alertHudVisible } from './hud/alertHud';
import { useTiltControl } from '../game/input/useTiltControl';
import { recenterTilt, stepTilt } from '../game/input/tilt';
import { stopPlayer } from '../game/input/tiltMovement';
import { syncInputMode } from '../game/input/inputTransition';
import { normalizeControlMode, resolveInput } from '../game/input/controlMode';
import { track } from '../game/analytics/track';
import { STICK_IDLE, stickDown, stickMove } from '../game/input/touchStick';
import type { StickState } from '../game/input/touchStick';
import { TouchStickHud } from './hud/TouchStickHud';
import { MissionResult } from './hud/MissionResult';
import { resultActions } from './resultNavigation';
import type { ResultAction } from './resultNavigation';
import { DEFAULT_PROGRESS, loadProgress, saveProgress } from '../game/progress/stageProgress';
import type { StageProgress } from '../game/progress/stageProgress';
import { useGameAudio, useUIAudio } from '../game/audio/useGameAudio';
import type { GuardEvents } from '../game/guards/guardBrain';
import { prepareMission, prepareMissionInSteps } from './preparedMission';
import { createMissionSwap, SWAP_TIMING } from './missionSwap';
import type { SwapPhase } from './missionSwap';
import { MISSION_COVER_OPACITY, MISSION_FINISH_HOLD_MS } from './missionTransition';
import { VALUABLES } from '../game/levels/stagePresentation';
import { BrandingScreen } from './branding/BrandingScreen';
import * as SplashScreen from 'expo-splash-screen';
import { markStartup } from './branding/startupMetrics';
import { useMenu } from './menu/MenuContext';
import { FIRST_RUN_CONTROL_MODE, topInset } from './device';
import { SettingsScreen } from './menu/MenuScreens';
import { feedbackKey,valuableKey } from './menu/strings';
import { CharacterMotionDebug } from './CharacterMotionDebug';
import { NativeQAObserver,useNativeQACadence } from './debug/NativeQAObserver';
import { TiltProfileDebug, TiltProfileSelector } from './debug/TiltProfileDebug';
import { useMonetization } from '../game/monetization/MonetizationContext';

type GamePhase = GuardEvents['phase'];

const VIEW_TILES_WIDE = 9.4;
/** UI-thread frames an incoming mission must have run before it is revealed. */
const READY_FRAMES = 3;
// Runtime gate only. Production visual approval (visualReviewPending) never blocks play.
const releaseAssetIssues = characterReleaseStatus(ASSET_MANIFEST).issues;

function debugFont(): SkFont | null {
  try {
    return matchFont({ fontFamily: 'Menlo', fontSize: 8.5 });
  } catch {
    return null;
  }
}

function makeVignette(w: number, h: number): SkPaint {
  const p = Skia.Paint();
  p.setShader(
    Skia.Shader.MakeRadialGradient(
      { x: w / 2, y: h * 0.48 },
      Math.max(w, h) * 0.72,
      [Skia.Color('rgba(0,0,0,0)'), Skia.Color('rgba(0,0,0,0.18)'), Skia.Color('rgba(0,0,0,0.72)')],
      [0.45, 0.7, 1],
      TileMode.Clamp,
    ),
  );
  return p;
}

export function VisualPlaygroundScreen({ initialMissionIndex, initialProgress, onProgressChange }: { initialMissionIndex?: number; initialProgress?: StageProgress; onProgressChange?: (next:StageProgress)=>void } = {}) {
  const [localProgress, setProgress] = useState<StageProgress>(initialProgress ?? DEFAULT_PROGRESS);
  const progress=onProgressChange&&initialProgress?initialProgress:localProgress;
  const {home,t}=useMenu();
  const [loaded, setLoaded] = useState(!!initialProgress);
  const [started, setStarted] = useState(!!initialProgress);

  useEffect(() => {
    if (initialProgress) return;
    let mounted = true;
    markStartup('storage-start');
    void loadProgress(false,FIRST_RUN_CONTROL_MODE).then((value) => {
      if (!mounted) return;
      markStartup('storage-ready');
      setProgress(value);
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, [initialProgress]);

  const updateProgress = (next: StageProgress) => {
    setProgress(next);
    if(onProgressChange)onProgressChange(next);
    else void saveProgress(next).catch(() => { /* Keep the in-memory session playable if storage fails. */ });
  };

  if (started && !__DEV__ && releaseAssetIssues.length) return <View style={styles.titleScreen} onLayout={()=>{void SplashScreen.hideAsync().catch(()=>{});}}>
    <Text style={styles.modalTitle}>{t('assetError')}</Text>
    <Text style={styles.modalBody}>{t('assetDetail')}</Text>
    <Pressable onPress={home} style={styles.button}><Text style={styles.buttonText}>{t('home')}</Text></Pressable>
  </View>;
  if (!loaded) return <View style={styles.root} />;
  if (!started) {
    return (
      <BrandingScreen soundEnabled={progress.soundEnabled} onStart={() => setStarted(true)} />
    );
  }

  return <GameRun initialMissionIndex={initialMissionIndex} progress={progress} onProgress={updateProgress} />;
}

function GameRun({ initialMissionIndex, progress, onProgress }: { initialMissionIndex?: number; progress: StageProgress; onProgress: (next: StageProgress) => void }) {
  const monetization=useMonetization();
  const [index,setIndex]=useState(()=>resolveInitialMissionIndex(progress,initialMissionIndex,QA_UNLOCK_ALL));
  // Exactly one mission is mounted, or none: between two missions there is only the black cover.
  const [stageMounted,setStageMounted]=useState(true);
  const [swap,setSwap]=useState<{phase:SwapPhase;to:number}>({phase:'idle',to:-1});
  const cover=useSharedValue(0);
  const coverStyle=useAnimatedStyle(()=>({opacity:cover.value}));
  const tilt=useTiltControl(normalizeControlMode(progress.controlMode)==='tilt');
  const definition=playableStages[index];
  // The transition outlives the render that started it (an ad may be on screen in between): read these when used.
  const live=useRef({progress,onProgress,presentAd:monetization.presentInterstitialIfNeeded});
  useEffect(()=>{live.current={progress,onProgress,presentAd:monetization.presentInterstitialIfNeeded};});
  const fade=useRef<{token:number;done:(()=>void)|null}>({token:0,done:null});
  const onFadeEnd=useCallback((token:number)=>{
    if(token!==fade.current.token)return; // the end of an earlier fade that this one replaced
    const done=fade.current.done;fade.current.done=null;done?.();
  },[]);
  const missionSwap=useRef<ReturnType<typeof createMissionSwap<ReturnType<typeof setTimeout>>>|null>(null);
  useEffect(()=>{
   const controller=createMissionSwap<ReturnType<typeof setTimeout>>({
    presentAd:()=>live.current.presentAd(),
    commit:to=>{
      const current=live.current.progress;
      live.current.onProgress({...current,campaign:{...migrateCampaign(current),lastMission:missionId(to)}});
    },
    fade:(to,done)=>{
      const token=++fade.current.token;fade.current.done=done;
      cover.set(withTiming(to?MISSION_COVER_OPACITY:0,{duration:SWAP_TIMING.fadeMs},()=>{'worklet';scheduleOnRN(onFadeEnd,token);}));
    },
    setMounted:next=>{
      if(next===null){setStageMounted(false);return;}
      setIndex(next);setStageMounted(true);
    },
    afterFrames:done=>{requestAnimationFrame(()=>requestAnimationFrame(done));},
    setTimer:(run,ms)=>setTimeout(run,ms),
    clearTimer:timer=>clearTimeout(timer),
    onPhase:(phase,to)=>setSwap({phase,to}),
    breadcrumb:(name,props)=>track(name,{...props,from:missionId(Number(props.from)),to:missionId(Number(props.to))}),
   });
   missionSwap.current=controller;
   // Leaving for Home or the chapter list mid-transition: late fade/frame signals of that run are ignored.
   return ()=>{controller.cancel();missionSwap.current=null;cancelAnimation(cover);};
  },[cover,onFadeEnd]);
  const stageCleared=(seconds:number,alerts:number)=>{
    const stage=playableStages[index];
    const controlMode=normalizeControlMode(progress.controlMode);
    track('mission_clear',{missionId:stage?.id??missionId(index),chapter:stage?.chapter??0,seconds,alerts,controlMode});
    if(stage && stage.mission===CHAPTER_MISSION_COUNTS[(stage.chapter??1)-1]) {
      track('chapter_complete',{chapter:stage.chapter??0,missionId:stage.id});
    }
    // The clear, the best time and the unlock are stored here, before any navigation is possible.
    onProgress({...progress,campaign:completeMission(migrateCampaign(progress),index,seconds,alerts)});
    monetization.recordMissionClear();
    // After the last mission there is no next one: the result screen leads to the chapter list.
    if(index>=playableStages.length-1)return;
    const next=index+1;
    // Shared images are already decoded; compile the next floor plan, navigation and static art while the result
    // screen is up. It runs after the result popup has been committed, and in three separate tasks, so the popup
    // and its buttons are not held behind it. Nothing is mounted or drawn for the next mission yet.
    setTimeout(()=>{
      const prepareStarted=Date.now();
      void preloadGameAssets(PLAYTEST_MANIFEST).then(assets=>prepareMissionInSteps(playableStages[next],assets)).then(()=>{
        if(__DEV__)console.info('[NAV] next mission prepared',JSON.stringify({totalMs:Date.now()-prepareStarted}));
      }).catch(()=>{});
    },MISSION_FINISH_HOLD_MS+200);
  };
  // Pressing again while a transition runs does nothing: one ad at most, one mission launched.
  const nextStage=()=>{
    if(index>=playableStages.length-1)return;
    missionSwap.current?.start(index,index+1);
  };
  const onStageReady=useCallback(()=>{missionSwap.current?.newStageReady(index);},[index]);
  const covering=swap.phase!=='idle'&&swap.phase!=='ad';
  // The incoming mission is frozen under the cover and starts when the cover is gone.
  const incoming=swap.phase==='mounting'||swap.phase==='fadeIn';
  return <View style={{flex:1,overflow:'hidden',backgroundColor:'#05070b'}}>
    {stageMounted&&<StageGame key={definition.id} definition={definition} tilt={tilt} soundEnabled={progress.soundEnabled}
      onStageCleared={stageCleared} onNextStage={nextStage} progress={progress}
      transitioning={incoming} onTransitionReady={swap.phase==='mounting'?onStageReady:undefined}/>}
    <Animated.View pointerEvents={covering?'auto':'none'} style={[StyleSheet.absoluteFill,styles.transitionCover,coverStyle]}>
      {covering&&swap.to>=0&&<View pointerEvents="none" style={styles.transitionName}>
        <Text style={styles.transitionCode}>{missionId(swap.to)}</Text>
        <Text style={styles.transitionTitle}>{missionName(swap.to,progress.language)}</Text>
      </View>}
    </Animated.View>
  </View>;
}

type TiltControl = ReturnType<typeof useTiltControl>;

function StageGame({
  definition,
  tilt,
  soundEnabled,
  onStageCleared,
  onNextStage,
  progress,
  transitioning=false,
  onTransitionReady,
}: {
  definition: StageDefinition;
  tilt: TiltControl;
  soundEnabled: boolean;
  onStageCleared: (seconds: number, alerts: number) => void;
  onNextStage: () => void;
  progress: StageProgress;
  transitioning?:boolean;
  onTransitionReady?:()=>void;
}) {
  const {t,home:menuHome,chapters:menuChapters}=useMenu();
  const playUI=useUIAudio();
  const monetization=useMonetization();
  const controlMode=normalizeControlMode(progress.controlMode);
  const missionProps=()=>({missionId:definition.id,chapter:definition.chapter??0,controlMode});
  const { width, height } = useWindowDimensions();
  const [replayIntro,setReplayIntro]=useState(false);
  // On an iPad the HUD starts below the system window controls; on an iPhone this is the safe area unchanged.
  const safeArea = useSafeAreaInsets();
  const insets = useMemo(() => ({ ...safeArea, top: topInset(safeArea.top) }), [safeArea]);
  const assets = useGameAssets(PLAYTEST_MANIFEST);
  const prepared=useMemo(()=>assets?prepareMission(definition,assets):null,[definition,assets]);
  const stage = useMemo(() => prepared?.stage ?? compileStage(definition), [definition,prepared]);
  const navigation = useMemo(() => prepared?.navigation ?? buildNavigation(stage, BODY.guardRadius), [stage,prepared]);
  const bounds = useMemo(
    () => ({ x: 0, y: -WALL_HEIGHT-90, w: stage.width, h: stage.height + WALL_HEIGHT+90 }),
    [stage],
  );
  // DEV map review: EXPO_PUBLIC_DM_QA_VIEW_TILES at Metro start widens the camera to show a whole map.
  const qaViewTiles = __DEV__ ? Number(process.env.EXPO_PUBLIC_DM_QA_VIEW_TILES) : NaN;
  const zoom = width / ((qaViewTiles > 0 ? qaViewTiles : VIEW_TILES_WIDE) * TILE);
  const viewW = width / zoom;
  const viewH = height / zoom;

  const resources = useMemo<RenderResources | null>(() => {
    if (!assets || !assets.guard) return null;
    const authoredLabCase = definition.chapter === 4 && definition.visualRevision === 'v12-4c'
      && definition.props.some(p => p.kind === 'objectiveCase' && p.visualAssetId === 'lab_sample_case');
    return {
      stage: prepared!.art,
      doors: stage.doors?.length?createDoorArt():undefined,
      player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false)),
      guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true)),
      cone: createConeArt(),
      cctv: createCctvArt(assets.museum?.cctv ?? null),
      icons: createIconArt(assets.indicators),
      fx: createLightFx(),
      diamond: authoredLabCase ? null : assets.museum?.[VALUABLES[definition.objective?.kind ?? 'diamond'].sprite] ?? null,
      objectiveGlowHeight: authoredLabCase ? 20 : undefined,
      diamondPos: stage.objective,
      exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h),
      exitPosition: definition.exitPosition ? {x:definition.exitPosition.x*TILE,y:definition.exitPosition.y*TILE} : undefined,
      guidanceInsets: {top:insets.top+100,bottom:insets.bottom+20,left:insets.left,right:insets.right},
      showObjective: true,
      debug: createDebugArt(debugFont()),
      vignette: makeVignette(width, height),
      screen: Skia.XYWHRect(0, 0, width, height),
      zoom,
    };
  }, [assets, stage, prepared, definition, width, height, zoom,insets]);
  // "Ready" is reported from the UI thread, after this mission's own frame callback has run for a few frames with
  // its resources in place. Mounting a mission makes the UI thread take in the whole scene (state, navigation,
  // art) in one go; a report from the JS side arrives before that is over, and the reveal would then stutter.
  const readyTarget=useRef(onTransitionReady);
  useEffect(()=>{readyTarget.current=onTransitionReady;});
  const reportReady=useCallback(()=>{readyTarget.current?.();},[]);
  const awaitingReady=!!onTransitionReady;
  const adCovering=monetization.adPresenting;
  const readyFrames=useSharedValue(0);

  const freshViewState = () => {
    const fresh=createPlaygroundState(stage,guardStrideContract(PLAYTEST_MANIFEST.characters.guard));
    // An incoming scene is frozen under the cover: center the entry before the
    // first rendered frame instead of waiting for camera-follow simulation.
    fresh.cam.x=bounds.w<=viewW ? bounds.x+(bounds.w-viewW)/2
      : Math.max(bounds.x,Math.min(bounds.x+bounds.w-viewW,fresh.player.x-viewW/2));
    fresh.cam.y=bounds.h<=viewH ? bounds.y+(bounds.h-viewH)/2
      : Math.max(bounds.y,Math.min(bounds.y+bounds.h-viewH,fresh.player.y-viewH*0.52));
    return fresh;
  };
  const state = useSharedValue(freshViewState());
  const accumulated = useSharedValue(0);
  const pausedValue = useSharedValue(false);
  const playerMode = useSharedValue(2);
  const [touchMode, setTouchMode] = useState(2);
  const selectTouchMode = (mode: number) => { playerMode.set(mode); setTouchMode(mode); };
  const touch = useSharedValue({ x: 0, y: 0, seq: 0 });
  const [caught, setCaught] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const leaveMission=(reason:'home'|'chapters')=>{
    if(!completed) track('mission_quit',{...missionProps(),reason});
    playUI('ui_back');
    if(reason==='home') menuHome(); else menuChapters();
  };
  const home=()=>leaveMission('home');
  const chapterSelect=()=>leaveMission('chapters');
  useEffect(()=>{
    track('mission_start',{missionId:definition.id,chapter:definition.chapter??0,controlMode});
  },[definition.id,definition.chapter,controlMode]);
  const qaCadence=useNativeQACadence(paused||caught||completed,transitioning);
  const [inspection, setInspection] = useState<InspectionView | null>(null);
  const [qaLockdown, setQaLockdown] = useState(false);
  const inspectionActive = useSharedValue(false);
  const qaDoorRequest = useSharedValue(false);
  const inspectionDoors = useSharedValue<DoorRuntime[] | undefined>(undefined);
  const [motionDebug,setMotionDebug]=useState(false);
  const [settings, setSettings] = useState(false);
  const [pauseFeedback, setPauseFeedback] = useState('');
  const [banner, setBanner] = useState('');
  const [secured, setSecured] = useState(false);
  const [flash, setFlash] = useState<'cyan' | 'red' | null>(null);
  const [result, setResult] = useState({ seconds: 0, alerts: 0 });
  const [pickupRevision, setPickupRevision] = useState(0);
  const [tiltStatus, setTiltStatus] = useState(() => (tilt.enabled ? tilt.controller.value.status : 'PLAY'));
  const [audioSession,setAudioSession]=useState(0);
  const [phaseInfo,setPhaseInfo]=useState({phase:'STEALTH' as GamePhase,theft:0,spotted:0,remaining:0,lockdown:false});
  const [resultVisible,setResultVisible]=useState(false);
  const finishDim=useSharedValue(0);
  const finishDimStyle=useAnimatedStyle(()=>({opacity:finishDim.value}));
  const clearReported = useRef(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { movementBlockers, visionBlockers } = stage;
  const { enabled: tiltEnabled, controller, sample, tuning, active, reset: inputReset } = tilt;
  const previousTiltEnabled = useSharedValue(tiltEnabled);
  // Touch control (Settings, or the sensor cannot be used): a drag stick on the tilt movement path.
  // The tap-to-move harness stays a development tool; EXPO_PUBLIC_DM_QA_VIRTUAL_TILT=1 gives a simulator the stick.
  const input = resolveInput({ preferred: normalizeControlMode(progress.controlMode), sensorUsable: tilt.usable,
    dev: __DEV__, devStick: process.env.EXPO_PUBLIC_DM_QA_VIRTUAL_TILT === '1' });
  const stickEnabled = !tiltEnabled && input.kind === 'stick';
  const stick = useSharedValue<StickState>(STICK_IDLE);

  useGameAudio({sessionKey:`${definition.id}:${audioSession}`,phase:replayIntro?'INTRO':phaseInfo.phase,
    objectiveRevision:pickupRevision,theftRevision:phaseInfo.theft,spottedRevision:phaseInfo.spotted,
    sfxEnabled:soundEnabled,bgmEnabled:progress.musicEnabled,paused:monetization.adPresenting,
    sfxSuspended:paused||caught||completed||transitioning||replayIntro||monetization.adPresenting,active:true},!transitioning);

  const showFlash = (color: 'cyan' | 'red') => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(color);
    flashTimer.current = setTimeout(() => setFlash(null), 220);
  };
  const showCaught = (value: boolean) => {
    setCaught(value);
    if (value) {
      const snapshot = state.get();
      const catchSource = snapshot.events.caughtBy
        ? 'guard'
        : (snapshot.events.cameraAlertRevision ?? 0) > 0 ? 'cctv' : 'other';
      track('mission_caught', {
        ...missionProps(),
        catchSource,
        seconds: snapshot.t,
        alerts: snapshot.events.whistleCount,
        cameraAlertRevision: snapshot.events.cameraAlertRevision ?? 0,
      });
      showFlash('red');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  useAnimatedReaction(() => state.value.events.caught, (value, previous) => {
    if (value !== previous) scheduleOnRN(showCaught, value);
  });
  useAnimatedReaction(() => {
    const e=state.value.events;
    return `${e.phase}|${e.theftWhistleRevision}|${e.spottedWhistleRevision}|${Math.ceil(e.lockdownRemaining)}|${e.lockdownActive}`;
  }, (value,previous)=>{
    if(value===previous)return;
    const e=state.value.events;
    scheduleOnRN(setPhaseInfo,{phase:e.phase,theft:e.theftWhistleRevision,spotted:e.spottedWhistleRevision,
      remaining:Math.ceil(e.lockdownRemaining),lockdown:e.lockdownActive});
  });
  const alertBanner=(message:string)=>{
    if(bannerTimer.current)clearTimeout(bannerTimer.current);
    setBanner(message);bannerTimer.current=setTimeout(()=>setBanner(''),1800);
  };
  useAnimatedReaction(() => state.value.events.theftRevision, (value,previous)=>{
    if(value>0 && value!==previous && !state.value.events.globalAlert && !state.value.events.spottedEpisode) scheduleOnRN(alertBanner,'THEFT ALERT');
  });
  useAnimatedReaction(() => state.value.events.spottedWhistleRevision, (value,previous)=>{
    if(value>0 && value!==previous)scheduleOnRN(alertBanner,'PLAYER SPOTTED');
  });
  useAnimatedReaction(() => state.value.events.cameraAlertRevision ?? 0, (value,previous)=>{
    if(value>0 && value!==previous)scheduleOnRN(alertBanner,'CAMERA ALERT');
  });
  const treasureAcquired = () => {
    setSecured(true);
    setPickupRevision((revision) => revision + 1);
    showFlash('cyan');
    setBanner('OBJECTIVE SECURED');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => {
      setBanner('ESCAPE TO THE EXIT');
      bannerTimer.current = setTimeout(() => setBanner(''), 1800);
    }, 1000);
  };
  useAnimatedReaction(() => state.value.mission.treasureRevision, (value, previous) => {
    if (value > 0 && value !== previous) scheduleOnRN(treasureAcquired);
  });
  useAnimatedReaction(() => state.value.mission.complete, (value, previous) => {
    if (value !== previous) scheduleOnRN(setCompleted, value);
  });
  useAnimatedReaction(() => tiltEnabled ? controller.value.status : 'PLAY', (value, previous) => {
    if (value !== previous) scheduleOnRN(setTiltStatus, value);
  });

  useEffect(() => () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
  }, []);

  useEffect(()=>{
    if(!completed){finishDim.set(0);return;}
    finishDim.set(withTiming(0.28,{duration:MISSION_FINISH_HOLD_MS}));
    const timer=setTimeout(()=>setResultVisible(true),MISSION_FINISH_HOLD_MS);
    return ()=>{clearTimeout(timer);cancelAnimation(finishDim);};
  },[completed,finishDim]);

  useEffect(() => {
    if (!completed || clearReported.current) return;
    clearReported.current = true;
    const snapshot = state.get();
    setResult({ seconds: snapshot.t, alerts: snapshot.events.whistleCount });
    onStageCleared(snapshot.t, snapshot.events.whistleCount);
  }, [completed, onStageCleared, state]);

  const index = missionIndex(definition.id);
  const chapterFinal = definition.mission === CHAPTER_MISSION_COUNTS[(definition.chapter ?? 1)-1];
  // The clear has been recorded (this render already holds the progress after it): only then is "next" offered.
  const actions = resultActions({ index, missionCount: MISSION_COUNT, chapterFinal,
    nextPlayable: canPlayMission(migrateCampaign(progress), index+1, QA_UNLOCK_ALL) });
  const onResultAction = (action: ResultAction) => {
    // Buttons exist only after the clear was reported and stored in the session.
    if (!clearReported.current) return;
    if (action === 'home') { home(); return; }
    if (action === 'chapters') { chapterSelect(); return; }
    if (action === 'retry') { playUI('ui_select'); retry(); return; }
    if (monetization.adPresenting) { monetization.confirmAdDismissed(); return; }
    playUI('ui_select'); onNextStage();
  };

  const stopAndPause = () => {
    pausedValue.set(true);
    stick.set(STICK_IDLE);
    state.modify((s) => { 'worklet'; stopPlayer(s.player); return s; });
    setPaused(true);
    setPauseFeedback('');
  };
  const beginInspection = () => {
    if (!__DEV__) return;
    inspectionDoors.set(state.get().doors?.map(door => ({ ...door })));
    inspectionActive.set(true);
    setInspection('Entry');
  };
  const exitInspection = () => {
    if (!__DEV__) return;
    qaDoorRequest.set(false);
    inspectionActive.set(false);
    inspectionDoors.set(undefined);
    setQaLockdown(false);
    setInspection(null);
  };
  const resume = () => {
    pausedValue.set(false);
    setSettings(false);
    setPaused(false);
    setPauseFeedback('');
  };
  const recenter = () => {
    if (!tiltEnabled) {
      setPauseFeedback('TOUCH CONTROL ACTIVE');
      return;
    }
    controller.modify((s) => { 'worklet'; recenterTilt(s, sample.value, Date.now()); return s; });
    inputReset.set(inputReset.get() + 1);
    state.modify((s) => { 'worklet'; stopPlayer(s.player); return s; });
    setPauseFeedback('CENTER RESET');
    void Haptics.selectionAsync().catch(() => {});
  };
  const retry = () => {
    track('mission_retry', missionProps());
    track('mission_start', missionProps());
    const fresh = freshViewState();
    fresh.touchSeq = touch.value.seq;
    state.set(fresh);
    accumulated.set(0);
    clearReported.current = false;
    setCaught(false);
    setCompleted(false);setResultVisible(false);setAudioSession(v=>v+1);
    setPhaseInfo({phase:'STEALTH',theft:0,spotted:0,remaining:0,lockdown:false});
    setBanner('');
    setSecured(false);
    setFlash(null);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    resume();
  };

  useFrameCallback((frame) => {
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    // Reanimated executes this callback on the UI frame, not during React render.
    // eslint-disable-next-line react-hooks/purity -- UI-thread frame callback, not component render; sensor timestamps use wall time.
    const now = Date.now();
    if (tiltEnabled && !transitioning) {
      controller.modify((s) => { 'worklet'; stepTilt(s, active.value ? sample.value : null, now, dt, tuning.value); return s; });
    }
    if (__DEV__ && inspectionActive.value) {
      if (qaDoorRequest.value) inspectionDoors.modify(doors => {
        'worklet';
        const s = state.value;
        const actors = [{ x: s.player.x, y: s.player.y, radius: BODY.playerRadius },
          ...s.guards.map(g => ({ x: g.x, y: g.y, radius: BODY.guardRadius }))];
        stepDoors(doors ?? [], dt, s.lockdownDoorIds ?? [], actors);
        return doors;
      });
      return;
    }
    if (awaitingReady && resources && readyFrames.value >= 0) {
      readyFrames.value += 1;
      if (readyFrames.value >= READY_FRAMES) { readyFrames.value = -1; scheduleOnRN(reportReady); }
    }
    // Behind a full-screen ad the finished scene stands still: nothing is simulated, so nothing is redrawn into a
    // canvas that is completely covered (see MISSION_COVER_OPACITY for what a covered canvas costs).
    if (pausedValue.value || transitioning || adCovering || !resources) return;
    const tiltInput = tiltEnabled ? {
      x: controller.value.x,
      y: controller.value.y,
      paused: !active.value || (controller.value.status !== 'PLAY' && controller.value.status !== 'CENTER RESET'),
      reset: inputReset.value,
    } : stickEnabled ? { x: stick.value.x, y: stick.value.y, paused: false, reset: inputReset.value } : undefined;
    const elapsed = accumulated.value + dt;
    const steps = Math.floor(elapsed * 60);
    accumulated.value = elapsed - steps / 60;
    const tch = touch.value;
    const previousTilt = previousTiltEnabled.value;
    previousTiltEnabled.value = tiltEnabled;
    state.modify((s) => {
      'worklet';
      syncInputMode(s, previousTilt, tiltEnabled, tch.seq);
      s.playerMode = tiltEnabled || stickEnabled ? -2 : playerMode.value;
      s.patrol = true;
      if (!tiltEnabled && !stickEnabled && tch.seq !== s.touchSeq) {
        s.touchSeq = tch.seq;
        s.player.tx = tch.x / zoom + s.cam.x;
        s.player.ty = tch.y / zoom + s.cam.y;
        s.player.hasTarget = true;
      }
      for (let i = 0; i < steps; i++) {
        stepPlayground(s, 1 / 60, TILE, viewW, viewH, bounds, movementBlockers, visionBlockers, navigation, tiltInput);
      }
      return s;
    });
  });

  const onTouch = (x: number, y: number, down: boolean) => {
    if (tiltEnabled || pausedValue.value || caught || completed) return;
    if (stickEnabled) {
      // The thumb steers: direction and speed follow the drag from where it landed. Nothing moves by itself.
      stick.set(down ? stickDown(x, y) : stickMove(stick.value, x, y));
      return;
    }
    touch.set({ x, y, seq: touch.value.seq + 1 });
  };
  const releaseStick = () => stick.set(STICK_IDLE);
  // A pause, a capture or a clear with the thumb still down must not leave a direction behind.
  useEffect(() => { if (paused || caught || completed || !stickEnabled) stick.set(STICK_IDLE); }, [paused, caught, completed, stickEnabled, stick]);

  const empty = useMemo(() => {
    const rec = Skia.PictureRecorder();
    rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
    return rec.finishRecordingAsPicture();
  }, []);
  // Camera is supplied only to the renderer; simulation camera/actors remain untouched.
  const inspectionCamera = useMemo(() => {
    if (!__DEV__ || !inspection) return null;
    const door = stage.doors?.find(d => d.id === definition.lockdownDoors?.[0]);
    const point = inspection === 'Entry' ? stage.playerSpawn : inspection === 'Objective' ? stage.objective
      : inspection === 'Exit' ? { x: stage.exit.x + stage.exit.w / 2, y: stage.exit.y + stage.exit.h / 2 }
      : inspection === 'Escape' ? (door ?? { x: stage.exit.x + stage.exit.w / 2, y: stage.exit.y + stage.exit.h / 2 })
      : { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 };
    const cameraZoom = inspection === 'Overview' ? Math.min(width / (bounds.w + TILE), height / (bounds.h + TILE)) : zoom;
    const w = width / cameraZoom, h = height / cameraZoom;
    return { zoom: cameraZoom, cam: {
      x: bounds.w <= w ? bounds.x + (bounds.w - w) / 2 : Math.max(bounds.x, Math.min(bounds.x + bounds.w - w, point.x - w / 2)),
      y: bounds.h <= h ? bounds.y + (bounds.h - h) / 2 : Math.max(bounds.y, Math.min(bounds.y + bounds.h - h, point.y - h / 2)),
    } };
  }, [inspection, stage, definition, bounds, width, height, zoom]);
  const picture = useDerivedValue(() => {
    if (!resources) return empty;
    if (__DEV__ && inspectionCamera) return renderPlaygroundFrame({ ...state.value, cam: inspectionCamera.cam, doors: inspectionDoors.value }, { ...resources, zoom: inspectionCamera.zoom }, false);
    return __DEV__ && motionDebug ? renderPlaygroundFrame(state.value, resources, true)
      : renderPlaygroundFrame(state.value, resources, false);
  }, [resources,motionDebug,inspectionCamera]);

  const calibrationVisible = tiltEnabled && !caught && !completed &&
    (tilt.error || ['HOLD COMFORTABLY', 'SENSOR PAUSED', 'READY'].includes(tiltStatus));

  return (
    <View style={styles.root}>
      <Canvas style={StyleSheet.absoluteFill}><Picture picture={picture} /></Canvas>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={paused || caught || completed || calibrationVisible ? 'none' : 'auto'}
        onStartShouldSetResponder={() => !tiltEnabled}
        onMoveShouldSetResponder={() => !tiltEnabled}
        onResponderGrant={(event) => onTouch(event.nativeEvent.pageX, event.nativeEvent.pageY, true)}
        onResponderRelease={releaseStick}
        onResponderTerminate={releaseStick}
        onResponderMove={(event) => onTouch(event.nativeEvent.pageX, event.nativeEvent.pageY, false)}
      />

      {!inspection && <>
      <StageHeader number={definition.number} code={definition.id} title={missionName(missionIndex(definition.id),progress.language)} top={insets.top} onPause={stopAndPause} onRecenter={recenter} />

      <View pointerEvents="none" style={[styles.secured, { top: insets.top + 55 }]}><Text style={styles.securedText}>{secured ? `◇ ${t(definition.objective?.kind==='diamond'?'diamond':'secured')}` : `${t('target')} · ${t(valuableKey[definition.objective?.kind ?? 'diamond'])}`}</Text></View>

      {alertHudVisible(phaseInfo.phase,phaseInfo.remaining,phaseInfo.lockdown,completed||caught) && <View pointerEvents="none" style={[styles.phaseHud,{top:insets.top+77}]}>
        <Text style={styles.phaseText}>{t(phaseInfo.phase==='THEFT_ALERT'?'theft':phaseInfo.phase==='PLAYER_SPOTTED'?'spotted':phaseInfo.phase==='SEARCH'?'searching':'returning')}</Text>
        {(phaseInfo.remaining>0||phaseInfo.lockdown)&&<Text style={styles.lockdownText}>{phaseInfo.lockdown?t('lockdownActive'):`${t('lockdownIn')} ${phaseInfo.remaining}`}</Text>}
      </View>}
      {!!banner && <View pointerEvents="none" style={[styles.banner, { top: insets.top + (phaseInfo.phase==='STEALTH'?80:125) }]}><Text style={styles.bannerText}>{feedbackKey(banner)?t(feedbackKey(banner)):banner}</Text></View>}

      {calibrationVisible && <View style={[styles.modal, styles.modalFront]}>
        <Text style={styles.modalTitle}>{tilt.error || (tiltStatus==='HOLD COMFORTABLY'?t('hold'):tiltStatus==='READY'?t('ready'):t('sensorPaused'))}</Text>
        <Text style={styles.modalBody}>{t('calibration')}</Text>
        {!!tilt.error && <Pressable onPress={tilt.restart} style={styles.button}><Text style={styles.buttonText}>{t('sensorRetry')}</Text></Pressable>}
      </View>}

      </>}
      {paused && !settings && !replayIntro && !inspection && <View accessibilityViewIsModal style={[styles.modal, styles.modalFront]}>
        {__DEV__&&<NativeQAObserver state={state} zoom={zoom} width={width} height={height} paused={paused} transitioning={transitioning} cadence={qaCadence}/>}
        <Text style={styles.modalTitle}>{t('paused')}</Text>
        {__DEV__ && tilt.compareEnabled && <TiltProfileSelector profile={tilt.profile} onSelect={profile => {
          tilt.selectProfile(profile);
          state.modify(s => { 'worklet'; stopPlayer(s.player); return s; });
          setPauseFeedback(`TILT ${profile} · NEUTRAL PRESERVED`);
        }} />}
        {!!pauseFeedback && <Text style={styles.feedback}>{feedbackKey(pauseFeedback)?t(feedbackKey(pauseFeedback)):pauseFeedback}</Text>}
          <Pressable accessibilityRole="button" onPress={()=>{playUI('ui_select');resume();}} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('resume')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={recenter} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('recenter')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={()=>{playUI('ui_select');retry();}} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('restart')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { playUI('ui_select'); setPauseFeedback(''); setSettings(true); }} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('settings')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={home} style={styles.button}><Text style={styles.buttonText}>{t('home')}</Text></Pressable>
          {__DEV__&&<Pressable accessibilityRole="button" onPress={beginInspection} style={styles.button}><Text style={styles.buttonText}>LIVE VISUAL QA</Text></Pressable>}
          {__DEV__&&<Pressable accessibilityRole="button" onPress={()=>{setMotionDebug(true);resume();}} style={styles.button}><Text style={styles.buttonText}>CHARACTER MOTION DEBUG</Text></Pressable>}
      </View>}

      {paused && settings && <View accessibilityViewIsModal style={[StyleSheet.absoluteFill,{zIndex:101,elevation:101}]}><SettingsScreen onBack={()=>setSettings(false)} onIntro={()=>setReplayIntro(true)}/></View>}
      {replayIntro && <View style={[StyleSheet.absoluteFill,{zIndex:102,elevation:102}]}><BrandingScreen soundEnabled={soundEnabled} musicEnabled={progress.musicEnabled} onStart={home} onFinished={menuHome}/></View>}
      {caught && <View accessibilityViewIsModal style={[styles.modal, styles.modalFront]}>
        {__DEV__&&<NativeQAObserver state={state} zoom={zoom} width={width} height={height} paused={paused} transitioning={transitioning} cadence={qaCadence}/>}
        <Text style={[styles.modalTitle, styles.caught]}>{t('caught')}</Text>
        {__DEV__&&<Pressable accessibilityRole="button" onPress={()=>setMotionDebug(true)} style={styles.button}><Text style={styles.buttonText}>CAPTURE DIAGNOSTICS</Text></Pressable>}
        <Pressable onPress={()=>{playUI('ui_select');retry();}} style={styles.primaryButton}><Text style={styles.primaryText}>{t('retry')}</Text></Pressable>
        <Pressable onPress={chapterSelect} style={styles.button}><Text style={styles.buttonText}>{t('chapters')}</Text></Pressable>
        <Pressable onPress={home} style={styles.button}><Text style={styles.buttonText}>{t('home')}</Text></Pressable>
      </View>}

      {completed&&!transitioning&&<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill,{backgroundColor:'#000'},finishDimStyle]}/>}
      {resultVisible && !transitioning && <>
        {__DEV__&&<NativeQAObserver state={state} zoom={zoom} width={width} height={height} paused={paused} transitioning={transitioning} cadence={qaCadence}/>}
        <MissionResult title={chapterFinal ? t('chapter') : t('mission')} name={missionName(index,progress.language)}
          seconds={result.seconds} alerts={result.alerts} best={migrateCampaign(progress).records[definition.id]?.bestTime ?? result.seconds}
          nextName={actions.primary==='chapters'?undefined:missionName(index+1,progress.language)}
          primary={actions.primary} secondary={actions.secondary} onAction={onResultAction}/>
      </>}
      {flash && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flash === 'cyan' ? 'rgba(70,225,255,0.24)' : 'rgba(255,40,40,0.30)' }]} />}
      {stickEnabled && !paused && !caught && !completed && !inspection && <TouchStickHud stick={stick} hint={t('touchHint')} bottom={insets.bottom + 10}
        note={input.fallback ? t('controlFallback') : undefined} retryLabel={t('sensorRetry')} onRetry={input.fallback && tilt.canRetry ? tilt.restart : undefined}/>}
      {__DEV__ && input.kind === 'tap' && !tiltEnabled && !paused && !caught && !completed && !motionDebug && <View style={[styles.touchControls, { bottom: insets.bottom + 8 }]}>
        <Text style={styles.feedback}>TOUCH · TAP TO MOVE</Text>
        {tilt.canRetry && !!tilt.error && <Pressable accessibilityRole="button" onPress={tilt.restart} style={styles.touchMode}><Text style={styles.buttonText}>{t('sensorRetry')}</Text></Pressable>}
        <View style={{ flexDirection: 'row', gap: 6 }}>{['IDLE', 'SNEAK', 'WALK', 'RUN'].map((label, mode) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: touchMode === mode }} onPress={() => selectTouchMode(mode)} style={[styles.touchMode, touchMode === mode && { borderColor: '#54DDF7' }]}><Text style={styles.buttonText}>{label}</Text></Pressable>)}</View>
      </View>}
      {__DEV__&&!inspection&&motionDebug&&resources&&<CharacterMotionDebug state={state} resources={resources} blockers={movementBlockers} bottom={insets.bottom+4} onClose={()=>setMotionDebug(false)} onMode={tiltEnabled?undefined:selectTouchMode}/>}
      {__DEV__ && !inspection && tilt.compareEnabled && <TiltProfileDebug profile={tilt.profile} controller={controller} state={state} bottom={insets.bottom + 52} enabled={tiltEnabled && !transitioning} />}
      {__DEV__&&!inspection&&<NativeQAObserver state={state} zoom={zoom} width={width} height={height} paused={paused} transitioning={transitioning} cadence={qaCadence}/>}
      {__DEV__&&inspection&&<LiveVisualQA mission={definition.id} selected={inspection} top={insets.top} bottom={insets.bottom} onView={setInspection} onExit={exitInspection} lockdown={qaLockdown} onLockdown={()=>{qaDoorRequest.set(true);setQaLockdown(true);setInspection('Escape');}}/>}
    </View>
  );
}

const styles = StyleSheet.create({
  transitionCover:{backgroundColor:'#000',zIndex:200,elevation:200},
  transitionName:{position:'absolute',alignSelf:'center',top:'43%',padding:22,borderRadius:12,backgroundColor:'#071219E8',alignItems:'center',gap:8},
  transitionCode:{color:'#93E5ED',fontSize:13,fontWeight:'800',letterSpacing:3},
  transitionTitle:{color:'#EDF2F3',fontSize:20,fontWeight:'700'},
  phaseHud:{position:'absolute',alignSelf:'center',alignItems:'center',gap:3,paddingHorizontal:10,paddingVertical:5,borderRadius:6,backgroundColor:'#0D151DDF'},
  phaseText:{color:'#F18E78',fontSize:10,fontWeight:'800',letterSpacing:1.4},
  lockdownText:{color:'#EFC48D',fontSize:11,fontWeight:'800',fontVariant:['tabular-nums']},
  nextMissionName:{color:'#87C8D7',fontSize:11,fontWeight:'600'},
  touchControls: { position: 'absolute', alignSelf: 'center', alignItems: 'center', gap: 6, padding: 8, borderRadius: 10, backgroundColor: '#081824EE' },
  touchMode: { paddingHorizontal: 10, paddingVertical: 13, borderWidth: 1, borderColor: '#354758', borderRadius: 7 },
  secured: { position: 'absolute', alignSelf: 'center' },
  securedText: { color: '#9beeff', fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  stageGrid: { width: 230, flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  stageCell: { width: 65, padding: 12, alignItems: 'center', backgroundColor: '#263342', borderRadius: 6 },
  locked: { opacity: 0.3 },
  root: { flex: 1, backgroundColor: '#05070b' },
  titleScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, backgroundColor: '#05070b' },
  logo: { color: '#f5f6f8', fontSize: 37, fontWeight: '900', letterSpacing: 7 },
  tagline: { color: '#7f8a9b', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginBottom: 30 },
  primaryButton: { minWidth: 170, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 16, borderWidth:1, borderColor:'#3ED5FA', backgroundColor: '#03131B' },
  primaryText: { color: '#54DDF7', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  button: { minWidth: 170, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 16, backgroundColor: '#04121DDD', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  buttonPressed: { backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ scale: 0.98 }] },
  buttonText: { color: '#e6e9ef', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  modal: { position: 'absolute', top: '31%', alignSelf: 'center', minWidth: 250, alignItems: 'center', gap: 14, padding: 28, borderRadius: 16, backgroundColor: 'rgba(8,11,17,0.96)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  modalFront: { zIndex: 100, elevation: 100 },
  feedback: { color: '#9beeff', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  modalTitle: { color: '#f1f2f4', fontSize: 20, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  modalBody: { color: '#aab2bf', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  caught: { color: '#ff655c', fontSize: 31 },
  complete: { color: '#83eabb', fontSize: 23 },
  banner: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 8, backgroundColor: 'rgba(5,20,28,0.9)', borderWidth: 1, borderColor: 'rgba(90,225,255,0.55)' },
  bannerText: { color: '#9beeff', fontSize: 12, fontWeight: '900', letterSpacing: 1.8 },
});
