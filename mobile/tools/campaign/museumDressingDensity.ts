/** Visual-density warning metrics, never an automatic placement target or gameplay approval. */
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {DRESSING_KIT} from '../../src/game/world/dressingKit';
import {describeMuseumDesign} from './museumFinalDesign';
type Point={x:number;y:number};
const round=(v:number)=>Math.round(v*1000)/1000;
function segmentDistance(p:Point,a:Point,b:Point){const dx=b.x-a.x,dy=b.y-a.y,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/d)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
export function measureDressingDensity(before:StageDefinition,after:StageDefinition){
 const compiled=compileStage(before),design=describeMuseumDesign(after);
 const paths=[...before.testRoutes??[],...before.escapeRoutes??[],...before.patrolRoutes];
 const segments=paths.flatMap(r=>r.points.slice(1).map((b,i)=>[r.points[i],b]));
 const items=(after.dressing??[]).flatMap(c=>c.items),existing=before.props;
 const near=(p:Point,points:Point[])=>points.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<=1.25);
 const projected=items.map(p=>{const k=DRESSING_KIT[p.kind],s=p.scale??1;return{x:p.x-k.drawWidth*s/2,y:p.y-k.mountHeight/TILE-k.drawHeight*s,w:k.drawWidth*s,h:k.drawHeight*s};});
 const inside=(p:Point,b:{x:number;y:number;w:number;h:number})=>p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h;
 const samples:Point[]=[];
 for(let y=0;y<before.layout.length;y++)for(let x=0;x<before.layout[y].length;x++)if(before.layout[y][x]==='.')for(const oy of [.25,.75])for(const ox of [.25,.75]){
  const p={x:x+ox,y:y+oy};if(clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,compiled.movementBlockers,BODY.playerRadius))samples.push(p);
 }
 const zones=design.zones.map(z=>{
  const floor=samples.filter(p=>(z.regions??[z.bounds]).some(b=>inside(p,b)));
  // 0.75-tile buffer includes body width and observation/overshoot allowance. Never label it wasted floor.
  const protectedSamples=floor.filter(p=>segments.some(([a,b])=>segmentDistance(p,a,b)<=.75));
  const available=floor.filter(p=>!segments.some(([a,b])=>segmentDistance(p,a,b)<=.75));
  const clusters=(after.dressing??[]).filter(c=>c.zoneId===z.id),zoneItems=clusters.flatMap(c=>c.items);
  const ratio=(n:number,total:number)=>total?round(n/total):0;
  const beforePresence=available.filter(p=>near(p,existing)).length,afterPresence=available.filter(p=>near(p,[...existing,...items])).length;
  const empty=ratio(available.length-afterPresence,available.length);
  return{id:z.id,name:z.name,clusters:clusters.length,soft:zoneItems.filter(p=>DRESSING_KIT[p.kind].category==='soft').length,decoration:zoneItems.filter(p=>DRESSING_KIT[p.kind].category==='decoration').length,accentLights:clusters.filter(c=>c.light).length,
   sampledBodyClearFloorTiles:floor.length/4,protectedRouteFloorTiles:protectedSamples.length/4,nonRouteFloorTiles:available.length/4,
   beforeVisualProximityCoverage:ratio(beforePresence,available.length),afterVisualProximityCoverage:ratio(afterPresence,available.length),afterDistantFromExhibitsFraction:empty,
   dressingProjectedBoxCoverage:ratio(floor.filter(p=>projected.some(b=>inside(p,b))).length,floor.length),
   warning:available.length/4>=12&&empty>.65?'Large off-route floor remains more than 1.25 tiles from an exhibit/detail; inspect visual composition.':null};
 });
 return {id:after.id,zones};
}
export function writeDressingDensity(){
 const before:StageDefinition[]=JSON.parse(readFileSync('Reports/MuseumDressingV1/before/campaignStages.json','utf8'));
 const report={method:[
  'Samples four positions per floor tile, filtered by baseline player-radius clearance. This is a plan-space sampling estimate, not rendered-pixel segmentation.',
  'Protected floor is within 0.75 tiles of authored player route or patrol waypoint segment. Non-route floor may still serve chase/search; this buffer is not exhaustive runtime path occupancy.',
  'Visual proximity is the fraction of non-route samples within 1.25 tiles of existing prop or dressing base anchors. It indicates composition spacing, not actual sprite coverage, lighting brightness, occlusion or physical occupancy.',
  'Projected-box coverage uses dressing kit drawWidth/drawHeight/mountHeight rectangles over sampled floor. Rectangular bounds include transparent pixels; atlas cropping/perspective may differ. Existing props are excluded from this secondary metric.',
  'Large-zone warning: at least 12 sampled non-route tiles and more than 65% farther than 1.25 tiles from visual anchors. Thresholds are review aids, never automatic generation rules.',
  'Cluster/item/light counts follow authored zone IDs. No gameplay safety or artistic quality claim follows from these numbers.'
 ],missions:campaignStages.filter(s=>s.chapter===1).map(s=>measureDressingDensity(before.find(b=>b.id===s.id)!,s))};
 mkdirSync('Reports/MuseumDressingV1',{recursive:true});writeFileSync('Reports/MuseumDressingV1/visual-density.json',JSON.stringify(report,null,2)+'\n');
 const rows=report.missions.flatMap(m=>m.zones.map(z=>`|${z.id} ${z.name}|${z.clusters}|${z.soft}/${z.decoration}/${z.accentLights}|${z.protectedRouteFloorTiles}/${z.sampledBodyClearFloorTiles}|${Math.round(z.beforeVisualProximityCoverage*100)}% → ${Math.round(z.afterVisualProximityCoverage*100)}%|${z.warning??'—'}|`));
 writeFileSync('Reports/MuseumDressingV1/visual-density.md',['# Museum dressing — visual-density review','','These are spatial proxies, not proof of final visual quality.','',...report.method.map(s=>'- '+s),'','|Zone|Clusters|Soft/decor/light|Protected/body-clear tiles|Off-route visual proximity before→after|Review warning|','|---|---:|---:|---:|---:|---|',...rows,''].join('\n'));
 return report;
}
if(process.argv[1]?.endsWith('museumDressingDensity.ts'))console.log(JSON.stringify(writeDressingDensity().missions.map(m=>({id:m.id,warnings:m.zones.filter(z=>z.warning).map(z=>z.name)})),null,2));
