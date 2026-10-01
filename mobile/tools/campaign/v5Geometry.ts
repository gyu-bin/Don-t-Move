/** Necessary technical gates; explicitly not a visual-quality certificate. */
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import fs from 'node:fs';
import type {EnvironmentAssetSpec} from '../../src/assets/environmentKit';
const ENVIRONMENT_ASSETS:EnvironmentAssetSpec[]=JSON.parse(fs.readFileSync('assets/environment/environment-assets.json','utf8')).assets;
export function auditV5Geometry(def:StageDefinition){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),issues:string[]=[];
 const routeResults=[...def.testRoutes??[],...def.escapeRoutes??[]].map(r=>({name:r.name,segments:r.points.slice(1).map((b,i)=>{const a=r.points[i];const body=clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,BODY.playerRadius);const tiltMargin=clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,18);if(!body||!tiltMargin)issues.push(`${r.name}: blocked leg${i} body=${body} radius18=${tiltMargin}`);return {a,b,body,tiltMargin};})}));
 const anchors=stage.guards.flatMap(g=>[...g.route,...g.theftPosts??[],...g.theftSearchSectors?.flatMap(s=>s.anchors)??[]].map(p=>{const route=findPath(nav,g.x,g.y,p.x,p.y);const reachable=clearSegment(p.x,p.y,p.x,p.y,stage.movementBlockers,BODY.guardRadius)&&route.length>=2&&Math.hypot(route.at(-2)!-p.x,route.at(-1)!-p.y)<.1;if(!reachable)issues.push(`${g.id}: unreachable compiled patrol/search target ${p.x/TILE},${p.y/TILE}`);return{guard:g.id,target:p,reachable};}));
 const family=def.chapter===1?'museum':def.chapter===2?'gallery':'bank';
 const foreignAssets=def.props.filter(p=>{
  const explicitFamily=/^(museum|gallery|bank|lab|casino)[A-Z]/.exec(p.kind)?.[1];
  if(explicitFamily&&explicitFamily!==family)return true;
  // Generic physics proxies (lamp, counter, objectiveCase) are shared. An
  // explicitly approved artwork determines their rendered chapter family.
  return !!p.visualAssetId&&ENVIRONMENT_ASSETS.find(a=>a.id===p.visualAssetId)?.chapter!==family;
 }).map(p=>({kind:p.kind,id:p.visualAssetId??p.kind}));
 for(const cluster of def.dressing??[])for(const item of cluster.items)if(item.visualAssetId&&ENVIRONMENT_ASSETS.find(a=>a.id===item.visualAssetId)?.chapter!==family)foreignAssets.push({kind:item.kind as typeof def.props[number]['kind'],id:item.visualAssetId});
 for(const p of foreignAssets)issues.push(`Foreign asset ${p.id}`);
 const portals=[def.entryPosition??def.playerSpawn,def.objective!,def.exitPosition??{x:def.exit!.x+def.exit!.w/2,y:def.exit!.y+def.exit!.h/2}];
 const portalReachability=portals.slice(1).map(p=>{const r=findPath(nav,portals[0].x*TILE,portals[0].y*TILE,p.x*TILE,p.y*TILE);const ok=r.length>=2&&Math.hypot(r.at(-2)!-p.x*TILE,r.at(-1)!-p.y*TILE)<.1;if(!ok)issues.push(`Unreachable objective/exit ${p.x},${p.y}`);return ok;});
 return{id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),issues,routeResults,anchors,foreignAssets,portalReachability,visualQuality:'SEPARATE_PIXEL_REVIEW_REQUIRED',nativeTilt:false};
}
