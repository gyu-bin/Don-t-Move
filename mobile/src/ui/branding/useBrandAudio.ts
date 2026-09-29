import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { scheduleIntroCues } from './introCues';

/** Intro and Home are silent until approved audio exists; retain the intro haptic. */
export function useBrandAudio(intro: boolean, enabled: boolean) {
  useEffect(() => scheduleIntroCues(intro && enabled, name => {
    if (name === 'freeze') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }), [intro, enabled]);
}
