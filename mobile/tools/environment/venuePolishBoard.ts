/** Same-state game-renderer comparisons, not Simulator/device screenshots. */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode(),root=process.argv[2]??'Reports/VenuePolish';
 const ids=['01-02','02-05','03-05','04-02','05-05','06-04','07-02','08-05','09-03'];
 const font=loadLabelFont(ck,19)!,small=loadLabelFont(ck,12)!;
 const ink=new ck.Paint();ink.setColor(ck.parseColorString('#e6e7df'));ink.setAntiAlias(true);
 for(let page=0;page<3;page++){
  const surface=ck.MakeSurface(1120,1500)!,c=surface.getCanvas();c.clear(ck.parseColorString('#09131c'));
  c.drawText('STATIC MATERIAL / LIGHT / PROP PROJECTION',16,28,ink,font);
  c.drawText('BEFORE',16,57,ink,font);c.drawText('AFTER',576,57,ink,font);
  for(let j=0;j<3;j++){
   const id=ids[page*3+j],y=85+j*460;
   c.drawText(id,16,y,ink,font);
   const a=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/${id}/before/map.png`))!;
   const b=ck.MakeImageFromEncoded(fs.readFileSync(`${root}/${id}/after/map.png`))!;
   if(a.width()!==b.width()||a.height()!==b.height())throw Error(`Mismatched capture ${id}`);
   const scale=Math.min(530/a.width(),420/a.height());
   for(const [i,img] of [a,b].entries()){
    c.save();c.translate(16+i*560+(530-img.width()*scale)/2,y+12);c.scale(scale,scale);c.drawImage(img,0,0);c.restore();img.delete();
   }
  }
  c.drawText('Offline actual renderer, same map/state/camera. No native HUD. Not device or energy evidence.',16,1483,ink,small);
  const snap=surface.makeImageSnapshot();fs.writeFileSync(`${root}/comparison-${page+1}.png`,snap.encodeToBytes()!);snap.delete();surface.delete();
 }
 font.delete();small.delete();ink.delete();
}
void main();
