import {BlendMode,Skia,TileMode} from '@shopify/react-native-skia';
import type {SkCanvas,SkPaint} from '@shopify/react-native-skia';
import type {ConeArt} from './visionCone';
import {fill,stroke} from '../paints';
import {drawSpriteFrame} from '../sprites/spriteAnimation';
import type {SpriteFrame} from '../sprites/spriteTypes';

/** Shared paints, allocated once; cameras reuse simulation LOS fans, no render raycasts. */
export interface CctvArt {
  cone:ConeArt;
  sprite:SpriteFrame|null;
  mount:SkPaint;
  edge:SkPaint;
  lens:SkPaint;
  active:SkPaint;
  alert:SkPaint;
  white:SkPaint;
}
export function createCctvArt(sprite:SpriteFrame|null=null):CctvArt {
  const gradient=(colors:string[],mode?:BlendMode)=>{
    const p=Skia.Paint();p.setAntiAlias(true);
    p.setShader(Skia.Shader.MakeRadialGradient({x:0,y:0},1,colors.map(c=>Skia.Color(c)),[0,.55,1],TileMode.Clamp));
    if(mode!==undefined)p.setBlendMode(mode);
    return p;
  };
  return {
    cone:{
      floor:[.28,.4,.52].map(a=>gradient([`rgba(245,173,50,${a})`,`rgba(235,147,32,${a*.7})`,'rgba(211,122,22,0.08)'])),
      hole:[.4,.5,.65].map(a=>gradient([`rgba(0,0,0,${a})`,`rgba(0,0,0,${a*.6})`,'rgba(0,0,0,0.04)'],BlendMode.DstOut)),
      edge:[.65,.8,.95].map(a=>stroke('#ffc164',1,a)),builder:Skia.PathBuilder.Make(),
    },sprite,mount:fill('#65737b'),edge:stroke('#b4c1c8',1),lens:fill('#122532'),active:fill('#ffd174'),alert:fill('#ff624c'),white:fill('#ffffff'),
  };
}
export function drawCctvDevice(c:SkCanvas,art:CctvArt,x:number,y:number,facing:number,alerted:boolean):void {
  'worklet';
  // Dome body is wall-mounted above its floor-vision origin; sweep is visible in fan/lens pointer.
  c.drawLine(x,y-9,x,y-24,art.edge);
  c.drawRect(Skia.XYWHRect(x-6,y-25,12,5),art.mount);
  if(art.sprite)drawSpriteFrame(c,art.sprite,x,y-8,28/art.sprite.sw,false,art.white);
  else {
    c.drawCircle(x,y-20,10,art.mount);c.drawCircle(x,y-20,7,art.lens);
    c.drawCircle(x+Math.cos(facing)*4,y-20+Math.sin(facing)*3,2,art.active);
  }
  c.drawCircle(x+4,y-18,2.2,alerted?art.alert:art.active);
  c.drawLine(x,y-9,x+Math.cos(facing)*7,y-9+Math.sin(facing)*5,art.edge);
}
