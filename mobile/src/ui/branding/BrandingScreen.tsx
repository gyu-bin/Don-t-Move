import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, Picture, Skia, loadData } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import Animated, { Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND, INTRO_MS, LOBBY_AUDIO_LEAD_MS, introFrame } from './introTimeline';
import { openingLayout } from './openingLayout';
import { drawMuseumScene, type SceneImageKey } from './museumScene';
import { skiaSceneGfx } from './skiaSceneGfx';
import { LOBBY_REVEAL_MS, LobbyRevealContext } from './lobbyReveal';
import { useBrandAudio } from './useBrandAudio';
import { markStartup } from './startupMetrics';
import { createOpeningArtLoader, type OpeningArt } from './openingArtLoader';
import { useMenu } from '../menu/MenuContext';
import { introEndsOnAppState, shouldStartHomeIntro } from '../../ota/startupFlow';
import { SECRET_TAP_COUNT, SECRET_TAP_WINDOW_MS } from '../../game/analytics/secretTap';

const SOURCES: Record<SceneImageKey, number> = {
 bg: require('../../../assets/branding/opening/bg_museum.png'),
 thiefPeek: require('../../../assets/branding/opening/thief_peek.png'),
 thiefSneak: require('../../../assets/branding/opening/thief_sneak.png'),
 thiefFreeze: require('../../../assets/branding/opening/thief_freeze.png'),
 guardAway: require('../../../assets/branding/opening/guard_away.png'),
 guardTurn: require('../../../assets/branding/opening/guard_turn.png'),
 column: require('../../../assets/branding/opening/fg_column_left.png'),
};
type Art = OpeningArt<SkImage>;
const openingArt = createOpeningArtLoader(async key => {
 // Native startup QA only. Unset EXPO_PUBLIC_OPENING_ART_TEST for normal loading.
 // Restart Metro with background-only or guard-failure, then cold-launch the app.
 // Release builds always decode normally, even if the test variable is present.
 const testMode = __DEV__ ? process.env.EXPO_PUBLIC_OPENING_ART_TEST : undefined;
 if ((testMode === 'background-only' && key !== 'bg') || (testMode === 'guard-failure' && key === 'guardTurn')) {
  throw new Error(`[OPENING QA] simulated optional decode failure: ${key}`);
 }
 const image = await loadData(SOURCES[key], data => Skia.Image.MakeImageFromEncoded(data));
 if (!image) throw new Error('Intro image decode failed: ' + key);
 if (key === 'bg') markStartup('intro-background-ready');
 return image;
}, 8000, (key, error) => { if (__DEV__) console.warn('Optional opening art omitted:', key, error); });
/** Resolve when the museum alone can render; optional poses never gate Home. */
export function preloadOpeningArt() { return openingArt.preload(); }

type Props = {
 children?: import('react').ReactNode; skipInitial?: boolean; musicEnabled?: boolean; onFinished?: () => void;
 soundEnabled: boolean; onStart: () => void; onReplayDone?: () => void;
 onSceneReady?: () => void; onLobbyAudioStart?: () => void; ready?: boolean; loadingError?: string; onRetry?: () => void;
 /** Startup-ready signal. The intro waits for it: being mounted does not start the animation. */
 startReady?: boolean;
 /** Home logo/character rapid-tap unlock for local analytics. */
 onSecretUnlock?: () => void;
};
/**
 * Spotlight Freeze Intro and Lobby are ONE scene: the intro animates introFrame(0→4500) and the
 * Lobby simply stays on introFrame(4500). Only the menu (children) fades in afterwards.
 */
export function BrandingScreen({ children, skipInitial = false, soundEnabled, musicEnabled = soundEnabled, onFinished, onStart, onReplayDone, onSceneReady, onLobbyAudioStart, ready = true, loadingError, onRetry, startReady = true, onSecretUnlock }: Props) {
 const { t } = useMenu();
 const { width, height } = useWindowDimensions();
 const insets = useSafeAreaInsets();
 const L = useMemo(() => openingLayout(width, height, insets), [width, height, insets]);
 const secretTaps = useRef<number[]>([]);
 const onSecretTap = () => {
  if (!onSecretUnlock) return;
  const now = Date.now();
  const taps = secretTaps.current;
  taps.push(now);
  while (taps.length && now - taps[0]! > SECRET_TAP_WINDOW_MS) taps.shift();
  if (taps.length >= SECRET_TAP_COUNT) {
   taps.length = 0;
   onSecretUnlock();
  }
 };
 const thiefHit = useMemo(() => ({
  left: Math.max(0, L.thief.peekX - L.thief.size.w * 0.35),
  top: L.thief.ground - L.thief.size.h * 0.92,
  width: L.thief.size.w * 0.7,
  height: L.thief.size.h * 0.85,
 }), [L]);
 const [art, setArt] = useState<Art>(() => openingArt.snapshot());
 const hasBackground = !!art.bg;
 const [artError, setArtError] = useState<string>();
 const [attempt, setAttempt] = useState(0);
 const [intro, setIntro] = useState(!skipInitial);
 const [started, setStarted] = useState(skipInitial);
 const [appState, setAppState] = useState<string>(AppState.currentState);
 const active = appState === 'active';
 const time = useSharedValue(skipInitial ? INTRO_MS : 0);
 const reveal = useSharedValue(skipInitial ? 0 : 0);
 const done = useRef(skipInitial), mounted = useRef(true);
 const finishedRef = useRef(onFinished), sceneReady = useRef(onSceneReady), lobbyAudio = useRef(onLobbyAudioStart);
 useEffect(() => { finishedRef.current = onFinished; sceneReady.current = onSceneReady; lobbyAudio.current = onLobbyAudioStart; });

 const finish = useCallback(() => {
  if (done.current || !mounted.current) return;
  done.current = true; cancelAnimation(time); time.set(INTRO_MS); setIntro(false);
  markStartup('intro-end');
 }, [time]);
 // The intro, the logo and the menu reveal are the Home entrance. They play even when the system asks for reduced
 // motion: honouring it would jump every one of them to its last frame, a cut from the splash to a finished Home.
 useEffect(() => { if (!intro) { finishedRef.current?.(); reveal.set(withTiming(LOBBY_REVEAL_MS, { duration: LOBBY_REVEAL_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never })); } }, [intro, reveal]);

 useEffect(() => {
  let alive = true;
  const unsubscribe = openingArt.subscribe(setArt);
  preloadOpeningArt().then(() => { if (alive) setArtError(undefined); })
   .catch(error => { console.error('Intro artwork failed', error); if (alive) { setArtError(String(error)); finish(); } });
  return () => { alive = false; unsubscribe(); };
 }, [attempt, finish]);
 useEffect(() => {
  mounted.current = true;
  // Leaving the app ends the intro (Home is there on return, and it is not played again).
  // A passing system overlay only makes the app inactive: it does not cut the intro.
  const sub = AppState.addEventListener('change', state => { setAppState(state); if (introEndsOnAppState(state)) finish(); });
  return () => { mounted.current = false; sub.remove(); cancelAnimation(time); };
 }, [finish, time]);

 // Independent of RAF/worklet completion: a lost timeline callback cannot hide Home forever.
 // Counted from the moment the intro starts, not from mount: waiting for startup must not use it up.
 useEffect(() => {
  if (!intro || !started) return;
  const deadline = setTimeout(() => { markStartup('intro-timeout-fallback'); finish(); }, INTRO_MS + 2000);
  return () => clearTimeout(deadline);
 }, [intro, started, finish]);

 // The timeline starts once startup is ready, the artwork can be drawn and the app is in front, and only once:
 // no frame of the intro is blank, and none of it plays behind the startup screen or while the app is away.
 // "In front" is anything but the background: an alert over the app at launch must not hold the intro back.
 const introStarted = useRef(skipInitial);
 const shouldStart = shouldStartHomeIntro({ startupReady: startReady, artReady: hasBackground, appActive: appState !== 'background', started, finished: !intro });
 useEffect(() => {
  if (!shouldStart) return;
  let second = 0;
  const first = requestAnimationFrame(() => {
   second = requestAnimationFrame(() => {
    if (introStarted.current || done.current) return;
    introStarted.current = true;
    markStartup('intro-start'); sceneReady.current?.(); setStarted(true);
    time.set(withTiming(INTRO_MS, { duration: INTRO_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, finished => { if (finished) scheduleOnRN(finish); }));
   });
  });
  return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
 }, [shouldStart, finish, time]);
 // Lobby music leads the end of the intro; scheduled from its real start.
 useEffect(() => {
  if (!intro || !started || skipInitial) return;
  const handoff = setTimeout(() => { if (!done.current) lobbyAudio.current?.(); }, INTRO_MS - LOBBY_AUDIO_LEAD_MS);
  return () => clearTimeout(handoff);
 }, [intro, started, skipInitial]);

 useBrandAudio(intro && started, hasBackground && active && soundEnabled);
 useEffect(() => { if (!intro && ready) { markStartup('start-interactive'); if (__DEV__) console.info('[HOME] mounted'); } }, [intro, ready]);

 const frame = useDerivedValue(() => introFrame(time.value));
 const picture = useDerivedValue(() => {
  const recorder = Skia.PictureRecorder();
  const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, L.W, L.H));
  if (art.bg) drawMuseumScene(skiaSceneGfx(canvas, art), L,
   art.guardTurn ? frame.value : { ...frame.value, beamAlpha: 0 });
  return recorder.finishRecordingAsPicture();
 }, [art, L]);

 const logoSize = L.logoSize;
 const dontStyle = useAnimatedStyle(() => ({ opacity: frame.value.logoTop, transform: [{ translateY: (1 - frame.value.logoTop) * 10 }] }));
 const moveStyle = useAnimatedStyle(() => ({ opacity: frame.value.logoBottom, transform: [{ translateY: (1 - frame.value.logoBottom) * 10 }] }));
 const underlineStyle = useAnimatedStyle(() => ({ opacity: frame.value.underline, transform: [{ translateX: (1 - frame.value.underline) * -8 }, { rotate: '-6deg' }] }));
 const taglineStyle = useAnimatedStyle(() => ({ opacity: frame.value.tagline }));
 const copyStyle = useAnimatedStyle(() => ({ opacity: frame.value.copy }));
 const menuStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, reveal.value / 120) }));

 return <View style={styles.root}>
  {hasBackground ? <Canvas style={StyleSheet.absoluteFill}><Picture picture={picture} /></Canvas> : null}
  <Animated.Text pointerEvents="none" style={[styles.copy, { top: L.H * 0.78 }, copyStyle]}>SOME THINGS{'\n'}SHOULD STAY{'\n'}UNTOUCHED</Animated.Text>
  <View pointerEvents="none" style={[styles.logo, { top: L.logoTop }]} accessibilityRole="header" accessibilityLabel="Don't Move">
   <View style={styles.logoWords}>
    <Animated.Text allowFontScaling={false} style={[styles.title, { fontSize: logoSize, lineHeight: logoSize * 0.92 }, dontStyle]}>DON&apos;T</Animated.Text>
    <Animated.Text allowFontScaling={false} style={[styles.title, { fontSize: logoSize, lineHeight: logoSize * 0.92 }, moveStyle]}>MOVE</Animated.Text>
   </View>
   <Animated.View style={[styles.accent, { width: logoSize * 1.24, marginTop: logoSize * 0.2 }, underlineStyle]} />
   <Animated.Text allowFontScaling={false} style={[styles.tagline, taglineStyle]}>A STEALTH GAME{'\n'}IN YOUR HANDS</Animated.Text>
  </View>
  {!intro && !!onSecretUnlock && <>
   <Pressable accessibilityRole="button" accessibilityLabel="Brand mark" onPress={onSecretTap}
    style={[styles.secretHit, { top: L.logoTop, height: logoSize * 2.6, left: width * 0.18, width: width * 0.64 }]} />
   <Pressable accessibilityRole="button" accessibilityLabel="Character" onPress={onSecretTap}
    style={[styles.secretHit, thiefHit]} />
  </>}
  <LobbyRevealContext.Provider value={reveal}>
   <Animated.View style={[StyleSheet.absoluteFill, menuStyle]} pointerEvents={intro ? 'none' : 'box-none'}
    accessibilityElementsHidden={intro} importantForAccessibility={intro ? 'no-hide-descendants' : 'auto'}>
    {children ?? <Pressable style={[styles.start, { top: L.menu.y, left: L.menu.x, width: L.menu.w }]} disabled={!ready && !loadingError}
     onPress={loadingError ? onRetry : onReplayDone ?? onStart} accessibilityRole="button"
     accessibilityLabel={loadingError ? t('retryLoading') : onReplayDone ? t('back') : ready ? t('start') : t('preparing')}>
     <Text style={styles.startText}>{loadingError ? t('retryLoading') : !ready ? t('preparing') : onReplayDone ? t('back') : t('start')}</Text>
    </Pressable>}
   </Animated.View>
  </LobbyRevealContext.Provider>
  {intro && <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={t('skip')} />}
  {artError && !intro && <Pressable style={styles.error} onPress={() => { setArtError(undefined); setAttempt(value => value + 1); }} accessibilityRole="button">
   <Text style={{ color: BRAND.ivory, textAlign: 'center' }}>{t('artError')} {t('retry')}</Text>
  </Pressable>}
  {loadingError && !intro ? <Text style={styles.error}>{loadingError}</Text> : null}
 </View>;
}
const styles = StyleSheet.create({
 root: { flex: 1, backgroundColor: BRAND.scene },
 copy: { position: 'absolute', alignSelf: 'center', color: '#AEC3CB', fontSize: 10, letterSpacing: 3.6, lineHeight: 20, textAlign: 'center' },
 logo: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
 logoWords: { alignItems: 'center', transform: [{ rotate: '-6deg' }] },
 title: { color: BRAND.ivory, fontWeight: '900', fontStyle: 'italic', letterSpacing: -1.5, textAlign: 'center' },
 accent: { height: 3, backgroundColor: BRAND.cyan, borderRadius: 1.5 },
 tagline: { color: '#AEC3CB', fontSize: 9, letterSpacing: 2.4, lineHeight: 14, marginTop: 16, textAlign: 'center' },
 start: { position: 'absolute', minHeight: 56, justifyContent: 'center', alignItems: 'center', borderColor: BRAND.cyan, borderWidth: 1.5, borderRadius: 16, backgroundColor: '#030C14CC' },
 startText: { color: BRAND.ivory, fontSize: 15, letterSpacing: 2, fontWeight: '700' },
 error: { position: 'absolute', top: '45%', alignSelf: 'center', maxWidth: '80%', color: BRAND.ivory, textAlign: 'center' },
 secretHit: { position: 'absolute', backgroundColor: 'transparent' },
});
