import type { GameAssets } from '../assets/buildSprites';
import type { StageDefinition } from '../game/levels/StageDefinition';
import { compileStage } from '../game/world/compileStage';
import { buildNavigation } from '../game/world/navigation';
import { BODY } from '../game/guards/guardTuning';
import { buildStageArt } from '../rendering/environment/buildStageArt';
import { createRecentCache } from './recentCache';

/** Compiled floor plan, navigation and static art of one mission. The art is Skia pictures over the shared atlases. */
type Prepared = { stage: ReturnType<typeof compileStage>; navigation: ReturnType<typeof buildNavigation>; art: ReturnType<typeof buildStageArt> };

/**
 * The mission being played and, once it is cleared, the next one. Nothing older is kept: an entry that falls out
 * is only dropped from this map (its pictures are freed when nothing draws them any more), never disposed by hand.
 */
export const PREPARED_MISSION_LIMIT = 2;
const cache = createRecentCache<StageDefinition, {assets:GameAssets; value:Prepared}>(PREPARED_MISSION_LIMIT);

function remember(definition:StageDefinition,assets:GameAssets,value:Prepared):Prepared {
  cache.put(definition,{assets,value});
  return value;
}
function cached(definition:StageDefinition,assets:GameAssets):Prepared|null {
  const existing=cache.get(definition);
  return existing?.assets===assets?existing.value:null;
}
export function preparedMissionIds():string[] { return cache.keys().map(definition=>definition.id); }

export function prepareMission(definition:StageDefinition,assets:GameAssets):Prepared {
  const existing=cached(definition,assets);
  if(existing)return existing;
  const t0=Date.now(),stage=compileStage(definition);
  const t1=Date.now(),navigation=buildNavigation(stage,BODY.guardRadius);
  const t2=Date.now(),art=buildStageArt(stage,assets.museum);
  if(__DEV__)console.info('[LOAD] build',JSON.stringify({id:definition.id,compileMs:t1-t0,navMs:t2-t1,artMs:Date.now()-t2}));
  return remember(definition,assets,{stage,navigation,art});
}

const nextTask=()=>new Promise<void>(resolve=>setTimeout(resolve,0));
/**
 * The same preparation in three separate tasks (floor plan, navigation, art), for use while the result screen is
 * up: touches and frames are served between the steps instead of after all three.
 */
export async function prepareMissionInSteps(definition:StageDefinition,assets:GameAssets,pause:()=>Promise<void>=nextTask):Promise<Prepared> {
  const existing=cached(definition,assets);
  if(existing)return existing;
  const stage=compileStage(definition);
  await pause();
  const navigation=buildNavigation(stage,BODY.guardRadius);
  await pause();
  // The mission may have been opened (and prepared in one go) while this was waiting its turn.
  return cached(definition,assets)??remember(definition,assets,{stage,navigation,art:buildStageArt(stage,assets.museum)});
}
