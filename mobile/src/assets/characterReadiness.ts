import type { AssetManifest } from './manifest';

const REQUIRED = {
  player: {idle:4,sneak:6,walk:8,run:8},
  guard: {idle:4,walk:8,run:8,whistle:6,search:6},
} as const;
/** Separate release gate, not a replacement or relaxation of the sprite validator. */
export function finalCharacterIssues(manifest: AssetManifest): string[] {
  const issues:string[]=[];
  for(const who of ['player','guard'] as const) {
    const set=manifest.characters[who];
    if(!set?.finalApproved) issues.push(`${who}: final sprite validation/visual approval missing`);
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
