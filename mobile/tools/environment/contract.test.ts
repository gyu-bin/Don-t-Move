import assert from 'node:assert/strict';
import test from 'node:test';
import {metadataErrors,pixelDiagnostics,type EnvironmentAsset} from './contract';
const sample:EnvironmentAsset={id:'case',chapter:'museum',category:'MAJOR',path:'assets/environment/museum/major/case.png',resolution:{width:384,height:384},pivot:{x:.5,y:.97,units:'normalized'},footprint:{w:1.2,h:.9},collision:true,losBehavior:'BLOCK',defaultScale:1,drawWidth:1.25,drawHeight:1.6,status:'NEEDS_REVIEW'};
test('Valid tile40 independent PNG contract',()=>assert.deepEqual(metadataErrors(sample),[]));
test('Rejects escaping path, empty collision footprint and NaN scale',()=>{
  const errors=metadataErrors({...sample,path:'../escape.png',footprint:{w:0,h:0},defaultScale:NaN});assert.equal(errors.length,3);
});
test('Pixel bounds ignore transparent margin and detect edge clipping',()=>{
  const data=new Uint8Array(4*4*4);data[(2*4+1)*4+3]=255;
  assert.deepEqual(pixelDiagnostics(data,4,4).bounds,{x:1,y:2,w:1,h:1});
  assert.equal(pixelDiagnostics(data,4,4).edgePixels,0);data[3]=255;assert.equal(pixelDiagnostics(data,4,4).edgePixels,1);
});
test('Opaque presentation/checkerboard image has no transparent background',()=>{
  const data=new Uint8Array(4*4*4).fill(255);assert.equal(pixelDiagnostics(data,4,4).transparentFraction,0);
});
test('Crop bounds cannot escape the actual PNG canvas',()=>{
  assert(metadataErrors({...sample,objectBounds:{x:380,y:0,w:10,h:10}}).includes('Invalid sprite object bounds'));
});
