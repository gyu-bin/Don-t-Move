/* eslint-disable @typescript-eslint/no-require-imports */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {SkCanvas} from '@shopify/react-native-skia';
import {initSkiaNode} from '../sprites/skiaNode';

test('Museum pilot replaces floor commands within the old budget and preserves compiled gameplay data',async()=>{
 await initSkiaNode();
 require.extensions['.png']=module=>{module.exports=0;};
 const {compileStage,Cell}=require('../../src/game/world/compileStage');
 const defs=require('../../src/game/levels/stages/campaignStages.json');
 const {isMuseumEntrance,drawEntranceStone}=require('../../src/rendering/environment/museumEntranceLook');
 const {buildStageArt}=require('../../src/rendering/environment/buildStageArt');
 assert.deepEqual(defs.filter((d:{id:string})=>isMuseumEntrance(d.id)).map((d:{id:string})=>d.id),['01-01']);
 const stage=compileStage(defs[0]),before=JSON.stringify(stage);
 let commands=0,oldCommands=3; // Existing objective rings + landmark oval.
 const floorRectangles:number[][]=[];
 const count=()=>{commands++;};
 const canvas={drawRect:(r:{x:number;y:number;width:number;height:number})=>{commands++;floorRectangles.push([r.x,r.y,r.width,r.height]);},drawLine:count,drawCircle:count,drawOval:count};
 drawEntranceStone(canvas as unknown as SkCanvas,stage);
 let floors=0;
 for(let y=0;y<stage.rows;y++)for(let x=0;x<stage.cols;x++)if(stage.grid[y*stage.cols+x]===Cell.Floor){
  floors++;oldCommands+=5+((x+y)%2===0?1:0);
 }
 assert.equal(floorRectangles.length,floors,'no extra full-floor overlay');
 for(const [x,y,w,h] of floorRectangles){assert.equal(stage.grid[y/40*stage.cols+x/40],Cell.Floor);assert.equal(w,40);assert.equal(h,40);}
 assert(commands<oldCommands*.75,`${commands} vs previous ${oldCommands} drawing commands`);
 const art=buildStageArt(stage,null);
 assert.equal(JSON.stringify(stage),before,'rendering cannot change collision, LOS, lights, routes or gameplay');
 for(const p of [art.floor,art.darkness,art.glow,art.exitActive,art.exitActiveTop,...art.layers.map((l:{picture:unknown})=>l.picture)])p?.dispose();
 console.log(JSON.stringify({floorCommandsBefore:oldCommands,floorCommandsAfter:commands,floorCells:floors}));
});
