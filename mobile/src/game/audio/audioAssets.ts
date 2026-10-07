import type { AudioSource } from 'expo-audio';
import type { AudioEvent } from './audioState';

/** Bind approved bundled require(...) sources here. All sources are bundled; provenance and edits are in assets/audio/LICENSES.md.
 * No generated/legacy temporary whistle is substituted for the final assets.
 */
export const AUDIO_SOURCES: Record<AudioEvent, AudioSource | null> = {
  bgm_lobby: require('../../../assets/audio/bgm/lobby.mp3'),
  objective_pickup: require('../../../assets/audio/sfx/objective-pickup.wav'),
  ui_select: require('../../../assets/audio/sfx/ui-select.wav'),
  ui_back: require('../../../assets/audio/sfx/ui-back.wav'),
  whistle_theft: require('../../../assets/audio/sfx/whistle-theft.wav'),
  whistle_spotted: require('../../../assets/audio/sfx/whistle-spotted.wav'),
  bgm_stealth: require('../../../assets/audio/bgm/stealth.mp3'),
  bgm_chase: require('../../../assets/audio/bgm/chase.mp3'),
};
export const AUDIO_ASSET_STATUS = {
  whistle: 'BUNDLED_CC0_AUDITION_PENDING',
  music: 'BUNDLED_MIXED_RIGHTS',
  musicLicenses: {
    lobby: 'USER_SUPPLIED_LICENSE_PENDING',
    stealth: 'CC0_1_0',
    chase: 'CC0_1_0',
  },
} as const;
