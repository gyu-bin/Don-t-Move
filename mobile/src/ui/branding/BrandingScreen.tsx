import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Canvas, Group, Image, LinearGradient, Mask, Path, Rect, loadData, Skia } from '@shopify/react-native-skia';
import type { SkImage } from '@shopify/react-native-skia';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as SplashScreen from 'expo-splash-screen';
import { BRAND, INTRO_MS, introFrame } from './introTimeline';
import { useBrandAudio } from './useBrandAudio';
import { markStartup } from './startupMetrics';
import { useMenu } from '../menu/MenuContext';
import { homeComposition } from './homeLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SOURCES = {
 room: require('../../../assets/branding/room-v2.png'),
 player: require('../../../assets/branding/player-v2.png'),
 guard: require('../../../assets/branding/guard-v2.png'),
 wall: require('../../../assets/branding/wall-v2.png'),
};
type Art = Record<keyof typeof SOURCES, SkImage>;
let artPromise: Promise<Art> | undefined;
let cachedArt:Art|null=null;
function preloadArt() {
 if (!artPromise) {
  markStartup('intro-images-start');
  artPromise = Promise.all(Object.entries(SOURCES).map(async ([key, source]) => {
   const image = await loadData(source, data => Skia.Image.MakeImageFromEncoded(data));
   if (!image) throw new Error('Intro image decode failed: ' + key);
   return [key, image];
  })).then(pairs => {
   markStartup('intro-images-ready');
   cachedArt=Object.fromEntries(pairs) as Art;
   return cachedArt;
  }).catch(error => { artPromise = undefined; throw error; });
 }
 return artPromise;
}
type Props = {
 children?: import('react').ReactNode; skipInitial?: boolean; musicEnabled?: boolean; onFinished?:()=>void;
 soundEnabled: boolean; onStart: () => void; onReplayDone?: () => void;
 onSceneReady?: () => void; ready?: boolean; loadingError?: string; onRetry?: () => void;
};
export function BrandingScreen({ children, skipInitial=false, soundEnabled, musicEnabled=soundEnabled, onFinished, onStart, onReplayDone, onSceneReady, ready = true, loadingError, onRetry }: Props) {
 const {t}=useMenu();
 const { width, height, fontScale } = useWindowDimensions();
 const insets=useSafeAreaInsets();
 const composition=homeComposition(width,height,insets,fontScale);
 const [art, setArt] = useState<Art | null>(()=>cachedArt);
 const [artError, setArtError] = useState<string>();
 const [attempt, setAttempt] = useState(0);
 const [intro, setIntro] = useState(!skipInitial);
 const [active, setActive] = useState(AppState.currentState === 'active');
 const time = useSharedValue(skipInitial?INTRO_MS:0), frameCount = useSharedValue(0), firstFrame = useSharedValue(0);
 const done = useRef(skipInitial), mounted = useRef(true), sceneReady = useRef(onSceneReady);
 useEffect(() => { sceneReady.current = onSceneReady; }, [onSceneReady]);
 const finishedRef=useRef(onFinished);
 useEffect(()=>{finishedRef.current=onFinished;},[onFinished]);
 useEffect(()=>{if(!intro)finishedRef.current?.();},[intro]);
 const finish = useCallback(() => {
  if (done.current || !mounted.current) return;
  done.current = true; cancelAnimation(time); time.set(INTRO_MS); setIntro(false);
  markStartup('intro-end');
 }, [time]);
 useEffect(() => {
  let alive = true;
  const timeout = setTimeout(() => { if (alive) setArtError('Intro artwork download timed out.'); }, 8000);
  preloadArt().then(value => { if (alive) { setArt(value); setArtError(undefined); } })
   .catch(error => { if (alive) setArtError(String(error)); }).finally(() => clearTimeout(timeout));
  return () => { alive = false; clearTimeout(timeout); };
 }, [attempt]);
 useEffect(() => {
  mounted.current = true;
  const sub = AppState.addEventListener('change', state => {
   setActive(state === 'active');
   if (state !== 'active') finish();
  });
  return () => { mounted.current = false; sub.remove(); cancelAnimation(time); };
 }, [finish, time]);
 useEffect(() => {
  if (!art) return;
  // Let the image-backed Canvas commit before hiding the native cover and
  // scheduling heavy gameplay modules. No artificial loading delay.
  let second = 0;
  const first = requestAnimationFrame(() => {
   second = requestAnimationFrame(() => {
    void SplashScreen.hideAsync().then(() => markStartup('native-splash-hidden'));
    markStartup('intro-start');
    sceneReady.current?.();
    if (!done.current) time.value = withTiming(INTRO_MS, { duration: INTRO_MS, easing: Easing.linear },
     finished => { if (finished) scheduleOnRN(finish); });
   });
  });
  return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
 }, [art, finish, time]);
 useFrameCallback(info => {
  if (!art || !intro || !__DEV__) return;
  if (!firstFrame.value) firstFrame.value = info.timestamp;
  frameCount.value++;
 });
 useEffect(() => {
  if (!intro && firstFrame.value) markStartup('intro-frame-sample', {
   frames: frameCount.value, note: 'UI frame count; use device trace for presented FPS',
  });
 }, [intro, firstFrame, frameCount]);
 useBrandAudio(intro, !!art && active && (intro?soundEnabled:musicEnabled));
 const frame = useDerivedValue(() => introFrame(time.value));
 const player = useDerivedValue(() => [{ translateX: frame.value.playerX }]);
 const playerSize = useDerivedValue(() => 270 + (composition.playerSize - 270) * frame.value.start);
 const playerHeight = useDerivedValue(() => 270 + (composition.playerHeight - 270) * frame.value.start);
 const playerX = useDerivedValue(() => -61 + (composition.playerX + 61) * frame.value.start);
 const playerY = useDerivedValue(() => 445 + (composition.playerY - 445) * frame.value.start);
 const playerClip = useDerivedValue(() => ({x:0,y:0,width:390+(composition.playerRight-390)*frame.value.start,height:844}));
 // Only the exposed lower shirt fades into the wall shadow. Keep the hand,
 // eyes and head untouched; no new artwork, scale change or Intro crop.
 const shirtEdge = useDerivedValue(() => playerX.value+playerSize.value*0.39);
 const handMaskWidth = useDerivedValue(() => shirtEdge.value+100);
 const shirtFadeStart = useDerivedValue(() => ({x:0,y:844+(playerY.value+playerHeight.value*0.80-844)*frame.value.start}));
 const shirtFadeEnd = useDerivedValue(() => ({x:0,y:850+(playerY.value+playerHeight.value*0.88-850)*frame.value.start}));
 const guard = useDerivedValue(() => [{ scaleX: 0.95 + frame.value.guardTurn * 0.25 }]);
 const beam = useDerivedValue(() => [{ rotate: frame.value.beamTurn }]);
 const darkness = useDerivedValue(() => frame.value.dark);
 const homeStyle=useAnimatedStyle(()=>({opacity:frame.value.start}));
 const logoStyle = useAnimatedStyle(() => ({
  opacity: frame.value.logo,
  transform: [{ translateY: (1 - frame.value.logo) * 8 }, { scale: 0.98 + frame.value.logo * 0.02 }],
 }));
 useEffect(() => {
  if (!intro && ready) markStartup('start-interactive');
 }, [intro, ready]);
 if (artError) return <View style={styles.root} onLayout={() => { void SplashScreen.hideAsync(); }}>
  <Text style={styles.error}>{t('artError')}</Text>
  <Pressable style={styles.start} onPress={() => { setArtError(undefined); setAttempt(value => value + 1); }} accessibilityRole="button">
   <Text style={styles.startText}>{t('retry')}</Text>
  </Pressable>
 </View>;
 return <View style={styles.root}>
  {art ? <Canvas style={StyleSheet.absoluteFill}>
   <Group transform={[{ scaleX: width / 390 }, { scaleY: height / 844 }]}>
    <Image image={art.room} x={0} y={0} width={390} height={844} fit="fill" />
    <Group origin={{ x: 308, y: 510 }} transform={beam}>
     <Path path="M 310 438 L 65 670 L 287 698 Z">
      <LinearGradient start={{ x: 310, y: 438 }} end={{ x: 130, y: 680 }} colors={['#FFF4D62B', '#FFF4D600']} />
     </Path>
    </Group>
    <Group origin={{ x: 310, y: 615 }} transform={guard}>
     <Image image={art.guard} x={245} y={399} width={130} height={236} fit="contain" />
    </Group>
    <Group clip={playerClip}><Group transform={player}>
     <Mask mode="alpha" mask={<Group>
      <Rect x={-100} y={0} width={handMaskWidth} height={844} color="white" />
      <Rect x={shirtEdge} y={0} width={490} height={844}>
       <LinearGradient start={shirtFadeStart} end={shirtFadeEnd} colors={['white','transparent']} />
      </Rect>
     </Group>}>
     <Image image={art.player} x={playerX} y={playerY} width={playerSize} height={playerHeight} fit="fill" />
     </Mask>
    </Group></Group>
    <Image image={art.wall} x={0} y={0} width={45} height={844} fit="fill" />
    <Rect x={0} y={0} width={390} height={844}>
     <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 0, y: 844 }} colors={['#020A1066', '#020A1000', '#020A1044']} />
    </Rect>
    <Rect x={0} y={0} width={390} height={844} color={BRAND.navy} opacity={darkness} />
   </Group>
  </Canvas> : null}
  <Animated.View pointerEvents="none" style={[styles.logo, logoStyle]}>
   <Text style={styles.title}>DON&apos;T{'\n'}MOVE</Text><View style={styles.accent} />
   <Text style={styles.tagline}>{t('tagline')}</Text>
  </Animated.View>
  <Animated.View style={[StyleSheet.absoluteFill,homeStyle]} pointerEvents={intro?'none':'auto'} accessibilityElementsHidden={intro} importantForAccessibility={intro?'no-hide-descendants':'auto'}>{children ??
   <Pressable style={styles.start} disabled={!ready && !loadingError}
    onPress={loadingError ? onRetry : onReplayDone ?? onStart} accessibilityRole="button"
    accessibilityLabel={loadingError ? t('retryLoading') : onReplayDone ? t('back') : ready ? t('start') : t('preparing')}>
    <Text style={styles.startText}>{loadingError ? t('retryLoading') : !ready ? t('preparing') : onReplayDone ? t('back') : t('start')}</Text>
   </Pressable>}</Animated.View>
  {intro&&<Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel={t('skip')}/>}
  {loadingError && !intro ? <Text style={styles.error}>{loadingError}</Text> : null}
 </View>;
}
const styles = StyleSheet.create({
 root: { flex: 1, backgroundColor: BRAND.navy },
 logo: { position: 'absolute', top: '14%', alignSelf: 'center', alignItems: 'center' },
 title: { color: BRAND.ivory, fontSize: 49, fontWeight: '900', fontStyle: 'italic', lineHeight: 48, letterSpacing: -2, transform: [{ rotate: '-6deg' }] },
 accent: { height: 3, width: 72, backgroundColor: BRAND.cyan, marginTop: 17, transform: [{ rotate: '-8deg' }] },
 tagline: { color: '#AEC3CB', fontSize: 8, letterSpacing: 2, marginTop: 23, textAlign:'center',lineHeight:15 },
 start: { position: 'absolute', bottom: '9%', alignSelf: 'center', borderColor: BRAND.cyan, borderWidth: 1, borderRadius: 24, paddingVertical: 14, paddingHorizontal: 30, backgroundColor: '#030C14DD' },
 startText: { color: BRAND.ivory, fontSize: 13, letterSpacing: 3, fontWeight: '600' },
 error: { position: 'absolute', top: '45%', alignSelf: 'center', maxWidth: '80%', color: BRAND.ivory, textAlign: 'center' },
});
