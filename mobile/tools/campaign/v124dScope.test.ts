import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import source from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import current from '../../src/game/levels/stages/campaignStages.json';
import assetCatalog from '../../assets/environment/environment-assets.json';
import protectedHashes from '../../docs/design/v12/phase4c/PROTECTED_HASHES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {ESCAPE_TIMER_SECONDS} from '../../src/game/guards/guardPhase';
import {buildV124dCampaign} from './v124dBuild';

// Phase 5 layers security tuning on top of this composition (see v125Scope.test.ts), so these Phase 4D
// invariants are checked on the Phase 4D build itself; `current` is the tuned live campaign.
const before=source as StageDefinition[],after=JSON.parse(JSON.stringify(buildV124dCampaign())) as StageDefinition[],live=current as unknown as StageDefinition[];

test('Phase4D: bake is reproducible and the live campaign keeps its mission order',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(buildV124dCampaign())),after);
 assert.deepEqual(after.map(d=>d.id),before.map(d=>d.id));
 assert.deepEqual(live.map(d=>d.id),before.map(d=>d.id));
});

test('Phase4D: all20 Chapter6–9 definitions remain byte-equivalent serialized data',()=>{
 const unchanged=after.filter(d=>d.chapter!>=6);
 assert.equal(unchanged.length,20);
 assert.equal(JSON.stringify(unchanged),JSON.stringify(before.filter(d=>d.chapter!>=6)));
});

test('Phase4D: guard counts and perception/movement rules remain unchanged for every mission',()=>{
 for(const stage of after){
  const old=before.find(d=>d.id===stage.id)!;
  assert.equal(stage.guards.length,old.guards.length,`${stage.id} guard count`);
  for(let i=0;i<stage.guards.length;i++)for(const key of ['pace','visionRange','visionHalfAngle','escapePatrol'] as const)
   assert.deepEqual(stage.guards[i][key],old.guards[i][key],`${stage.id} guard ${i} ${key}`);
  for(let i=0;i<(stage.cameras?.length??0);i++)for(const key of ['range','visionAngle','sweepAngle','sweepSpeed','pauseAtEnds','suspicionRate'] as const)
   assert.deepEqual(stage.cameras![i][key],old.cameras?.[i]?.[key],`${stage.id} CCTV ${i} ${key}`);
 }
});

test('Phase4D map composition: authored patrol and CCTV configurations are preserved',()=>{
 for(const stage of after.filter(s=>s.chapter!<=5)){
  const old=before.find(d=>d.id===stage.id)!;
  assert.deepEqual(stage.topologyPlan?.patrols,old.topologyPlan?.patrols,`${stage.id} authored patrols`);
  assert.deepEqual(stage.topologyPlan?.cameras,old.topologyPlan?.cameras,`${stage.id} authored CCTV`);
 }
});

test('Phase4D: Casino physical fixtures select shipped Casino art with matching collider scales',()=>{
 const casino=after.filter(d=>d.chapter===5),assets=new Map(assetCatalog.assets.map(a=>[a.id,a]));
 assert.equal(casino.length,5);
 for(const stage of casino){
  const fixtures=stage.props.filter(p=>p.kind.startsWith('casino'));
  assert(fixtures.length>0,`${stage.id} fixtures`);
  for(const prop of fixtures){
   assert(prop.visualAssetId,`${stage.id} ${prop.kind} must explicitly select art`);
   const asset=assets.get(prop.visualAssetId);
   assert(asset,`${stage.id} missing asset ${prop.visualAssetId}`);
   assert.equal(asset.chapter,'casino');
   assert(fs.existsSync(asset.path),asset.path);
   if(PROP_KIT[prop.kind].blocksMovement&&prop.scale!==undefined)
    assert.equal(prop.collisionScale,prop.scale,`${stage.id} ${prop.kind} collider scale`);
  }
 }
});

test('Phase4D: protected Tilt, Guard AI, CCTV and saves remain unchanged; the escape timer is the shortened 10 seconds',()=>{
 // Shortened from 28 s after the V13 playtest: at 28 s the lockdown door never closed on a thief who kept moving.
 assert.equal(ESCAPE_TIMER_SECONDS,10);
 for(const [file,hash] of Object.entries(protectedHashes))
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
});
