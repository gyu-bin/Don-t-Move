/** Chapter is the difficulty axis. Mission number selects a heist, never a stat multiplier.
 * These are authoring budgets, not a claim that human playtests have certified difficulty.
 * Runtime movement, chase and CCTV detection constants remain independent.
 */
export type DifficultyTier = 'EASY'|'EASY_PLUS'|'MEDIUM'|'MEDIUM_PLUS'|'MEDIUM_HIGH'|'MEDIUM_HIGH_PLUS'|'HARD'|'VERY_HARD'|'FINAL';
export interface ChapterDifficultyProfile {
 chapter:number; difficultyTier:DifficultyTier; pressureBand:string; identity:string;
 /** For future generated layouts: identical across every mission within this chapter. */
 authoring:{guardCount:number;roamingCount:number;visionRange:number;patrolPace:number;patrolWait:number};
 missionModifierBounds:readonly [number,number];
}
const tiers:DifficultyTier[]=['EASY','EASY_PLUS','MEDIUM','MEDIUM_PLUS','MEDIUM_HIGH','MEDIUM_HIGH_PLUS','HARD','VERY_HARD','FINAL'];
const bands=['LOW–LOW+','LOW+–MEDIUM−','MEDIUM','MEDIUM+','MEDIUM-HIGH','MEDIUM-HIGH+','HIGH','VERY HIGH','HIGHEST'];
const identities=['Basic vision, corner refuge and readable theft escape','Open gallery LOS with limited CCTV and partitions','Checkpoints, CCTV and vault search sectors','Glass and complex visibility','Open rooms and multidirectional security','Rooms, corners and alternate routes','Long LOS, roaming patrols and large spaces','Coordinated guard network and CCTV','Combined security systems with readable escape options'];
export const CHAPTER_DIFFICULTY:readonly ChapterDifficultyProfile[]=tiers.map((difficultyTier,i)=>({
 chapter:i+1,difficultyTier,pressureBand:bands[i],identity:identities[i],missionModifierBounds:[.95,1.05],
 authoring:{guardCount:[3,4,4,4,4,4,5,5,5][i],roamingCount:[1,1,1,1,2,2,2,2,3][i],visionRange:[4.2,3.5,4.4,4.1,4.3,4.4,4.6,4.8,5][i],patrolPace:.85,patrolWait:1.4},
}));
export function chapterDifficulty(chapter:number):ChapterDifficultyProfile {
 const profile=CHAPTER_DIFFICULTY[chapter-1];
 if(!Number.isInteger(chapter)||!profile)throw new Error(`Unknown difficulty chapter ${chapter}`);
 return profile;
}
/** No mission-number ramp, including finales. Their combination of mechanics supplies identity. */
export const missionDifficultyModifier=1;
