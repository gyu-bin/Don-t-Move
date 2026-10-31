/* eslint-disable @typescript-eslint/no-require-imports */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {SkCanvas} from '@shopify/react-native-skia';
import {initSkiaNode} from '../sprites/skiaNode';

test('45 mission materials reduce static drawing commands without modifying gameplay',async()=>{
 await initSkiaNode();require.extensions['.png']=m=>{m.exports=0;};
 const {compileStage,Cell}=require('../../src/game/world/compileStage');
 const {drawVenueFloor}=require('../../src/rendering/environment/venueArt');
 const defs=require('../../src/game/levels/stages/campaignStages.json');
 const rows=[];
 for(const def of defs){
  if(def.id==='01-01')continue; // Existing pilot has its own measured regression test.
  const stage=compileStage(def),before=JSON.stringify(stage);let count=0,old=3;
  const add=()=>{count++;};
  const c={drawRect:add,drawLine:add,drawCircle:add,drawOval:add} as unknown as SkCanvas;
  drawVenueFloor(c,stage);
  for(let y=0;y<stage.rows;y++)for(let x=0;x<stage.cols;x++)if(stage.grid[y*stage.cols+x]===Cell.Floor){
   const t=def.theme,v=(def.mission??1)-1;
   old+=t==='gallery'?2+(x%2===0?1:0)+(y%2===0?1:0):t==='mansion'?13:t==='casino'?17:t==='warehouse'?8:
    t==='vault'?10:t==='security'||t==='blacksite'?6:t==='lab'?3+((x+y+v)%4===0?2:0):5+((Math.floor(x/(v%2+1))+Math.floor(y/(v%2+1)))%2===0?1:0);
  }
  assert(count<old,`${def.id}: ${count} must be below ${old}`);
  assert.equal(JSON.stringify(stage),before,`${def.id}: drawing mutated gameplay`);
  rows.push({id:def.id,before:old,after:count});
 }
 console.log(JSON.stringify(rows));
});
