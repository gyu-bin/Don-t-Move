import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {PropKind,StageDefinition} from '../StageDefinition';
import {compileStage,TILE} from '../../world/compileStage';
import {clearSegment} from '../../world/navigation';
import {BODY} from '../../guards/guardTuning';
import {PROP_KIT} from '../../world/propKit';
for(const kind of ['galleryGlassPanel','galleryGlassPanelVertical'] as PropKind[]){
 test(`${kind}: visible continuous glazing blocks bodies and passes sight`,()=>{
  const def:StageDefinition={id:'glass-contract',number:1,title:'Glass',theme:'gallery',chapter:2,layout:['########','#......#','#......#','#......#','#......#','#......#','########'],props:[{kind,x:4,y:4,scale:1,collisionScale:1}],lights:[],guards:[],patrolRoutes:[],playerSpawn:{x:2,y:2,facing:0},objective:{x:6,y:5,kind:'painting'},exit:{x:6,y:5,w:1,h:1}};
  const stage=compileStage(def),vertical=kind==='galleryGlassPanelVertical';
  const [ax,ay,bx,by]=vertical?[3,3,5,3]:[4,3,4,5];
  assert(!clearSegment(ax*TILE,ay*TILE,bx*TILE,by*TILE,stage.movementBlockers,BODY.playerRadius));
  assert(clearSegment(ax*TILE,ay*TILE,bx*TILE,by*TILE,stage.visionBlockers));
  assert.equal(PROP_KIT[kind].cover,false);assert.equal(PROP_KIT[kind].blocksVision,false);
  assert.equal(stage.props[0].kind,kind);
  const scaled=compileStage({...def,props:[{kind,x:4,y:4,scale:2}]});
  const physical=compileStage({...def,props:[{kind,x:4,y:4,scale:2,collisionScale:2}]});
  assert.deepEqual(scaled.movementBlockers,physical.movementBlockers);
  assert.throws(()=>compileStage({...def,props:[{kind,x:4,y:4,scale:2,collisionScale:1}]}),/glass visual\/collision scale mismatch/);
 });
}
