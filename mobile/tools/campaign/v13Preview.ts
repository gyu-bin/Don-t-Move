/** Authoring aid: ASCII render of a compiled stage (walls, solid props, opaque props, doors, security). */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import fs from 'node:fs';
import {compileStage,TILE} from '../../src/game/world/compileStage';
export function previewStage(def:StageDefinition,sub=2,marks?:{x:number;y:number;ch:string}[]):string{
 const s=compileStage(def),rows=def.layout.length,cols=Math.max(...def.layout.map(r=>r.length)),g:string[][]=[];
 for(let y=0;y<rows*sub;y++){g.push([]);for(let x=0;x<cols*sub;x++){const ch=def.layout[Math.floor(y/sub)]?.[Math.floor(x/sub)]??' ';g[y].push(ch==='#'?'#':ch==='.'?' ':'~');}}
 const wallCount=(def.layout.join('').match(/#/g)??[]).length;void wallCount;
 const paint=(b:ArrayLike<number>,ch:string,skipWalls=true)=>{for(let i=0;i<b.length;i+=4){const x0=b[i]/TILE,y0=b[i+1]/TILE,x1=b[i+2]/TILE,y1=b[i+3]/TILE;
  for(let y=Math.floor(y0*sub);y<Math.ceil(y1*sub);y++)for(let x=Math.floor(x0*sub);x<Math.ceil(x1*sub);x++){if(!g[y]?.[x])continue;const cx=(x+.5)/sub,cy=(y+.5)/sub;if(cx<x0||cx>x1||cy<y0||cy>y1)continue;if(skipWalls&&g[y][x]==='#')continue;if(g[y][x]==='~')continue;g[y][x]=ch;}}};
 paint(s.movementBlockers,'o');paint(s.visionBlockers,'O');
 const mark=(x:number,y:number,ch:string)=>{const gx=Math.floor(x*sub),gy=Math.floor(y*sub);if(g[gy]?.[gx]!==undefined)g[gy][gx]=ch;};
 for(const d of def.doors??[]){const n=Math.round(d.width*sub);for(let i=0;i<n;i++){const t=(i+.5)/sub-d.width/2;mark(d.orientation==='horizontal'?d.x+t:d.x,d.orientation==='horizontal'?d.y:d.y+t,def.lockdownDoors?.includes(d.id)?'L':'=');}}
 for(const r of def.patrolRoutes)for(const q of r.points)mark(q.x,q.y,q.waitDuration?'g':'·');
 def.guards.forEach((q,i)=>mark(q.x,q.y,String(i+1)));
 for(const c of def.cameras??[])mark(c.x,c.y,'C');
 mark(def.playerSpawn.x,def.playerSpawn.y,'E');mark(def.objective!.x,def.objective!.y,'D');mark(def.exitPosition!.x,def.exitPosition!.y,'X');
 if(def.safeZones?.[1])mark(def.safeZones[1].x,def.safeZones[1].y,'b');
 if(marks)for(const q of marks)mark(q.x,q.y,q.ch);
 const head='    '+Array.from({length:cols},(_,x)=>String(x%10).padEnd(sub)).join('');
 return [head,...g.map((r,y)=>(y%sub===0?String(Math.floor(y/sub)).padStart(3)+' ':'    ')+r.join(''))].join('\n');
}
if(process.argv[1]?.endsWith('v13Preview.ts')){
 const file=process.env.STAGES??'src/game/levels/stages/campaignStages.json';
 const defs=JSON.parse(fs.readFileSync(file,'utf8')) as StageDefinition[];
 for(const id of process.argv.slice(2)){const def=defs.find(d=>d.id===id)!;console.log(`\n${id} ${def.title}  ${def.layout[0].length}x${def.layout.length}  guards ${def.guards.length} cams ${def.cameras?.length??0} props ${def.props.length}`);console.log(previewStage(def));}
}
