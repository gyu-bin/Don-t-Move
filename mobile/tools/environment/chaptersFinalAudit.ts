/** Actual patrol visibility union and shortest physical escape; review aids, not difficulty approval. */
import fs from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {describeMuseumDesign} from '../campaign/museumFinalDesign';
import {describeGalleryDesign} from '../campaign/galleryEnvironmentDesign';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {BODY} from '../../src/game/guards/guardTuning';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
import {pointVisible} from '../../src/game/guards/guardVision';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';

export function auditFinalMission(d:StageDefinition){
 const design=d.chapter===1?describeMuseumDesign(d):describeGalleryDesign(d),stage=compileStage(d);
 const nav=buildNavigation(stage,BODY.playerRadius),guardNav=buildNavigation(stage,BODY.guardRadius);
 const inside=(p:{x:number;y:number},z:typeof design.zones[number])=>(('regions' in z&&z.regions)||[z.bounds]).some(b=>p.x>=b.x&&p.x<b.x+b.w&&p.y>=b.y&&p.y<b.y+b.h);
 const floor:{x:number;y:number;seen:Set<string>;near:Set<string>}[]=[];
 for(let y=0;y<d.layout.length;y++)for(let x=0;x<d.layout[y].length;x++)if(d.layout[y][x]==='.'&&clearSegment((x+.5)*TILE,(y+.5)*TILE,(x+.5)*TILE,(y+.5)*TILE,stage.movementBlockers,BODY.playerRadius))floor.push({x:x+.5,y:y+.5,seen:new Set(),near:new Set()});
 const s=createPlaygroundState(stage);
 for(let f=0;f<60*60;f++){
  stepGuards(s.guards,{x:-9999,y:-9999,gait:0},stage.visionBlockers,guardNav,1/60,s.events,f/60,true,1,s.theft);
  if(f%12!==0)continue;
  for(const p of floor)for(const g of s.guards){
   if(Math.hypot(p.x*TILE-g.x,p.y*TILE-g.y)<=TILE)p.near.add(g.id);
   if(pointVisible(g,p.x*TILE,p.y*TILE,stage.visionBlockers))p.seen.add(g.id);
  }
 }
 const raw=findPath(nav,stage.objective.x,stage.objective.y,stage.exit.x+stage.exit.w/2,stage.exit.y+stage.exit.h/2);
 const path=[{x:stage.objective.x/TILE,y:stage.objective.y/TILE},...Array.from({length:raw.length/2},(_,i)=>({x:raw[2*i]/TILE,y:raw[2*i+1]/TILE}))];
 let escapeTiles=0;for(let i=1;i<path.length;i++)escapeTiles+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y);
 // Densify segments so a straight nav shortcut cannot omit intermediate zones.
 const dense=path.flatMap((p,i)=>{if(!i)return[p];const a=path[i-1],n=Math.ceil(Math.hypot(p.x-a.x,p.y-a.y)*4);return Array.from({length:n},(_,j)=>({x:a.x+(p.x-a.x)*(j+1)/n,y:a.y+(p.y-a.y)*(j+1)/n}));});
 const orderedZones:string[]=[];
 for(const p of dense){const z=design.zones.find(z=>inside(p,z));if(z&&orderedZones.at(-1)!==z.name)orderedZones.push(z.name);}
 const crossedGuardZones=(d.securityZones??[]).filter(z=>dense.some(p=>Math.hypot(p.x-z.x,p.y-z.y)<=z.radius)).map(z=>({name:z.name,guardId:z.guardId}));
 const zones=design.zones.map(z=>{
  const cells=floor.filter(p=>inside(p,z)),seen=cells.filter(p=>p.seen.size),near=cells.filter(p=>p.near.size);
  return {id:z.id,name:z.name,purpose:z.purpose,bodyClearTiles:cells.length,patrolVisionUnionRatio:cells.length?seen.length/cells.length:0,patrolFootprintTiles:near.length,actualPatrolVisionGuardIds:[...new Set(seen.flatMap(p=>[...p.seen]))],assignedGuards:z.guardIds,reviewWarning:cells.length>=20&&seen.length/cells.length<.15?'Large zone has low patrol visual coverage; inspect intended refuge vs dead area':null};
 });
 return {id:d.id,title:d.title,floorAreaTiles:d.layout.reduce((n,row)=>n+[...row].filter(v=>v==='.').length,0),guardCount:d.guards.length,guards:d.guards.map(g=>({id:g.id,role:g.role,theftRole:g.theftRole,posts:g.theftPosts})),landmark:d.landmark,escape:{shortestPlayableTiles:escapeTiles,atMaxRunLowerBoundSeconds:escapeTiles*TILE/150,orderedZones,distinctZoneCount:new Set(orderedZones).size,guardZones:crossedGuardZones,authoredEscapeRoutes:d.escapeRoutes?.length??0,reachable:raw.length>0},zones,coverageWarnings:zones.filter(z=>z.reviewWarning).map(z=>z.name),native:false};
}
if(process.argv[1]?.endsWith('chaptersFinalAudit.ts')){
 const source:StageDefinition[]=process.env.CAMPAIGN_JSON?JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON,'utf8')):campaignStages;
 const missions=source.filter(d=>d.chapter===1||d.chapter===2).map(auditFinalMission);
 const out=process.env.OUT_JSON??'Reports/ChaptersFinalAuditV1/final-audit.json';
 fs.writeFileSync(out,JSON.stringify({method:'60 seconds actual patrol engine, tile-centre body-clear samples every0.2seconds tested against actual rendered vision fan and LOS. Union measures potential patrol exposure, not simultaneous detection or difficulty. Shortest radius9 physical nav escape sampled through semantic zones. Run-time lower bound excludes acceleration/turns/guards and is not an actual playthrough.',missions},null,2)+'\n');
 console.log(JSON.stringify(missions.map(m=>({id:m.id,guards:m.guardCount,escape:m.escape.shortestPlayableTiles,zones:m.escape.orderedZones,warning:m.coverageWarnings})),null,2));
}
