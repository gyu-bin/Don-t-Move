/** Additive chapter contracts exercise actual collision/LOS compilation, not scene snapshots. */
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {StageDefinition,PropKind} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {metadataErrors,LAB_CASINO_COUNTS} from './contract';
const catalog=JSON.parse(readFileSync('assets/environment/environment-assets.json','utf8'));
const assets=catalog.assets.filter((a:{chapter:string})=>['lab','casino'].includes(a.chapter));
function fixture(kind:PropKind,scale=1):StageDefinition{return{
 id:'lab-casino-contract',number:0,title:'Environment physical fixture',theme:'lab',lights:[],
 layout:Array.from({length:18},(_,y)=>Array.from({length:18},(_,x)=>x===0||x===17||y===0||y===17?'#':'.').join('')),
 props:[{kind,x:9,y:9,scale}],guards:[],patrolRoutes:[],playerSpawn:{x:9,y:13,facing:-Math.PI/2},objective:{x:9,y:4,kind:'vaultGem'},exit:{x:12,y:13,w:1,h:1},
};}
test('Lab26/Casino26 complete additive runtime paths and exact category contracts',()=>{
 assert.equal(assets.length,52);assert.equal(catalog.assets.length,92);
 for(const chapter of['lab','casino']){
  const entries=assets.filter((a:{chapter:string})=>a.chapter===chapter);
  const counts=entries.reduce((out:Record<string,number>,a:{category:string})=>{out[a.category]=(out[a.category]??0)+1;return out;},{});
  assert.deepEqual(counts,LAB_CASINO_COUNTS);
  const source=readFileSync('src/assets/environmentKit.ts','utf8');
  for(const a of entries){assert(source.includes(`${a.id}:require('../../${a.path}')`));assert(a.path.startsWith(`assets/environment/${chapter}/`));}
 }
 // Original approved-art metadata must not be retroactively changed by new chapter additions.
 const old=catalog.assets.filter((a:{chapter:string})=>['museum','gallery'].includes(a.chapter));
 assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'71eaf16771e9d25b3c9b70dba5b03d84c83f861f40cae1479c61ccbcedfb3b0a');
});
test('All Lab/Casino declared collider and LOS roles match compiled physical solids',()=>{
 for(const a of assets){const spec=PROP_KIT[a.physicalKind as PropKind];assert(spec,a.id);
  assert.deepEqual(a.footprint,spec.footprint);assert.equal(a.collision,spec.blocksMovement);assert.equal(a.losBehavior!=='PASS',spec.blocksVision);
  assert.deepEqual(a.collisionParts,spec.collisionParts);assert.deepEqual(metadataErrors(a),[],a.id);
  if(spec.collisionParts)continue;
  const stage=compileStage(fixture(a.physicalKind));
  assert.equal(clearSegment(9*TILE,5*TILE,9*TILE,13*TILE,stage.movementBlockers,BODY.playerRadius),!spec.blocksMovement,a.id);
  assert.equal(clearSegment(9*TILE,5*TILE,9*TILE,13*TILE,stage.visionBlockers),!spec.blocksVision,a.id);
 }
});
test('Glass surfaces block physical passage while transmitting guard LOS',()=>{
 for(const kind of['labGlassWall','labGlassCorridor'] as const){const stage=compileStage(fixture(kind));
  assert(!clearSegment(9*TILE,5*TILE,9*TILE,13*TILE,stage.movementBlockers,BODY.playerRadius));
  assert(clearSegment(9*TILE,5*TILE,9*TILE,13*TILE,stage.visionBlockers));
 }
});
test('Open gold arch and room portals have real passable centers and solid posts at both scales',()=>{
 for(const kind of['casinoGoldArch','casinoVipRoom','labObservationRoom'] as const)for(const scale of[1,1.5]){
  const spec=PROP_KIT[kind],stage=compileStage(fixture(kind,scale));
  assert(clearSegment(9*TILE,5*TILE,9*TILE,13*TILE,stage.movementBlockers,BODY.playerRadius+9),`${kind}: phantom opening`);
  for(const side of[-1,1]){const x=(9+side*(spec.footprint.w/2-.175)*scale)*TILE;
   assert(!clearSegment(x,5*TILE,x,13*TILE,stage.movementBlockers,BODY.playerRadius),`${kind}: visible post must collide`);
  }
 }
});
test('Visual/collision scale equality is mandatory for new chapter props; flat detail never blocks passage',()=>{
 for(const kind of['labExperimentMachine','casinoSlotBank'] as const){
  for(const bad of[0,-1,NaN,Infinity])assert.throws(()=>compileStage(fixture(kind,bad)),/visual\/collision scale/);
  const mismatch=fixture(kind,2);mismatch.props[0].collisionScale=1;assert.throws(()=>compileStage(mismatch),/visual\/collision scale/);
 }
 for(const kind of['labCable','labFloorMarker','casinoCarpetPattern'] as const){assert.equal(PROP_KIT[kind].floorDetail,true);assert.equal(PROP_KIT[kind].blocksMovement,false);}
});
test('52 delivered images are RGBA budget PNGs with measured alpha bounds and matching sprite aspect',()=>{
 for(const a of assets){const png=readFileSync(a.path);
  assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`${a.id}: PNG signature`);
  assert.equal(png.readUInt32BE(16),a.resolution.width);assert.equal(png.readUInt32BE(20),a.resolution.height);assert.equal(png[25],6,`${a.id}: RGBA`);
  const expected=a.category==='LANDMARK'?768:a.category==='SOFT'?384:a.category==='DECORATION'?256:512;
  assert.equal(a.resolution.width,expected);assert.equal(a.resolution.height,expected);
  const b=a.objectBounds;assert(b&&b.w>0&&b.h>0&&b.x>=0&&b.y>=0&&b.x+b.w<=expected&&b.y+b.h<=expected,`${a.id}: measured bounds`);
  assert(Math.abs(a.drawHeight-a.drawWidth*b.h/b.w)<1e-8,`${a.id}: aspect`);
  assert.deepEqual(a.pivot,{x:.5,y:1,units:'normalized'});assert.equal(a.status,'READY_FOR_USER_REVIEW');
 }
});
