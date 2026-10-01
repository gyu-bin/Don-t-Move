/** Runtime packaging only: preserve pixels/aspect, trim transparent margin and
 * encode into a standard canvas. Never paints, removes a baked background or
 * repairs a wrong perspective; those must be regenerated with imagegen. */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode} from '../sprites/skiaNode';
import {pixelDiagnostics} from './contract';
export async function normalizePng(source:string,out:string,size:number){
 if(!source||!out||![256,384,512,768].includes(size))throw Error('Usage: normalizePng.ts source.png output.png 256|384|512|768');
 const ck=await initSkiaNode(),image=ck.MakeImageFromEncoded(fs.readFileSync(source));if(!image)throw Error('Input decode failed');
 const pixels=image.readPixels(0,0,{width:image.width(),height:image.height(),colorType:ck.ColorType.RGBA_8888,alphaType:ck.AlphaType.Unpremul,colorSpace:ck.ColorSpace.SRGB}) as Uint8Array;
 const input=pixelDiagnostics(pixels,image.width(),image.height());
 if(input.transparentFraction<.01||!input.bounds)throw Error('Input is empty or opaque; regenerate true transparent PNG');
 const b=input.bounds,padding=3;
 const sx=Math.max(0,b.x-padding),sy=Math.max(0,b.y-padding),sw=Math.min(image.width(),b.x+b.w+padding)-sx,sh=Math.min(image.height(),b.y+b.h+padding)-sy;
 const scale=Math.min(size*.94/sw,size*.94/sh),w=sw*scale,h=sh*scale;
 const surface=ck.MakeSurface(size,size);if(!surface)throw Error('Canvas allocation failed');
 const canvas=surface.getCanvas(),paint=new ck.Paint();paint.setAntiAlias(true);canvas.clear(ck.TRANSPARENT);
 canvas.drawImageRect(image,ck.XYWHRect(sx,sy,sw,sh),ck.XYWHRect((size-w)/2,size*.97-h,w,h),paint);
 surface.flush();const snapshot=surface.makeImageSnapshot();
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,snapshot.encodeToBytes()!);
 const outputPixels=snapshot.readPixels(0,0,{width:size,height:size,colorType:ck.ColorType.RGBA_8888,alphaType:ck.AlphaType.Unpremul,colorSpace:ck.ColorSpace.SRGB}) as Uint8Array;
 const output=pixelDiagnostics(outputPixels,size,size);
 const metadata={path:out,resolution:{width:size,height:size},objectBounds:output.bounds,pivot:{x:.5,y:.97,units:'normalized'},source:{path:source,resolution:{width:image.width(),height:image.height()},bounds:input.bounds},diagnostics:output};
 fs.writeFileSync(out.replace(/\.png$/,'.metadata.json'),JSON.stringify(metadata,null,2)+'\n');console.log(JSON.stringify(metadata));
 snapshot.delete();surface.delete();image.delete();paint.delete();return metadata;
}
if(process.argv[1]?.endsWith('normalizePng.ts')){
 const [source,out,sizeArg]=process.argv.slice(2);void normalizePng(source,out,Number(sizeArg));
}
