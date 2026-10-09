/**
 * Mission Complete → Next Stage, as one sequence with exactly one mission on screen at any time:
 *
 *   idle → ad → fadeOut → empty → mounting → fadeIn → idle
 *
 *   ad        an interstitial that is ALREADY loaded is shown; otherwise this step ends at once
 *   fadeOut   the screen goes to black over the finished mission
 *   empty     the finished mission is unmounted; nothing but the black cover is drawn
 *   mounting  the next mission is mounted under the cover and prepares its resources
 *   fadeIn    the cover clears; the next mission starts when it is gone
 *
 * No React, no animation library, no timers of its own: the host supplies them, so the order, the lock and the
 * recovery paths can be tested as they are. Every step is entered once, either by its own signal or by its
 * watchdog, so a lost animation callback, a lost frame or a mission that never reports ready cannot leave the game
 * on a black screen or the "Next Stage" button locked.
 */
export type SwapPhase = 'idle' | 'ad' | 'fadeOut' | 'empty' | 'mounting' | 'fadeIn';
export type SwapBreadcrumb = 'next_stage_pressed' | 'mission_transition_begin' | 'mission_old_unmounted'
  | 'mission_new_ready' | 'mission_transition_complete';

export const SWAP_TIMING = {
  /** Fade to and from black. Short: the wait is for the next mission, not for the effect. */
  fadeMs: 160,
  /** A fade whose end is never reported is taken as finished after this long. */
  fadeWatchdogMs: 700,
  /** The frames after the old mission is unmounted, likewise. */
  framesWatchdogMs: 500,
  /** A next mission that never reports ready is revealed anyway after this long. */
  readyWatchdogMs: 4000,
} as const;

export interface MissionSwapDeps<Timer = unknown> {
  /** Show an interstitial if one is due and already loaded. Must not wait for a load. May reject. */
  presentAd(): Promise<unknown>;
  /** Record that the player is now on mission `to` (the clear itself was saved when the mission was completed). */
  commit(to: number): void;
  /** Animate the black cover to opaque (1) or clear (0) and call `done` at the end. */
  fade(to: 0 | 1, done: () => void): void;
  /** Mount mission `index`, or nothing at all (null). At most one mission is ever mounted. */
  setMounted(index: number | null): void;
  /** Call `done` once the unmount has been drawn (a couple of frames). */
  afterFrames(done: () => void): void;
  setTimer(run: () => void, ms: number): Timer;
  clearTimer(timer: Timer): void;
  /** Phase changes, for the host's own state (touch blocking, freezing the incoming mission). */
  onPhase?(phase: SwapPhase, to: number): void;
  /** Diagnostics. Must not throw into the sequence; if it does, it is ignored. */
  breadcrumb?(name: SwapBreadcrumb, props: Record<string, string | number | boolean>): void;
}

export function createMissionSwap<Timer>(deps: MissionSwapDeps<Timer>) {
  let phase: SwapPhase = 'idle';
  let run = 0;
  let from = -1, target = -1;
  let watchdog: Timer | null = null;

  const note = (name: SwapBreadcrumb, props: Record<string, string | number | boolean> = {}) => {
    try { deps.breadcrumb?.(name, { from, to: target, ...props }); } catch { /* diagnostics never steer the game */ }
  };
  const disarm = () => { if (watchdog !== null) { deps.clearTimer(watchdog); watchdog = null; } };
  const enter = (next: SwapPhase) => {
    phase = next;
    try { deps.onPhase?.(next, target); } catch { /* the host's bookkeeping never steers the game */ }
  };
  /**
   * Something in the sequence threw. Put the game in a playable state: the next mission mounted, the cover clear,
   * the lock released.
   */
  const recover = (id: number, reason: string) => {
    if (id !== run) return;
    disarm();
    try { deps.setMounted(target); } catch { /* nothing more can be done here */ }
    try { deps.fade(0, () => {}); } catch { /* likewise */ }
    note('mission_transition_complete', { recovered: true, reason });
    enter('idle');
  };
  /**
   * Leave `expected` exactly once. The returned function is handed both to the real signal and to the watchdog;
   * whichever comes second finds the phase already left and does nothing.
   */
  const leave = (id: number, expected: SwapPhase, action: (late: boolean) => void, watchdogMs?: number) => {
    const go = (late: boolean) => {
      if (id !== run || phase !== expected) return;
      disarm();
      try { action(late); } catch { recover(id, `threw leaving ${expected}`); }
    };
    if (watchdogMs !== undefined) watchdog = deps.setTimer(() => go(true), watchdogMs);
    return () => go(false);
  };

  const fadeIn = (id: number, ready: boolean) => {
    note('mission_new_ready', { ready });
    enter('fadeIn');
    const done = leave(id, 'fadeIn', (late) => {
      note('mission_transition_complete', late ? { fadeReported: false } : {});
      enter('idle');
    }, SWAP_TIMING.fadeWatchdogMs);
    deps.fade(0, done);
  };
  const mount = (id: number) => {
    enter('mounting');
    // The next mission reports through newStageReady(); if it never does, it is revealed anyway.
    leave(id, 'mounting', () => fadeIn(id, false), SWAP_TIMING.readyWatchdogMs);
    deps.setMounted(target);
  };
  const unmount = (id: number) => {
    enter('empty');
    deps.setMounted(null);
    note('mission_old_unmounted');
    deps.afterFrames(leave(id, 'empty', () => mount(id), SWAP_TIMING.framesWatchdogMs));
  };
  const fadeOut = (id: number) => {
    note('mission_transition_begin');
    enter('fadeOut');
    deps.commit(target);
    deps.fade(1, leave(id, 'fadeOut', () => unmount(id), SWAP_TIMING.fadeWatchdogMs));
  };

  return {
    phase: (): SwapPhase => phase,
    /** A transition is in progress; "Next Stage" does nothing until it has finished. */
    locked: (): boolean => phase !== 'idle',
    /**
     * Begin. Returns false, and does nothing, while a transition is already running: pressing the button again
     * cannot start a second one, show a second ad or launch a second mission.
     */
    start(fromIndex: number, toIndex: number): boolean {
      if (phase !== 'idle') return false;
      const id = ++run;
      from = fromIndex; target = toIndex;
      note('next_stage_pressed');
      enter('ad');
      const afterAd = leave(id, 'ad', () => fadeOut(id));
      // An ad that fails in any way is the same as no ad: go on.
      let ad: Promise<unknown>;
      try { ad = Promise.resolve(deps.presentAd()); } catch { ad = Promise.resolve(); }
      void ad.then(afterAd, afterAd);
      return true;
    },
    /** The mounted mission has its resources and has drawn. Ignored unless it is the one being waited for. */
    newStageReady(index: number): void {
      if (phase !== 'mounting' || index !== target) return;
      const id = run;
      leave(id, 'mounting', () => fadeIn(id, true))();
    },
    /** The host is going away (Home, chapter list). Late signals of the abandoned run are ignored. */
    cancel(): void {
      run++;
      disarm();
      phase = 'idle';
    },
  };
}
