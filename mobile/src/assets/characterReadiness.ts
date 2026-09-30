import type { AssetManifest } from './manifest';
import { LOCO_CHARACTERS } from '../game/core/locomotionAtlas';

// Frame counts come from the atlas contract so the gate cannot drift from the baked sheets.
const P = LOCO_CHARACTERS.player, G = LOCO_CHARACTERS.guard;
const REQUIRED = {
  player: {idle:P.idle.frames,sneak:P.gaits.sneak!.frames,walk:P.gaits.walk!.frames,run:P.gaits.run!.frames},
  guard: {idle:G.idle.frames,walk:G.gaits.walk!.frames,run:G.gaits.run!.frames,whistle:G.idle.frames,search:G.idle.frames},
} as const;
/**
 * Release (runtime) gate: blocks play only when a character atlas is missing, reused or
 * off-contract, or has not passed the automatic validators. It does NOT require the
 * Production visual approval — that is reported separately by characterReleaseStatus.
 */
export function runtimeCharacterIssues(manifest: AssetManifest): string[] {
  const issues:string[]=[];
  for(const who of ['player','guard'] as const) {
    const set=manifest.characters[who];
    if(!set?.runtimeReady) issues.push(`${who}: runtime atlas validation missing`);
    const used=new Set<string>();
    for(const [name,count] of Object.entries(REQUIRED[who])) {
      const clips=set?.clips[name as keyof typeof set.clips];
      const image=clips?.down?.image;
      if(image && used.has(image)) issues.push(`${who}/${name}: reused animation sheet`);
      if(image) used.add(image);
      for(const dir of ['down','up','left','right'] as const) {
        const clip=clips?.[dir];
        const frames=clip ? Array.isArray(clip.frames) ? clip.frames.length : clip.frames.count : 0;
        if(frames!==count) issues.push(`${who}/${name}/${dir}: expected ${count} frames, got ${frames}`);
      }
    }
  }
  return issues;
}

export interface CharacterReleaseStatus {
  /** Game may run in release builds. */
  runtimeReady: boolean;
  /** Production Locomotion Lock not yet granted (Simulator / device / user review). */
  visualReviewPending: boolean;
  issues: string[];
}

export function characterReleaseStatus(manifest: AssetManifest): CharacterReleaseStatus {
  const issues = runtimeCharacterIssues(manifest);
  const { player, guard } = manifest.characters;
  return {
    runtimeReady: issues.length === 0,
    visualReviewPending: !(player?.finalApproved === true && guard?.finalApproved === true),
    issues,
  };
}
