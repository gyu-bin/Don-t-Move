/** Projection-envelope audit. A silhouette/footprint review remains separate from this numeric test. */
import fs from 'node:fs';
import {createRequire} from 'node:module';
import stages from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {PROP_KIT} from '../../src/game/world/propKit';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {propRenderWidth} from '../../src/rendering/environment/propRenderWidth';
const req=createRequire(import.meta.url);req.extensions['.png']=m=>{m.exports=0;};
const {environmentAssetForProp,ENVIRONMENT_ASSETS}=req('../../src/assets/environmentKit');
const rows=[];
for(const def of stages as StageDefinition[]){
 const stage=compileStage(def),findings:string[]=[],corrected:string[]=[];let checked=0,transparent=0;
 for(let i=0;i<def.props.length;i++){
  const p=def.props[i],spec=PROP_KIT[p.kind];if(!spec.blocksMovement)continue;
  const id=environmentAssetForProp(def,stage.props[i]),asset=ENVIRONMENT_ASSETS.find((a:{id:string})=>a.id===id);
  if(!asset){if(p.kind.startsWith('galleryGlass')){transparent++;continue;}findings.push(`${i}/${p.kind}: no reviewed bitmap envelope`);continue;}
  const b=asset.objectBounds??{w:asset.resolution.width,h:asset.resolution.height};
  const physical=p.collisionScale??1,drawW=propRenderWidth(p,{sw:b.w,sh:b.h,ax:b.w*asset.pivot.x,ay:b.h*asset.pivot.y});
  const pivot=asset.pivot,x=p.x*TILE,y=p.y*TILE-spec.mountHeight;
  const bodyW=spec.footprint.w*TILE*physical,bodyH=spec.footprint.h*TILE*physical;
  const outside=(width:number)=>{
   const height=width*b.h/b.w,left=x-(p.flip?1-pivot.x:pivot.x)*width,right=left+width,top=y-pivot.y*height,bottom=top+height;
   return p.x*TILE-bodyW/2<left-1||p.x*TILE+bodyW/2>right+1||p.y*TILE-bodyH<top-1||p.y*TILE>bottom+1;
  };
  if(outside(spec.drawWidth*TILE*(p.scale??1))&&!outside(drawW))corrected.push(`${i}/${id}`);
  if(outside(drawW))
   findings.push(`${i}/${id}: collision extends outside projected bitmap bounds`);
  checked++;
 }
 rows.push({id:def.id,checked,transparentModules:transparent,corrected,findings});
}
const report={method:'Actual runtime asset selection, crop/pivot, draw width, physical scale and floor footprint; one-world-unit raster allowance. Checks bounds, not alpha silhouettes, occlusion height, or visual approval. Transparent glass retains its technical renderer and PASS LOS.',rows};
fs.writeFileSync('docs/reports/performance/placement-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.filter(r=>r.findings.length)));console.log(rows.reduce((n,r)=>n+r.checked,0),'solid props checked');
process.exitCode=rows.some(r=>r.findings.length)?1:0;
