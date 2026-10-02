import type { GameAssets } from '../assets/buildSprites';
import type { StageDefinition } from '../game/levels/StageDefinition';
import { compileStage } from '../game/world/compileStage';
import { buildNavigation } from '../game/world/navigation';
import { BODY } from '../game/guards/guardTuning';
import { buildStageArt } from '../rendering/environment/buildStageArt';

// Shared decoded atlases plus the current/next compiled maps keep transition
// frames independent of image loading and static floor-plan compilation.
const cache = new Map<StageDefinition, {assets:GameAssets; value:ReturnType<typeof build>}>();
function build(definition:StageDefinition,assets:GameAssets) {
  const t0=Date.now(),stage=compileStage(definition);
  const t1=Date.now(),navigation=buildNavigation(stage,BODY.guardRadius);
  const t2=Date.now(),art=buildStageArt(stage,assets.museum);
  if(__DEV__)console.info('[LOAD] build',JSON.stringify({id:definition.id,compileMs:t1-t0,navMs:t2-t1,artMs:Date.now()-t2}));
  return {stage,navigation,art};
}
export function prepareMission(definition:StageDefinition,assets:GameAssets) {
  const existing=cache.get(definition);
  if(existing?.assets===assets)return existing.value;
  const value=build(definition,assets);
  cache.set(definition,{assets,value});
  if(cache.size>3)cache.delete(cache.keys().next().value!);
  return value;
}
