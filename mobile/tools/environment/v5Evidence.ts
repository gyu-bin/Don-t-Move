/** V5 pixel evidence from actual Debug OFF captures; overlays never certify quality. */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
async function main(){
 const campaign=process.env.CAMPAIGN_JSON??'Reports/LevelDesignV5/before/campaignStages.json';
 const dir=process.env.OUT_DIR??'Reports/LevelDesignV5/before/render';
 const defs=(JSON.parse(fs.readFileSync(campaign,'utf8')) as StageDefinition[]).filter(d=>(d.chapter??0)<=3);
 const metadata=JSON.parse(fs.readFileSync(path.join(dir,'static-coverage-metadata.json'),'utf8'));
 const ck=await initSkiaNode(),font=loadLabelFont(ck,14)!;Object.assign(globalThis,{__DEV__:false});
 const {TILE,compileStage}=require('../../src/game/world/compileStage');
 const paint=new ck.Paint();paint.setAntiAlias(true);paint.setColor(ck.parseColorString('#f2eadc'));
 const save=(s:ReturnType<typeof ck.MakeSurface>,name:string)=>{if(!s)throw Error(name);s.flush();const im=s.makeImageSnapshot();fs.writeFileSync(path.join(dir,name),im.encodeToBytes()!);im.delete();s.delete();};
 const records:unknown[]=[];
 for(const d of defs){
  const stage=compileStage(d),im=ck.MakeImageFromEncoded(fs.readFileSync(path.join(dir,`${d.id}-Debug-OFF.png`)))!;
  const crop=ck.MakeSurface(400,400)!;const c=crop.getCanvas();c.clear(ck.parseColorString('#070c12'));
  const ox=d.objective!.x*TILE,oy=d.objective!.y*TILE+40;
  c.drawImage(im,200-ox,200-oy);c.drawText(`${d.id} OBJECTIVE | actual pixels | world scale 1`,8,22,paint,font);save(crop,`${d.id}-Objective-Crop.png`);
  const row=metadata.missions.find((r:{mission:string})=>r.mission===d.id);
  const routes=[...(d.testRoutes??[]),...(d.escapeRoutes??[])];
  const distance=(x:number,y:number,a:{x:number;y:number},b:{x:number;y:number})=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);};
  const nearRoute=(x:number,y:number)=>routes.some(r=>r.points.slice(1).some((b,i)=>distance(x,y,r.points[i],b)<1.1));
  const decorative=new Set(['lamp','painting','plant','bankPlant','bankMonitor','bankClock','bankPaperwork','bankFloorMarker','cctv']);
  const major=d.props.filter(p=>!decorative.has(p.kind));
  const candidates=row.cells.filter((p:{x:number;y:number;guard:boolean;cctv:boolean})=>!p.guard&&!p.cctv&&!nearRoute(p.x,p.y)&&!major.some(m=>Math.hypot(m.x-p.x,m.y-p.y)<2.2)&&Math.hypot(d.objective!.x-p.x,d.objective!.y-p.y)>2);
  const mask=new Set<string>(candidates.map((p:{x:number;y:number})=>`${p.x},${p.y}`));const components:{cells:string[];size:number}[]=[];
  while(mask.size){const first=mask.values().next().value!;mask.delete(first);const queue=[first];for(let i=0;i<queue.length;i++){const [x,y]=queue[i].split(',').map(Number);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const k=`${x+dx},${y+dy}`;if(mask.delete(k))queue.push(k);}}if(queue.length>=6)components.push({cells:queue,size:queue.length});}
  const heat=ck.MakeSurface(im.width(),im.height()+42)!;const hc=heat.getCanvas();hc.clear(ck.parseColorString('#07121c'));hc.drawImage(im,0,0);
  const p=new ck.Paint();p.setColor(ck.parseColorString('rgba(255,92,55,.55)'));
  for(const comp of components)for(const key of comp.cells){const[x,y]=key.split(',').map(Number);hc.drawRect(ck.XYWHRect((x-.5)*TILE,(y-.5)*TILE+40,TILE,TILE),p);}
  hc.drawText('EMPTY CANDIDATE: no nearby major, potential security, objective or route',8,im.height()+20,paint,font);hc.drawText('Authored Main/Safe/Risk/Escape envelopes excluded; requires manual review',8,im.height()+38,paint,font);save(heat,`${d.id}-Empty-Candidates.png`);p.delete();
  const sil=ck.MakeSurface(Math.ceil(stage.width*.2),Math.ceil(stage.height*.2)+24)!;const sc=sil.getCanvas();sc.clear(ck.parseColorString('#07121c'));sc.drawText(d.id,4,17,paint,font);sc.save();sc.translate(0,24);sc.scale(.2,.2);const fp=new ck.Paint();fp.setColor(ck.parseColorString('#b8d9e4'));d.layout.forEach((line,y)=>[...line].forEach((v,x)=>{if(v==='.')sc.drawRect(ck.XYWHRect(x*TILE,y*TILE,TILE,TILE),fp);}));sc.restore();save(sil,`${d.id}-Silhouette-20pct.png`);fp.delete();im.delete();
  records.push({mission:d.id,sourceSha256:createHash('sha256').update(JSON.stringify(d)).digest('hex'),objectiveCrop:{width:400,height:400,scale:1,x:ox-200,y:oy-200},emptyCandidateComponents:components,method:'Potential coverage mask excludes authored route envelopes, not actual human input; empty candidates are review leads, never automatic failure.'});
 }
 for(const ch of [1,2,3])for(const layer of ['Objective-Crop','Silhouette-20pct']){
  const ims=defs.filter(d=>d.chapter===ch).map(d=>ck.MakeImageFromEncoded(fs.readFileSync(path.join(dir,`${d.id}-${layer}.png`)))!);
  const w=Math.max(...ims.map(i=>i.width()))+12,h=Math.max(...ims.map(i=>i.height()))+12,s=ck.MakeSurface(w*5,h*2)!;s.getCanvas().clear(ck.parseColorString('#07121c'));ims.forEach((im,i)=>s.getCanvas().drawImage(im,i%5*w,Math.floor(i/5)*h));save(s,`Chapter-${String(ch).padStart(2,'0')}-All10-${layer}.png`);ims.forEach(i=>i.delete());
 }
 fs.writeFileSync(path.join(dir,'v5-evidence.json'),JSON.stringify({campaign,records},null,2)+'\n');paint.delete();font.delete();console.log(dir);
}
void main();
