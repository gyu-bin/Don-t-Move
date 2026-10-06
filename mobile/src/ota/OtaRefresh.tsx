import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { downloadAndReload, isOtaReloadInProgress, reloadOntoUpdate, updatesModule } from './applyUpdate';
import { coldStartGate, shouldAnnounceApplying } from './otaNotice';

type UpdatesModule = NonNullable<ReturnType<typeof updatesModule>>;

const CHECK_WAIT_MS = 12000;
const DOWNLOAD_WAIT_MS = 45000;

const MENU_CHECK_MS = 15000;

/**
 * Cold start stays on the splash until the running bundle is current.
 * Outside a mission, a newer bundle shows the applying toast and plays the splash once more.
 * A mission already in progress is left alone until the player is back on a menu.
 */
export function OtaRefresh({ onReady, onApplying, onApplyingDone, inGame }: {
  onReady: () => void;
  onApplying: () => void;
  onApplyingDone: () => void;
  inGame: boolean;
}) {
  const [Updates] = useState(updatesModule);
  useEffect(() => {
    if (!Updates) onReady();
  }, [Updates, onReady]);
  if (!Updates) return null;
  return <OtaRefreshRunner Updates={Updates} onReady={onReady} onApplying={onApplying} onApplyingDone={onApplyingDone} inGame={inGame} />;
}

function OtaRefreshRunner({ Updates, onReady, onApplying, onApplyingDone, inGame }: {
  Updates: UpdatesModule;
  onReady: () => void;
  onApplying: () => void;
  onApplyingDone: () => void;
  inGame: boolean;
}) {
  const state = Updates.useUpdates();
  const readySent = useRef(false);
  const fetchStarted = useRef(false);
  const inGameRef = useRef(inGame);
  const [watching, setWatching] = useState(false);
  useEffect(() => { inGameRef.current = inGame; }, [inGame]);
  const downloadedId = state.downloadedUpdate?.type === 'new' ? state.downloadedUpdate.updateId : null;
  const runningId = state.currentlyRunning.updateId ?? null;
  const present = useCallback(() => {
    if (inGameRef.current) return;
    onApplying();
  }, [onApplying]);
  const release = useCallback(() => {
    if (readySent.current || isOtaReloadInProgress()) return;
    readySent.current = true;
    setWatching(true);
    onApplyingDone();
    onReady();
  }, [onApplyingDone, onReady]);

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
    if (shouldAnnounceApplying({ downloading: state.isDownloading, pending: state.isUpdatePending, decision })) present();
    if (decision === 'wait') return;
    if (decision === 'reload') {
      present();
      void reloadOntoUpdate(Updates, downloadedId).then((switched) => {
        if (!switched) release();
      });
      return;
    }
    if (fetchStarted.current) return;
    fetchStarted.current = true;
    void downloadAndReload(Updates, present, () => !inGameRef.current).then((outcome) => {
      if (outcome === 'reloading' || outcome === 'deferred' || isOtaReloadInProgress()) return;
      release();
    });
  }, [Updates, downloadedId, inGame, present, release, runningId, state.isChecking, state.isDownloading, state.isStartupProcedureRunning, state.isUpdatePending]);

  useEffect(() => {
    const cap = setTimeout(release, state.isDownloading || state.isStartupProcedureRunning ? DOWNLOAD_WAIT_MS : CHECK_WAIT_MS);
    return () => clearTimeout(cap);
  }, [release, state.isDownloading, state.isStartupProcedureRunning]);

  useEffect(() => {
    const cap = setTimeout(() => {
      if (readySent.current) return;
      readySent.current = true;
      setWatching(true);
      onApplyingDone();
      onReady();
    }, DOWNLOAD_WAIT_MS);
    return () => clearTimeout(cap);
  }, [onApplyingDone, onReady]);

  useEffect(() => {
    if (!watching || inGame) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const run = () => {
      void downloadAndReload(Updates, present, () => !inGameRef.current).then((outcome) => {
        if (cancelled || outcome === 'reloading' || outcome === 'deferred' || isOtaReloadInProgress()) return;
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
  }, [Updates, inGame, onApplyingDone, present, watching]);

  return null;
}
