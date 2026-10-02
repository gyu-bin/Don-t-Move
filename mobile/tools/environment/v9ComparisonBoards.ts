/** Offline production renderer comparison only. Not native Simulator play evidence. */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const root='Reports/HeistV9',ck=await initSkiaNode(),font=loadLabelFont(ck,20)!,paint=new ck.Paint();
 paint.setAntiAlias(true);paint.setColor(ck.parseColorString('#d9edf3'));
 for(const id of ['02-06','02-10','03-08','03-10']){
  const before=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/offline-before/${id}-Debug-OFF.png`))!;
  const after=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/offline-candidate/${id}-Debug-OFF.png`))!;
  const w=Math.max(before.width(),after.width()),h=Math.max(before.height(),after.height());
  const surface=ck.MakeSurface(w*2,h+60)!,canvas=surface.getCanvas();canvas.clear(ck.parseColorString('#07121c'));
  canvas.drawText(`${id} BEFORE | OFFLINE renderer | Debug OFF`,12,27,paint,font);
  canvas.drawText(`${id} V9 | OFFLINE renderer | Debug OFF`,w+12,27,paint,font);
  canvas.drawText('Same world scale. Native play / CLEAR / FPS remain unverified.',12,51,paint,font);
  canvas.drawImage(before,0,60);canvas.drawImage(after,w,60);surface.flush();
  const snapshot=surface.makeImageSnapshot();fs.writeFileSync(`${root}/${id}-Offline-Before-After.png`,snapshot.encodeToBytes()!);
  snapshot.delete();surface.delete();before.delete();after.delete();
 }
 font.delete();paint.delete();
}
void main();
