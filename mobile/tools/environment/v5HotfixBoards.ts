/** Diagnostic boards assembled from Debug OFF production frames; no new game art. */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const root='Reports/V5VisualHotfix',dir=`${root}/render`,ck=await initSkiaNode(),font=loadLabelFont(ck,18)!,paint=new ck.Paint();paint.setAntiAlias(true);paint.setColor(ck.parseColorString('#d9edf3'));
 const load=(p:string)=>ck.MakeImageFromEncoded(fs.readFileSync(p))!;
 const save=(s:NonNullable<ReturnType<typeof ck.MakeSurface>>,p:string)=>{s.flush();const im=s.makeImageSnapshot();fs.writeFileSync(p,im.encodeToBytes()!);im.delete();s.delete();};
 for(const id of ['01-08','02-02','02-06']){
  const before=load(`${root}/${id}-Before.png`),after=load(`${dir}/${id}-Debug-OFF.png`),w=Math.max(before.width(),after.width()),h=Math.max(before.height(),after.height());
  const s=ck.MakeSurface(w*2,h+38)!,c=s.getCanvas();c.clear(ck.parseColorString('#07121c'));c.drawText(`${id} BEFORE | Debug OFF`,12,25,paint,font);c.drawText(`${id} AFTER | Debug OFF`,w+12,25,paint,font);c.drawImage(before,0,38);c.drawImage(after,w,38);save(s,`${root}/${id}-Before-After.png`);before.delete();after.delete();
 }
 const defs=JSON.parse(fs.readFileSync('src/game/levels/stages/campaignStages.json','utf8')).filter((d:{chapter:number})=>d.chapter<=3),images=defs.map((d:{id:string})=>load(`${dir}/${d.id}-Debug-OFF.png`));
 const w=Math.ceil(Math.max(...images.map((i:ReturnType<typeof load>)=>i.width()))*.3)+18,h=Math.ceil(Math.max(...images.map((i:ReturnType<typeof load>)=>i.height()))*.3)+35;
 const s=ck.MakeSurface(w*10,h*3)!,c=s.getCanvas();c.clear(ck.parseColorString('#07121c'));images.forEach((im:ReturnType<typeof load>,i:number)=>{const x=i%10*w,y=Math.floor(i/10)*h;c.drawText(defs[i].id,x+8,y+24,paint,font);c.save();c.translate(x+8,y+35);c.scale(.3,.3);c.drawImage(im,0,0);c.restore();im.delete();});save(s,`${root}/All30-SameScale.png`);font.delete();paint.delete();
}
void main();
