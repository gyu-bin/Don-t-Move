import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture, Skia, TileMode, matchFont } from '@shopify/react-native-skia';
import type { SkFont, SkPaint } from '@shopify/react-native-skia';
import Animated, {cancelAnimation,useAnimatedStyle,withTiming,useAnimatedReaction, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

import {campaignStages as playableStages} from '../game/levels/campaignStages';
import {missionId,missionIndex,missionName} from '../game/levels/campaignCatalog';
import {migrateCampaign,completeMission} from '../game/progress/campaignProgress';
import type { StageDefinition } from '../game/levels/StageDefinition';
import { compileStage, TILE, WALL_HEIGHT } from '../game/world/compileStage';
import { createPlaygroundState, stepPlayground } from '../game/playground/playgroundState';
import { guardStrideContract } from '../rendering/characters/guardAnimation';
import { buildNavigation } from '../game/world/navigation';
import { BODY } from '../game/guards/guardTuning';
import { ASSET_MANIFEST, PLAYTEST_MANIFEST } from '../assets/manifest';
import { finalCharacterIssues } from '../assets/characterReadiness';
import { useGameAssets } from '../assets/useGameAssets';
import { createCharacterVisual } from '../rendering/characters/characterVisual';
import { createDebugArt } from '../rendering/debug/guardDebug';
import { createIconArt } from '../rendering/effects/alertIcons';
import { createLightFx } from '../rendering/effects/lightFx';
import { createConeArt } from '../rendering/effects/visionCone';
import { buildStageArt } from '../rendering/environment/buildStageArt';
import { GUARD_PALETTE, PLAYER_PALETTE } from '../rendering/fallback/characterPalettes';
import { createCharacterArt } from '../rendering/fallback/proceduralCharacter';
import { renderPlaygroundFrame } from '../rendering/renderFrame';
import type { RenderResources } from '../rendering/renderFrame';
import { StageHeader } from './hud/StageHeader';
import { useTiltControl } from '../game/input/useTiltControl';
import { recenterTilt, stepTilt } from '../game/input/tilt';
import { stopPlayer } from '../game/input/tiltMovement';
import { DEFAULT_PROGRESS, loadProgress, saveProgress } from '../game/progress/stageProgress';
import type { StageProgress } from '../game/progress/stageProgress';
import { useWhistleAudio } from '../game/audio/useWhistleAudio';
import { usePickupAudio } from '../game/audio/usePickupAudio';
import { VALUABLES } from '../game/levels/stagePresentation';
import { BrandingScreen } from './branding/BrandingScreen';
import * as SplashScreen from 'expo-splash-screen';
import { markStartup } from './branding/startupMetrics';
import { useMenu } from './menu/MenuContext';
import { SettingsScreen } from './menu/MenuScreens';
import { feedbackKey,valuableKey } from './menu/strings';
import { CharacterMotionDebug } from './CharacterMotionDebug';

const VIEW_TILES_WIDE = 9.4;
const releaseAssetIssues = finalCharacterIssues(ASSET_MANIFEST);

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

export function VisualPlaygroundScreen({ initialProgress, onProgressChange }: { initialProgress?: StageProgress; onProgressChange?: (next:StageProgress)=>void } = {}) {
  const [localProgress, setProgress] = useState<StageProgress>(initialProgress ?? DEFAULT_PROGRESS);
  const progress=onProgressChange&&initialProgress?initialProgress:localProgress;
  const {home,t}=useMenu();
  const [loaded, setLoaded] = useState(!!initialProgress);
  const [started, setStarted] = useState(!!initialProgress);

  useEffect(() => {
    if (initialProgress) return;
    let mounted = true;
    markStartup('storage-start');
    void loadProgress().then((value) => {
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

  return <GameRun progress={progress} onProgress={updateProgress} />;
}

function GameRun({ progress, onProgress }: { progress: StageProgress; onProgress: (next: StageProgress) => void }) {
  const [index, setIndex] = useState(()=>missionIndex(migrateCampaign(progress).lastMission));
  const [pending,setPending]=useState<number|null>(null);
  const transition=useSharedValue(0);
  const transitionStyle=useAnimatedStyle(()=>({opacity:transition.value}));
  const finishTransition=useCallback(()=>{transition.set(withTiming(0,{duration:180},finished=>{if(finished)scheduleOnRN(setPending,null);}));},[transition]);
  useEffect(()=>()=>cancelAnimation(transition),[transition]);
  const tilt = useTiltControl();
  const definition = playableStages[index];

  const stageCleared = (seconds: number, alerts: number) => onProgress({...progress,campaign:completeMission(migrateCampaign(progress),index,seconds,alerts)});
  const nextStage = () => {
    if(pending!==null)return;
    const next=index<playableStages.length-1?index+1:0;
    onProgress({...progress,campaign:{...migrateCampaign(progress),lastMission:missionId(next)}});
    setPending(next);
    transition.set(withTiming(1,{duration:160},finished=>{if(finished)scheduleOnRN(setIndex,next);}));
  };

  return (
    <View style={{flex:1}}><StageGame
      key={definition.id}
      definition={definition}
      tilt={tilt}
      soundEnabled={progress.soundEnabled}
      onStageCleared={stageCleared}
      onNextStage={nextStage}
      progress={progress}
      transitioning={pending!==null}
      onTransitionReady={pending===index?finishTransition:undefined}
    />
    {pending!==null&&<Animated.View style={[StyleSheet.absoluteFill,{backgroundColor:'#0a1823',alignItems:'center',justifyContent:'center'},transitionStyle]}>
      <View style={{width:'52%',height:'48%',borderWidth:2,borderColor:'#627e8b',backgroundColor:'#122838',alignItems:'center',justifyContent:'center',gap:14}}>
        <View style={{position:'absolute',left:'50%',top:0,bottom:0,width:1,backgroundColor:'#6c939a'}}/>
        <Text style={{color:'#e6ecdf',fontSize:20,backgroundColor:'#122838',padding:12}}>{missionId(pending)}</Text>
        <Text style={{color:'#a0c6cc',fontSize:12,textAlign:'center',backgroundColor:'#122838',padding:10}}>{missionName(pending,progress.language)}</Text>
      </View>
    </Animated.View>}</View>
  );
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
  const {t,home}=useMenu();
  const { width, height } = useWindowDimensions();
  const [replayIntro,setReplayIntro]=useState(false);
  const insets = useSafeAreaInsets();
  const stage = useMemo(() => compileStage(definition), [definition]);
  const navigation = useMemo(() => buildNavigation(stage, BODY.guardRadius), [stage]);
  const bounds = useMemo(
    () => ({ x: 0, y: -WALL_HEIGHT-90, w: stage.width, h: stage.height + WALL_HEIGHT+90 }),
    [stage],
  );
  const assets = useGameAssets(PLAYTEST_MANIFEST);
  const zoom = width / (VIEW_TILES_WIDE * TILE);
  const viewW = width / zoom;
  const viewH = height / zoom;

  const resources = useMemo<RenderResources | null>(() => {
    if (!assets || !assets.guard) return null;
    return {
      stage: buildStageArt(stage, assets.museum),
      player: createCharacterVisual(assets.player, createCharacterArt(PLAYER_PALETTE, false)),
      guard: createCharacterVisual(assets.guard, createCharacterArt(GUARD_PALETTE, true)),
      cone: createConeArt(),
      icons: createIconArt(assets.indicators),
      fx: createLightFx(),
      diamond: assets.museum?.[VALUABLES[definition.objective?.kind ?? 'diamond'].sprite] ?? null,
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
  }, [assets, stage, definition, width, height, zoom,insets]);
  useEffect(()=>{
    if(!resources||!onTransitionReady)return;
    let second=0;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(onTransitionReady);});
    return ()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
  },[resources,onTransitionReady]);

  const state = useSharedValue(createPlaygroundState(stage,guardStrideContract(PLAYTEST_MANIFEST.characters.guard)));
  const accumulated = useSharedValue(0);
  const pausedValue = useSharedValue(false);
  const playerMode = useSharedValue(2);
  const touch = useSharedValue({ x: 0, y: 0, seq: 0 });
  const [caught, setCaught] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [motionDebug,setMotionDebug]=useState(false);
  const [settings, setSettings] = useState(false);
  const [pauseFeedback, setPauseFeedback] = useState('');
  const [banner, setBanner] = useState('');
  const [secured, setSecured] = useState(false);
  const [flash, setFlash] = useState<'cyan' | 'red' | null>(null);
  const [result, setResult] = useState({ seconds: 0, alerts: 0 });
  const [pickupRevision, setPickupRevision] = useState(0);
  const [tiltStatus, setTiltStatus] = useState('HOLD COMFORTABLY');
  const [whistleRevision, setWhistleRevision] = useState(0);
  const clearReported = useRef(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { movementBlockers, visionBlockers } = stage;
  const { enabled: tiltEnabled, controller, sample, tuning, active, reset: inputReset } = tilt;

  useWhistleAudio(whistleRevision, soundEnabled);
  usePickupAudio(pickupRevision, soundEnabled);

  const showFlash = (color: 'cyan' | 'red') => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(color);
    flashTimer.current = setTimeout(() => setFlash(null), 220);
  };
  const showCaught = (value: boolean) => {
    setCaught(value);
    if (value) {
      showFlash('red');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  useAnimatedReaction(() => state.value.events.caught, (value, previous) => {
    if (value !== previous) scheduleOnRN(showCaught, value);
  });
  useAnimatedReaction(() => state.value.events.whistleCount, (value, previous) => {
    if (value !== previous) scheduleOnRN(setWhistleRevision, value);
  });
  const alertBanner=(message:string)=>{
    if(bannerTimer.current)clearTimeout(bannerTimer.current);
    setBanner(message);bannerTimer.current=setTimeout(()=>setBanner(''),1800);
  };
  useAnimatedReaction(() => state.value.events.theftRevision, (value,previous)=>{
    if(value>0 && value!==previous)scheduleOnRN(alertBanner,'THEFT ALERT');
  });
  useAnimatedReaction(() => state.value.events.globalAlert, (value,previous)=>{
    if(value && !previous)scheduleOnRN(alertBanner,'PLAYER SPOTTED');
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

  useEffect(() => {
    if (!completed || clearReported.current) return;
    clearReported.current = true;
    const snapshot = state.get();
    setResult({ seconds: snapshot.t, alerts: snapshot.events.whistleCount });
    onStageCleared(snapshot.t, snapshot.events.whistleCount);
  }, [completed, onStageCleared, state]);

  const stopAndPause = () => {
    pausedValue.set(true);
    state.modify((s) => { 'worklet'; stopPlayer(s.player); return s; });
    setPaused(true);
    setPauseFeedback('');
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
    const fresh = createPlaygroundState(stage,guardStrideContract(PLAYTEST_MANIFEST.characters.guard));
    fresh.touchSeq = touch.value.seq;
    state.set(fresh);
    accumulated.set(0);
    clearReported.current = false;
    setCaught(false);
    setCompleted(false);
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
    const now = Date.now();
    if (tiltEnabled) {
      controller.modify((s) => { 'worklet'; stepTilt(s, active.value ? sample.value : null, now, dt, tuning.value); return s; });
    }
    if (pausedValue.value || transitioning || !resources) return;
    const tiltInput = tiltEnabled ? {
      x: controller.value.x,
      y: controller.value.y,
      paused: !active.value || (controller.value.status !== 'PLAY' && controller.value.status !== 'CENTER RESET'),
      reset: inputReset.value,
    } : undefined;
    const elapsed = accumulated.value + dt;
    const steps = Math.floor(elapsed * 60);
    accumulated.value = elapsed - steps / 60;
    const tch = touch.value;
    state.modify((s) => {
      'worklet';
      s.playerMode = tiltEnabled ? -2 : playerMode.value;
      s.patrol = true;
      if (!tiltEnabled && tch.seq !== s.touchSeq) {
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

  const onTouch = (x: number, y: number) => {
    if (tiltEnabled || pausedValue.value || caught || completed) return;
    touch.set({ x, y, seq: touch.value.seq + 1 });
  };

  const empty = useMemo(() => {
    const rec = Skia.PictureRecorder();
    rec.beginRecording(Skia.XYWHRect(0, 0, 1, 1));
    return rec.finishRecordingAsPicture();
  }, []);
  const picture = useDerivedValue(() => {
    if (!resources) return empty;
    return __DEV__ && motionDebug ? renderPlaygroundFrame(state.value, resources, true)
      : renderPlaygroundFrame(state.value, resources, false);
  }, [resources,motionDebug]);

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
        onResponderGrant={(event) => onTouch(event.nativeEvent.locationX, event.nativeEvent.locationY)}
        onResponderMove={(event) => onTouch(event.nativeEvent.locationX, event.nativeEvent.locationY)}
      />

      <StageHeader number={definition.number} code={definition.id} title={missionName(definition.number-1,progress.language)} top={insets.top} onPause={stopAndPause} onRecenter={recenter} />

      <View pointerEvents="none" style={[styles.secured, { top: insets.top + 55 }]}><Text style={styles.securedText}>{secured ? `◇ ${t(definition.objective?.kind==='diamond'?'diamond':'secured')}` : `${t('target')} · ${t(valuableKey[definition.objective?.kind ?? 'diamond'])}`}</Text></View>

      {!!banner && <View style={[styles.banner, { top: insets.top + 80 }]}><Text style={styles.bannerText}>{feedbackKey(banner)?t(feedbackKey(banner)):banner}</Text></View>}

      {calibrationVisible && <View style={[styles.modal, styles.modalFront]}>
        <Text style={styles.modalTitle}>{tilt.error || (tiltStatus==='HOLD COMFORTABLY'?t('hold'):tiltStatus==='READY'?t('ready'):t('sensorPaused'))}</Text>
        <Text style={styles.modalBody}>{t('calibration')}</Text>
        {!!tilt.error && <Pressable onPress={tilt.restart} style={styles.button}><Text style={styles.buttonText}>{t('sensorRetry')}</Text></Pressable>}
      </View>}

      {paused && !settings && !replayIntro && <View accessibilityViewIsModal style={[styles.modal, styles.modalFront]}>
        <Text style={styles.modalTitle}>{t('paused')}</Text>
        {!!pauseFeedback && <Text style={styles.feedback}>{feedbackKey(pauseFeedback)?t(feedbackKey(pauseFeedback)):pauseFeedback}</Text>}
          <Pressable accessibilityRole="button" onPress={resume} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('resume')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={recenter} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('recenter')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={retry} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('restart')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setPauseFeedback(''); setSettings(true); }} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>{t('settings')}</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={home} style={styles.button}><Text style={styles.buttonText}>{t('home')}</Text></Pressable>
          {__DEV__&&<Pressable accessibilityRole="button" onPress={()=>{setMotionDebug(true);resume();}} style={styles.button}><Text style={styles.buttonText}>CHARACTER MOTION DEBUG</Text></Pressable>}
      </View>}

      {paused && settings && <View accessibilityViewIsModal style={[StyleSheet.absoluteFill,{zIndex:101,elevation:101}]}><SettingsScreen onBack={()=>setSettings(false)} onIntro={()=>setReplayIntro(true)}/></View>}
      {replayIntro && <View style={[StyleSheet.absoluteFill,{zIndex:102,elevation:102}]}><BrandingScreen soundEnabled={soundEnabled} musicEnabled={progress.musicEnabled} onStart={home} onFinished={home}/></View>}
      {caught && <View accessibilityViewIsModal style={[styles.modal, styles.modalFront]}>
        <Text style={[styles.modalTitle, styles.caught]}>{t('caught')}</Text>
        {__DEV__&&<Pressable accessibilityRole="button" onPress={()=>setMotionDebug(true)} style={styles.button}><Text style={styles.buttonText}>CAPTURE DIAGNOSTICS</Text></Pressable>}
        <Pressable onPress={retry} style={styles.primaryButton}><Text style={styles.primaryText}>{t('retry')}</Text></Pressable>
        <Pressable onPress={home} style={styles.button}><Text style={styles.buttonText}>{t('home')}</Text></Pressable>
      </View>}

      {completed && <View accessibilityViewIsModal style={[styles.modal, styles.modalFront]}>
        <Text style={[styles.modalTitle, styles.complete]}>{definition.mission === 5 ? t('chapter') : t('mission')}</Text>
        <Text style={styles.modalBody}>{missionName(definition.number-1,progress.language)}</Text>
        <Text style={styles.modalBody}>{t('time')} {result.seconds.toFixed(1)}s</Text>
        <Text style={styles.modalBody}>{t('alerts')} {result.alerts}</Text>
        <Text style={styles.modalBody}>{t('best')} {(migrateCampaign(progress).records[definition.id]?.bestTime ?? result.seconds).toFixed(1)}s</Text>
        <Pressable onPress={onNextStage} style={styles.primaryButton}><Text style={styles.primaryText}>{definition.number === 45 ? t('again') : t('next')}</Text></Pressable>
        <Pressable onPress={retry} style={styles.button}><Text style={styles.buttonText}>{t('retry')}</Text></Pressable>
        <Pressable onPress={home} style={styles.button}><Text style={styles.buttonText}>{t('home')}</Text></Pressable>
      </View>}
      {flash && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flash === 'cyan' ? 'rgba(70,225,255,0.24)' : 'rgba(255,40,40,0.30)' }]} />}
      {__DEV__&&motionDebug&&resources&&<CharacterMotionDebug state={state} resources={resources} blockers={movementBlockers} bottom={insets.bottom+4} onClose={()=>setMotionDebug(false)} onMode={tiltEnabled?undefined:(mode)=>playerMode.set(mode)}/>}
    </View>
  );
}

const styles = StyleSheet.create({
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
