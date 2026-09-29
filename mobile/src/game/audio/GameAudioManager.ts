import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { AUDIO_SOURCES } from './audioAssets';
import { audioTransitionLog } from './audioDiagnostics';
import { fadeMix, UI_GAIN, WHISTLE_GAIN, MUSIC_EVENTS, reduceAudio, silenceMix, type AudioState, type GameAudioInput,
  type AudioEvent, type UiSoundEvent, type MusicEvent, type WhistleEvent } from './audioState';

/** Native backend for the prototype's named audio events. Max 4 music + 4 SFX voices.
 * Bundled assets preload before playback; each whistle has one replace-oldest voice.
 * Final mastering/tempo/spatial metadata remain part of asset acceptance.
 */
export class GameAudioManager {
  private state: AudioState | null = null;
  private previousInput: GameAudioInput | null = null;
  private players = new Map<AudioEvent, AudioPlayer>();
  private mix = silenceMix();
  private target: MusicEvent | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private generation = 0;
  private disposed = false;
  private sfxAllowed = false;
  private lastTick = 0;
  private masterBgmVolume = 1;
  private uiAllowed = false;
  private uiGeneration = 0;
  private subscriptions: { remove(): void }[] = [];
  private pendingWhistles = new Map<WhistleEvent, { generation: number; requestedAt: number }>();

  constructor() {
    // Missing assets allocate neither native players nor the mixer timer.
    for (const key of Object.keys(AUDIO_SOURCES) as AudioEvent[]) {
      const source = AUDIO_SOURCES[key];
      if (source == null) continue;
      const player = createAudioPlayer(source, { updateInterval: 100, downloadFirst: true });
      player.loop = key.startsWith('bgm_');
      player.volume = 0;
      this.players.set(key, player);
      let loaded = false;
      let advancing = false;
      let lastError: string | null = null;
      this.subscriptions.push(player.addListener('playbackStatusUpdate', status => {
        if (this.disposed) return;
        if (status.isLoaded && !loaded && __DEV__) console.info(
          `[AUDIO] NATIVE_LOADED ${key} duration=${status.duration.toFixed(3)}`);
        loaded = status.isLoaded;
        const running = status.playing && status.currentTime > 0;
        if (running && !advancing && __DEV__) console.info(
          `[AUDIO] NATIVE_ADVANCING ${key} time=${status.currentTime.toFixed(3)} volume=${player.volume.toFixed(3)}`);
        advancing = running;
        if (status.error && status.error !== lastError && __DEV__)
          console.warn(`[AUDIO] NATIVE_ERROR ${key} ${status.error}`);
        lastError = status.error;
        if (status.isLoaded && key.startsWith('whistle_')) this.flushWhistle(key as WhistleEvent);
      }));
    }
    if (this.players.size) void setAudioModeAsync({ playsInSilentMode: true,
      shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' }).catch(error => {
      if (__DEV__) console.warn('[AUDIO] MODE_SETUP_FAILED', error);
    });
  }

  update(input: GameAudioInput): void {
    if (this.disposed) return;
    if (this.state && this.state.sessionKey !== input.sessionKey) {
      this.generation++; this.pendingWhistles.clear();
      for (const name of ['whistle_theft', 'whistle_spotted'] as const) this.players.get(name)?.pause();
    }
    const decision = reduceAudio(this.state, input);
    if (__DEV__) {
      for (const line of audioTransitionLog(this.previousInput, input, this.state, decision.state,
        event => AUDIO_SOURCES[event] != null)) console.info(line);
      this.previousInput = { ...input };
    }
    this.state = decision.state;
    this.masterBgmVolume = Math.max(0, Math.min(1, input.masterBgmVolume ?? 1));
    this.uiAllowed = input.active && input.sfxEnabled;
    if (!this.uiAllowed) {
      this.uiGeneration++;
      for (const name of ['ui_select', 'ui_back'] as const) this.players.get(name)?.pause();
    }
    this.sfxAllowed = input.active && !input.paused && !input.sfxSuspended && input.sfxEnabled;
    if (!this.sfxAllowed) {
      this.generation++;
      this.pendingWhistles.clear();
      for (const name of ['whistle_theft', 'whistle_spotted'] as const) this.players.get(name)?.pause();
    }
    for (const event of decision.whistles) this.whistle(event);
    this.target = decision.music;
    if (!this.target) {
      this.mix = silenceMix();
      for (const name of MUSIC_EVENTS) {
        const player = this.players.get(name);
        if (player) { player.volume = 0; player.pause(); }
      }
      this.clearTimer();
    } else if (MUSIC_EVENTS.some(name => this.players.has(name)) && !this.timer) {
      this.lastTick = Date.now();
      this.timer = setInterval(() => this.tick(), 50);
    }
  }

  playUI(name: UiSoundEvent): void {
    const player = this.players.get(name);
    if (this.disposed || !this.uiAllowed || !player?.isLoaded) return;
    const generation = ++this.uiGeneration;
    for (const event of ['ui_select', 'ui_back'] as const) this.players.get(event)?.pause();
    void player.seekTo(0).then(() => {
      if (this.disposed || !this.uiAllowed || generation !== this.uiGeneration) return;
      player.volume = UI_GAIN; player.play();
      if (__DEV__) console.info(`[AUDIO] UI_PLAY ${name}`);
    }).catch(error => { if (__DEV__) console.warn(`[AUDIO] ${name} SEEK_FAILED`, error); });
  }

  private whistle(name: WhistleEvent): void {
    if (!this.players.has(name)) return;
    // Replace pending/playing theft when a stronger spotted event arrives.
    this.generation++;
    this.pendingWhistles.clear();
    for (const event of ['whistle_theft', 'whistle_spotted'] as const) this.players.get(event)?.pause();
    this.pendingWhistles.set(name, { generation: this.generation, requestedAt: Date.now() });
    this.flushWhistle(name);
  }

  private flushWhistle(name: WhistleEvent): void {
    const player = this.players.get(name);
    const pending = this.pendingWhistles.get(name);
    if (!player?.isLoaded || !pending) return;
    this.pendingWhistles.delete(name);
    // A failed/very late load must not replay an old alert in a different context.
    if (!this.sfxAllowed || pending.generation !== this.generation || Date.now() - pending.requestedAt > 2000) return;
    void player.seekTo(0).then(() => {
      if (!this.disposed && this.sfxAllowed && pending.generation === this.generation) {
        player.volume = WHISTLE_GAIN;
        player.play();
      }
    }).catch(error => { if (__DEV__) console.warn(`[AUDIO] ${name.toUpperCase()} SEEK_FAILED`, error); });
  }

  private tick(): void {
    const now = Date.now();
    // Keep the outgoing loop until the incoming asset is actually ready.
    if (this.target && !this.players.get(this.target)?.isLoaded) {
      this.lastTick = now;
      return;
    }
    this.mix = fadeMix(this.mix, this.target, Math.min(0.1, (now - this.lastTick) / 1000));
    this.lastTick = now;
    for (const name of MUSIC_EVENTS) {
      const player = this.players.get(name);
      if (!player || !player.isLoaded) continue;
      player.volume = this.mix[name] * this.masterBgmVolume;
      if (this.mix[name] > 0.001) { if (!player.playing) player.play(); }
      else player.pause();
    }
  }

  private clearTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
  private stopAll(): void {
    this.generation++;
    this.pendingWhistles.clear();
    this.clearTimer();
    this.mix = silenceMix();
    for (const player of this.players.values()) { player.volume = 0; player.pause(); }
  }
  dispose(): void {
    this.disposed = true;
    this.uiGeneration++;
    this.stopAll();
    for (const subscription of this.subscriptions) subscription.remove();
    this.subscriptions = [];
    for (const player of this.players.values()) player.remove();
    this.players.clear();
  }
}
