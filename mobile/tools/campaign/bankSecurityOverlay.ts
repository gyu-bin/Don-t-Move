/** Additive semantic security data; existing Chapter01/02 geometry stays byte-for-byte equal. */
import type {StageDefinition,SecurityCameraDef} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../src/game/world/navigation';
const CAMERA_MISSIONS=new Set(['01-08','01-10','02-08','02-09','02-10']);
export function applySecurityData(source:StageDefinition):StageDefinition {
 if((source.chapter??0)>3)return source;
 const def=structuredClone(source),stage=compileStage(def),nav=buildNavigation(stage,8);
 const nearestAnchor=(x:number,y:number,gx:number,gy:number)=>{for(const radius of[0,.5,1,1.5,2])for(const [dx,dy]of [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]]){const xx=x+dx,yy=y+dy;if(!clearSegment(xx*TILE,yy*TILE,xx*TILE,yy*TILE,stage.movementBlockers,18))continue;const path=findPath(nav,gx*TILE,gy*TILE,xx*TILE,yy*TILE);if(path.length>=2&&Math.hypot(path.at(-2)!-xx*TILE,path.at(-1)!-yy*TILE)<.01)return{x:xx,y:yy};}return null;};
 const zones=def.securityZones??[];
 for(const [i,g]of def.guards.entries()){
  if(g.theftSearchSectors?.length)continue;
  const anchors=zones.map(z=>({name:z.name,point:nearestAnchor(z.x,z.y,g.x,g.y)})).filter((a):a is {name:string;point:{x:number;y:number}}=>a.point!==null);
  if(anchors.length<2)continue;
  const rotated=anchors.map((_,j)=>anchors[(j+i)%anchors.length]);
  g.theftSearchSectors=[{id:`${g.id}: assigned adjacent security sectors`,anchors:rotated.slice(0,Math.ceil(rotated.length/2)).map(a=>a.point)},{id:`${g.id}: junction and exit recheck`,anchors:[...rotated.slice(Math.ceil(rotated.length/2)).map(a=>a.point),{x:stage.exit.x/TILE+stage.exit.w/TILE/2,y:stage.exit.y/TILE+stage.exit.h/TILE/2}]}];
  // Security Core's approved reaction window also depends on its role-specific first circuit.
  if(def.id==='01-08'&&g.theftPosts?.length)g.theftSearchSectors.unshift({id:`${g.id}: original role inspection circuit`,anchors:g.theftPosts.map(p=>({...p}))});
 }
 if(CAMERA_MISSIONS.has(def.id)){
  const candidates:{camera:SecurityCameraDef;score:number}[]=[];
  for(let y=1;y<stage.rows-1;y++)for(let x=1;x<stage.cols-1;x++)if(stage.grid[y*stage.cols+x]===1){
   for(const [dx,dy,facing]of [[-1,0,0],[1,0,Math.PI],[0,-1,Math.PI/2],[0,1,-Math.PI/2]])if(stage.grid[(y+dy)*stage.cols+x+dx]===2){
    const xx=x+.5+dx*.27,yy=y+.5+dy*.27;if(!clearSegment(xx*TILE,yy*TILE,xx*TILE,yy*TILE,stage.movementBlockers,0))continue;
    const objectiveDistance=Math.hypot(xx-stage.objective.x/TILE,yy-stage.objective.y/TILE),spawnDistance=Math.hypot(xx-def.playerSpawn.x,yy-def.playerSpawn.y);if(objectiveDistance<5||spawnDistance<5)continue;
    const routePoints=def.testRoutes?.flatMap(r=>r.points)??[];const routeDistance=Math.min(...routePoints.map(p=>Math.hypot(xx-p.x,yy-p.y)));
    if(routeDistance<2)continue;
    const preferred=zones.filter(z=>/Security|Junction|Atrium|Collection|Master/i.test(z.name));const sectorDistance=Math.min(...(preferred.length?preferred:zones).map(z=>Math.hypot(xx-z.x,yy-z.y)));
    const camera:SecurityCameraDef={id:`${def.id}-cam1`,x:xx,y:yy,centerFacing:facing,sweepAngle:.65,sweepSpeed:.35,pauseAtEnds:.6,range:4.8,visionAngle:.65,suspicionRate:.4};
    candidates.push({camera,score:(Number.isFinite(sectorDistance)?sectorDistance:0)+Math.abs(routeDistance-3)});
   }
  }
  if(!candidates.length)throw Error(`${def.id}: no fair wall-mounted CCTV candidate`);
  def.cameras=[candidates.sort((a,b)=>a.score-b.score)[0].camera];
 }
 return def;
}
