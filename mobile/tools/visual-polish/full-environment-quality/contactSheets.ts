/** QA contact sheets only; source PNGs are unchanged production-renderer evidence. */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode,loadLabelFont} from '../../sprites/skiaNode';
async function main(){
 const [source,out]=process.argv.slice(2);if(!source||!out)throw Error('source and output directories required');
 const ck=await initSkiaNode(),font=loadLabelFont(ck,18),paint=new ck.Paint();paint.setColor(ck.Color(214,218,221,1));paint.setAntiAlias(true);
 fs.mkdirSync(out,{recursive:true});
 for(let ch=1;ch<=9;ch++){
  const surface=ck.MakeSurface(1500,750)!;const canvas=surface.getCanvas();canvas.clear(ck.Color(16,19,24,1));
  for(let m=1;m<=5;m++)for(const [row,view]of ['full','spawn'].entries()){
   const id=`${String(ch).padStart(2,'0')}-${String(m).padStart(2,'0')}`,file=path.join(source,`${id}-${view}.png`),im=ck.MakeImageFromEncoded(fs.readFileSync(file));if(!im)throw Error(file);
   const w=288,h=340,ratio=Math.min(w/im.width(),h/im.height()),iw=im.width()*ratio,ih=im.height()*ratio,x=(m-1)*300+6+(w-iw)/2,y=row*375+28+(h-ih)/2;
   canvas.drawImageRect(im,ck.XYWHRect(0,0,im.width(),im.height()),ck.XYWHRect(x,y,iw,ih),paint);
   if(font)canvas.drawText(`${id} ${view}`,6+(m-1)*300,22+row*375,paint,font);im.delete();
  }
  surface.flush();const im=surface.makeImageSnapshot();const png=im.encodeToBytes();if(!png)throw Error('encode');fs.writeFileSync(path.join(out,`chapter-${String(ch).padStart(2,'0')}.png`),png);im.delete();surface.delete();
 }
 font?.delete();paint.delete();
}
void main();
