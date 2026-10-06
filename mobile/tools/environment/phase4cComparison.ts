import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){const ck=await initSkiaNode(),dir='Reports/V12Phase4C/final',s=ck.MakeSurface(2200,1050)!,c=s.getCanvas(),p=new ck.Paint(),font=loadLabelFont(ck,24)!;c.clear(ck.parseColorString('#071019'));p.setColor(ck.parseColorString('#cce5e9'));
 c.drawText('CHAPTER 1–4 / SAME WORLD SCALE / ACTUAL RUNTIME SKIA / DEBUG OFF',24,38,p,font);
 ['01-05','02-05','03-05','04-05'].forEach((id,i)=>{const im=ck.MakeImageFromEncoded(fs.readFileSync(`${dir}/${id}-OPEN-DebugOFF.png`))!,scale=.34;const x=i*550+(550-im.width()*scale)/2,y=100;c.drawImageRect(im,ck.XYWHRect(0,0,im.width(),im.height()),ck.XYWHRect(x,y,im.width()*scale,im.height()*scale),p);c.drawText(id+' '+['Museum','Gallery','Bank','Lab'][i],i*550+24,75,p,font);im.delete();});
 c.drawText('Offline production renderer. Simulator play evidence is stored separately.',24,1000,p,font);s.flush();const im=s.makeImageSnapshot();fs.writeFileSync(`${dir}/four-chapter-comparison.png`,im.encodeToBytes()!);im.delete();s.delete();p.delete();font.delete();}
void main();
