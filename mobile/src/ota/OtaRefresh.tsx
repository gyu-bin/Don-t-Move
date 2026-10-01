import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { downloadAndReload, reloadOntoUpdate, updatesModule } from './applyUpdate';
import { shouldReloadPending } from './otaNotice';

type UpdatesModule = NonNullable<ReturnType<typeof updatesModule>>;

/**
 * When a newer bundle is on disk, restart the app from the splash.
 * The native reload boots index again. If that reload never tears the runtime down,
 * `onSplashRestart` remounts the tree so the splash still plays.
 */
export function OtaRefresh({ onSplashRestart }: { onSplashRestart: () => void }) {
  const [Updates] = useState(updatesModule);
  if (!Updates) return null;
  return <OtaRefreshRunner Updates={Updates} onSplashRestart={onSplashRestart} />;
}

function OtaRefreshRunner({ Updates, onSplashRestart }: { Updates: UpdatesModule; onSplashRestart: () => void }) {
  const state = Updates.useUpdates();
  const checked = useRef(false);

  useEffect(() => {
    if (state.isStartupProcedureRunning || state.isChecking || state.isDownloading) return;
    const downloadedId = state.downloadedUpdate?.type === 'new' ? state.downloadedUpdate.updateId : null;
    if (state.isUpdatePending && shouldReloadPending(false, state.currentlyRunning.updateId, downloadedId)) {
      void reloadOntoUpdate(Updates, downloadedId, onSplashRestart);
      return;
    }
    if (checked.current) return;
    checked.current = true;
    void downloadAndReload(Updates, onSplashRestart);
  }, [Updates, onSplashRestart, state.currentlyRunning.updateId, state.downloadedUpdate, state.isChecking, state.isDownloading, state.isStartupProcedureRunning, state.isUpdatePending]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void downloadAndReload(Updates, onSplashRestart);
    });
    return () => sub.remove();
  }, [Updates, onSplashRestart]);

  return null;
}
