import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {deflateSync} from 'node:zlib';
function rgbPng(rgba,w,h){
 const chunk=(name,data)=>{
  const type=Buffer.from(name),payload=Buffer.concat([type,data]);let crc=0xffffffff;
  for(const b of payload){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);type.copy(out,4);data.copy(out,8);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;
 };
 const header=Buffer.alloc(13);header.writeUInt32BE(w);header.writeUInt32BE(h,4);header[8]=8;header[9]=2;
 const rows=Buffer.alloc(h*(1+w*3));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let c=0;c<3;c++)rows[y*(1+w*3)+1+x*3+c]=rgba[(y*w+x)*4+c];
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
const require=createRequire(import.meta.url);
const init=require('canvaskit-wasm');
const ck=await init({locateFile:f=>path.join(path.dirname(require.resolve('canvaskit-wasm/bin/canvaskit.wasm')),f)});
const surface=ck.MakeSurface(256,256),canvas=surface.getCanvas(),paint=new ck.Paint();
paint.setAntiAlias(true);canvas.clear(ck.TRANSPARENT);
const diamond=ck.Path.MakeFromSVGString('M 80 105 L 100 80 L 156 80 L 176 105 L 128 158 Z');
paint.setColor(ck.Color(255,244,214));canvas.drawPath(diamond,paint);
paint.setColor(ck.Color(62,197,255));canvas.drawRect(ck.XYWHRect(101,177,54,3),paint);
surface.flush();
fs.writeFileSync(new URL('../assets/branding/splash-mark.png',import.meta.url),surface.makeImageSnapshot().encodeToBytes());
diamond.delete();paint.delete();surface.delete();

// Packaging of the supplied approved artwork: no redraw or color changes.
// Remove the presentation margin/01, retain its rounded artwork within navy padding.
const reference=ck.MakeImageFromEncoded(fs.readFileSync(new URL('../assets/branding/icon-reference.png',import.meta.url)));
for(const [file,side] of [['app-icon.png',900],['adaptive-foreground.png',610]]){
 const s=ck.MakeSurface(1024,1024),c=s.getCanvas(),p=new ck.Paint();
 c.clear(ck.Color(8,24,36));p.setAntiAlias(true);
 const x=(1024-side)/2,h=side*424/456,y=(1024-h)/2,rect=ck.XYWHRect(x,y,side,h);
 c.save();c.clipRRect(ck.RRectXY(rect,side*0.22,h*0.22),ck.ClipOp.Intersect,true);
 c.drawImageRect(reference,ck.XYWHRect(40,14,456,424),rect,p);c.restore();s.flush();
 const image=s.makeImageSnapshot();
 const pixels=image.readPixels(0,0,{width:1024,height:1024,colorType:ck.ColorType.RGBA_8888,alphaType:ck.AlphaType.Unpremul,colorSpace:ck.ColorSpace.SRGB});
 fs.writeFileSync(new URL('../assets/branding/'+file,import.meta.url),rgbPng(pixels,1024,1024));
 image.delete();
 p.delete();s.delete();
}
reference.delete();
