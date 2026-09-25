import { useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

import { shouldPlayWhistle } from './whistleAudio';

const WHISTLE = require('../../../assets/audio/whistle.wav');

/** One replaceable sound source behind the Global Alert whistle event. */
export function useWhistleAudio(revision: number, soundEnabled: boolean): void {
  const player = useAudioPlayer(WHISTLE, { downloadFirst: true, updateInterval: 500 });
  const previous = useRef(revision);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const before = previous.current;
    previous.current = revision;
    if (!soundEnabled) { player.pause(); return; }
    if (!shouldPlayWhistle(before, revision, soundEnabled)) return;
    void player.seekTo(0).then(() => player.play()).catch(() => {});
  }, [player, revision, soundEnabled]);
}
