import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import old from '../../docs/design/v12/phase4c/SOURCE_STAGES.json';
// The Phase4D input is the released Phase4C result; retain this historical contract.
import current from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';
const defs=current as StageDefinition[];
test('Phase4C: all25 Chapter5–9 definitions remain byte-equivalent serialized data',()=>{
 assert.deepEqual(current.filter(d=>d.chapter>=5),old.filter(d=>d.chapter>=5));
});
test('Phase4C: Tilt, Guard AI, CCTV and save logic unchanged',()=>{
 const hashes=JSON.parse(fs.readFileSync('docs/design/v12/phase4c/PROTECTED_HASHES.json','utf8'));
 for(const [file,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash,file);
});
for(const d of defs.filter(d=>d.chapter!<=4)){
 test(`${d.id}: secure objective is inside actual chamber, behind threshold; all enlarged bodies match`,()=>{
  assert.equal(d.visualRevision,'v12-4c');const p=d.topologyPlan!,r=p.rooms.find(r=>r.id===p.objectiveRoom)!;const o=d.objective!;
  assert(o.x>r.x&&o.x<r.x+r.w&&o.y>r.y&&o.y<r.y+r.h);
  const secureEdge=p.edges.find(e=>e.role==='approach'&&(e.from===p.objectiveRoom||e.to===p.objectiveRoom));
  const gate=d.doors!.find(q=>q.id.endsWith('secure-threshold'))??d.doors!.find(q=>q.id===`${p.id}-door-${secureEdge?.id??p.edges.indexOf(secureEdge!)}`);
  assert(gate,'Secure threshold required');assert(Math.hypot(gate.x-o.x,gate.y-o.y)>=1.5,'Objective must not sit in front of security threshold');
  assert(gate.x<r.x||gate.x>r.x+r.w||gate.y<r.y||gate.y>r.y+r.h,'Threshold outside chamber, objective inside');
  for(const prop of d.props)if(PROP_KIT[prop.kind].blocksMovement&&prop.scale!==undefined)assert.equal(prop.collisionScale,prop.scale,`${prop.kind} physical and visual scale`);
  const s=compileStage(d);assert(s.doors!.length>=2);assert(s.objective.x/TILE===o.x);
 });
}
test('Phase4C: all13 chapter-specific door profiles actually used',()=>{
 const ids=new Set(defs.filter(d=>d.chapter!<=4).flatMap(d=>d.doors!.map(q=>q.style)));
 for(const style of ['museumExhibition4c','museumRestrictedCollection4c','museumSecurity4c','galleryMinimal4c','galleryGlassSliding4c','galleryPrivateCollection4c','bankStaff4c','bankSecurity4c','bankSecurityPortal4c','bankVault4c','labSliding4c','labRestrictedGlass4c','labPrototypeSecurity4c'])assert(ids.has(style as never),style);
});
