import {test} from 'node:test';
import assert from 'node:assert/strict';
import {propRenderWidth} from '../../src/rendering/environment/propRenderWidth';
import {PROP_KIT} from '../../src/game/world/propKit';
import type {PropDef} from '../../src/game/levels/StageDefinition';

test('solid artwork keeps pivot/aspect and contains the floor footprint, also when flipped',()=>{
 const p:PropDef={kind:'displayCase',x:4,y:8,scale:1,collisionScale:1};
 const spec=PROP_KIT[p.kind],f={sw:200,sh:100,ax:70,ay:80};
 const old=spec.drawWidth*40,before=JSON.stringify(p);
 const width=propRenderWidth(p,f),height=width*f.sh/f.sw;
 assert(width>=old);
 for(const flip of [false,true]){
  assert.equal(propRenderWidth({...p,flip},f),width);
  const pivot=flip?1-f.ax/f.sw:f.ax/f.sw;
  assert(width*pivot>=spec.footprint.w*40/2);
  assert(width*(1-pivot)>=spec.footprint.w*40/2);
  assert(height*f.ay/f.sh>=spec.footprint.h*40-spec.mountHeight);
 }
 assert.equal(JSON.stringify(p),before,'render fit never changes collision or placement');
 assert(propRenderWidth({...p,collisionScale:2},f)>width,'explicit physical scale is respected');
});

test('wall decorations and already sufficient art retain their original size',()=>{
 const painting:PropDef={kind:'painting',x:0,y:0,scale:1.2};
 assert.equal(propRenderWidth(painting,{sw:200,sh:100,ax:70,ay:80}),PROP_KIT.painting.drawWidth*40*1.2);
 const p:PropDef={kind:'displayCase',x:0,y:0,scale:3};
 assert.equal(propRenderWidth(p,{sw:100,sh:300,ax:50,ay:280}),PROP_KIT.displayCase.drawWidth*40*3);
});
