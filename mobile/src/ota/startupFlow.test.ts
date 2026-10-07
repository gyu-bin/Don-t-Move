import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  alreadyTriedUpdate, APPLY_RETRY_QUIET_MS, checkDownloadApply, introEndsOnAppState, isOfflineError, isStartupReady, nextSeenUpdateId,
  shouldShowOtaToast, shouldStartHomeIntro, showApplyingThenReload, showsApplyingText,
  statusAfterCheck, type OtaStatus, type UpdatesDriver,
} from './startupFlow';

const noSleep = () => Promise.resolve();
const driver = (script: Partial<UpdatesDriver>, log: string[]): UpdatesDriver => ({
  check: async () => { log.push('check'); return script.check ? script.check() : { available: false, rollback: false }; },
  fetch: async () => { log.push('fetch'); return script.fetch ? script.fetch() : { isNew: true, rollback: false, id: 'new' }; },
  apply: async (id) => { log.push(`apply:${id}`); await script.apply?.(id); },
});

/** One mount of the Home screen, as BrandingScreen runs it. */
function homeMount() {
  const state = { started: false, finished: false, starts: 0 };
  return {
    state,
    tick(input: { startupReady: boolean; artReady?: boolean; appActive?: boolean }) {
      if (shouldStartHomeIntro({ startupReady: input.startupReady, artReady: input.artReady ?? true, appActive: input.appActive ?? true, started: state.started, finished: state.finished })) {
        state.started = true; state.starts++;
      }
    },
    finish() { state.finished = true; },
    appState(next: string) { if (state.started && !state.finished && introEndsOnAppState(next)) state.finished = true; },
  };
}

test('cold launch: the Home intro does not start before startup is ready', () => {
  const home = homeMount();
  for (const status of ['checking', 'downloading', 'applying'] as OtaStatus[]) {
    assert.equal(isStartupReady(status), false, status);
    home.tick({ startupReady: isStartupReady(status) });
  }
  assert.equal(home.state.starts, 0);
  // Mounted, artwork decoded, app in front — still waiting for the startup signal.
  home.tick({ startupReady: false, artReady: true, appActive: true });
  assert.equal(home.state.started, false);
});

test('startup ready: the Home intro starts exactly once', () => {
  const home = homeMount();
  home.tick({ startupReady: false });
  home.tick({ startupReady: true, artReady: false });
  assert.equal(home.state.starts, 0, 'not before its artwork can be drawn');
  home.tick({ startupReady: true, appActive: false });
  assert.equal(home.state.starts, 0, 'not while the app is not in front');
  home.tick({ startupReady: true });
  home.tick({ startupReady: true });
  home.tick({ startupReady: true });
  assert.equal(home.state.starts, 1);
  home.finish();
  home.tick({ startupReady: true });
  assert.equal(home.state.starts, 1, 'a finished intro does not start again');
});

test('background resume: the Home intro is not played again', () => {
  const home = homeMount();
  home.tick({ startupReady: true });
  home.finish();
  home.appState('inactive'); home.appState('background'); home.appState('active');
  home.tick({ startupReady: true });
  assert.equal(home.state.starts, 1);
  // Leaving in the middle of the intro ends it: Home is there on return, and it does not replay.
  const left = homeMount();
  left.tick({ startupReady: true });
  left.appState('inactive');
  assert.equal(left.state.finished, false, 'a passing system overlay does not cut the intro');
  left.appState('background');
  assert.equal(left.state.finished, true);
  left.appState('active');
  left.tick({ startupReady: true });
  assert.equal(left.state.starts, 1);
});

test('OTA reload: the new bundle is a new launch, so its Home intro plays', () => {
  const before = homeMount();
  before.tick({ startupReady: isStartupReady('applying') });
  assert.equal(before.state.starts, 0, 'the bundle being replaced never shows Home');
  const after = homeMount(); // reloadAsync starts a new JS runtime: nothing carries over
  after.tick({ startupReady: isStartupReady('checking') });
  assert.equal(after.state.starts, 0);
  after.tick({ startupReady: isStartupReady('latest') });
  assert.equal(after.state.starts, 1);
});

test('no update: checking → latest, and the app starts', async () => {
  const log: string[] = [], stages: string[] = [];
  const outcome = await checkDownloadApply(driver({}, log), { onStage: (s) => stages.push(s), sleep: noSleep });
  assert.equal(outcome, 'current');
  assert.deepEqual(log, ['check']);
  assert.deepEqual(stages, []);
  assert.equal(statusAfterCheck(outcome), 'latest');
  assert.equal(isStartupReady(statusAfterCheck(outcome)), true);
});

test('update found: checking → downloading → applying, in that order', async () => {
  const log: string[] = [];
  let reloading = false;
  const outcome = await checkDownloadApply(driver({
    check: async () => ({ available: true, rollback: false }),
    apply: async () => { reloading = true; },
  }, log), { onStage: (s) => log.push(`stage:${s}`), isReloading: () => reloading, sleep: noSleep });
  assert.deepEqual(log, ['check', 'stage:downloading', 'fetch', 'stage:applying', 'apply:new']);
  assert.equal(outcome, 'reloading');
});

test('update found during a mission: nothing is downloaded or applied', async () => {
  const log: string[] = [];
  const outcome = await checkDownloadApply(driver({ check: async () => ({ available: true, rollback: false }) }, log),
    { allowApply: () => false, onStage: (s) => log.push(`stage:${s}`), sleep: noSleep });
  assert.equal(outcome, 'deferred');
  assert.deepEqual(log, ['check']);
});

test('apply: the applying screen is drawn before reload is called', async () => {
  const log: string[] = [];
  let painted!: () => void;
  const done = showApplyingThenReload({
    show: () => log.push('show'),
    painted: () => new Promise<void>((resolve) => { painted = () => { log.push('painted'); resolve(); }; }),
    reload: async () => { log.push('reload'); },
    paintDeadlineMs: 60_000, readMs: 5,
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(log, ['show'], 'reload waits: setting the state is not the same as having drawn it');
  painted();
  await done;
  assert.deepEqual(log, ['show', 'painted', 'reload']);
});

test('apply: a lost paint signal cannot block the update', async () => {
  const log: string[] = [];
  await showApplyingThenReload({
    show: () => log.push('show'), painted: () => new Promise<void>(() => {}), reload: async () => { log.push('reload'); },
    paintDeadlineMs: 10, readMs: 0,
  });
  assert.deepEqual(log, ['show', 'reload']);
});

test('offline or failing check: the app still starts on the bundle it has', async () => {
  const log: string[] = [];
  const offline = await checkDownloadApply(driver({
    check: async () => { throw new Error('The Internet connection appears to be offline.'); },
  }, log), { sleep: noSleep });
  assert.equal(offline, 'offline');
  assert.deepEqual(log, ['check'], 'no retries without a connection');
  assert.equal(statusAfterCheck(offline), 'offline');
  assert.equal(isStartupReady(statusAfterCheck(offline)), true);

  const tries: string[] = [];
  const failed = await checkDownloadApply(driver({ check: async () => { throw new Error('server said no'); } }, tries), { attempts: 3, sleep: noSleep });
  assert.equal(failed, 'failed');
  assert.equal(tries.length, 3);
  assert.equal(statusAfterCheck(failed), 'failed');
  assert.equal(isStartupReady(statusAfterCheck(failed)), true);

  // expo-updates does not pass the reason on ("ERR_UPDATES_CHECK: undefined reason"), so the app asks the network itself.
  const probed: string[] = [];
  const unreachable = await checkDownloadApply(driver({ check: async () => { throw Object.assign(new Error('ERR_UPDATES_CHECK: undefined reason'), { code: 'ERR_UPDATES_CHECK' }); } }, probed),
    { isOffline: async () => true, sleep: noSleep });
  assert.equal(unreachable, 'offline');
  assert.deepEqual(probed, ['check']);

  // A download that dies half-way is retried, and gives up without blocking.
  const half: string[] = [];
  const dropped = await checkDownloadApply(driver({
    check: async () => ({ available: true, rollback: false }),
    fetch: async () => { throw new Error('ERR_UPDATES_FETCH'); },
  }, half), { attempts: 2, sleep: noSleep });
  assert.equal(dropped, 'failed');
  assert.deepEqual(half, ['check', 'fetch', 'check', 'fetch']);
});

test('offline is recognised from the error, in English or Korean, and other errors are not', () => {
  for (const message of ['The Internet connection appears to be offline.', 'Network request failed', 'The request timed out.', 'NSURLErrorDomain Code=-1009', 'Could not connect to the server.',
   '인터넷 연결이 오프라인 상태입니다.', '서버에 연결할 수 없습니다.', '요청한 시간이 초과되었습니다.', '네트워크 연결이 유실되었습니다.', '지정된 호스트 이름을 가진 서버를 찾을 수 없습니다.'])
    assert.equal(isOfflineError(new Error(message)), true, message);
  for (const message of ['Failed to parse manifest', 'server said no', 'ERR_UPDATES_CODE_SIGNING'])
    assert.equal(isOfflineError(new Error(message)), false, message);
});

test('the startup screen only ever says "applying", and only while an update is in flight', () => {
  assert.equal(showsApplyingText('downloading'), true);
  assert.equal(showsApplyingText('applying'), true);
  for (const quiet of ['checking', 'latest', 'offline', 'failed', null] as (OtaStatus | null)[]) assert.equal(showsApplyingText(quiet), false, String(quiet));
});

test('first install: no "update applied" toast', () => {
  assert.equal(shouldShowOtaToast({ dev: false, enabled: true, embedded: true, updateId: null, seenId: null }), false);
  assert.equal(nextSeenUpdateId(true, null), 'embedded');
  // First launch of a version that starts keeping the record, already running an update: record it, say nothing.
  assert.equal(shouldShowOtaToast({ dev: false, enabled: true, embedded: false, updateId: 'a', seenId: null }), false);
  assert.equal(nextSeenUpdateId(false, 'a'), 'a');
});

test('same OTA on the next launch: no toast', () => {
  assert.equal(shouldShowOtaToast({ dev: false, enabled: true, embedded: false, updateId: 'a', seenId: 'a' }), false);
});

test('new OTA: the toast shows once', () => {
  let seen: string | null = 'embedded';
  const launch = (embedded: boolean, updateId: string | null) => {
    const show = shouldShowOtaToast({ dev: false, enabled: true, embedded, updateId, seenId: seen });
    seen = nextSeenUpdateId(embedded, updateId) ?? seen;
    return show;
  };
  assert.equal(launch(true, null), false);  // installed
  assert.equal(launch(false, 'a'), true);   // first launch on update a
  assert.equal(launch(false, 'a'), false);  // relaunch
  assert.equal(launch(false, 'a'), false);
  assert.equal(launch(false, 'b'), true);   // next update
  assert.equal(launch(false, 'b'), false);
  assert.equal(shouldShowOtaToast({ dev: true, enabled: true, embedded: false, updateId: 'c', seenId: 'b' }), false);
});

test('reload loop guard: an update that was restarted onto and is not running is not restarted onto again', () => {
  const now = 1_000_000;
  // Nothing tried yet.
  assert.equal(alreadyTriedUpdate({ candidateId: 'b', runningId: 'a', attempt: null, now }), false);
  // Tried b, and b is what runs now: the apply worked; a newer c is a new update.
  assert.equal(alreadyTriedUpdate({ candidateId: 'c', runningId: 'b', attempt: { id: 'b', at: now - 5000 }, now }), false);
  // Tried b, the runtime restarted, a is still running and b is still offered: do not loop.
  assert.equal(alreadyTriedUpdate({ candidateId: 'b', runningId: 'a', attempt: { id: 'b', at: now - 5000 }, now }), true);
  assert.equal(alreadyTriedUpdate({ candidateId: 'b', runningId: null, attempt: { id: 'b', at: now - 86_400_000 }, now }), true, 'however long ago');
  // A pending bundle with no id: only a restart a moment ago counts.
  assert.equal(alreadyTriedUpdate({ candidateId: null, runningId: 'a', attempt: { id: null, at: now - 2000 }, now }), true);
  assert.equal(alreadyTriedUpdate({ candidateId: null, runningId: 'a', attempt: { id: null, at: now - APPLY_RETRY_QUIET_MS - 1 }, now }), false);
  assert.equal(alreadyTriedUpdate({ candidateId: null, runningId: 'a', attempt: { id: 'b', at: now - 2000 }, now }), false);
});
