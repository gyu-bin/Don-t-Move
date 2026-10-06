/**
 * Environment catalog ↔ runtime kit (Phase 8B). The game reads collision, sight and footprint from PROP_KIT
 * (src/game/world/propKit.ts) only; assets/environment/environment-assets.json repeats them per picture for the
 * art tools. These tests hold the two copies, the image table in environmentKit.ts and the files on disk together,
 * so that editing one alone fails here instead of drifting silently. They check, they do not change any value.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition,PropKind} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {DRESSING_KIT} from '../../src/game/world/dressingKit';
import type {EnvironmentAsset,EnvironmentManifest} from './contract';

type Entry=EnvironmentAsset&{physicalKind?:string;collisionParts?:unknown;image?:string};
const manifest=JSON.parse(fs.readFileSync('assets/environment/environment-assets.json','utf8')) as EnvironmentManifest,catalog=manifest.assets as Entry[];
// The image table of the runtime kit: `id:require('../../assets/environment/<path>')`.
const kit=[...fs.readFileSync('src/assets/environmentKit.ts','utf8').matchAll(/^ (\w+):require\('\.\.\/\.\.\/(assets\/environment\/[^']+)'\)/gm)].map(m=>({id:m[1],path:m[2]}));
const stages=campaign as unknown as StageDefinition[];
/** Pictures drawn at a width of their own, not the width of their physical kind (wall portraits in a painting slot). */
const OWN_DRAW_WIDTH=new Set(['gallery_portrait_frame_a','gallery_portrait_frame_b','gallery_portrait_frame_c','gallery_portrait_frame_d','gallery_portrait_frame_e','gallery_portrait_frame_f']);

test('Environment: catalog, kit image table and files name the same pictures, once each',()=>{
 const ids=catalog.map(a=>a.id),kitIds=kit.map(k=>k.id);
 assert(ids.length>0&&kit.length>0);
 assert.deepEqual(ids.filter((id,i)=>ids.indexOf(id)!==i),[],'duplicate catalog id');
 assert.deepEqual(kitIds.filter((id,i)=>kitIds.indexOf(id)!==i),[],'duplicate kit id');
 assert.deepEqual(ids.filter(id=>!kitIds.includes(id)),[],'in the catalog, not in the kit');
 assert.deepEqual(kitIds.filter(id=>!ids.includes(id)),[],'in the kit, not in the catalog');
 for(const a of catalog){
  assert.equal(kit.find(k=>k.id===a.id)!.path,a.path,`${a.id}: kit and catalog point at different files`);
  assert(fs.existsSync(a.path),`${a.id}: missing file ${a.path}`);
 }
});

test('Environment: every catalog entry carries footprint, collision and sight metadata',()=>{
 for(const a of catalog){
  assert(Number.isFinite(a.footprint?.w)&&Number.isFinite(a.footprint?.h)&&a.footprint.w>=0&&a.footprint.h>=0,`${a.id}: footprint`);
  assert.equal(typeof a.collision,'boolean',`${a.id}: collision`);
  assert(['BLOCK','BREAKER','PASS'].includes(a.losBehavior),`${a.id}: losBehavior`);
  assert(a.physicalKind&&(a.physicalKind in PROP_KIT||a.physicalKind in DRESSING_KIT),`${a.id}: unknown physical kind ${a.physicalKind}`);
 }
});

test('Environment: catalog metadata equals the runtime PROP_KIT entry of its physical kind',()=>{
 for(const a of catalog){
  const spec=PROP_KIT[a.physicalKind as PropKind];if(!spec)continue; // dressing kinds are checked by kind above
  assert.deepEqual(a.footprint,spec.footprint,`${a.id}: footprint differs from PROP_KIT.${a.physicalKind}`);
  assert.equal(a.collision,spec.blocksMovement,`${a.id}: collision differs from PROP_KIT.${a.physicalKind}`);
  // BLOCK and BREAKER both stop sight in the game; PASS does not.
  assert.equal(a.losBehavior!=='PASS',spec.blocksVision,`${a.id}: losBehavior ${a.losBehavior} against blocksVision ${spec.blocksVision}`);
  assert.deepEqual(a.collisionParts??null,spec.collisionParts??null,`${a.id}: collision parts`);
  if(!OWN_DRAW_WIDTH.has(a.id))assert.equal(a.drawWidth,spec.drawWidth,`${a.id}: drawWidth differs from PROP_KIT.${a.physicalKind}`);
 }
 for(const id of OWN_DRAW_WIDTH)assert(catalog.some(a=>a.id===id),`${id}: listed exception is gone from the catalog`);
});

test('Environment: every campaign prop is a known kind with complete physics, and names a known picture',()=>{
 const ids=new Set(catalog.map(a=>a.id));
 for(const def of stages)for(const p of def.props){
  const spec=PROP_KIT[p.kind];
  assert(spec,`${def.id}: unknown prop kind ${p.kind}`);
  assert(Number.isFinite(spec.footprint.w)&&Number.isFinite(spec.footprint.h),`${def.id} ${p.kind}: footprint`);
  assert.equal(typeof spec.blocksMovement,'boolean',`${def.id} ${p.kind}: collision`);assert.equal(typeof spec.blocksVision,'boolean',`${def.id} ${p.kind}: sight`);
  if(p.visualAssetId)assert(ids.has(p.visualAssetId),`${def.id}: unknown picture ${p.visualAssetId}`);
 }
});
