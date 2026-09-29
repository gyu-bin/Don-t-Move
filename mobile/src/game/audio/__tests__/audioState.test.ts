import test from 'node:test';
import assert from 'node:assert/strict';
import { fadeMix, reduceAudio, silenceMix, TRACK_BASE_GAIN, type GameAudioInput } from '../audioState';
const base: GameAudioInput = { sessionKey: '01-01:0', phase: 'STEALTH', theftRevision: 0,
  spottedRevision: 0, sfxEnabled: true, bgmEnabled: true, paused: false, active: true };
test('separate theft and spotted events emit once each', () => {
  const start = reduceAudio(null, base).state;
  const theft = reduceAudio(start, { ...base, phase: 'THEFT_ALERT', theftRevision: 1 });
  assert.deepEqual(theft.whistles, ['whistle_theft']);
  const spottedInput = { ...base, phase: 'PLAYER_SPOTTED' as const, theftRevision: 1, spottedRevision: 1 };
  const spotted = reduceAudio(theft.state, spottedInput);
  assert.deepEqual(spotted.whistles, ['whistle_spotted']);
  assert.deepEqual(reduceAudio(spotted.state, spottedInput).whistles, []);
});
test('muted events are consumed rather than replayed when enabling SFX', () => {
  const muted = reduceAudio(reduceAudio(null, base).state,
    { ...base, theftRevision: 1, spottedRevision: 1, sfxEnabled: false });
  assert.deepEqual(muted.whistles, []);
  assert.deepEqual(reduceAudio(muted.state, { ...base, theftRevision: 1, spottedRevision: 1 }).whistles, []);
});
test('SFX and BGM settings are independent', () => {
  const initial = reduceAudio(null, base).state;
  const silentMusic = reduceAudio(initial, { ...base, theftRevision: 1, bgmEnabled: false });
  assert.equal(silentMusic.music, null);
  assert.deepEqual(silentMusic.whistles, ['whistle_theft']);
  assert.equal(reduceAudio(initial, { ...base, sfxEnabled: false }).music, 'bgm_stealth');
});
test('SEARCH and RETURN retain chase tension until every alert ends', () => {
  let state = reduceAudio(null, { ...base, phase: 'PLAYER_SPOTTED' }).state;
  for (const phase of ['SEARCH', 'RETURN'] as const) {
    const result = reduceAudio(state, { ...base, phase });
    assert.equal(result.music, 'bgm_chase'); state = result.state;
  }
  assert.equal(reduceAudio(state, base).music, 'bgm_stealth');
});
test('theft investigation retains theft tension; silent objective changes no audio', () => {
  const stealth = reduceAudio(null, base);
  assert.equal(reduceAudio(stealth.state, base).music, 'bgm_stealth');
  const theft = reduceAudio(stealth.state, { ...base, phase: 'THEFT_ALERT' });
  assert.equal(reduceAudio(theft.state, { ...base, phase: 'SEARCH' }).music, 'bgm_chase');
});
test('retry/mount snapshot never replays history and resets music memory', () => {
  const chase = reduceAudio(null, { ...base, phase: 'PLAYER_SPOTTED', spottedRevision: 4 });
  assert.deepEqual(chase.whistles, []);
  const retry = reduceAudio(chase.state, { ...base, sessionKey: '01-01:1' });
  assert.equal(retry.music, 'bgm_stealth'); assert.deepEqual(retry.whistles, []);
  assert.deepEqual(reduceAudio(retry.state, { ...base, sessionKey: '01-01:1', spottedRevision: 1 }).whistles,
    ['whistle_spotted']);
});
test('pause/background/mission-end suppress sounds and consume pending revisions', () => {
  for (const suspended of [{ paused: true }, { active: false }]) {
    const result = reduceAudio(reduceAudio(null, base).state, { ...base, ...suspended, spottedRevision: 1 });
    assert.equal(result.music, null); assert.deepEqual(result.whistles, []);
    assert.deepEqual(reduceAudio(result.state, { ...base, spottedRevision: 1 }).whistles, []);
  }
});
test('crossfade is gradual, bounded, and returns cleanly to stealth', () => {
  let mix = { ...silenceMix(), bgm_stealth: TRACK_BASE_GAIN.bgm_stealth };
  const first = fadeMix(mix, 'bgm_chase', 0.05);
  assert.ok(first.bgm_stealth > 0 && first.bgm_chase > 0);
  for (let i = 0; i < 200; i++) {
    mix = fadeMix(mix, i < 100 ? 'bgm_chase' : 'bgm_stealth', 0.05);
    assert.ok(Object.values(mix).every(gain => gain >= 0 && gain <= TRACK_BASE_GAIN.bgm_chase));
    assert.ok(Object.values(mix).reduce((a, b) => a + b, 0) <= TRACK_BASE_GAIN.bgm_chase + 0.000001);
  }
  const chase = { ...silenceMix(), bgm_chase: TRACK_BASE_GAIN.bgm_chase };
  assert.ok(fadeMix(chase, 'bgm_stealth', 0.05).bgm_stealth < first.bgm_chase);
});

test('late theft revisions cannot sound over player alert/search/return', () => {
  for (const phase of ['PLAYER_SPOTTED', 'SEARCH', 'RETURN'] as const) {
    const chase = reduceAudio(null, { ...base, phase: 'PLAYER_SPOTTED', spottedRevision: 1 }).state;
    const late = reduceAudio(chase, { ...base, phase, spottedRevision: 1, theftRevision: 1 });
    assert.deepEqual(late.whistles, []);
    assert.equal(late.music, 'bgm_chase');
    assert.equal(late.state.theftRevision, 1);
  }
});
test('simultaneous theft and spotted events prefer the spotted whistle only', () => {
  const start = reduceAudio(null, base).state;
  const result = reduceAudio(start,
    { ...base, phase: 'PLAYER_SPOTTED', theftRevision: 1, spottedRevision: 1 });
  assert.deepEqual(result.whistles, ['whistle_spotted']);
  assert.equal(result.music, 'bgm_chase');
});

test('diagnostics expose missing sources and persisted OFF without pretending playback or spamming', async () => {
  const { audioTransitionLog } = await import('../audioDiagnostics');
  const { normalizeProgress } = await import('../../progress/stageProgress');
  const progress = normalizeProgress({ soundEnabled: false, musicEnabled: false });
  const input = { ...base, sfxEnabled: progress.soundEnabled, bgmEnabled: progress.musicEnabled };
  const state = reduceAudio(null, input).state;
  assert.deepEqual(audioTransitionLog(null, input, null, state, () => false), [
    '[AUDIO] SETTINGS SFX=OFF BGM=OFF', '[AUDIO] BGM STEALTH MISSING_ASSET MUTED',
  ]);
  assert.deepEqual(audioTransitionLog(input, input, state, state, () => false), []);
  const theftInput = { ...input, phase: 'THEFT_ALERT' as const, theftRevision: 1 };
  const theft = reduceAudio(state, theftInput);
  assert.deepEqual(theft.whistles, []);
  assert.ok(audioTransitionLog(input, theftInput, state, theft.state, () => false)
    .includes('[AUDIO] WHISTLE_THEFT MISSING_ASSET MUTED'));
  const enabled = { ...theftInput, sfxEnabled: true, bgmEnabled: true };
  const resumed = reduceAudio(theft.state, enabled);
  assert.deepEqual(resumed.whistles, []);
  assert.equal(resumed.music, 'bgm_chase');
});
test('stable BGM phase and SEARCH/RETURN do not emit repeated music transition requests', async () => {
  const { audioTransitionLog } = await import('../audioDiagnostics');
  let input = { ...base, phase: 'PLAYER_SPOTTED' as GameAudioInput['phase'], spottedRevision: 1 };
  let state = reduceAudio(null, input).state;
  for (const phase of ['PLAYER_SPOTTED', 'SEARCH', 'RETURN'] as const) {
    const next = { ...input, phase };
    const decision = reduceAudio(state, next);
    assert.equal(decision.music, 'bgm_chase');
    assert.deepEqual(audioTransitionLog(input, next, state, decision.state, () => true), []);
    input = next; state = decision.state;
  }
});

test('three-state crossfade reaches exact endpoints in 0.9 seconds', () => {
  let mix = { ...silenceMix(), bgm_stealth: TRACK_BASE_GAIN.bgm_stealth };
  for (let i = 0; i < 18; i++) mix = fadeMix(mix, 'bgm_chase', 0.05);
  assert.ok(Math.abs(mix.bgm_chase - TRACK_BASE_GAIN.bgm_chase) < 1e-9);
  assert.ok(mix.bgm_stealth < 1e-9);
  for (let i = 0; i < 18; i++) mix = fadeMix(mix, 'bgm_stealth', 0.05);
  assert.ok(Math.abs(mix.bgm_stealth - TRACK_BASE_GAIN.bgm_stealth) < 1e-9);
  assert.ok(mix.bgm_chase < 1e-9);
});
test('interrupted three-track blend preserves aggregate gain and converges', () => {
  let mix = { ...silenceMix(), bgm_stealth: TRACK_BASE_GAIN.bgm_stealth };
  for (let i = 0; i < 5; i++) mix = fadeMix(mix, 'bgm_chase', 0.05);
  for (let i = 0; i < 16; i++) {
    mix = fadeMix(mix, 'bgm_chase', 0.05);
    assert.ok(Object.values(mix).reduce((a, b) => a + b, 0) <= TRACK_BASE_GAIN.bgm_chase + 0.000001);
  }
  assert.ok(Math.abs(mix.bgm_chase - TRACK_BASE_GAIN.bgm_chase) < 1e-9);
  assert.ok(mix.bgm_stealth < 1e-9);
  assert.deepEqual(fadeMix(mix, 'bgm_stealth', -1), mix);
});

test('native manager queues the first loading whistle, cancels suspended work, and releases voices', async () => {
  // Execute the production class with only its native module/clock boundary replaced.
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const ts = await import('typescript');
  const stateModule = await import('../audioState');
  const diagnostics = await import('../audioDiagnostics');
  const listeners = new Map<number, (status: unknown) => void>();
  const voices: {
    isLoaded: boolean; playing: boolean; loop: boolean; volume: number;
    playCount: number; removed: boolean; seekTo: () => Promise<void>;
    pause: () => void; play: () => void; remove: () => void;
    addListener: (name: string, callback: (status: unknown) => void) => { remove(): void };
  }[] = [];
  let releaseSeek: (() => void) | undefined;
  let removedSubscriptions = 0;
  let timerCount = 0;
  let now = 0;
  let mixerTick: (()=>void) | undefined;
  const registry = { bgm_stealth: 1, bgm_chase: 2, whistle_theft: 3, whistle_spotted: 4, bgm_lobby: 5, ui_select: 6, ui_back: 7 };
  const native = {
    createAudioPlayer: (_source: number, options: { downloadFirst: boolean }) => {
      assert.equal(options.downloadFirst, true);
      const id = voices.length;
      const voice = {
        isLoaded: false, playing: false, loop: false, volume: 0, playCount: 0, removed: false,
        seekTo: () => new Promise<void>(resolve => { releaseSeek = resolve; }),
        pause() { this.playing = false; },
        play() { this.playing = true; this.playCount++; },
        remove() { this.removed = true; },
        addListener(_name: string, callback: (status: unknown) => void) {
          listeners.set(id, callback);
          return { remove() { listeners.delete(id); removedSubscriptions++; } };
        },
      };
      voices.push(voice);
      return voice;
    },
    setAudioModeAsync: async () => {},
  };
  const output = ts.transpileModule(
    readFileSync(new URL('../GameAudioManager.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText;
  const exports: { GameAudioManager?: new () => { update(input: GameAudioInput): void; dispose(): void; playUI(event:'ui_select'|'ui_back'):void } } = {};
  runInNewContext(output, {
    exports, __DEV__: false, Date: {now:()=>now}, console,
    setInterval: (callback:()=>void) => { mixerTick=callback;timerCount++; return timerCount; },
    clearInterval: () => { timerCount--; },
    require: (name: string) => {
      if (name === 'expo-audio') return native;
      if (name === './audioAssets') return { AUDIO_SOURCES: registry };
      if (name === './audioDiagnostics') return diagnostics;
      if (name === './audioState') return stateModule;
      throw new Error(name);
    },
  });
  const manager = new exports.GameAudioManager!();
  const coldMenu = {...base, sessionKey:'menu', phase:'INTRO' as const, bgmEnabled:false, sfxEnabled:false};
  manager.update(coldMenu);
  assert.equal(timerCount, 0, 'initial storage wait + intro is silent');
  manager.update({...coldMenu, bgmEnabled:true, sfxEnabled:true});
  assert.equal(timerCount, 0, 'restoring ON during intro must stay silent');
  manager.update({...coldMenu, phase:'LOBBY', bgmEnabled:true, sfxEnabled:true});
  assert.equal(timerCount, 1, 'Home owns persistent request before asset readiness');
  now+=50; mixerTick?.();
  assert.equal(voices[4].playCount, 0, 'not-yet-loaded lobby cannot pretend to play');
  voices[4].isLoaded=true;
  for(let i=0;i<20;i++){now+=50;mixerTick?.();}
  assert.equal(voices[4].playCount, 1, 'late preload plays without another Home/update event');
  assert.ok(Math.abs(voices[4].volume-TRACK_BASE_GAIN.bgm_lobby)<1e-9);
  manager.update({...coldMenu, phase:'LOBBY', bgmEnabled:false});
  assert.equal(voices[4].playing,false,'saved BGM OFF is never overridden');
  manager.update(base);
  const theft = { ...base, phase: 'THEFT_ALERT' as const, theftRevision: 1 };
  manager.update(theft);
  assert.equal(voices[2].playCount, 0);
  const load = (id: number) => {
    voices[id].isLoaded = true;
    listeners.get(id)!({ isLoaded: true, playing: false, currentTime: 0, error: null });
  };
  load(2);
  releaseSeek!();
  await Promise.resolve();
  assert.equal(voices[2].playCount, 1, 'first event survives asynchronous preload');
  manager.update({ ...theft, phase: 'PLAYER_SPOTTED', spottedRevision: 1 });
  manager.update({ ...theft, phase: 'PLAYER_SPOTTED', spottedRevision: 1, active: false });
  load(3);
  assert.equal(voices[3].playCount, 0, 'pending load cannot play after background');
  manager.update({ ...theft, phase: 'PLAYER_SPOTTED', spottedRevision: 1 });
  assert.equal(voices[3].playCount, 0, 'foreground does not replay consumed event');
  manager.update({ ...theft, phase: 'PLAYER_SPOTTED', spottedRevision: 2 });
  manager.update({ ...base, sessionKey: 'retry' });
  releaseSeek!();
  await Promise.resolve();
  assert.equal(voices[3].playCount, 0, 'pending seek cannot play after session switch');
  for(const id of [0,1,2,3,4,5,6])load(id);
  const advance=(seconds:number)=>{for(let i=0;i<seconds*20;i++){now+=50;mixerTick?.();}};
  const menu={...base,sessionKey:'menu',phase:'LOBBY' as const};
  manager.update(menu); advance(1);
  assert.equal(voices[4].volume,TRACK_BASE_GAIN.bgm_lobby);
  const lobbyPlays=voices[4].playCount;
  for(let i=0;i<6;i++){manager.update(menu);advance(0.1);}
  assert.equal(voices[4].playCount,lobbyPlays,'menu navigation never restarts lobby');
  manager.update(base);
  assert.equal(voices[4].playing,true,'session switch preserves outgoing music for crossfade');
  advance(1);assert.ok(Math.abs(voices[0].volume-TRACK_BASE_GAIN.bgm_stealth)<1e-9);
  assert.equal(voices[4].playing,false);
  manager.update({...base,masterBgmVolume:0.5});advance(0.1);
  assert.ok(Math.abs(voices[0].volume-TRACK_BASE_GAIN.bgm_stealth*0.5)<1e-9,'one master factor');
  manager.update({...base,bgmEnabled:false});
  assert.equal(voices[0].playing,false);
  manager.update(menu);advance(1);
  assert.equal(voices[4].volume,TRACK_BASE_GAIN.bgm_lobby);
  manager.update({...menu,active:false});assert.equal(voices[4].playing,false);
  manager.update(menu);advance(1);assert.equal(voices[4].volume,TRACK_BASE_GAIN.bgm_lobby);
  load(5); load(6);
  manager.playUI('ui_select'); releaseSeek!(); await Promise.resolve();
  assert.equal(voices[5].playCount, 1);
  assert.equal(voices[5].volume, 0.45);
  manager.update({...base,sfxSuspended:true});
  manager.playUI('ui_select');
  manager.update({...base,phase:'INTRO',sfxSuspended:true,active:true});
  releaseSeek!();await Promise.resolve();
  assert.equal(voices[5].playCount,2,'Play Intro click survives asynchronous seek when replay suppresses music');
  assert.ok([0,1,4].every(id=>!voices[id].playing),'replayed intro keeps all music silent');
  manager.update({ ...base, sfxEnabled:false });
  manager.playUI('ui_back');
  assert.equal(voices[6].playCount, 0, 'SFX OFF suppresses Back');
  manager.update(base); manager.playUI('ui_back');
  manager.update({ ...base, active:false }); releaseSeek!(); await Promise.resolve();
  assert.equal(voices[6].playCount, 0, 'background cancels pending UI seek');
  manager.dispose();
  assert.equal(removedSubscriptions, 7);
  assert.equal(timerCount, 0);
  assert.ok(voices.every(voice => voice.removed && !voice.playing));
});


test('intro is silent; Home/Chapter/Mission Select/Settings preserve one lobby decision', () => {
  const menu = { ...base, sessionKey:'menu', phase:'INTRO' as const };
  let decision = reduceAudio(null, menu);
  assert.equal(decision.music, null);
  for (const _screen of ['Home','Chapter','Mission Select','Back','Settings','Back']) {
    decision = reduceAudio(decision.state, {...menu, phase:'LOBBY'});
    assert.equal(decision.music,'bgm_lobby',_screen); assert.deepEqual(decision.whistles,[]);
  }
  const off=reduceAudio(decision.state,{...menu,phase:'LOBBY',bgmEnabled:false});
  assert.equal(off.music,null);
  assert.equal(reduceAudio(off.state,{...menu,phase:'LOBBY'}).music,'bgm_lobby');
  assert.equal(reduceAudio(off.state,{...menu,phase:'LOBBY',active:false}).music,null);
});
test('lobby/gameplay crossfades finish in 0.9 seconds and direct next mission never selects lobby', () => {
  let mix={...silenceMix(),bgm_lobby:TRACK_BASE_GAIN.bgm_lobby};
  for(let i=0;i<18;i++)mix=fadeMix(mix,'bgm_stealth',0.05);
  assert.ok(Math.abs(mix.bgm_stealth-TRACK_BASE_GAIN.bgm_stealth)<1e-9);assert.ok(mix.bgm_lobby<1e-9);
  for(let i=0;i<18;i++)mix=fadeMix(mix,'bgm_lobby',0.05);
  assert.ok(Math.abs(mix.bgm_lobby-TRACK_BASE_GAIN.bgm_lobby)<1e-9);assert.ok(mix.bgm_stealth<1e-9);
  const chase=reduceAudio(null,{...base,phase:'PLAYER_SPOTTED'});
  const next=reduceAudio(chase.state,{...base,sessionKey:'01-02:0'});
  assert.equal(next.music,'bgm_stealth');assert.deepEqual(next.whistles,[]);
});
test('paused/result UI retains BGM but consumes unheard alert events', () => {
  const result=reduceAudio(reduceAudio(null,base).state,{...base,sfxSuspended:true,spottedRevision:1,phase:'PLAYER_SPOTTED'});
  assert.equal(result.music,'bgm_chase');assert.deepEqual(result.whistles,[]);
  assert.deepEqual(reduceAudio(result.state,{...base,spottedRevision:1,phase:'PLAYER_SPOTTED'}).whistles,[]);
});


test('cold-launch diagnostics distinguish silent Intro from audible Home intent', async () => {
  const { audioTransitionLog } = await import('../audioDiagnostics');
  const intro={...base,sessionKey:'menu',phase:'INTRO' as const};
  const prior=reduceAudio(null,intro).state;
  assert.ok(audioTransitionLog(null,intro,null,prior,()=>true).includes('[AUDIO] BGM LOBBY INTRO_SILENT'));
  const home={...intro,phase:'LOBBY' as const};
  const current=reduceAudio(prior,home).state;
  assert.ok(audioTransitionLog(intro,home,prior,current,()=>true).includes('[AUDIO] BGM LOBBY REQUESTED'));
  assert.deepEqual(audioTransitionLog(home,home,current,current,()=>true),[]);
});
