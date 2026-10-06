/** V12 Phase 4E visual-only authoring contract.
 * World-pixel ranges are measured against the ~52 px standing player.
 * They are review bands, not global multipliers: each fixture keeps its role-
 * specific scale and collision-bearing art must keep the authored footprint in
 * sync without changing a locked route. */
export const PHASE4E_SCALE_BUDGETS = {
  SMALL: {minWidth: 24, maxWidth: 52, role: 'Monitor, crate and handheld decoration'},
  MEDIUM: {minWidth: 58, maxWidth: 112, role: 'Chair, cart and small display'},
  LARGE: {minWidth: 112, maxWidth: 208, role: 'Desk, gaming table and laboratory machine'},
  ARCHITECTURAL: {minWidth: 152, maxWidth: 320, role: 'Door, counter, divider and security desk'},
  LANDMARK: {minWidth: 196, maxWidth: 420, role: 'Vault, prototype and major installation'},
} as const;

export const PHASE4E_PERSPECTIVE = {
  view: 'TOP_DOWN_THREE_QUARTER',
  topFace: 'MODERATE',
  verticals: 'UPRIGHT',
  floorPivot: {x: .5, y: 1},
} as const;
