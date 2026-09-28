import assert from 'node:assert/strict';
import {test} from 'node:test';
import {HOME_COMPOSITION as layout,homeComposition} from './homeLayout';

test('HOME upper character never overlaps centred lower menu at iPhone widths/font scales',()=>{
 for(const width of [320,375,390,393,402,414,430,440]){
  for(const height of [568,667,812,844,932])for(const fontScale of [1,1.4,2,3]){
   const c=homeComposition(width,height,{top:59,bottom:34,left:0,right:0},fontScale);
   assert(c.menuTop-(c.playerBounds.y+c.playerBounds.height)>=23.9);
   assert(c.playerBounds.y>=59);
   assert.equal(c.menuLeft+c.menuWidth/2,width/2);
  }
 }
 assert(layout.playerSize/216>=0.85&&layout.playerSize/216<=0.90);
});

test('V6 foreground is subordinate to diamond and compact menu reveals pedestal',()=>{
 const c=homeComposition(393,852,{top:59,bottom:34,left:0,right:0});
 const previousTop=59+(852-59-46)*0.39;
 assert.equal(layout.playerSize,188);
 assert(Math.abs(c.playerSize*393/390-188*393/390)<0.001);
 assert(c.playerBounds.y>previousTop);
 assert.equal(c.menuTop,602);
 assert.equal(c.menuLeft+c.menuWidth/2,196.5);
 assert(c.playerBounds.y+c.playerBounds.height<=c.menuTop-24);
});
