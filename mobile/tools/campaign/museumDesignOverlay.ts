import type {Canvas,CanvasKit,Font} from 'canvaskit-wasm';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {describeMuseumDesign} from './museumFinalDesign';
import {auditHideability,structureRole} from './museumHideabilityQA';

/** Diagnostic overlay only. Uses compiled-geometry witnesses; no runtime UI changes. */
export function drawMuseumDesignOverlay(ck:CanvasKit,c:Canvas,def:StageDefinition,font:Font){
 const colors=['#82b4ff','#c591ed','#e8c27a','#77c8b0','#ee9c95','#c5d37e'];
 const pen=new ck.Paint();pen.setAntiAlias(true);
 const label=(text:string,x:number,y:number,color:string)=>{pen.setStyle(ck.PaintStyle.Fill);pen.setColor(ck.parseColorString('#08131ee6'));c.drawRect(ck.XYWHRect(x-3,y-16,text.length*8.5+6,20),pen);pen.setColor(ck.parseColorString(color));c.drawText(text,x,y,pen,font);};
 const design=describeMuseumDesign(def);
 for(const [i,z] of design.zones.entries()){
  pen.setColor(ck.parseColorString(colors[i]));pen.setStyle(ck.PaintStyle.Stroke);pen.setStrokeWidth(1.3);
  for(const b of z.regions??[z.bounds])c.drawRect(ck.XYWHRect(b.x*40,b.y*40,b.w*40,b.h*40),pen);
  label(`${String.fromCharCode(65+i)} ${z.name}`,z.bounds.x*40+5,z.bounds.y*40+17,colors[i]);
 }
 for(const p of def.props){const role=structureRole(p.kind);if(role!=='FULL COVER'&&role!=='LOS BREAKER')continue;
  const k=PROP_KIT[p.kind],s=p.collisionScale??1;pen.setStyle(ck.PaintStyle.Stroke);pen.setStrokeWidth(2.4);pen.setColor(ck.parseColorString(role==='FULL COVER'?'#55edee':'#ffc46c'));
  c.drawRect(ck.XYWHRect((p.x-k.footprint.w*s/2)*40,(p.y-k.footprint.h*s)*40,k.footprint.w*s*40,k.footprint.h*s*40),pen);
 }
 const qa=auditHideability(def);
 for(const w of [...qa.witnesses,...qa.architecturalRefuges]){
  pen.setStyle(ck.PaintStyle.Fill);pen.setColor(ck.parseColorString(w.escapePocket?'#8fff8a':'#ffffff'));c.drawCircle(w.point.x*40,w.point.y*40,4,pen);
 }
 pen.delete();
}
