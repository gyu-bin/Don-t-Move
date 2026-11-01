import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';
import { missionBackAction } from './missionBackAction';
import type { MissionBackAction, MissionBackState } from './missionBackAction';

/** Installs the Android Back handler while the mission screen is mounted; every press is consumed. No effect on iOS. */
export function useMissionBackHandler(state: MissionBackState, act: (action: MissionBackAction) => void): void {
  const latest = useRef({ state, act });
  useEffect(() => { latest.current = { state, act }; });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const action = missionBackAction(latest.current.state);
      if (action !== 'ignore') latest.current.act(action);
      return true;
    });
    return () => sub.remove();
  }, []);
}
