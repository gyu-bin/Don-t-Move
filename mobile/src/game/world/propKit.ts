import type { PropKind } from '../levels/StageDefinition';

/**
 * Reusable per-kind prop rules. Stages only place props; how big they are,
 * whether they block movement or sight, and how they sort is defined once here.
 *
 * Units are tiles. `footprint` is centered on the prop's base point.
 */
export interface PropSpec {
  /** Collision/occlusion box size (tiles), centered on base x, extending up from base y. */
  footprint: { w: number; h: number };
  blocksMovement: boolean;
  blocksVision: boolean;
  /** Player can hide behind it (used by Search/Cover logic later). */
  cover: boolean;
  /** Mounted on a wall's front face: drawn with the wall row, no floor shadow. */
  wallMounted: boolean;
  /** Visual width in tiles (height follows the sprite aspect). */
  drawWidth: number;
  /** Soft contact shadow radius in tiles (0 = none). */
  shadow: number;
  /** World units the sprite anchor sits above the base (wall-mounted props). */
  mountHeight: number;
}

export const PROP_KIT: Record<PropKind, PropSpec> = {
  statue: {
    footprint: { w: 0.9, h: 0.7 },
    blocksMovement: true,
    blocksVision: true,
    cover: true,
    wallMounted: false,
    drawWidth: 0.95,
    shadow: 0.55,
    mountHeight: 0,
  },
  statuePedestal: {
    footprint: { w: 0.8, h: 0.6 },
    blocksMovement: true,
    blocksVision: false,
    cover: false,
    wallMounted: false,
    drawWidth: 0.8,
    shadow: 0.45,
    mountHeight: 0,
  },
  displayCase: {
    footprint: { w: 1.2, h: 0.9 },
    blocksMovement: true,
    blocksVision: true,
    cover: true,
    wallMounted: false,
    drawWidth: 1.25,
    shadow: 0.7,
    mountHeight: 0,
  },
  diamondPedestal: {
    footprint: { w: 1.0, h: 0.8 },
    blocksMovement: true,
    blocksVision: false,
    cover: false,
    wallMounted: false,
    drawWidth: 1.1,
    shadow: 0.65,
    mountHeight: 0,
  },
  painting: {
    footprint: { w: 0, h: 0 },
    blocksMovement: false,
    blocksVision: false,
    cover: false,
    wallMounted: true,
    drawWidth: 1.3,
    shadow: 0,
    mountHeight: 6,
  },
  plant: {
    footprint: { w: 0.6, h: 0.5 },
    blocksMovement: true,
    blocksVision: false,
    cover: true,
    wallMounted: false,
    drawWidth: 0.95,
    shadow: 0.4,
    mountHeight: 0,
  },
  bench: {
    footprint: { w: 1.5, h: 0.5 },
    blocksMovement: true,
    blocksVision: false,
    cover: false,
    wallMounted: false,
    drawWidth: 1.55,
    shadow: 0.8,
    mountHeight: 0,
  },
  crate: {
    footprint: { w: 0.9, h: 0.8 },
    blocksMovement: true,
    blocksVision: true,
    cover: true,
    wallMounted: false,
    drawWidth: 0.95,
    shadow: 0.55,
    mountHeight: 0,
  },
  lamp: {
    footprint: { w: 0, h: 0 },
    blocksMovement: false,
    blocksVision: false,
    cover: false,
    wallMounted: true,
    drawWidth: 0.55,
    shadow: 0,
    mountHeight: 10,
  },
  cctv: {
    footprint: { w: 0, h: 0 },
    blocksMovement: false,
    blocksVision: false,
    cover: false,
    wallMounted: true,
    drawWidth: 0.5,
    shadow: 0,
    mountHeight: 8.5,
  },
  pillar: {
    footprint: { w: 0.8, h: 0.8 },
    blocksMovement: true,
    blocksVision: true,
    cover: true,
    wallMounted: false,
    drawWidth: 0.9,
    shadow: 0.55,
    mountHeight: 0,
  },
  door: {
    footprint: { w: 0, h: 0 },
    blocksMovement: false,
    blocksVision: false,
    cover: false,
    wallMounted: true,
    drawWidth: 1.0,
    shadow: 0,
    mountHeight: 0,
  },
};
