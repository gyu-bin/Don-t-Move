import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { downloadAndReload, isOtaReloadInProgress, reloadOntoUpdate, updatesModule } from './applyUpdate';
import { coldStartGate } from './otaNotice';

type UpdatesModule = NonNullable<ReturnType<typeof updatesModule>>;

const CHECK_WAIT_MS = 12000;
const DOWNLOAD_WAIT_MS = 45000;

/**
 * Cold start stays on the splash until the running bundle is the newest one on disk.
 * A downloaded update is applied with reloadAsync before the splash ends, so the next
 * splash is already the new bundle. Killing the app is not what switches bundles.
 */
export function OtaRefresh({ onReady }: { onReady: () => void }) {
  const [Updates] = useState(updatesModule);
  useEffect(() => {
    if (!Updates) onReady();
  }, [Updates, onReady]);
  if (!Updates) return null;
  return <OtaRefreshRunner Updates={Updates} onReady={onReady} />;
}

function OtaRefreshRunner({ Updates, onReady }: { Updates: UpdatesModule; onReady: () => void }) {
  const state = Updates.useUpdates();
  const readySent = useRef(false);
  const fetchStarted = useRef(false);
  const downloadedId = state.downloadedUpdate?.type === 'new' ? state.downloadedUpdate.updateId : null;
  const runningId = state.currentlyRunning.updateId ?? null;
  const release = useCallback(() => {
    if (readySent.current || isOtaReloadInProgress()) return;
    readySent.current = true;
    onReady();
  }, [onReady]);

  useEffect(() => {
    const decision = coldStartGate({
      startupRunning: state.isStartupProcedureRunning,
      checking: state.isChecking,
      downloading: state.isDownloading,
      pending: state.isUpdatePending,
      runningId,
      downloadedId,
    });
    if (decision === 'wait') return;
    if (decision === 'reload') {
      void reloadOntoUpdate(Updates, downloadedId).then((switched) => {
        if (!switched) release();
      });
      return;
    }
    if (fetchStarted.current) return;
    fetchStarted.current = true;
    void downloadAndReload(Updates).then((outcome) => {
      if (outcome === 'reloading' || isOtaReloadInProgress()) return;
      release();
    });
  }, [Updates, downloadedId, release, runningId, state.isChecking, state.isDownloading, state.isStartupProcedureRunning, state.isUpdatePending]);

  useEffect(() => {
    const cap = setTimeout(release, state.isDownloading || state.isStartupProcedureRunning ? DOWNLOAD_WAIT_MS : CHECK_WAIT_MS);
    return () => clearTimeout(cap);
  }, [release, state.isDownloading, state.isStartupProcedureRunning]);

  useEffect(() => {
    const cap = setTimeout(() => {
      if (readySent.current) return;
      readySent.current = true;
      onReady();
    }, DOWNLOAD_WAIT_MS);
    return () => clearTimeout(cap);
  }, [onReady]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active' && readySent.current) void downloadAndReload(Updates);
    });
    return () => sub.remove();
  }, [Updates]);

  return null;
}
