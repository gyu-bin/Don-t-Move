import type {StageDefinition,PropDef} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {inwardFacing} from '../../src/game/levels/missionContinuity';

export type P=readonly [number,number];
export type Room=readonly [number,number,number,number];
export type Routes={safe:readonly P[];risk:readonly P[];escape:readonly P[];alternateEscape?:readonly P[]};
export type Watch={subject:string;points:readonly P[];look:readonly number[];role?: NonNullable<StageDefinition['guards'][number]['role']>; roaming?:boolean; range?:number};

export function architecture(w:number,h:number,rooms:readonly Room[],cuts:readonly P[]=[]){
 const floor=Array.from({length:h},()=>Array<boolean>(w).fill(false));
 for(const [x,y,rw,rh] of rooms)for(let j=y;j<y+rh;j++)for(let i=x;i<x+rw;i++)floor[j][i]=true;
 for(const [x,y] of cuts)floor[y][x]=false;
 return floor.map((row,y)=>row.map((open,x)=>open?'.':[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor[y+dy]?.[x+dx]))?'#':' ').join(''));
}

/** Explicit room geometry and stops; no sampled furniture or A* repair of authored player routes. */
export function mission(n:number,title:string,plan:string,layout:string[],routes:Routes,props:PropDef[],landmark:StageDefinition['landmark'],watch:Watch[]):StageDefinition{
 const id=`01-${String(n).padStart(2,'0')}`,exits=['right','bottom','right','top','right','bottom','left','bottom','top','left'] as const,opposite={right:'left',left:'right',top:'bottom',bottom:'top'} as const,edges={entry:n===1?'left' as const:opposite[exits[n-2]],exit:exits[n-1]},entry=routes.safe[0],objective=routes.safe.at(-1)!,exit=routes.escape.at(-1)!;
 const point=([x,y]:P)=>({x,y});
 const s:StageDefinition={id,number:n,chapter:1,mission:n,title,theme:'museum',structurePlan:plan,layout,
  entryEdge:edges.entry,exitEdge:edges.exit,entryPosition:point(entry),exitPosition:point(exit),
  playerSpawn:{...point(entry),facing:inwardFacing[edges.entry]},
  objective:{...point(objective),kind:n===10?'masterDiamond':n===5?'diamond':n===3?'classified':n===4?'data':'artifact'},
  exit:{x:exit[0]-.6,y:exit[1]-.6,w:1.2,h:1.2},ambientDarkness:n>=5?.35:.3,
  props:[...props,{kind:'objectiveCase',x:objective[0],y:objective[1]+.12}],landmark,
  lights:[{...point(objective),radius:n===5||n===10?3:2.6,kind:'warm',intensity:n===5||n===10?1:.96},
   ...(n>=5?[{...point(objective),radius:1.65,kind:'cyan' as const,intensity:.85}]:[]),
   {...point(entry),radius:2,kind:'warm',intensity:.4},
   {x:landmark!.x,y:landmark!.y,radius:n===5?2:2.6,kind:n===4?'cool':'warm',intensity:n===5?.38:.62},
   {...point(exit),radius:1.8,kind:'warm',intensity:.3}],
  guards:watch.map((g,i)=>({id:`${id}-g${i+1}`,routeId:`${id}-g${i+1}`,...point(g.points[0]),
   role:g.role??(i===watch.length-1?'objective':'room'),theftRole:g.role==='room'?'zone':g.role??(i===watch.length-1?'objective':'zone'),theftPosts:[...g.points.slice(1),g.points[0]].map(point),initialFacing:g.look[0],facing:g.look[0],pace:.8+(n-1)*.025,
   startDelay:i===watch.length-1?4:i*1.5,visionRange:g.range??(3.5+Math.min(n-1,5)*.18),visionHalfAngle:Math.PI/6})),
  patrolRoutes:watch.map((g,i)=>({id:`${id}-g${i+1}`,mode:'pingpong',points:g.points.map((p,j)=>({...point(p),waitDuration:j===0?4.5:2,lookDirection:g.look[j],turnDuration:1.1}))})),
  patrolPlan:{zones:watch.map((g,i)=>({id:`Z${i}`,name:g.subject})),
   anchors:watch.flatMap((g,i)=>g.points.map((p,j)=>({id:`${i}-${j}`,zone:`Z${i}`,subject:`${g.subject}: ${j?'inspection threshold':'observation return'}`,...point(p),wait:j===0?4.5:2,look:g.look[j]}))),
   assignments:watch.map((g,i)=>({guardId:`${id}-g${i+1}`,zones:[`Z${i}`],anchors:g.points.map((_,j)=>`${i}-${j}`),roaming:g.roaming??false}))},
  securityZones:watch.map((g,i)=>({name:g.subject,...point(g.points[0]),radius:3.5,guardId:`${id}-g${i+1}`})),
  objectiveZone:{guardId:`${id}-g${watch.length}`,spotlight:true},safeZones:[{...point(entry),radius:.2}],
  testRoutes:[{name:'safe: structural observation route',points:routes.safe.map(point)},{name:'risk: shorter timed crossing',points:routes.risk.map(point)}],
  escapeRoutes:[{name:'escape: rear staff circulation',points:routes.escape.map(point)},...(routes.alternateEscape?[{name:'escape alternate: timed security crossing',points:routes.alternateEscape.map(point)}]:[])],
 };
 if(n===4){const row=s.layout[0].split('');row[13]='.';row[14]='.';s.layout[0]=row.join('');}
 const nav=buildNavigation(compileStage(s),BODY.playerRadius);
 for(const route of [...s.testRoutes!,...s.escapeRoutes!])for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i];
  if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,nav.blockers,BODY.playerRadius))throw Error(`${id}: authored ${route.name} blocked ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
 }
 return s;
}

export const MUSEUM_02_PATHS:Routes={
 safe:[[1.3,8.5],[3,8.5],[5.5,8.5],[6.5,10.5],[8.5,10.5],[9.5,8.5],[11.5,8.5],[11.5,6.5],[12.5,6.5],[12.5,4.5],[12,2.5]],
 risk:[[1.3,8.5],[3,8.5],[5.5,8.5],[9.5,8.5],[11.5,8.5],[11.5,6.5],[12.5,6.5],[12.5,4.5],[12,2.5]],
 escape:[[12,2.5],[13.3,3.5],[13.3,4.5],[13.3,6.5],[13.3,8.5],[13.3,11],[13.3,13.5]],
};
export function museumMission02(){return mission(2,'Main Gallery',
 'Painting Gallery → octagonal Central Rotunda (southern recess / central crossing) → Sculpture Wing → Artifact Room → south staff exit',
 architecture(15,15,[[1,6,3,5],[4,8,2,2],[5,5,5,7],[9,8,2,2],[11,6,3,4],[10,1,4,4],[12,4,2,2],[12,10,2,4],[12,14,2,1]],[[5,5],[9,5],[5,11],[9,11]]),MUSEUM_02_PATHS,
 [{kind:'painting',x:2.5,y:6},{kind:'pillar',x:6,y:7,scale:1.1,collisionScale:1.1},{kind:'pillar',x:9,y:7,scale:1.1,collisionScale:1.1},
  {kind:'statue',x:11.8,y:9.8,scale:1.2,collisionScale:1.2},{kind:'lamp',x:12,y:1}],
 {name:'Central Rotunda',kind:'pillar',x:6,y:7},[
  {subject:'Rotunda entrance / central crossing / Sculpture threshold',points:[[7,6],[9,8]],look:[Math.PI/2,Math.PI]},
  {subject:'Artifact entrance / case inspection',points:[[10.8,2.3],[10.8,4]],look:[0,0]},
 ]);}

export const MUSEUM_03_PATHS:Routes={
 safe:[[2.5,1.5],[2.5,5.8],[5.5,5.8],[5.5,9.3],[9.5,9.3],[9.5,11.5],[11.5,11.5],[11.5,9.5],[12.5,8]],
 risk:[[2.5,1.5],[2.5,5.8],[5.5,5.8],[9.5,6.5],[9.5,9.3],[9.5,11.5],[11.5,11.5],[11.5,9.5],[12.5,8]],
 escape:[[12.5,8],[11.5,9.5],[11.5,11.5],[16.5,11.5]],
};
export function museumMission03(){return mission(3,'Archive',
 'Bent Staff Corridor → Archive Shelves (shelf-end cover / central aisle) → Storage → Restricted Archive → return through Storage inspection corner → east staff door',
 architecture(18,14,[[1,1,3,6],[3,5,2,2],[5,4,5,6],[8,9,2,2],[8,11,9,2],[11,6,3,4],[11,9,2,2]]),MUSEUM_03_PATHS,
 [{kind:'shelf',x:7,y:8,scale:1.2,collisionScale:1.2},{kind:'shelf',x:8.3,y:5.5},
  {kind:'crate',x:8.5,y:12.7},{kind:'shelf',x:14.5,y:12.9},{kind:'lamp',x:2,y:1},{kind:'lamp',x:12.5,y:6}],
 {name:'Archive Shelves',kind:'shelf',x:7,y:8},[
  {subject:'Staff access / Archive to Storage threshold',points:[[7,4.7],[9,8.5]],look:[Math.PI,Math.PI]},
  {subject:'Restricted Archive / rear staff door',points:[[11.6,6.5],[11.6,8.9],[12,11.5]],look:[Math.PI/2,-Math.PI/2,0]},
 ]);}

export const MUSEUM_04_PATHS:Routes={
 safe:[[1.3,10.5],[3.5,10.5],[6.375,10.5],[6.375,7.5],[9.5,7.5],[9.5,5],[12.5,5],[13.5,6],[13.7,7.3]],
 risk:[[1.3,10.5],[3.5,10.5],[6.5,10.5],[9.5,7.5],[9.5,5],[12.5,5],[13.5,6],[13.7,7.3]],
 escape:[[13.7,7.3],[14,5.5],[14,3],[14,1.5]],
};
export function museumMission04(){return mission(4,'Security Wing',
 'Security Office / CCTV Room → Security Hub observation pocket → timed Junction → Security Gate inspection → Restricted Passage',
 architecture(16,14,[[1,9,4,4],[4,10,2,2],[6,7,4,6],[8,5,2,2],[8,4,5,2],[12,4,3,5],[12,1,3,3]]),MUSEUM_04_PATHS,
 [{kind:'counter',x:7.2,y:8.7,scale:.65,collisionScale:.65},{kind:'equipment',x:6.8,y:12.5},{kind:'counter',x:3,y:12},{kind:'cctv',x:9,y:4},
  {kind:'lamp',x:13.5,y:4},{kind:'lamp',x:2,y:9}],
 {name:'Security Control Room',kind:'equipment',x:6.8,y:12.5},[
  {subject:'CCTV Office / Hub doorway',points:[[8.8,11.8],[9.1,8.2]],look:[-Math.PI/2,-Math.PI/2]},
  {subject:'Three-way controlled junction',points:[[10,4.5],[11.2,5.3]],look:[0,Math.PI]},
  {subject:'Gate inspection / Restricted Passage',points:[[14.2,4.8],[12.8,6.6]],look:[-Math.PI/2,Math.PI/2]},
 ]);}

export const MUSEUM_05_PATHS:Routes={
 safe:[[3,13.5],[3,10.5],[7.5,10.5],[7.5,6.5],[9,5.5],[10,6.5],[12.5,6.5],[14,5.5]],
 risk:[[3,13.5],[3,10.5],[7.5,10.5],[10,6.5],[12.5,6.5],[14,5.5]],
 escape:[[14,5.5],[14,7.5],[12.5,7.5],[10.5,7.5],[10.5,11.5],[13,11.5],[15,11.5]],
 alternateEscape:[[14,5.5],[14,6.5],[10.5,6.5],[10.5,11.5],[15,11.5]],
};
export function museumMission05(){return mission(5,'Diamond Hall',
 'Grand Exhibition → Final Security observation loop → Diamond Chamber → guarded chamber threshold → southern Service Corridor → east exit',
 architecture(17,15,[[1,7,5,7],[5,10,2,2],[7,4,4,9],[10,6,2,2],[12,2,4,7],[10,10,3,2],[13,10,3,3],[2,14,2,1]],[[12,2],[15,2]]),MUSEUM_05_PATHS,
 [{kind:'statue',x:2,y:8.5,scale:1.4,collisionScale:1.4},{kind:'pillar',x:9.5,y:10},
  {kind:'diamondPedestal',x:14,y:4},{kind:'lamp',x:13,y:3},{kind:'lamp',x:4,y:7},
  // Density V1: Restricted Collection islands; each room gets real cover off the routes.
  {kind:'displayCase',x:5,y:12.9},            // Grand Exhibition lower island
  {kind:'partition',x:8.8,y:11.6},            // Final Security south divider (escape-side cover)
  {kind:'statue',x:15.3,y:3.8},               // Chamber flank beside the Blue Diamond
  {kind:'displayCase',x:13.65,y:12.9}],        // Service corridor exhibit before the exit
 {name:'Diamond Chamber',kind:'diamondPedestal',x:14,y:4},[
  {subject:'Grand Exhibition threshold',points:[[3,8],[5,8]],look:[Math.PI/2,Math.PI/2]},
  {subject:'Final Security / chamber approach',points:[[9.5,4.8],[9.5,8]],look:[Math.PI/2,Math.PI]},
  {subject:'Chamber entrance / Blue Diamond inspection',points:[[12.8,3.5],[13,7.6]],look:[0,-Math.PI/2]},
 ]);}
