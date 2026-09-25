/**
 * Character palettes matched to the art reference:
 * Agent Zero = charcoal/black clothing, brown hair, backpack, light sneakers.
 * Guard = navy security uniform, peaked cap, gold badge — readable at a glance
 * even at ~40px tall.
 */
export interface CharacterPalette {
  outline: string;
  skin: string;
  skinShade: string;
  hair: string;
  hairLight: string;
  hairShade: string;
  top: string;
  topLight: string;
  topShade: string;
  inner: string;
  pants: string;
  pantsShade: string;
  shoe: string;
  shoeLight: string;
  gear: string;
  gearLight: string;
  metal: string;
  eye: string;
}

export const PLAYER_PALETTE: CharacterPalette = {
  outline: '#06070a',
  skin: '#e2b596',
  skinShade: '#b7866a',
  hair: '#3b2a21',
  hairLight: '#6a4b37',
  hairShade: '#221812',
  top: '#23262e',
  topLight: '#3a3f4b',
  topShade: '#14161b',
  inner: '#454a55',
  pants: '#1c1e25',
  pantsShade: '#111217',
  shoe: '#3b3e46',
  shoeLight: '#a4a9b2',
  gear: '#2f2a27', // backpack
  gearLight: '#4a423b',
  metal: '#8d8f94',
  eye: '#0d0e12',
};

export const GUARD_PALETTE: CharacterPalette = {
  outline: '#05070c',
  skin: '#d9a987',
  skinShade: '#aa7a5d',
  hair: '#1d2944', // cap crown
  hairLight: '#34466e',
  hairShade: '#101829', // visor
  top: '#2a3b5f',
  topLight: '#3f5480',
  topShade: '#1a253d',
  inner: '#34476d',
  pants: '#1c263d',
  pantsShade: '#121a2b',
  shoe: '#101216',
  shoeLight: '#2d3038',
  gear: '#0f1217', // belt, radio
  gearLight: '#262a33',
  metal: '#e2b44a', // badge, buckle
  eye: '#0b0c10',
};
