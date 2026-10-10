/// <reference types="node" />
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMissionSwap, SWAP_TIMING, type MissionSwapDeps, type SwapPhase } from '../missionSwap';
import { createRecentCache } from '../recentCache';
import { MISSION_COVER_OPACITY } from '../missionTransition';
import { resultActions } from '../resultNavigation';
import { campaignStages } from '../../game/levels/campaignStages';
import { CHAPTER_MISSION_COUNTS, MISSION_COUNT, missionId, missionIndex } from '../../game/levels/campaignCatalog';
import { canPlayMission, completeMission, freshCampaign, type CampaignProgress } from '../../game/progress/campaignProgress';
import { DEFAULT_PROGRESS, loadProgress, saveProgress } from '../../game/progress/stageProgress';
import { compileStage } from '../../game/world/compileStage';
import { createPlaygroundState } from '../../game/playground/playgroundState';
import { stepTiltPlayer } from '../../game/input/tiltMovement';
import { reduceAudio, type GameAudioInput } from '../../game/audio/audioState';

type Fault = 'fadeLost' | 'framesLost' | 'readyLost' | 'adRejects' | 'adThrows' | 'unmountThrows' | 'fadeThrows' | 'commitThrows' | 'breadcrumbThrows';
/**
 * The screen as the transition sees it: what is mounted, the cover, a manual clock. `auto` answers every signal
 * the way a healthy device does; faults withhold or break one of them.
 */
function host(start: number, faults: Fault[] = []) {
  const has = (fault: Fault) => faults.includes(fault);
  let now = 0, timerId = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const log: string[] = [];
  const calls = { ads: 0, commits: [] as number[], mounts: [] as (number | null)[] };
  const pending: { fade: (() => void)[]; frames: (() => void)[]; ad: ((ok: boolean) => void)[] } = { fade: [], frames: [], ad: [] };
  let mounted: number | null = start, everTwo = false, cover = 0;
  const phases: SwapPhase[] = [];
  let holdAd = false;
  const deps: MissionSwapDeps<number> = {
    presentAd: () => {
      calls.ads++;
      if (has('adThrows')) throw new Error('ad module missing');
      if (has('adRejects')) return Promise.reject(new Error('no fill'));
      if (holdAd) return new Promise<void>((resolve, reject) => pending.ad.push((ok) => (ok ? resolve() : reject(new Error('closed badly')))));
      return Promise.resolve();
    },
    commit: (to) => { if (has('commitThrows')) throw new Error('storage'); calls.commits.push(to); },
    fade: (to, done) => { if (has('fadeThrows') && to === 1) throw new Error('animation'); cover = to; if (!has('fadeLost')) pending.fade.push(done); },
    setMounted: (next) => {
      if (next === null && has('unmountThrows')) throw new Error('unmount');
      // React replaces by key: if a mission is put in while another is still up, both exist for that commit.
      if (next !== null && mounted !== null && mounted !== next) everTwo = true;
      mounted = next; calls.mounts.push(next);
    },
    afterFrames: (done) => { if (!has('framesLost')) pending.frames.push(done); },
    setTimer: (run, ms) => { timers.set(++timerId, { at: now + ms, run }); return timerId; },
    clearTimer: (id) => { timers.delete(id); },
    onPhase: (phase) => phases.push(phase),
    breadcrumb: (name, props) => { if (has('breadcrumbThrows')) throw new Error('analytics offline'); log.push(`${name}${props.ready === false ? ':late' : ''}${props.recovered ? ':recovered' : ''}`); },
  };
  const swap = createMissionSwap(deps);
  const microtasks = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
  /** Deliver everything a healthy device would: fade ends, frames, and the mounted mission reporting ready. */
  const settle = async () => {
    for (let guard = 0; guard < 40; guard++) {
      await microtasks();
      const fade = pending.fade.shift(); if (fade) { fade(); continue; }
      const frames = pending.frames.shift(); if (frames) { frames(); continue; }
      if (swap.phase() === 'mounting' && mounted !== null && !has('readyLost')) { swap.newStageReady(mounted); continue; }
      break;
    }
  };
  const advance = async (ms: number) => {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.run(); }
    await microtasks();
  };
  return { swap, deps, log, calls, phases, pending, settle, advance, microtasks, timers,
    mounted: () => mounted, everTwo: () => everTwo, cover: () => cover, holdAd: (value: boolean) => { holdAd = value; } };
}
const HEALTHY = ['next_stage_pressed', 'mission_transition_begin', 'mission_old_unmounted', 'mission_new_ready', 'mission_transition_complete'];

test('all 44 consecutive transitions 01-01 → … → 09-05: one mission at a time, right mission, progress kept', async () => {
  assert.equal(campaignStages.length, 45); assert.equal(MISSION_COUNT, 45);
  let campaign: CampaignProgress = freshCampaign();
  const h = host(0);
  for (let index = 0; index < MISSION_COUNT - 1; index++) {
    const from = missionId(index), to = missionId(index + 1);
    // Mission Complete: the clear is stored before any button can act.
    campaign = completeMission(campaign, index, 40 + index, 0);
    const [chapter, mission] = from.split('-').map(Number);
    const actions = resultActions({ index, missionCount: MISSION_COUNT, chapterFinal: mission === CHAPTER_MISSION_COUNTS[chapter - 1],
      nextPlayable: canPlayMission(campaign, index + 1, false) });
    assert.notEqual(actions.primary, 'chapters', `${from} offers the next mission`);
    h.log.length = 0; h.calls.mounts.length = 0; h.calls.commits.length = 0; h.calls.ads = 0;
    assert.equal(h.swap.start(index, index + 1), true, from);
    await h.settle();
    assert.equal(h.swap.phase(), 'idle', `${from} → ${to} finished`); assert.equal(h.swap.locked(), false);
    assert.equal(h.mounted(), index + 1, `${to} is the mission on screen`);
    assert.deepEqual(h.calls.mounts, [null, index + 1], `${from} is unmounted before ${to} is mounted`);
    assert.equal(h.everTwo(), false, 'never two missions mounted');
    assert.equal(h.cover(), 0, 'cover cleared');
    assert.deepEqual(h.log, HEALTHY, `${from} breadcrumbs`);
    assert.deepEqual(h.calls.commits, [index + 1]); assert.equal(h.calls.ads, 1);
    campaign = { ...campaign, lastMission: missionId(h.calls.commits[0]) };
    assert.equal(campaign.records[from]?.cleared, true); assert.equal(campaign.records[from]?.bestTime, 40 + index);
    assert.equal(h.timers.size, 0, 'no watchdog left armed');
  }
  assert.equal(h.mounted(), missionIndex('09-05')); assert.equal(campaign.lastMission, '09-05');
  assert.equal(Object.values(campaign.records).filter((record) => record.cleared).length, 44);
  assert.deepEqual(h.phases.slice(0, 7), ['ad', 'fadeOut', 'empty', 'mounting', 'fadeIn', 'idle', 'ad']);
});

test('pressing Next again at any point of a transition does nothing: one ad, one transition, one mission', async () => {
  const h = host(4); h.holdAd(true);
  assert.equal(h.swap.start(4, 5), true);
  for (let i = 0; i < 5; i++) assert.equal(h.swap.start(4, 5), false, 'locked while the ad is up');
  await h.microtasks();
  assert.equal(h.swap.phase(), 'ad'); assert.equal(h.mounted(), 4, 'the finished mission stays under the ad'); assert.deepEqual(h.calls.mounts, []);
  h.pending.ad.shift()?.(true);
  const seen = new Set<SwapPhase>();
  for (let step = 0; step < 12 && h.swap.phase() !== 'idle'; step++) {
    await h.microtasks();
    seen.add(h.swap.phase());
    assert.equal(h.swap.start(4, 5), false, `locked in ${h.swap.phase()}`);
    assert.equal(h.swap.start(5, 6), false);
    const fade = h.pending.fade.shift(); if (fade) { fade(); fade(); continue; } // a duplicate end is ignored
    const frames = h.pending.frames.shift(); if (frames) { frames(); frames(); continue; }
    if (h.swap.phase() === 'mounting') { h.swap.newStageReady(99); h.swap.newStageReady(5); h.swap.newStageReady(5); }
  }
  assert.deepEqual([...seen].sort(), ['empty', 'fadeIn', 'fadeOut', 'mounting'].sort());
  assert.equal(h.swap.phase(), 'idle');
  assert.equal(h.calls.ads, 1); assert.deepEqual(h.calls.commits, [5]); assert.deepEqual(h.calls.mounts, [null, 5]);
  assert.deepEqual(h.log, HEALTHY); assert.equal(h.everTwo(), false);
  // The lock is released: the next clear can go on.
  h.holdAd(false);
  assert.equal(h.swap.start(5, 6), true); await h.settle(); assert.equal(h.mounted(), 6);
});

test('an ad that rejects, throws or closes badly is the same as no ad', async () => {
  for (const fault of ['adRejects', 'adThrows'] as const) {
    const h = host(0, [fault]);
    h.swap.start(0, 1); await h.settle();
    assert.equal(h.swap.phase(), 'idle'); assert.equal(h.mounted(), 1); assert.deepEqual(h.log, HEALTHY);
  }
  const h = host(0); h.holdAd(true);
  h.swap.start(0, 1); await h.microtasks(); h.pending.ad.shift()?.(false); await h.settle();
  assert.equal(h.mounted(), 1); assert.equal(h.swap.locked(), false);
});

test('a lost fade end, lost frames or a mission that never reports ready cannot leave a black screen or a locked button', async () => {
  for (const [fault, wait] of [['fadeLost', SWAP_TIMING.fadeWatchdogMs], ['framesLost', SWAP_TIMING.framesWatchdogMs], ['readyLost', SWAP_TIMING.readyWatchdogMs]] as const) {
    const h = host(10, [fault]);
    h.swap.start(10, 11);
    for (let i = 0; i < 4 && h.swap.phase() !== 'idle'; i++) { await h.settle(); if (h.swap.phase() !== 'idle') await h.advance(wait); }
    await h.settle();
    assert.equal(h.swap.phase(), 'idle', fault); assert.equal(h.mounted(), 11, fault);
    assert.equal(h.cover(), 0, `${fault}: cover cleared`); assert.equal(h.everTwo(), false);
    assert.deepEqual(h.calls.mounts, [null, 11]); assert.equal(h.timers.size, 0);
    assert.equal(h.log[h.log.length - 1].startsWith('mission_transition_complete'), true);
    if (fault === 'readyLost') assert(h.log.includes('mission_new_ready:late'), 'recorded as revealed without a ready report');
  }
  // Everything lost at once: still finite. No single wait is longer than the ready watchdog.
  const worst = host(0, ['fadeLost', 'framesLost', 'readyLost']);
  worst.swap.start(0, 1); await worst.microtasks();
  const budget = 2 * SWAP_TIMING.fadeWatchdogMs + SWAP_TIMING.framesWatchdogMs + SWAP_TIMING.readyWatchdogMs;
  for (let elapsed = 0; elapsed <= budget; elapsed += 100) await worst.advance(100);
  assert.equal(worst.swap.phase(), 'idle'); assert.equal(worst.mounted(), 1); assert(budget < 6500, `worst case ${budget} ms`);
});

test('if a step throws, the game recovers into the next mission with the lock released', async () => {
  for (const fault of ['unmountThrows', 'fadeThrows', 'commitThrows'] as const) {
    const h = host(20, [fault]);
    h.swap.start(20, 21); await h.settle();
    assert.equal(h.swap.phase(), 'idle', fault); assert.equal(h.swap.locked(), false);
    assert.equal(h.mounted(), 21, `${fault}: playable mission on screen`); assert.equal(h.cover(), 0);
    assert(h.log.includes('mission_transition_complete:recovered'), fault);
    assert.equal(h.timers.size, 0);
  }
  // Diagnostics failing (remote analytics down) does not touch the sequence.
  const h = host(0, ['breadcrumbThrows']);
  h.swap.start(0, 1); await h.settle();
  assert.equal(h.swap.phase(), 'idle'); assert.equal(h.mounted(), 1); assert.deepEqual(h.calls.mounts, [null, 1]);
});

test('Home or chapter select during a transition: the run is dropped, late signals do nothing, a new run works', async () => {
  const h = host(7);
  h.swap.start(7, 8); await h.microtasks();
  assert.equal(h.swap.phase(), 'fadeOut');
  const staleFade = h.pending.fade.shift();
  h.swap.cancel();
  assert.equal(h.swap.locked(), false); assert.equal(h.timers.size, 0);
  staleFade?.(); await h.advance(10_000); await h.settle();
  assert.deepEqual(h.calls.mounts, [], 'nothing was unmounted or mounted by the abandoned run');
  assert.equal(h.swap.start(7, 8), true); await h.settle(); assert.equal(h.mounted(), 8);
  // Retry / Home / chapter select never go through the transition at all.
  const idle = host(3);
  idle.swap.newStageReady(3); idle.swap.cancel();
  assert.equal(idle.swap.phase(), 'idle'); assert.deepEqual(idle.calls.mounts, []); assert.equal(idle.calls.ads, 0);
});

test('the clear is on disk before navigation: a crash during the transition keeps record, best time and unlock', async () => {
  const saved = new Map<string, string>(), get = AsyncStorage.getItem, set = AsyncStorage.setItem;
  AsyncStorage.getItem = async (key) => saved.get(key) ?? null;
  AsyncStorage.setItem = async (key, value) => { saved.set(key, value); };
  try {
    let progress = { ...DEFAULT_PROGRESS, hasStarted: true, campaign: completeMission(freshCampaign(), 0, 33.5, 1) };
    await saveProgress(progress);                       // Mission Complete
    const h = host(0);
    h.deps.commit = (to) => { progress = { ...progress, campaign: { ...progress.campaign, lastMission: missionId(to) } }; void saveProgress(progress); };
    h.swap.start(0, 1); await h.microtasks();           // …and the app dies somewhere in here
    const restarted = (await loadProgress(true)).campaign!;
    assert.equal(restarted.records['01-01']?.cleared, true); assert.equal(restarted.records['01-01']?.bestTime, 33.5);
    assert.equal(restarted.highestUnlocked, 1); assert(canPlayMission(restarted, 1, false));
    await h.settle();
    assert.equal((await loadProgress(true)).campaign!.lastMission, '01-02');
  } finally { AsyncStorage.getItem = get; AsyncStorage.setItem = set; }
});

test('every mission starts clean: thief at rest at the entry, nothing carried over from the mission before', () => {
  for (const definition of campaignStages) {
    const state = createPlaygroundState(compileStage(definition));
    const p = state.player;
    assert.equal(p.speed, 0, definition.id); assert.equal(p.vx, 0); assert.equal(p.vy, 0); assert.equal(p.hasTarget, false);
    assert.equal(state.t, 0); assert.equal(state.mission.complete, false); assert.equal(state.events.caught, false);
    // The tilt controller is shared across missions and may still be tilted: the first frame of the new mission
    // consumes the input reset and does not move; from the next frame the same tilt steers normally.
    const x = p.x, y = p.y;
    stepTiltPlayer(p, { x: 1, y: 0, paused: false, reset: 7 }, 1 / 60, []);
    assert.equal(p.x, x, `${definition.id}: no jump on the first frame`); assert.equal(p.y, y); assert.equal(p.speed, 0);
    stepTiltPlayer(p, { x: 1, y: 0, paused: false, reset: 7 }, 1 / 60, []);
    assert(p.vx > 0, `${definition.id}: responds from the second frame`);
  }
});

test('audio: the new mission is a new session — stealth music, no whistle or pickup replayed from the last one', () => {
  const base: GameAudioInput = { sessionKey: '03-04:0', phase: 'PLAYER_SPOTTED', objectiveRevision: 1, theftRevision: 2, spottedRevision: 3,
    sfxEnabled: true, bgmEnabled: true, paused: false, sfxSuspended: false, active: true };
  const before = reduceAudio(null, base).state;
  assert.equal(before.music, 'bgm_chase');
  const next = reduceAudio(before, { ...base, sessionKey: '03-05:0', phase: 'STEALTH', objectiveRevision: 0, theftRevision: 0, spottedRevision: 0 });
  assert.equal(next.music, 'bgm_stealth'); assert.deepEqual(next.whistles, []); assert.equal(next.pickup, false);
  assert.equal(next.state.sessionKey, '03-05:0');
  // A counter that happens to be higher in the new mission's first input is not an event either.
  const carried = reduceAudio(before, { ...base, sessionKey: '03-05:0', phase: 'STEALTH', theftRevision: 9, spottedRevision: 9, objectiveRevision: 9 });
  assert.deepEqual(carried.whistles, []); assert.equal(carried.pickup, false);
});

test('prepared missions: only the one being played and the next are kept, across the whole campaign', () => {
  const cache = createRecentCache<string, { id: string }>(2);
  for (let index = 0; index < MISSION_COUNT; index++) {
    const current = missionId(index);
    cache.get(current) ?? cache.put(current, { id: current });          // mission opens
    assert(cache.keys().includes(current));
    if (index < MISSION_COUNT - 1) cache.put(missionId(index + 1), { id: missionId(index + 1) }); // prepared at the result screen
    assert(cache.size <= 2, `${current}: ${cache.keys()}`);
    assert(cache.keys().includes(current), `${current} is not dropped while it is on screen`);
    // Once the next mission has been prepared, the one before the current is no longer held.
    if (index > 0 && index < MISSION_COUNT - 1) assert.equal(cache.keys().includes(missionId(index - 1)), false, `${missionId(index - 1)} is released`);
  }
  // Going back to an old mission from the chapter list while two are cached: the one in use survives.
  const jump = createRecentCache<string, number>(2);
  jump.put('A', 1); jump.put('B', 2);
  assert.equal(jump.get('A'), 1); jump.put('C', 3);
  assert.deepEqual(jump.keys(), ['A', 'C']); assert.equal(jump.get('B'), undefined);
});

test('the game screen mounts one StageGame and has no two-layer slide', () => {
  const screen = fs.readFileSync('src/ui/VisualPlaygroundScreen.tsx', 'utf8');
  assert.equal((screen.match(/<StageGame\b/g) ?? []).length, 1, 'a single StageGame element');
  assert(/\{stageMounted&&<StageGame key=\{definition\.id\}/.test(screen), 'mounted alone, keyed by mission');
  for (const gone of ['MissionLayer', 'missionSlide', 'transitionVector', 'MISSION_SLIDE_MS', '[index,pending]', 'visible.map'])
    assert.equal(screen.includes(gone), false, `${gone} must be gone`);
  assert(screen.includes('createMissionSwap<'), 'the transition is the tested sequence');
  assert(screen.includes('prepareMissionInSteps('), 'next-mission preparation is split into tasks');
  assert.equal(/presentInterstitialIfNeeded\(\)[^;]*\.then\(|await monetization\.presentInterstitialIfNeeded/.test(screen), false, 'the screen does not sequence the ad itself');
  const cache = fs.readFileSync('src/ui/preparedMission.ts', 'utf8');
  assert(/PREPARED_MISSION_LIMIT = 2\b/.test(cache)); assert.equal(/\.dispose\(/.test(cache), false, 'nothing is disposed by hand');
  assert.equal(fs.readFileSync('src/ui/missionSwap.ts', 'utf8').includes("from 'react"), false, 'the sequence has no React or native dependency');
  // The cover between missions is never fully opaque (a fully covered Skia canvas blocks the UI thread for a
  // second per draw), and the finished scene is not redrawn behind a full-screen ad.
  assert(MISSION_COVER_OPACITY > 0.97 && MISSION_COVER_OPACITY < 1, `cover opacity ${MISSION_COVER_OPACITY}`);
  assert(screen.includes('withTiming(to?MISSION_COVER_OPACITY:0'), 'the fade target is the non-opaque cover');
  assert.equal(/cover\.set\(\s*1\s*\)|withTiming\(\s*1\s*[,)]/.test(screen.slice(screen.indexOf('function GameRun'), screen.indexOf('type TiltControl'))), false);
  assert(/if \(pausedValue\.value \|\| transitioning \|\| adCovering \|\| !resources\) return;/.test(screen), 'no simulation or redraw behind an ad');
  // Ready is reported from the mission's own UI-thread frames, not from a JS-side frame request.
  assert(screen.includes('scheduleOnRN(reportReady)')); assert.equal(/requestAnimationFrame\(onTransitionReady\)/.test(screen), false);
  assert.equal(screen.includes('TMPQA'), false, 'no QA scaffolding left in the screen');
});
