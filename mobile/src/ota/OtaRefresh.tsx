import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

import { loadProgress } from '../game/progress/stageProgress';
import { translate } from '../ui/menu/strings';
import { downloadAndReload, reloadOntoUpdate, updatesModule } from './applyUpdate';
import { shouldReloadPending } from './otaNotice';

type UpdatesModule = NonNullable<ReturnType<typeof updatesModule>>;

/**
 * Production launches with the bundle already on disk, then downloads in the background.
 * When that download is a different bundle, cover the screen and reload immediately.
 */
export function OtaRefresh() {
  const [Updates] = useState(updatesModule);
  const [covering, setCovering] = useState(false);
  const showCover = useCallback(() => setCovering(true), []);
  return (
    <>
      {Updates ? <OtaRefreshRunner Updates={Updates} onWillReload={showCover} /> : null}
      {covering ? <OtaReloadCover /> : null}
    </>
  );
}

function OtaRefreshRunner({ Updates, onWillReload }: { Updates: UpdatesModule; onWillReload: () => void }) {
  const state = Updates.useUpdates();
  const checked = useRef(false);

  useEffect(() => {
    if (state.isStartupProcedureRunning || state.isChecking || state.isDownloading) return;
    const downloadedId = state.downloadedUpdate?.type === 'new' ? state.downloadedUpdate.updateId : null;
    if (state.isUpdatePending && shouldReloadPending(false, state.currentlyRunning.updateId, downloadedId)) {
      onWillReload();
      void reloadOntoUpdate(Updates);
      return;
    }
    if (checked.current) return;
    checked.current = true;
    void downloadAndReload(Updates, onWillReload);
  }, [Updates, onWillReload, state.currentlyRunning.updateId, state.downloadedUpdate, state.isChecking, state.isDownloading, state.isStartupProcedureRunning, state.isUpdatePending]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') void downloadAndReload(Updates, onWillReload);
    });
    return () => sub.remove();
  }, [Updates, onWillReload]);

  return null;
}

function OtaReloadCover() {
  const [label, setLabel] = useState(translate('en', 'updating'));
  useEffect(() => {
    void loadProgress().then((progress) => setLabel(translate(progress.language, 'updating'))).catch(() => {});
  }, []);
  return (
    <View style={styles.cover}>
      <ActivityIndicator color="#3ED5FA" size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100,
    elevation: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#081824',
  },
  label: {
    color: '#D9E5E8',
    fontSize: 16,
    fontWeight: '600',
  },
});
