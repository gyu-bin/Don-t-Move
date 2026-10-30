/** Lay out real-renderer captures for review, without retouching their pixels. */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode(),root=path.resolve(process.argv[2]??'Reports/MuseumPolish');
 const font=loadLabelFont(ck,22)!,small=loadLabelFont(ck,13)!;
 const text=new ck.Paint();text.setColor(ck.parseColorString('#e7e6dc'));text.setAntiAlias(true);
 for(const name of ['entrance','exhibition','objective','map']){
  const a=ck.MakeImageFromEncoded(fs.readFileSync(path.join(root,'before',name+'.png')))!;
  const b=ck.MakeImageFromEncoded(fs.readFileSync(path.join(root,'after',name+'.png')))!;
  const w=a.width(),h=a.height();if(w!==b.width()||h!==b.height())throw Error('Capture dimensions must match');
  const surface=ck.MakeSurface(w*2+32,h+98)!;const c=surface.getCanvas();c.clear(ck.parseColorString('#09131c'));
  c.drawText('BEFORE',8,29,text,font);c.drawText('AFTER',w+24,29,text,font);
  c.drawText('MUSEUM 01-01 / same state, camera and scale / debug OFF',8,54,text,small);
  c.drawImage(a,8,68);c.drawImage(b,w+24,68);
  c.drawText('Actual game renderer, offline capture. Not an iPhone screenshot.',8,h+88,text,small);
  const image=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,`${name}-compare.png`),image.encodeToBytes()!);
  image.delete();surface.delete();a.delete();b.delete();
 }
 text.delete();font.delete();small.delete();console.log(root);
}
void main();
