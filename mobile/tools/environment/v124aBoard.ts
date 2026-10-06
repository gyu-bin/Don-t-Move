import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const ck=await initSkiaNode(),dir='Reports/V12Phase4A/visual';
 const board=ck.MakeSurface(2100,740)!,c=board.getCanvas(),p=new ck.Paint(),font=loadLabelFont(ck,19)!;
 c.clear(ck.parseColorString('#071019'));p.setColor(ck.parseColorString('#d3e5ed'));
 c.drawText('PHASE4A | OFFLINE PRODUCTION SKIA | DEBUG OFF | NOT SIMULATOR CAPTURES',20,30,p,font);
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('-OPEN-DebugOFF.png')).sort();
 const images=files.map(f=>ck.MakeImageFromEncoded(fs.readFileSync(`${dir}/${f}`))!);
 const scale=Math.min(405/Math.max(...images.map(i=>i.width())),300/Math.max(...images.map(i=>i.height())));
 files.forEach((f,i)=>{const im=images[i];const w=im.width()*scale,h=im.height()*scale,x=i%5*420+(420-w)/2,y=55+Math.floor(i/5)*340;
 c.drawImageRect(im,ck.XYWHRect(0,0,im.width(),im.height()),ck.XYWHRect(x,y,w,h),p);c.drawText(f.slice(0,5),i%5*420+15,y+324,p,font);im.delete();});
 board.flush();const image=board.makeImageSnapshot();fs.writeFileSync(`${dir}/ten-mission-overview.png`,image.encodeToBytes()!);image.delete();board.delete();p.delete();font.delete();
}
void main();
