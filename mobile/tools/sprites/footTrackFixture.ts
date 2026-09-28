/** Synthetic test data ONLY. Never an artist annotation or game asset. */
import { bodyBob, footCycle } from '../../src/game/core/locomotion';
import { ANCHOR, plantedFeet, plantingFor } from './spriteSpec';
import type { SheetSpec } from './spriteSpec';
import type { FootLandmarks, TrackedFrame } from './footTracks';

export function syntheticTracks(spec: SheetSpec): TrackedFrame[] {
  const pl = plantingFor(spec)!;
  return Array.from({ length: spec.frames }, (_, i) => {
    const phase = i / spec.frames;
    const hip: [number, number] = [ANCHOR.x, 165 + 4 * bodyBob(phase)];
    const foot = (id: 'L' | 'R'): FootLandmarks => {
      const buf = [0, 0];
      footCycle(phase + (id === 'L' ? 0 : 0.5), pl.stance, buf);
      const sole: [number, number] = [ANCHOR.x + buf[0] * pl.reachPx, ANCHOR.y - buf[1] * 16];
      return { sole, ankle: [sole[0] - 3, sole[1] - 7],
        knee: [(hip[0] + sole[0]) / 2 + 8, (hip[1] + sole[1]) / 2 - 4],
        planted: plantedFeet(spec, i).some(f => f.foot === id) };
    };
    return { phase, beat: spec.beats[i], root: [ANCHOR.x, ANCHOR.y], hip, L: foot('L'), R: foot('R') };
  });
}
