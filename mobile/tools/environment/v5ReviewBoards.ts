/** Compose inspected screenshots and actual temporal evidence, never create game art. */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
const root='Reports/LevelDesignV5',dir=`${root}/final/render`;
async function main(){
 const ck=await initSkiaNode(),font=loadLabelFont(ck,18)!,paint=new ck.Paint();paint.setAntiAlias(true);paint.setColor(ck.parseColorString('#d9edf3'));
 const load=(file:string)=>ck.MakeImageFromEncoded(fs.readFileSync(file))!;
 const save=(s:NonNullable<ReturnType<typeof ck.MakeSurface>>,name:string)=>{s.flush();const im=s.makeImageSnapshot();fs.writeFileSync(`${dir}/${name}.png`,im.encodeToBytes()!);im.delete();s.delete();};
 // Constant world scale across every map and before/after pair.
 const ids=['01-05','02-06','03-10'];
 const pairs=ids.map(id=>({id,b:load(`${root}/before/render/${id}-Debug-OFF.png`),a:load(`${dir}/${id}-Debug-OFF.png`)}));
 const scale=.4,cw=Math.ceil(Math.max(...pairs.flatMap(p=>[p.a.width(),p.b.width()]))*scale)+24,ch=Math.ceil(Math.max(...pairs.flatMap(p=>[p.a.height(),p.b.height()]))*scale)+50;
 const s=ck.MakeSurface(cw*2,ch*pairs.length)!;s.getCanvas().clear(ck.parseColorString('#07121c'));
 pairs.forEach((p,i)=>{for(const[im,j,label]of[[p.b,0,'BEFORE'],[p.a,1,'AFTER']]as const){const c=s.getCanvas();c.drawText(`${p.id} ${label} | same world scale .4`,j*cw+10,i*ch+24,paint,font);c.save();c.translate(j*cw+10,i*ch+38);c.scale(scale,scale);c.drawImage(im,0,0);c.restore();}p.a.delete();p.b.delete();});save(s,'Representative-Before-After');
 const ids30=Array.from({length:30},(_,i)=>`${Math.floor(i/10)+1}`.padStart(2,'0')+'-'+`${i%10+1}`.padStart(2,'0'));
 const images=ids30.map(id=>load(`${dir}/${id}-Debug-OFF.png`));const tileW=Math.ceil(Math.max(...images.map(i=>i.width()))*.25)+24,tileH=Math.ceil(Math.max(...images.map(i=>i.height()))*.25)+40;
 const overview=ck.MakeSurface(tileW*10,tileH*3)!;overview.getCanvas().clear(ck.parseColorString('#07121c'));
 images.forEach((im,i)=>{const c=overview.getCanvas(),x=i%10*tileW,y=Math.floor(i/10)*tileH;c.drawText(ids30[i],x+8,y+24,paint,font);c.save();c.translate(x+8,y+36);c.scale(.25,.25);c.drawImage(im,0,0);c.restore();im.delete();});save(overview,'All30-SameScale');
 const temporal=JSON.parse(fs.readFileSync(`${root}/final/temporal/temporal-search.json`,'utf8'));
 for(const row of temporal){const im=load(`${dir}/${row.id}-Debug-OFF.png`),surface=ck.MakeSurface(im.width(),im.height()+70)!,c=surface.getCanvas();c.clear(ck.parseColorString('#07121c'));c.drawImage(im,0,0);const run=row.runs[1];
  for(const[cells,color]of[[run.guardCoveredTiles,'rgba(235,100,95,.22)'],[run.cameraCoveredTiles,'rgba(240,190,50,.25)']]as const){paint.setColor(ck.parseColorString(color));for(const key of cells){const[x,y]=key.split(',').map(Number);c.drawRect(ck.XYWHRect((x-.5)*40,(y-.5)*40+40,40,40),paint);}}
  paint.setColor(ck.parseColorString('#d9edf3'));c.drawText(`${row.id} actual 90s empty-case circulation | sampled 1Hz`,8,im.height()+24,paint,font);c.drawText(`red Guard sight / amber CCTV | theft at ${run.theftAt.toFixed(2)}s`,8,im.height()+48,paint,font);save(surface,`${row.id}-Temporal-Theft-Coverage`);im.delete();
 }
 paint.delete();font.delete();
}
void main();
