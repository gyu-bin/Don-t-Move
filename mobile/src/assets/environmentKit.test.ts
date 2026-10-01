import test from 'node:test';
import assert from 'node:assert/strict';
import type {SkImage} from '@shopify/react-native-skia';
import type {EnvironmentAssetSpec} from './environmentKit';
import {buildEnvironmentFrames,buildGameAssets,referencedImages} from './buildSprites';
import type {AssetManifest} from './manifest';
import {compileStage} from '../game/world/compileStage';
import type {StageDefinition} from '../game/levels/StageDefinition';

const spec:EnvironmentAssetSpec={id:'museum_column',chapter:'museum',category:'ARCHITECTURE',path:'column.png',resolution:{width:512,height:512},objectBounds:{x:150,y:80,w:200,h:400},pivot:{x:.5,y:.97,units:'normalized'},footprint:{w:.75,h:.65},collision:true,losBehavior:'BLOCK',defaultScale:1,drawWidth:.8,drawHeight:1.6,status:'NEEDS_REVIEW'};
const image={width:()=>512,height:()=>512} as SkImage;
const manifest:AssetManifest={characters:{player:null,guard:null},environment:{museum:null,production:[spec]},ui:{indicators:null}};
test('production PNG decoding preserves cropped pixels and normalized ground anchor',()=>{
 const f=buildEnvironmentFrames([spec],{museum_column:image}).museum_column;
 assert.deepEqual([f.sx,f.sy,f.sw,f.sh,f.ax,f.ay],[150,80,200,400,100,388]);
 assert.equal(f.image,image);
 assert.deepEqual(referencedImages(manifest),['museum_column']);
 assert.equal(buildGameAssets(manifest,{museum_column:image}).museum?.museum_column.image,image);
});
test('optional frame fallback and required production PNG errors are explicit',()=>{
 assert.deepEqual(buildEnvironmentFrames([spec],{}),{});
 assert.throws(()=>buildGameAssets(manifest,{}),/Missing production environment image: museum_column/);
 assert.throws(()=>buildEnvironmentFrames([{...spec,objectBounds:{x:400,y:0,w:200,h:50}}],{museum_column:image}),/Invalid environment frame bounds/);
});
test('artwork selection is independent from collision and sight blockers',()=>{
 const base:StageDefinition={id:'visual-physics',number:1,title:'test',theme:'museum',layout:['#####','#...#','#...#','#####'],props:[{kind:'pillar',x:2,y:2}],lights:[],guards:[],patrolRoutes:[],playerSpawn:{x:1.5,y:1.5,facing:0},objective:{x:3,y:2,kind:'diamond'},exit:{x:3,y:2,w:1,h:1}};
 const a=compileStage(base),b=compileStage({...base,props:[{...base.props[0],visualAssetId:'museum_column'}]});
 assert.deepEqual(b.movementBlockers,a.movementBlockers);assert.deepEqual(b.visionBlockers,a.visionBlockers);
 assert.equal(b.props[0].visualAssetId,'museum_column');
});
