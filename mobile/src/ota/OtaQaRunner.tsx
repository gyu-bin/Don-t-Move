import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { DevSettings } from 'react-native';

import type { OtaRefreshProps } from './OtaRefresh';
import { showApplyingThenReload, type OtaStatus } from './startupFlow';

/**
 * DEVELOPMENT ONLY. Plays the startup update statuses in a development bundle, where expo-updates is off, so the
 * sequence can be looked at in the Simulator. Start Metro with EXPO_PUBLIC_DM_OTA_QA set to:
 *   latest | offline | failed   that result of the check (nothing is shown), then Home
 *   update                      check → "Applying update" → the JS runtime reloads → Home → applied toast (once)
 *   reset                       forgets that the simulated update was applied, then behaves as `latest`
 * It never runs in a release build: OtaRefresh only loads this file under __DEV__.
 */
const QA_FLAG = 'dont-move.ota.qa-applied';
const STEP_MS = 1400;

/** True once, on the launch after the simulated update was applied. */
export async function consumeQaFreshNotice(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(QA_FLAG);
  if (flag !== 'applied') return false;
  await AsyncStorage.setItem(QA_FLAG, 'seen');
  return true;
}

export function OtaQaRunner({ mode, onReady, onStatus, onApplying, applyingShown }: OtaRefreshProps & { mode: string }) {
  useEffect(() => {
    let alive = true;
    const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const finish = (status: OtaStatus) => { if (alive) { onStatus(status); onReady(); } };
    void (async () => {
      onStatus('checking');
      if (mode === 'reset') await AsyncStorage.removeItem(QA_FLAG);
      const applied = await AsyncStorage.getItem(QA_FLAG);
      await wait(STEP_MS);
      if (!alive) return;
      if (mode === 'offline' || mode === 'failed') return finish(mode);
      if (mode !== 'update' || applied) return finish('latest');
      onStatus('downloading'); onApplying();
      await wait(STEP_MS);
      if (!alive) return;
      onStatus('applying');
      await showApplyingThenReload({
        painted: applyingShown, paintDeadlineMs: 1500, readMs: 400,
        reload: async () => { await AsyncStorage.setItem(QA_FLAG, 'applied'); DevSettings.reload(); },
      });
    })();
    return () => { alive = false; };
  }, [applyingShown, mode, onApplying, onReady, onStatus]);
  return null;
}
