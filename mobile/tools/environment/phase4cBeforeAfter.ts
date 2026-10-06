/** Same-world-scale evidence pairs; offline renderer images, never device screenshots. */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const ck=await initSkiaNode(),root='Reports/V12Phase4C',out=root+'/final/before-after';fs.mkdirSync(out,{recursive:true});
 for(let chapter=1;chapter<=4;chapter++)for(let mission=1;mission<=5;mission++){
  const id=`0${chapter}-0${mission}`,a=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/before/${id}-OPEN-DebugOFF.png`))!,b=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/final/${id}-OPEN-DebugOFF.png`))!;
  const scale=.6,w=Math.ceil((a.width()+b.width())*scale)+60,h=Math.ceil(Math.max(a.height(),b.height())*scale)+100;
  const s=ck.MakeSurface(w,h)!,c=s.getCanvas(),p=new ck.Paint(),font=loadLabelFont(ck,18)!;c.clear(ck.parseColorString('#071019'));p.setColor(ck.parseColorString('#e1eef3'));
  c.drawText(`${id} BEFORE`,20,28,p,font);c.drawText(`${id} AFTER`,40+a.width()*scale,28,p,font);
  [a,b].forEach((im,i)=>c.drawImageRect(im,ck.XYWHRect(0,0,im.width(),im.height()),ck.XYWHRect(i===0?20:40+a.width()*scale,45,im.width()*scale,im.height()*scale),p));
  c.drawText('Same world scale / production renderer / Debug OFF / offline visual evidence',20,h-18,p,font);s.flush();const im=s.makeImageSnapshot();fs.writeFileSync(`${out}/${id}.png`,im.encodeToBytes()!);im.delete();a.delete();b.delete();s.delete();p.delete();font.delete();
 }
}
void main();
