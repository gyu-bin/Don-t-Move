import type { AudioSource } from 'expo-audio';
import type { AudioEvent } from './audioState';

/** Bind approved bundled require(...) sources here. All sources are bundled; provenance and edits are in assets/audio/LICENSES.md.
 * No generated/legacy temporary whistle is substituted for the final assets.
 */
export const AUDIO_SOURCES: Record<AudioEvent, AudioSource | null> = {
  bgm_lobby: require('../../../assets/audio/bgm/lobby.m4a'),
  ui_select: require('../../../assets/audio/sfx/ui-select.wav'),
  ui_back: require('../../../assets/audio/sfx/ui-back.wav'),
  whistle_theft: require('../../../assets/audio/sfx/whistle-theft.wav'),
  whistle_spotted: require('../../../assets/audio/sfx/whistle-spotted.wav'),
  bgm_stealth: require('../../../assets/audio/bgm/stealth.m4a'),
  bgm_theft_alert: require('../../../assets/audio/bgm/theft-alert.m4a'),
  bgm_chase: require('../../../assets/audio/bgm/chase.m4a'),
};
export const AUDIO_ASSET_STATUS = {
  whistle: 'BUNDLED_CC0_AUDITION_PENDING',
  music: 'BUNDLED_CC0_AUDITION_PENDING',
} as const;
