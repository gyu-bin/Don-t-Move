/** Bank physical/asset contracts are independent of campaign production and character systems. */
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {StageDefinition,PropKind} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {metadataErrors} from './contract';

const catalog=JSON.parse(readFileSync('assets/environment/environment-assets.json','utf8'));
const bank=catalog.assets.filter((a:{chapter:string})=>a.chapter==='bank');
function fixture(kind:PropKind,scale=1):StageDefinition{return{
 id:'bank-kind-contract',number:0,title:'Bank physical contract',theme:'bank',lights:[],
 layout:Array.from({length:12},(_,y)=>Array.from({length:12},(_,x)=>x===0||x===11||y===0||y===11?'#':'.').join('')),
 props:[{kind,x:6,y:6,scale,collisionScale:scale}],guards:[],patrolRoutes:[],
 playerSpawn:{x:6,y:9,facing:-Math.PI/2},objective:{x:6,y:3,kind:'vaultGem'},exit:{x:8,y:9,w:1,h:1},
};}

test('Bank catalog has exactly twenty static Metro paths and preserves original Museum/Gallery metadata',()=>{
 assert.equal(bank.length,20);assert.equal(catalog.assets.length,92);
 assert.equal(new Set(catalog.assets.map((a:{id:string})=>a.id)).size,92);
 const categories=bank.reduce((counts:Record<string,number>,a:{category:string})=>{counts[a.category]=(counts[a.category]??0)+1;return counts;},{});
 assert.deepEqual(categories,{ARCHITECTURE:4,MAJOR:5,SOFT:5,DECORATION:5,LANDMARK:1});
 const source=readFileSync('src/assets/environmentKit.ts','utf8');
 for(const a of bank){assert(source.includes(`${a.id}:require('../../${a.path}')`),`${a.id}: must have a literal Metro require`);assert(a.path.startsWith('assets/environment/bank/'));}
 const old=catalog.assets.filter((a:{chapter:string})=>['museum','gallery'].includes(a.chapter));
 assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'71eaf16771e9d25b3c9b70dba5b03d84c83f861f40cae1479c61ccbcedfb3b0a');
});
test('Bank metadata and actual physical kinds agree; low exhibits never falsely block guard LOS',()=>{
 for(const a of bank){const spec=PROP_KIT[a.physicalKind as PropKind];assert(spec,a.id);
  assert.deepEqual(a.footprint,spec.footprint);assert.equal(a.collision,spec.blocksMovement);assert.equal(a.losBehavior!=='PASS',spec.blocksVision);
  assert.deepEqual(a.collisionParts,spec.collisionParts,a.id);
  assert.deepEqual(metadataErrors(a),[],`${a.id}: generic manifest contract must accept the physical asset`);
  const stage=compileStage(fixture(a.physicalKind));
  if(a.physicalKind==='bankSecurityGate')continue;
  const from={x:6*TILE,y:3*TILE},to={x:6*TILE,y:9*TILE};
  assert.equal(clearSegment(from.x,from.y,to.x,to.y,stage.movementBlockers,BODY.playerRadius),!spec.blocksMovement,a.id);
  assert.equal(clearSegment(from.x,from.y,to.x,to.y,stage.visionBlockers),!spec.blocksVision,a.id);
 }
 assert.equal(PROP_KIT.bankFloorMarker.floorDetail,true);
 const plant=bank.find((a:{id:string})=>a.id==='bank_plant');
 assert(metadataErrors({...plant,id:'unapproved_colliding_decoration'}).includes('Decoration cannot silently introduce collision'));
 assert(metadataErrors({...plant,footprint:{w:0,h:0}}).includes('Collision asset needs nonzero floor footprint'));
});
test('Open security gate central lane is truly passable at Player plus Tilt radius; posts remain solid at both scales',()=>{
 for(const scale of[1,2]){const s=compileStage(fixture('bankSecurityGate',scale)),margin=BODY.playerRadius+9;
  assert(clearSegment(6*TILE,3*TILE,6*TILE,9*TILE,s.movementBlockers,margin),'open gate must not use a phantom full-span collider');
  for(const side of[-1,1]){const x=(6+side*1.05*scale)*TILE;
   assert(!clearSegment(x,3*TILE,x,9*TILE,s.movementBlockers,BODY.playerRadius),'actual side posts must be solid');
  }
  assert(clearSegment(6*TILE,3*TILE,6*TILE,9*TILE,s.visionBlockers),'gate transmits guard sight');
  assert.equal(s.movementBlockers.length/4-s.wallRects.length,2,'gate must add exactly the two visible post footprints');
 }
});
test('Bank visual scale automatically scales solids and rejects invisible-base mismatches',()=>{
 const def=fixture('bankSecurityGate',2);delete def.props[0].collisionScale;
 const automatic=compileStage(def),explicit=compileStage(fixture('bankSecurityGate',2));
 assert.deepEqual(automatic.movementBlockers,explicit.movementBlockers);
 for(const value of[0,-1,Number.NaN,Number.POSITIVE_INFINITY]){const bad=fixture('bankWall',value);assert.throws(()=>compileStage(bad),/Bank visual\/collision scale/);}
 const mismatch=fixture('bankWall',2);mismatch.props[0].collisionScale=1;
 assert.throws(()=>compileStage(mismatch),/Bank visual\/collision scale/);
});
test('Twenty Bank images are complete RGBA files at budget size with measured object bounds and ground pivots',()=>{
 for(const a of bank){const png=readFileSync(a.path);assert(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),`${a.id}: actual PNG required`);
  assert.equal(png.readUInt32BE(16),a.resolution.width);assert.equal(png.readUInt32BE(20),a.resolution.height);
  assert.equal(png[25],6,`${a.id}: RGBA transparency required`);
  const budget=a.category==='LANDMARK'?768:a.category==='SOFT'||a.id==='bank_plant'?384:a.category==='DECORATION'?256:512;
  assert(a.resolution.width<=budget&&a.resolution.height<=budget,a.id);
  const b=a.objectBounds;assert(b&&b.w>0&&b.h>0&&b.x>=0&&b.y>=0&&b.x+b.w<=a.resolution.width&&b.y+b.h<=a.resolution.height,`${a.id}: actual alpha bounds required`);
  assert(Math.abs(a.drawHeight-a.drawWidth*b.h/b.w)<1e-8,`${a.id}: draw size must match measured object aspect`);
  assert.equal(a.pivot.x,.5);assert(a.pivot.y>=.97&&a.pivot.y<=1);
  assert.equal(a.status,'READY_FOR_USER_REVIEW');
 }
});
