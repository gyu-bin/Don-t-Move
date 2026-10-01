import type {Canvas, CanvasKit, Font} from 'canvaskit-wasm';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {describeMuseumDesign} from './museumFinalDesign';
import {auditCentralCover} from './museumCentralCoverQA';

type Point = {x:number;y:number};
/** Offline geometry witness annotation. Never used by production UI. */
export function drawMuseumCentralOverlay(ck:CanvasKit,c:Canvas,def:StageDefinition,font:Font){
 const qa=auditCentralCover(def),design=describeMuseumDesign(def);
 const pen=new ck.Paint();pen.setAntiAlias(true);
 const color=(v:string,stroke=false,width=2)=>{pen.setColor(ck.parseColorString(v));pen.setStyle(stroke?ck.PaintStyle.Stroke:ck.PaintStyle.Fill);pen.setStrokeWidth(width);};
 const label=(text:string,x:number,y:number,tint:string)=>{x=Math.max(2,Math.min(x,def.layout[0].length*40-text.length*7.9-3));color('#07131eeb');c.drawRect(ck.XYWHRect(x-2,y-13,text.length*7.9+4,17),pen);color(tint);c.drawText(text,x,y,pen,font);};
 const line=(points:Point[],tint:string,width=2)=>{color(tint,true,width);for(let i=1;i<points.length;i++)c.drawLine(points[i-1].x*40,points[i-1].y*40,points[i].x*40,points[i].y*40,pen);};
 const isCentral=(p:Point)=>design.zones.some(z=>(z.regions??[z.bounds]).some(b=>p.x>=b.x+b.w*.225&&p.x<b.x+b.w*.775&&p.y>=b.y+b.h*.225&&p.y<b.y+b.h*.775));
 for(const [i,z]of design.zones.entries()){
  for(const b of z.regions??[z.bounds]){
   color('#55e8ee22');c.drawRect(ck.XYWHRect((b.x+b.w*.225)*40,(b.y+b.h*.225)*40,b.w*.55*40,b.h*.55*40),pen);
   color('#55e8ee88',true,1);c.drawRect(ck.XYWHRect((b.x+b.w*.225)*40,(b.y+b.h*.225)*40,b.w*.55*40,b.h*.55*40),pen);
  }
  const metric=qa.zones.find(m=>m.id===z.id);
  label(`${String.fromCharCode(65+i)} C${metric?.centralCover??0}/E${metric?.edgeCover??0}`,z.bounds.x*40+4,z.bounds.y*40+16,'#e5edf5');
 }
 for(const p of def.props){
  const k=PROP_KIT[p.kind];if(!k.blocksVision)continue;
  const scale=p.collisionScale??1,central=isCentral(p),tint=central?'#51f4ec':'#ffd07e';
  color(tint,true,2.7);c.drawRect(ck.XYWHRect((p.x-k.footprint.w*scale/2)*40,(p.y-k.footprint.h*scale)*40,k.footprint.w*scale*40,k.footprint.h*scale*40),pen);
  label(central?'C':'E',p.x*40-4,p.y*40+13,tint);
 }
 const chain=qa.hideChain as (typeof qa.hideChain[number]&{nearestHidePath?:Point[]})[];
 for(const h of chain){
  if(h.nearestHidePath?.length)line(h.nearestHidePath,'#b5faad88',1.1);
  color('#b5faad');c.drawCircle(h.point.x*40,h.point.y*40,3.8,pen);
 }
 for(const g of qa.gaps){
  const tint=g.bodyPassable?'#ffb547':'#ff385a';line([g.from,g.to],tint,4);
  label(`${g.bodyPassable?'TILT':'GAP'} ${g.width.toFixed(2)}`,g.from.x*40+3,g.from.y*40-6,tint);
 }
 const routes=qa.routeMetrics as (typeof qa.routeMetrics[number]&{maxPotentialExposurePath?:Point[]})[];
 const longest=routes.reduce<typeof routes[number]|null>((a,b)=>!a||b.maxPotentialExposureTiles>a.maxPotentialExposureTiles?b:a,null);
 if(longest?.maxPotentialExposurePath?.length){
  line(longest.maxPotentialExposurePath,'#ff80e6cc',4);
  const p=longest.maxPotentialExposurePath[Math.floor(longest.maxPotentialExposurePath.length/2)];
  label(`ANCHOR LOS ${longest.maxPotentialExposureTiles.toFixed(1)}t`,p.x*40+4,p.y*40,'#ff80e6');
 }
 pen.delete();
}
