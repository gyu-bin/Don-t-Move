import type {Canvas, CanvasKit, Font} from 'canvaskit-wasm';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {SECURITY_CLUSTERS} from './museumSecurityCleanup';
import {auditHideability,structureRole} from './museumHideabilityQA';
/** Offline annotation only; no production UI imports this module. */
export function drawMuseumSecurityOverlay(ck:CanvasKit,c:Canvas,def:StageDefinition,font:Font){
 const p=new ck.Paint();p.setAntiAlias(true);
 const colors=['#6dffd0','#e7bdff','#ffcd71'];
 SECURITY_CLUSTERS.forEach((cluster,i)=>{
  for(const [regionIndex,b] of cluster.regions.entries()){p.setStyle(ck.PaintStyle.Stroke);p.setStrokeWidth(2);p.setColor(ck.parseColorString(colors[i]));
  c.drawRect(ck.XYWHRect(b.x*40,b.y*40,b.w*40,b.h*40),p);
  p.setStyle(ck.PaintStyle.Fill);c.drawText(regionIndex===0?`${cluster.id}: ${['DESK','JUNCTION','RECORDS'][i]}`:cluster.id,b.x*40+3,b.y*40+15,p,font);}
 });
 const qa=auditHideability(def);
 for(const [i,prop]of def.props.entries()){
  const role=structureRole(prop.kind);if(role!=='FULL COVER'&&role!=='LOS BREAKER')continue;
  p.setColor(ck.parseColorString(role==='FULL COVER'?'#83f1ff':'#ffd67f'));
  c.drawText(`${i} ${role==='FULL COVER'?'FC':'LOS'}`,prop.x*40-12,prop.y*40+14,p,font);
 }
 for(const w of [...qa.witnesses,...qa.architecturalRefuges]){
  p.setColor(ck.parseColorString('#8affaf'));c.drawCircle(w.point.x*40,w.point.y*40,4,p);
 }
 p.delete();
}
