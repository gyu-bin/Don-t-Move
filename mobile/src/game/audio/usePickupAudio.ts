import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

/** Replace this single asset when the final pickup cue is delivered. */
const PICKUP = require('../../../assets/audio/diamond.wav');

export function usePickupAudio(revision: number, soundEnabled: boolean): void {
  const player = useAudioPlayer(PICKUP, { downloadFirst: true, updateInterval: 500 });
  const previous = useRef(revision);
  useEffect(() => {
    const changed = revision > previous.current;
    previous.current = revision;
    if (!soundEnabled) { player.pause(); return; }
    if (changed) void player.seekTo(0).then(() => player.play()).catch(() => {});
  }, [player, revision, soundEnabled]);
}
