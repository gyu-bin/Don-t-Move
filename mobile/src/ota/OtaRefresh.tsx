import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { downloadAndReload, isOtaReloadInProgress, reloadOntoUpdate, updatesModule } from './applyUpdate';
import { coldStartGate, shouldAnnounceApplying } from './otaNotice';
import { statusAfterCheck, type OtaStatus } from './startupFlow';

type UpdatesModule = NonNullable<ReturnType<typeof updatesModule>>;

const CHECK_WAIT_MS = 12000;
const DOWNLOAD_WAIT_MS = 45000;

const MENU_CHECK_MS = 15000;

export interface OtaRefreshProps {
  /** The running bundle is the one to play this launch: the startup screen may hand over to Home. */
  onReady: () => void;
  /** What the startup screen should say. null in a development bundle, where there is nothing to check. */
  onStatus: (status: OtaStatus | null) => void;
  /** An update is being downloaded or applied outside a mission: put the startup screen in front. */
  onApplying: () => void;
  onApplyingDone: () => void;
  /** Resolves once the startup screen has drawn the applying status. */
  applyingShown: () => Promise<void>;
  inGame: boolean;
}

/**
 * Cold start stays on the startup screen until the running bundle is current.
 * Outside a mission, a newer bundle brings the startup screen back with its status and restarts onto it.
 * A mission already in progress is left alone until the player is back on a menu.
 */
export function OtaRefresh(props: OtaRefreshProps) {
  const [Updates] = useState(updatesModule);
  const { onReady, onStatus } = props;
  // DEV only: EXPO_PUBLIC_DM_OTA_QA=latest|update|offline|failed plays the startup statuses without expo-updates.
  const qaMode = __DEV__ ? process.env.EXPO_PUBLIC_DM_OTA_QA : undefined;
  useEffect(() => {
    if (Updates || qaMode) return;
    onStatus(null);
    onReady();
  }, [Updates, onReady, onStatus, qaMode]);
  if (!Updates) {
    if (!qaMode) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- development only, kept out of the release module graph's start-up
    const { OtaQaRunner } = require('./OtaQaRunner') as typeof import('./OtaQaRunner');
    return <OtaQaRunner mode={qaMode} {...props} />;
  }
  return <OtaRefreshRunner Updates={Updates} {...props} />;
}

function OtaRefreshRunner({ Updates, onReady, onStatus, onApplying, onApplyingDone, applyingShown, inGame }: OtaRefreshProps & { Updates: UpdatesModule }) {
  const state = Updates.useUpdates();
  const readySent = useRef(false);
  const fetchStarted = useRef(false);
  const inGameRef = useRef(inGame);
  const [watching, setWatching] = useState(false);
  useEffect(() => { inGameRef.current = inGame; }, [inGame]);
  const downloadedId = state.downloadedUpdate?.type === 'new' ? state.downloadedUpdate.updateId : null;
  const runningId = state.currentlyRunning.updateId ?? null;
  /** Shows a stage of an update in flight. Never during a mission. */
  const present = useCallback((stage: 'downloading' | 'applying') => {
    if (inGameRef.current) return;
    onStatus(stage);
    onApplying();
  }, [onApplying, onStatus]);
  const release = useCallback((status: OtaStatus) => {
    if (readySent.current || isOtaReloadInProgress()) return;
    readySent.current = true;
    setWatching(true);
    onStatus(status);
    onApplyingDone();
    onReady();
  }, [onApplyingDone, onReady, onStatus]);

  // The first thing the startup screen says.
  useEffect(() => { onStatus('checking'); }, [onStatus]);

  useEffect(() => {
    const decision = coldStartGate({
      startupRunning: state.isStartupProcedureRunning,
      checking: state.isChecking,
      downloading: state.isDownloading,
      pending: state.isUpdatePending,
      runningId,
      downloadedId,
    });
    if (inGameRef.current) return;
    if (shouldAnnounceApplying({ downloading: state.isDownloading, pending: state.isUpdatePending, decision })) {
      // Still downloading says so; a bundle already on disk is about to be applied.
      present(state.isDownloading && decision !== 'reload' ? 'downloading' : 'applying');
    }
    if (decision === 'wait') return;
    if (decision === 'reload') {
      present('applying');
      void reloadOntoUpdate(Updates, downloadedId, applyingShown).then((switched) => {
        if (!switched) release('failed');
      });
      return;
    }
    if (fetchStarted.current) return;
    fetchStarted.current = true;
    void downloadAndReload(Updates, { onStage: present, allowApply: () => !inGameRef.current, applyingShown }).then((outcome) => {
      if (outcome === 'reloading' || outcome === 'deferred' || isOtaReloadInProgress()) return;
      release(statusAfterCheck(outcome));
    });
  }, [Updates, applyingShown, downloadedId, inGame, present, release, runningId, state.isChecking, state.isDownloading, state.isStartupProcedureRunning, state.isUpdatePending]);

  // A check that does not come back never keeps the app from starting.
  useEffect(() => {
    const cap = setTimeout(() => release('failed'), state.isDownloading || state.isStartupProcedureRunning ? DOWNLOAD_WAIT_MS : CHECK_WAIT_MS);
    return () => clearTimeout(cap);
  }, [release, state.isDownloading, state.isStartupProcedureRunning]);

  useEffect(() => {
    const cap = setTimeout(() => {
      if (readySent.current) return;
      readySent.current = true;
      setWatching(true);
      onStatus('failed');
      onApplyingDone();
      onReady();
    }, DOWNLOAD_WAIT_MS);
    return () => clearTimeout(cap);
  }, [onApplyingDone, onReady, onStatus]);

  useEffect(() => {
    if (!watching || inGame) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const run = () => {
      void downloadAndReload(Updates, { onStage: present, allowApply: () => !inGameRef.current, applyingShown }).then((outcome) => {
        if (cancelled || outcome === 'reloading' || outcome === 'deferred' || isOtaReloadInProgress()) return;
        // If the startup screen was brought back for a download that then failed, it says so before it leaves.
        onStatus(statusAfterCheck(outcome));
        onApplyingDone();
      });
    };
    const sync = (next: string) => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (next !== 'active') return;
      run();
      timer = setInterval(run, MENU_CHECK_MS);
    };
    sync(AppState.currentState);
    const sub = AppState.addEventListener('change', sync);
    return () => {
      cancelled = true;
      sub.remove();
      if (timer) clearInterval(timer);
    };
  }, [Updates, applyingShown, inGame, onApplyingDone, onStatus, present, watching]);

  return null;
}
