/**
 * Per-mission difficulty normalisation. Applied last in buildMission.
 *
 * Playtest feedback: 01-05 and 01-08 are a little too hard while 01-10 is fine.
 * Scripted route runs agree (7/108 clears each against 15/108 for 01-10).
 *
 * - 01-05: guard sight shortened by 8% (7 → 10 clears). Routes, timing, counts and cameras stay as authored.
 * - 01-08: not tuned here. Its authored safe run is balanced on a knife edge: any sight reduction lets it
 *   clear without being spotted (losing the theft → spotted → search escalation the mission is built
 *   around), and longer patrol pauses make that run fail. Easing it needs its patrol re-authored.
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
const GUARD_SIGHT_SCALE:Record<string,number>={'01-05':0.92};
export function applyDifficultyTuning(source:StageDefinition):StageDefinition{
 const scale=GUARD_SIGHT_SCALE[source.id];
 if(!scale)return source;
 const def=structuredClone(source);
 for(const g of def.guards)if(g.visionRange!==undefined)g.visionRange=+(g.visionRange*scale).toFixed(3);
 return def;
}
