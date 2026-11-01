import test from 'node:test';
import assert from 'node:assert/strict';
import type {SkImage} from '@shopify/react-native-skia';
import {compileStage,TILE,WALL_HEIGHT} from '../../../game/world/compileStage';
import type {StageDefinition} from '../../../game/levels/StageDefinition';
import type {SpriteAtlas,SpriteFrame} from '../../sprites/spriteTypes';
import {fitWallArt} from '../wallArtFit';

// Same rule as environmentAssetForProp for these props: the placed visualAssetId.
const pick=(_def:unknown,p:{visualAssetId?:string})=>p.visualAssetId;

// Frames shaped like the real pictures: a tall portrait (238×360, pivot at the bottom) and a server rack.
const image={width:()=>512,height:()=>512} as SkImage;
const frame=(w:number,h:number):SpriteFrame=>({image,sx:0,sy:0,sw:w,sh:h,ax:w/2,ay:h});
const atlas:SpriteAtlas={gallery_portrait_frame_a:frame(238,360),hq_server_row:frame(430,462),hq_video_wall:frame(250,130)};
const base:StageDefinition={id:'wall-art',number:1,title:'t',theme:'gallery',
 layout:['############','#..........#','#..........#','#..........#','############'],props:[],lights:[],guards:[],patrolRoutes:[],
 playerSpawn:{x:1.5,y:3},objective:{x:9,y:3},exit:{x:10,y:3,w:1,h:1}} as unknown as StageDefinition;

test('a wall picture that would rise out of the map is hung inside the wall cap; nothing else moves',()=>{
 const stage=compileStage({...base,props:[{kind:'painting',visualAssetId:'gallery_portrait_frame_a',x:3,y:1.6,scale:1.7},{kind:'statue',x:8,y:3}]} as StageDefinition);
 const fit=fitWallArt(stage,atlas,pick),p=stage.props.find(q=>q.kind==='painting')!,placed=fit.get(p)!;
 assert.ok(placed,'portrait is re-hung');
 const top=placed.y-placed.width*360/238;
 assert.ok(top>=-WALL_HEIGHT,`top ${top} stays inside the cap`);
 assert.equal(placed.y,TILE+8,'bottom 8 units below the wall foot');
 assert.equal(placed.x,p.x,'stays in its column');
 assert.equal(fit.has(stage.props.find(q=>q.kind==='statue')!),false,'blocking props are never touched');
});

test('a wall screen drawn over furniture slides to a clear stretch of the same wall; collision is unchanged',()=>{
 const props=[{kind:'labServerRack',visualAssetId:'hq_server_row',x:5,y:1.6,scale:.9},{kind:'labWallScreen',visualAssetId:'hq_video_wall',x:5.2,y:1.6,scale:1.4}];
 const stage=compileStage({...base,theme:'security',props} as StageDefinition),before=JSON.stringify([stage.movementBlockers,stage.visionBlockers]);
 const fit=fitWallArt(stage,atlas,pick),screen=stage.props.find(q=>q.kind==='labWallScreen')!,placed=fit.get(screen)!;
 assert.ok(placed&&Math.abs(placed.x-screen.x)>=TILE/4,'moved along the wall');
 assert.equal(placed.y,screen.y-16,'same height on the wall');
 const rack=stage.props.find(q=>q.kind==='labServerRack')!,rw=1.9*TILE*.9/2,sw=placed.width/2;
 assert.ok(placed.x-sw>=rack.x+rw-4||placed.x+sw<=rack.x-rw+4,'no longer over the rack');
 assert.equal(JSON.stringify([stage.movementBlockers,stage.visionBlockers]),before);
});

test('pictures that already fit are left exactly as placed',()=>{
 const stage=compileStage({...base,theme:'security',props:[{kind:'labWallScreen',visualAssetId:'hq_video_wall',x:5,y:1.6,scale:1.4}]} as StageDefinition);
 assert.equal(fitWallArt(stage,atlas,pick).size,0);
});

test('Portrait Hall paintings leave the upper wall cap visible without changing collision',()=>{
 const stage=compileStage({...base,id:'02-01',props:[{kind:'painting',visualAssetId:'gallery_portrait_frame_a',x:3,y:1.6,scale:1.7}]} as StageDefinition);
 const before=JSON.stringify([stage.movementBlockers,stage.visionBlockers]);
 const painting=stage.props[0],placed=fitWallArt(stage,atlas,pick).get(painting)!;
 assert.ok(placed&&placed.width>0);
 assert.ok(placed.y-placed.width*360/238>=-WALL_HEIGHT+TILE/2+2-1e-6);
 assert.equal(placed.x,painting.x);
 assert.equal(JSON.stringify([stage.movementBlockers,stage.visionBlockers]),before);
});

test('a picture remains scaled to the wall cap when furniture leaves no clear span',()=>{
 const stage=compileStage({...base,theme:'security',props:[
  {kind:'painting',visualAssetId:'gallery_portrait_frame_a',x:5,y:1,scale:1.7},
  {kind:'labServerRack',visualAssetId:'hq_server_row',x:5,y:1,scale:8},
 ]} as StageDefinition);
 const before=JSON.stringify([stage.movementBlockers,stage.visionBlockers]);
 const picture=stage.props[0],placed=fitWallArt(stage,atlas,pick).get(picture);
 assert.ok(placed,'the resized picture must be returned even when it cannot slide');
 assert.equal(placed.x,picture.x);
 assert.equal(placed.y,picture.y-6,'the original hanging height was already inside the wall');
 assert.ok(placed.width<1.3*TILE*1.7);
 assert.ok(placed.y-placed.width*360/238>=-WALL_HEIGHT+2-1e-6);
 assert.equal(JSON.stringify([stage.movementBlockers,stage.visionBlockers]),before);
});
