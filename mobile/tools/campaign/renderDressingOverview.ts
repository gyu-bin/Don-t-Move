import {readFileSync,writeFileSync} from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const ck=await initSkiaNode(),root=process.env.REPORT_ROOT??'Reports/MuseumDressingV1';
 const p=new ck.Paint();p.setColor(ck.parseColorString('#e6eff8'));p.setAntiAlias(true);
 const f=loadLabelFont(ck,24)!;
 const cellW=360,cellH=500;
 for(const version of ['before','after']){
  const surface=ck.MakeSurface(cellW*5,cellH*2+90)!,c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));
  c.drawText(`${process.env.REPORT_TITLE??'MUSEUM DRESSING'} | ${version.toUpperCase()} | SAME SCALE`,20,32,p,f);
  c.drawText('Actual Skia game renderer, offline. No Simulator/device claim.',20,64,p,f);
  for(let i=0;i<10;i++){
   const id=`01-${String(i+1).padStart(2,'0')}`;
   const im=ck.MakeImageFromEncoded(readFileSync(`${root}/${version}/${id}-Debug-OFF.png`))!;
   // Identical overview canvas sizes across missions preserve world-unit scale.
   const scale=Math.min(cellW/im.width(),cellH/im.height());
   c.drawImageRect(im,ck.XYWHRect(0,0,im.width(),im.height()),ck.XYWHRect((i%5)*cellW,90+Math.floor(i/5)*cellH,im.width()*scale,im.height()*scale),p);im.delete();
  }
  const im=surface.makeImageSnapshot();writeFileSync(`${root}/Museum-All10-${version}.png`,im.encodeToBytes()!);im.delete();surface.delete();
 }
 p.delete();f.delete();
}
void main();
