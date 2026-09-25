import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Canvas, Picture, Skia, TileMode, matchFont } from '@shopify/react-native-skia';
import type { SkFont, SkPaint } from '@shopify/react-native-skia';
import { useAnimatedReaction, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

import { playableStages } from '../game/levels/stages/tiltTestMaps';
import type { StageDefinition } from '../game/levels/StageDefinition';
import { compileStage, TILE, WALL_HEIGHT } from '../game/world/compileStage';
import { createPlaygroundState, stepPlayground } from '../game/playground/playgroundState';
import { buildNavigation } from '../game/world/navigation';
import { BODY } from '../game/guards/guardTuning';
import { ASSET_MANIFEST } from '../assets/manifest';
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
import { canSelectStage, clearStage, DEFAULT_PROGRESS, loadProgress, saveProgress } from '../game/progress/stageProgress';
import type { StageProgress } from '../game/progress/stageProgress';
import { useWhistleAudio } from '../game/audio/useWhistleAudio';
import { usePickupAudio } from '../game/audio/usePickupAudio';

const VIEW_TILES_WIDE = 9.4;

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

export function VisualPlaygroundScreen() {
  const [progress, setProgress] = useState<StageProgress>(DEFAULT_PROGRESS);
  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let mounted = true;
    void loadProgress().then((value) => {
      if (!mounted) return;
      setProgress(value);
      setLoaded(true);
    });
    return () => { mounted = false; };
  }, []);

  const updateProgress = (next: StageProgress) => {
    setProgress(next);
    void saveProgress(next).catch(() => { /* Keep the in-memory session playable if storage fails. */ });
  };

  if (!loaded) return <View style={styles.root} />;
  if (!started) {
    return (
      <View style={styles.titleScreen}>
        <Text style={styles.logo}>DON&apos;T MOVE</Text>
        <Text style={styles.tagline}>TILT STEALTH HEIST</Text>
        <Pressable style={styles.primaryButton} onPress={() => setStarted(true)} accessibilityRole="button">
          <Text style={styles.primaryText}>START</Text>
        </Pressable>
      </View>
    );
  }

  return <GameRun progress={progress} onProgress={updateProgress} />;
}

function GameRun({ progress, onProgress }: { progress: StageProgress; onProgress: (next: StageProgress) => void }) {
  const [index, setIndex] = useState(progress.currentStage);
  const tilt = useTiltControl();
  const definition = playableStages[index];

  const stageCleared = (seconds: number) => onProgress(clearStage(progress, index, seconds));
  const selectStage = (selected: number, devUnlock = false) => {
    if (!canSelectStage(progress, selected, __DEV__ && devUnlock)) return;
    onProgress({ ...progress, currentStage: selected });
    setIndex(selected);
  };
  const setSoundEnabled = (enabled: boolean) => onProgress({ ...progress, soundEnabled: enabled });
  const nextStage = () => {
    if (index < playableStages.length - 1) setIndex(index + 1);
    else {
      onProgress({ ...progress, currentStage: 0 });
      setIndex(0);
    }
  };

  return (
    <StageGame
      key={definition.id}
      definition={definition}
      tilt={tilt}
      soundEnabled={progress.soundEnabled}
      onSoundEnabled={setSoundEnabled}
      onStageCleared={stageCleared}
      onNextStage={nextStage}
      progress={progress}
      onSelectStage={selectStage}
    />
  );
}

type TiltControl = ReturnType<typeof useTiltControl>;

function StageGame({
  definition,
  tilt,
  soundEnabled,
  onSoundEnabled,
  onStageCleared,
  onNextStage,
  progress,
  onSelectStage,
}: {
  definition: StageDefinition;
  tilt: TiltControl;
  soundEnabled: boolean;
  onSoundEnabled: (enabled: boolean) => void;
  onStageCleared: (seconds: number) => void;
  onNextStage: () => void;
  progress: StageProgress;
  onSelectStage: (stage: number, devUnlock?: boolean) => void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const stage = useMemo(() => compileStage(definition), [definition]);
  const navigation = useMemo(() => buildNavigation(stage, BODY.guardRadius), [stage]);
  const bounds = useMemo(
    () => ({ x: 0, y: -WALL_HEIGHT, w: stage.width, h: stage.height + WALL_HEIGHT }),
    [stage],
  );
  const assets = useGameAssets(ASSET_MANIFEST);
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
      diamond: assets.museum?.diamond ?? null,
      diamondPos: stage.objective,
      exit: Skia.XYWHRect(stage.exit.x, stage.exit.y, stage.exit.w, stage.exit.h),
      showObjective: true,
      debug: createDebugArt(debugFont()),
      vignette: makeVignette(width, height),
      screen: Skia.XYWHRect(0, 0, width, height),
      zoom,
    };
  }, [assets, stage, width, height, zoom]);

  const state = useSharedValue(createPlaygroundState(stage));
  const accumulated = useSharedValue(0);
  const pausedValue = useSharedValue(false);
  const playerMode = useSharedValue(2);
  const touch = useSharedValue({ x: 0, y: 0, seq: 0 });
  const [caught, setCaught] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState(false);
  const [pauseFeedback, setPauseFeedback] = useState('');
  const [banner, setBanner] = useState('');
  const [secured, setSecured] = useState(false);
  const [flash, setFlash] = useState<'cyan' | 'red' | null>(null);
  const [stageSelect, setStageSelect] = useState(false);
  const [devUnlock, setDevUnlock] = useState(false);
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
  const treasureAcquired = () => {
    setSecured(true);
    setPickupRevision((revision) => revision + 1);
    showFlash('cyan');
    setBanner('DIAMOND ACQUIRED');
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
    onStageCleared(snapshot.t);
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
    setStageSelect(false);
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
    const fresh = createPlaygroundState(stage);
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
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    if (tiltEnabled) {
      controller.modify((s) => { 'worklet'; stepTilt(s, active.value ? sample.value : null, now, dt, tuning.value); return s; });
    }
    if (pausedValue.value || !resources) return;
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
    return renderPlaygroundFrame(state.value, resources, false);
  }, [resources]);

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

      <StageHeader number={definition.number} title={definition.title} top={insets.top} onPause={stopAndPause} onRecenter={recenter} />

      {secured && <View pointerEvents="none" style={[styles.secured, { top: insets.top + 55 }]}><Text style={styles.securedText}>◇ DIAMOND SECURED</Text></View>}

      {!!banner && <View style={[styles.banner, { top: insets.top + 80 }]}><Text style={styles.bannerText}>{banner}</Text></View>}

      {calibrationVisible && <View style={[styles.modal, styles.modalFront]}>
        <Text style={styles.modalTitle}>{tilt.error || tiltStatus}</Text>
        <Text style={styles.modalBody}>편하게 든 자세에서 잠시 멈춰 주세요</Text>
        {!!tilt.error && <Pressable onPress={tilt.restart} style={styles.button}><Text style={styles.buttonText}>RETRY SENSOR</Text></Pressable>}
      </View>}

      {paused && <View style={[styles.modal, styles.modalFront]}>
        <Text style={styles.modalTitle}>{stageSelect ? 'STAGE SELECT' : settings ? 'SETTINGS' : 'PAUSED'}</Text>
        {!!pauseFeedback && !settings && !stageSelect && <Text style={styles.feedback}>{pauseFeedback}</Text>}
        {stageSelect ? <>
          <View style={styles.stageGrid}>{playableStages.map((entry, i) => {
            const unlocked = canSelectStage(progress, i, __DEV__ && devUnlock);
            return <Pressable key={entry.id} disabled={!unlocked} accessibilityLabel={`Stage ${entry.number}${unlocked ? '' : ' locked'}`} onPress={() => {
              if (i === definition.number - 1) retry();
              else onSelectStage(i, devUnlock);
            }} style={[styles.stageCell, !unlocked && styles.locked]}>
              <Text style={styles.buttonText}>{String(entry.number).padStart(2, '0')}{progress.clearedStages.includes(i) ? ' ✓' : unlocked ? '' : ' ·'}</Text>
            </Pressable>;
          })}</View>
          {__DEV__ && <Pressable onPress={() => setDevUnlock(!devUnlock)} style={styles.button}><Text style={styles.buttonText}>DEV UNLOCK {devUnlock ? 'ON' : 'OFF'}</Text></Pressable>}
          <Pressable onPress={() => setStageSelect(false)} style={styles.button}><Text style={styles.buttonText}>BACK</Text></Pressable>
        </> : settings ? <>
          <Pressable onPress={() => onSoundEnabled(!soundEnabled)} style={styles.button}><Text style={styles.buttonText}>SOUND {soundEnabled ? 'ON' : 'OFF'}</Text></Pressable>
          <Pressable onPress={() => setStageSelect(true)} style={styles.button}><Text style={styles.buttonText}>STAGE SELECT</Text></Pressable>
          <Pressable onPress={() => setSettings(false)} style={styles.button}><Text style={styles.buttonText}>BACK</Text></Pressable>
        </> : <>
          <Pressable accessibilityRole="button" onPress={resume} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>RESUME</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={recenter} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>RECENTER</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={retry} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>RESTART</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { setPauseFeedback(''); setSettings(true); }} style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}><Text style={styles.buttonText}>SETTINGS</Text></Pressable>
        </>}
      </View>}

      {caught && <View style={[styles.modal, styles.modalFront]}>
        <Text style={[styles.modalTitle, styles.caught]}>CAUGHT</Text>
        <Pressable onPress={retry} style={styles.primaryButton}><Text style={styles.primaryText}>RETRY</Text></Pressable>
      </View>}

      {completed && <View style={[styles.modal, styles.modalFront]}>
        <Text style={[styles.modalTitle, styles.complete]}>{definition.number === 10 ? 'CHAPTER COMPLETE' : 'MISSION COMPLETE'}</Text>
        <Text style={styles.modalBody}>{definition.title}</Text>
        <Text style={styles.modalBody}>CLEAR TIME {result.seconds.toFixed(1)}s</Text>
        <Text style={styles.modalBody}>ALERTS {result.alerts}</Text>
        <Text style={styles.modalBody}>BEST TIME {(progress.bestTimes[definition.number - 1] ?? result.seconds).toFixed(1)}s</Text>
        <Pressable onPress={onNextStage} style={styles.primaryButton}><Text style={styles.primaryText}>{definition.number === 10 ? 'PLAY AGAIN' : 'NEXT STAGE'}</Text></Pressable>
        <Pressable onPress={retry} style={styles.button}><Text style={styles.buttonText}>RETRY STAGE</Text></Pressable>
      </View>}
      {flash && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: flash === 'cyan' ? 'rgba(70,225,255,0.24)' : 'rgba(255,40,40,0.30)' }]} />}
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
  primaryButton: { minWidth: 170, alignItems: 'center', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 8, backgroundColor: '#dce4ee' },
  primaryText: { color: '#0a0d12', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  button: { minWidth: 170, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
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
