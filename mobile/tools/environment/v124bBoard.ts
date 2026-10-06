import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const ck=await initSkiaNode(),dir='Reports/V12Phase4B/visual';
 const board=ck.MakeSurface(2100,410)!,c=board.getCanvas(),p=new ck.Paint(),font=loadLabelFont(ck,19)!;
 c.clear(ck.parseColorString('#071019'));p.setColor(ck.parseColorString('#d3e5ed'));
 c.drawText('PHASE4B | OFFLINE PRODUCTION SKIA | DEBUG OFF | NOT SIMULATOR CAPTURES',20,30,p,font);
 const chapter=process.env.QA_CHAPTER??'1';
 const files=fs.readdirSync(dir).filter(f=>f.startsWith(chapter.padStart(2,'0')+'-')&&f.endsWith('-OPEN-DebugOFF.png')).sort();
 const images=files.map(f=>ck.MakeImageFromEncoded(fs.readFileSync(`${dir}/${f}`))!);
 // Fixed 0.17 overview pixels/world pixel across every chapter, including partial review boards.
 const scale=.17;
 if(images.some(i=>i.width()*scale>405||i.height()*scale>300))throw Error('Common-scale board canvas must be enlarged, never rescale just one chapter');
 files.forEach((f,i)=>{const im=images[i];const w=im.width()*scale,h=im.height()*scale,x=i%5*420+(420-w)/2,y=55+Math.floor(i/5)*340;
 c.drawImageRect(im,ck.XYWHRect(0,0,im.width(),im.height()),ck.XYWHRect(x,y,w,h),p);c.drawText(f.slice(0,5),i%5*420+15,y+324,p,font);im.delete();});
 board.flush();const image=board.makeImageSnapshot();fs.writeFileSync(`${dir}/chapter-${chapter.padStart(2,'0')}-overview.png`,image.encodeToBytes()!);image.delete();board.delete();p.delete();font.delete();
}
void main();
