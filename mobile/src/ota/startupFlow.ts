/**
 * Startup sequencing and OTA status: the decisions, with no React, storage or native module in them, so that they
 * can be tested as they are. OtaRefresh / applyUpdate / StartupScreen / BrandingScreen only wire these to the app.
 */

/** What the startup screen says about the update check. null: nothing to say (development bundle). */
export type OtaStatus = 'checking' | 'downloading' | 'applying' | 'latest' | 'offline' | 'failed';

/** Text key of each status (keys of src/ui/menu/strings.ts). */
export const OTA_STATUS_TEXT = {
  checking: 'updateChecking',
  downloading: 'updateDownloading',
  applying: 'updateApplying',
  latest: 'updateLatest',
  offline: 'updateOffline',
  failed: 'updateFailed',
} as const satisfies Record<OtaStatus, string>;

/**
 * Startup is ready when the running bundle is the one to play this launch: the check is over (whatever its result)
 * and no update is about to replace the runtime. A failed or offline check never keeps the app from starting.
 */
export function isStartupReady(status: OtaStatus | null): boolean {
  return status === null || status === 'latest' || status === 'offline' || status === 'failed';
}

/** Where an update check ended. */
export type CheckOutcome = 'reloading' | 'current' | 'deferred' | 'offline' | 'failed';

/** Status shown for a finished check that leaves this bundle running. */
export function statusAfterCheck(outcome: CheckOutcome): OtaStatus {
  return outcome === 'offline' ? 'offline' : outcome === 'failed' ? 'failed' : 'latest';
}

/**
 * The Home intro (museum scene, logo, menu reveal) starts when — and only when — startup is ready, its artwork can
 * be drawn and the app is in the foreground, and it starts once per mount. Mounting the screen does not start it.
 */
export function shouldStartHomeIntro(input: {
  startupReady: boolean;
  artReady: boolean;
  appActive: boolean;
  started: boolean;
  finished: boolean;
}): boolean {
  return input.startupReady && input.artReady && input.appActive && !input.started && !input.finished;
}

/** Leaving the app ends a running intro (the player comes back to Home). A passing system overlay does not. */
export function introEndsOnAppState(state: string): boolean {
  return state === 'background';
}

/** No connection, as far as the error tells. Either way the app starts on the bundle it has. */
export function isOfflineError(error: unknown): boolean {
  const e = error as { message?: unknown; code?: unknown } | null | undefined;
  const text = `${typeof e?.code === 'string' ? e.code : ''} ${typeof e?.message === 'string' ? e.message : String(error ?? '')}`;
  // iOS words these in the device language, so the Korean wording of the same URL errors is listed too.
  return /offline|not connected|no internet|internet connection|network (request failed|connection|is unreachable|error)|timed out|could not connect|cannot find host|-100[13459]\b|-1020\b|오프라인|인터넷|네트워크|서버에 연결할 수 없|시간이 초과|서버를 찾을 수 없/i.test(text);
}

export interface UpdatesDriver {
  check(): Promise<{ available: boolean; rollback: boolean }>;
  fetch(): Promise<{ isNew: boolean; rollback: boolean; id: string | null }>;
  /** Shows "applying", waits until it is on screen, then replaces the runtime. Returns only if that did not happen. */
  apply(id: string | null): Promise<void>;
}

/**
 * One update check from start to end: check → (download → apply). `onStage` is called as each visible stage begins.
 * A failing check is tried once more and then given up: the app starts on the bundle it has, and the check runs
 * again from the menu a little later anyway.
 * `allowApply` is asked before the download and again before the reload: during a mission nothing is applied.
 */
export async function checkDownloadApply(driver: UpdatesDriver, options: {
  onStage?: (stage: 'downloading' | 'applying') => void;
  allowApply?: () => boolean;
  isReloading?: () => boolean;
  attempts?: number;
  retryMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onError?: (error: unknown) => void;
  /** Is the failure "no connection"? Defaults to reading the error; the app also probes the update host. */
  isOffline?: (error: unknown) => boolean | Promise<boolean>;
} = {}): Promise<CheckOutcome> {
  const allowApply = options.allowApply ?? (() => true);
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const afterApply = (): CheckOutcome => (options.isReloading?.() ? 'reloading' : 'current');
  for (let attempt = 0; attempt < (options.attempts ?? 2); attempt++) {
    try {
      const check = await driver.check();
      if (check.rollback) {
        options.onStage?.('applying');
        await driver.apply(null);
        return afterApply();
      }
      if (!check.available) return 'current';
      if (!allowApply()) return 'deferred';
      options.onStage?.('downloading');
      const fetched = await driver.fetch();
      if (!allowApply()) return 'deferred';
      if (!fetched.isNew && !fetched.rollback) return 'current';
      options.onStage?.('applying');
      await driver.apply(fetched.id);
      return afterApply();
    } catch (error) {
      options.onError?.(error);
      // Without a connection there is nothing to wait for: start on the bundle already here.
      if (await (options.isOffline ?? isOfflineError)(error)) return 'offline';
      await sleep(options.retryMs ?? 700);
    }
  }
  return 'failed';
}

/**
 * "Applying update…" has to be seen before the runtime is replaced: setting the state and reloading in the same
 * tick replaces the runtime before React has drawn anything. So: show it, wait until the screen reports that it
 * has been drawn (`painted`, bounded by `paintDeadlineMs` so a lost signal never blocks the update), leave it up
 * for `readMs`, and only then reload.
 */
export async function showApplyingThenReload(input: {
  show?: () => void;
  painted: () => Promise<void>;
  reload: () => Promise<void>;
  paintDeadlineMs: number;
  readMs: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<void> {
  const sleep = input.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  input.show?.();
  await Promise.race([input.painted().catch(() => {}), sleep(input.paintDeadlineMs)]);
  if (input.readMs > 0) await sleep(input.readMs);
  await input.reload();
}

export const OTA_APPLY_ATTEMPT_KEY = 'dont-move.ota.apply-attempt';
/** How long a restart onto a bundle whose id is not known counts as "just tried". */
export const APPLY_RETRY_QUIET_MS = 60_000;

/**
 * Reload-loop guard. Before the runtime is restarted onto an update, that attempt is written down. If the next
 * launch finds the same update still waiting — the restart happened and it is not what is running — restarting
 * again would only repeat it. The update is then left to the native launcher, which picks it up on a later cold start.
 */
export function alreadyTriedUpdate(input: {
  candidateId: string | null;
  runningId: string | null;
  attempt: { id: string | null; at: number } | null;
  now: number;
}): boolean {
  const { attempt } = input;
  if (!attempt) return false;
  if (input.candidateId) return attempt.id === input.candidateId && input.runningId !== input.candidateId;
  // A pending bundle without an id: only "we restarted a moment ago and it is still pending" can be told.
  return attempt.id === null && input.now - attempt.at < APPLY_RETRY_QUIET_MS;
}

export const OTA_SEEN_UPDATE_KEY = 'dont-move.ota.seen-update-id';

/**
 * "Update applied" is shown once, on the first launch that runs an update other than the one last seen.
 * Nothing seen yet (first install, or first launch of a version that keeps this record) only records what is
 * running: there is no earlier bundle to have been updated from.
 */
export function shouldShowOtaToast(input: {
  dev: boolean;
  enabled: boolean;
  embedded: boolean;
  updateId: string | null;
  seenId: string | null;
}): boolean {
  if (input.dev || !input.enabled || input.embedded || !input.updateId) return false;
  if (!input.seenId) return false;
  return input.updateId !== input.seenId;
}

export function nextSeenUpdateId(embedded: boolean, updateId: string | null): string | null {
  if (updateId) return updateId;
  return embedded ? 'embedded' : null;
}

/** First eight characters of an update id: enough to tell updates apart, short enough to read. */
export function shortUpdateId(id: string | null | undefined): string | null {
  const text = (id ?? '').replace(/[^0-9a-f]/gi, '');
  return text.length >= 8 ? text.slice(0, 8).toLowerCase() : null;
}

/** What is running, for the startup screen and the applied toast: "v1.0.0 (2) · Embedded" or "v1.0.0 (2) · OTA a21a7422". */
export function runningBundleLabel(input: {
  version: string | null | undefined;
  build: string | null | undefined;
  dev: boolean;
  embedded: boolean;
  /** EAS update group (what `eas update` prints); the per-platform update id is the fallback. */
  updateGroup?: string | null;
  updateId?: string | null;
}): string {
  const app = `v${input.version || '?'}${input.build ? ` (${input.build})` : ''}`;
  if (input.dev) return `${app} · DEV`;
  const short = shortUpdateId(input.updateGroup) ?? shortUpdateId(input.updateId);
  return input.embedded || !short ? `${app} · Embedded` : `${app} · OTA ${short}`;
}

/** "Update applied · OTA a21a7422" */
export function appliedToastText(applied: string, updateGroup: string | null | undefined, updateId: string | null | undefined): string {
  const short = shortUpdateId(updateGroup) ?? shortUpdateId(updateId);
  return short ? `${applied} · OTA ${short}` : applied;
}
