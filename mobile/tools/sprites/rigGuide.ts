import { CHARACTERS } from './spriteSpec';
import type { RowName, SheetSpec } from './spriteSpec';

/**
 * Pose-guide parameters for the fallback rig, per sheet frame. Used only to
 * draw the faint timing guide on templates and the validator self-test
 * fixtures — the rig is not the art target.
 */
export const FACING: Record<RowName, number> = {
  down: Math.PI / 2,
  up: -Math.PI / 2,
  left: Math.PI,
  right: 0,
};

/** Unscaled fallback-rig height (sole → top of hair/cap, incl. outline), rig units. */
export const RIG_HEIGHT = 54.5;
/** Sole bottom (incl. outline) below the rig origin, rig units. */
export const RIG_SOLE_OFFSET = 2.5;

export type Pose = { gait: number; phase: number; t: number; action: number; actionT: number };

export function poseFor(sheet: SheetSpec, i: number): Pose {
  const n = sheet.frames;
  switch (sheet.anim) {
    case 'idle':
      return { gait: 0, phase: 0, t: (i / n) * ((Math.PI * 2) / 2.3), action: 0, actionT: 0 };
    // Frame 1 = Contact of the left foot (cycle phase 0), see footCycle().
    case 'sneak':
      return { gait: 1, phase: i / n, t: 0, action: 0, actionT: 0 };
    case 'walk':
      return { gait: 2, phase: i / n, t: 0, action: 0, actionT: 0 };
    case 'run':
      return { gait: 3, phase: i / n, t: 0, action: 0, actionT: 0 };
    case 'whistle':
      return { gait: 0, phase: 0, t: 0, action: 1, actionT: [0, 0.45, 1, 1, 1, 0.45][i] ?? 0 };
    case 'search':
      return { gait: 0, phase: 0, t: 0, action: 2, actionT: [0.3, 1, 1, 0.3, 1, 1][i] ?? 0 };
  }
}

/** Rig draw scale (px per rig unit) for a character at its spec height. */
export function rigScale(sheet: SheetSpec): number {
  return CHARACTERS[sheet.character].height / RIG_HEIGHT;
}

/** Foot-sweep factor so the rig guide's planted feet land on the spec's px positions. */
export function guideReachScale(sheet: SheetSpec): number {
  const ch = CHARACTERS[sheet.character];
  return ch.height / ch.worldHeight / rigScale(sheet);
}
