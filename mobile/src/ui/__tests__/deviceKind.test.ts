/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firstRunControlModeFor, IPAD_WINDOW_CONTROLS_BOTTOM, isIPad, topInsetFor } from '../deviceKind';
import { normalizeControlMode } from '../../game/input/controlMode';
import { DEFAULT_PROGRESS, loadProgress, normalizeProgress, saveProgress } from '../../game/progress/stageProgress';
import { completeMission, freshCampaign } from '../../game/progress/campaignProgress';

const phone = (width: number, systemName: unknown = 'iOS') => ({ os: 'ios', systemName, windowWidth: width, screenWidth: width });

test('iPad is recognised by either measured sign, never by isPad (false for this iPhone-only app on an iPad)', () => {
  // Simulator, iPadOS 27, iPad Air 11: {isPad:false, systemName:"iPadOS", interfaceIdiom:"phone", window 410, screen 820}.
  assert.equal(isIPad({ os: 'ios', systemName: 'iPadOS', windowWidth: 410, screenWidth: 820 }), true, 'both signs');
  assert.equal(isIPad({ os: 'ios', systemName: 'iPadOS', windowWidth: 820, screenWidth: 820 }), true, 'name alone (a full-width window)');
  assert.equal(isIPad({ os: 'ios', systemName: 'iOS', windowWidth: 410, screenWidth: 820 }), true, 'width alone (should the name ever read "iOS")');
  assert.equal(isIPad({ os: 'ios', systemName: undefined, windowWidth: 410, screenWidth: 820 }), true);
  // iPhones, measured: SE 3 375 = 375, 18 Pro Max 440 = 440, systemName "iOS".
  for (const width of [320, 375, 390, 393, 402, 430, 440]) assert.equal(isIPad(phone(width)), false, `iPhone ${width}`);
  assert.equal(isIPad(phone(375.0000001)), false); assert.equal(isIPad({ ...phone(375), screenWidth: 375.4 }), false, 'sub-point rounding is not a window');
  // Sizes not known yet never make an iPhone an iPad.
  for (const [windowWidth, screenWidth] of [[0, 0], [0, 375], [375, 0], [NaN, 375], [375, Infinity]])
    assert.equal(isIPad({ os: 'ios', systemName: 'iOS', windowWidth, screenWidth }), false, `${windowWidth}/${screenWidth}`);
  // Android split-screen and other platforms are not iPads, whatever their widths or names.
  assert.equal(isIPad({ os: 'android', systemName: 'Android', windowWidth: 400, screenWidth: 800 }), false);
  assert.equal(isIPad({ os: 'android', systemName: 'iPadOS', windowWidth: 400, screenWidth: 800 }), false);
  assert.equal(isIPad({ os: 'web', systemName: 'iPadOS', windowWidth: 400, screenWidth: 800 }), false);
});

test('one decision feeds both consequences: the top inset and the first-run control mode', () => {
  const device = fs.readFileSync('src/ui/device.ts', 'utf8');
  assert.equal((device.match(/\bisIPad\(/g) ?? []).length, 1, 'decided once');
  assert(/topInsetFor\(safeTop, ON_IPAD\)/.test(device)); assert(/firstRunControlModeFor\(ON_IPAD\)/.test(device));
  assert(device.includes('systemName') && device.includes("Dimensions.get('window').width") && device.includes("Dimensions.get('screen').width"));
  assert.equal(/\bisPad\b/.test(device), false, 'Platform.isPad is not used: it is false on the review device');
  // Nothing else in the app makes its own guess.
  for (const file of ['src/ui/menu/MenuScreens.tsx', 'src/ui/menu/StageSelectScreen.tsx', 'src/ui/menu/MissionSelect.tsx', 'src/ui/admin/AdminAnalyticsScreen.tsx',
    'src/ui/VisualPlaygroundScreen.tsx', 'src/ui/branding/StartupScreen.tsx'])
    assert.equal(/iPadOS|\bisPad\b|isIPad\(/.test(fs.readFileSync(file, 'utf8')), false, file);
  for (const onIPad of [true, false]) {
    assert.equal(topInsetFor(32, onIPad) > 32, onIPad); assert.equal(firstRunControlModeFor(onIPad) === 'touch', onIPad);
  }
});

test('top inset: unchanged on every iPhone, pushed below the window controls on an iPad', () => {
  for (const safeTop of [0, 20, 47, 59, 62]) assert.equal(topInsetFor(safeTop, false), safeTop, `iPhone inset ${safeTop} is left alone`);
  // Measured iPad window: safe top 32, controls reach y 72. The back button (54 pt tall, 14 pt below the inset)
  // then starts at 86, where taps were measured to arrive.
  assert.equal(topInsetFor(32, true), IPAD_WINDOW_CONTROLS_BOTTOM);
  assert(topInsetFor(32, true) + 14 >= 86);
  assert.equal(topInsetFor(90, true), 90, 'a larger safe area still wins');
});

test('first-run control mode: touch on an iPad, tilt elsewhere — and only when nothing was chosen', () => {
  assert.equal(firstRunControlModeFor(true), 'touch'); assert.equal(firstRunControlModeFor(false), 'tilt');
  const iPad = firstRunControlModeFor(true);
  assert.equal(normalizeProgress(null, iPad).controlMode, 'touch', 'no save at all');
  assert.equal(normalizeProgress({ language: 'ko' }, iPad).controlMode, 'touch', 'a save from before the setting existed');
  assert.equal(normalizeProgress({ controlMode: 'tilt' }, iPad).controlMode, 'tilt', 'a saved Tilt is kept on an iPad');
  assert.equal(normalizeProgress({ controlMode: 'touch' }, 'tilt').controlMode, 'touch', 'a saved Touch is kept on an iPhone');
  assert.equal(normalizeProgress({ controlMode: 'TOUCH' }, iPad).controlMode, 'touch', 'a damaged value falls back to the device default');
  assert.equal(normalizeControlMode(undefined), 'tilt'); assert.equal(normalizeProgress(null).controlMode, 'tilt', 'iPhone behaviour is what it was');
});

test('iPad: the default is not written over a choice — switch to Tilt in Settings, restart, still Tilt', async () => {
  const saved = new Map<string, string>(), get = AsyncStorage.getItem, set = AsyncStorage.setItem;
  AsyncStorage.getItem = async (key) => saved.get(key) ?? null;
  AsyncStorage.setItem = async (key, value) => { saved.set(key, value); };
  try {
    const first = await loadProgress(true, 'touch');
    assert.equal(first.controlMode, 'touch', 'first launch on an iPad');
    assert.equal(saved.size, 0, 'loading writes nothing');
    await saveProgress({ ...first, controlMode: 'tilt' });               // Settings → 기울이기
    assert.equal((await loadProgress(true, 'touch')).controlMode, 'tilt', 'the choice survives a restart');
    await saveProgress({ ...(await loadProgress(true, 'touch')), controlMode: 'touch' });
    assert.equal((await loadProgress(true, 'touch')).controlMode, 'touch');
    // An iPhone save that already holds a choice and progress is read back untouched.
    const campaign = completeMission(freshCampaign(), 0, 30, 0);
    await saveProgress({ ...DEFAULT_PROGRESS, hasStarted: true, campaign, controlMode: 'tilt' });
    const again = await loadProgress(true, 'touch');
    assert.equal(again.controlMode, 'tilt'); assert.deepEqual(again.campaign, campaign);
  } finally { AsyncStorage.getItem = get; AsyncStorage.setItem = set; }
});

test('every screen with a top-left control uses the iPad-aware inset', () => {
  for (const file of ['src/ui/menu/MenuScreens.tsx', 'src/ui/menu/StageSelectScreen.tsx', 'src/ui/menu/MissionSelect.tsx', 'src/ui/admin/AdminAnalyticsScreen.tsx']) {
    const source = fs.readFileSync(file, 'utf8');
    assert(source.includes('topInset(insets.top)'), file);
    assert.equal(/paddingTop:\s*insets\.top\b/.test(source), false, `${file}: raw inset left on a header`);
  }
  const game = fs.readFileSync('src/ui/VisualPlaygroundScreen.tsx', 'utf8');
  assert(game.includes('top: topInset(safeArea.top)'), 'game HUD');
});
