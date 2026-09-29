import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {MUSEUM_PATROL} from '../../src/game/levels/semanticPatrol';

type Stop=readonly [number,number];

// Approved room architecture precedes routes, sightlines, cover and decoration.
export const MUSEUM_PATHS={
 safe:[[1.3,10],[4,10],[7,10],[9.5,8],[9.5,5.5],[9.5,3],[13.5,3],[13.5,5.5],[15,6.5]],
 risk:[[1.3,10],[4,10],[7,10],[10,9],[12.5,9],[13.2,7.5],[15,6.5]],
 main:[[1.3,10],[4,10],[7,10],[10,9],[12.5,9],[13.2,7.5],[15,6.5]],
 escape:[[15,6.5],[16,7],[16.2,8.8],[18.5,8.8],[19.7,8.8]],
} as const;

function floorLayout(width:number,height:number,spaces:{x:number;y:number;w:number;h:number}[],walls:Stop[]=[]){
 const floor=Array.from({length:height},()=>Array<boolean>(width).fill(false));
 for(const r of spaces)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)floor[y][x]=true;
 for(const [x,y] of walls)floor[y][x]=false;
 return floor.map((row,y)=>row.map((open,x)=>open?'.':
  [-1,0,1].some(dy=>[-1,0,1].some(dx=>floor[y+dy]?.[x+dx]))?'#':' ').join(''));
}

function withRoutes(s:StageDefinition,routes:{safe:readonly Stop[];risk:readonly Stop[];escape:readonly Stop[];main?:readonly Stop[]}){
 const nav=buildNavigation(compileStage(s),BODY.playerRadius);
 const route=(stops:readonly Stop[])=>stops.map((p,i)=>{
  const a=stops[Math.max(0,i-1)];
  if(!clearSegment(a[0]*TILE,a[1]*TILE,p[0]*TILE,p[1]*TILE,nav.blockers,BODY.playerRadius))
   throw Error(`${s.id} authored path blocked: ${a} → ${p}`);
  return {x:p[0],y:p[1]};
 });
 s.testRoutes=[{name:'safe: observation pockets linked by structural cover',points:route(routes.safe)},
  {name:'risk: short exposed sightline crossing',points:route(routes.risk)}];
 if(routes.main)s.testRoutes.push({name:'main: room sequence and objective reveal',points:route(routes.main)});
 s.escapeRoutes=[{name:'escape: separate post-objective circulation',points:route(routes.escape)}];
 return s;
}

/** Approved Entrance floor-plan topology. Dimensions remain a Tilt review candidate. */
export function museumProduction():StageDefinition {
 const s:StageDefinition={
  id:'01-01',number:1,chapter:1,mission:1,title:'Entrance Hall',theme:'museum',
  structurePlan:'Lobby / First Exhibition with Grand Statue / north Gallery Recess or timed exhibition crossing / Objective Room / east Side Exit',
  layout:floorLayout(21,14,[
   {x:1,y:8,w:4,h:5}, // Lobby
   {x:6,y:5,w:5,h:8}, // First Exhibition
   {x:8,y:1,w:7,h:3}, // Gallery Recess
   {x:12,y:5,w:5,h:6}, // Objective Room
   {x:18,y:7,w:2,h:4}, // Side Exit
   {x:4,y:9,w:2,h:2},{x:9,y:4,w:2,h:1},
   {x:13,y:4,w:2,h:1},{x:10,y:8,w:2,h:2},{x:16,y:8,w:2,h:2},
  ]),ambientDarkness:0.25,
  entryEdge:'left',entryPosition:{x:1.3,y:10},exitEdge:'right',exitPosition:{x:19.7,y:8.8},
  playerSpawn:{x:1.3,y:10,facing:0},objective:{kind:'diamond',x:15,y:6.5},exit:{x:19.1,y:8.2,w:1.2,h:1.2},
  props:[
   {kind:'partition',x:3.2,y:9,scale:1.3,collisionScale:1.3},
   {kind:'statue',x:7.8,y:7.5,scale:1.7,collisionScale:1.7},
   {kind:'displayCase',x:7.5,y:12,scale:1.2,collisionScale:1.2},
   {kind:'pillar',x:14.5,y:9.5,scale:1.3,collisionScale:1.3},
   {kind:'objectiveCase',x:15,y:6.62},
   {kind:'painting',x:11.8,y:1,scale:0.85},
   {kind:'lamp',x:15,y:5},{kind:'lamp',x:3,y:8},
  ],
  landmark:{name:'Grand Statue',kind:'statue',x:7.8,y:7.5},
  lights:[{x:15,y:6.5,radius:2.8,kind:'warm',intensity:1},
   {x:7.8,y:7,radius:2.5,kind:'warm',intensity:0.67},
   {x:3,y:10,radius:2.3,kind:'warm',intensity:0.36},
   {x:11.8,y:2.5,radius:2.2,kind:'warm',intensity:0.38},
   {x:19,y:8.8,radius:1.6,kind:'warm',intensity:0.24}],
  patrolPlan:MUSEUM_PATROL,
  guards:[
   {id:'01-01-g1',role:'room',theftRole:'corridor',theftPosts:[{x:6.8,y:10.5},{x:9.5,y:5.5}],initialFacing:Math.PI,x:9.7,y:10.8,routeId:'main-gallery',facing:Math.PI,pace:0.8,startDelay:1.5,visionRange:3.5,visionHalfAngle:Math.PI/6},
   {id:'01-01-g2',role:'objective',theftRole:'objective',theftPosts:[{x:13.5,y:5.8},{x:15.6,y:8}],initialFacing:-Math.PI/2,x:15.6,y:8,routeId:'exhibition',facing:-Math.PI/2,pace:0.8,startDelay:4,visionRange:3.5,visionHalfAngle:Math.PI/6}],
  patrolRoutes:MUSEUM_PATROL.assignments.map((a,i)=>({id:i?'exhibition':'main-gallery',mode:'loop',points:a.anchors.map(id=>{
   const p=MUSEUM_PATROL.anchors.find(v=>v.id===id)!;
   return {x:p.x,y:p.y,waitDuration:p.wait,lookDirection:p.look,turnDuration:1.1};
  })})),
  securityZones:[{name:'Lobby threshold / First Exhibition',x:8,y:9,radius:3.5,guardId:'01-01-g1'},
   {name:'Objective Room / Side Exit threshold',x:15,y:7,radius:3,guardId:'01-01-g2'}],
  objectiveZone:{guardId:'01-01-g2',spotlight:true},
  safeZones:[{x:2.8,y:11,radius:0.55},{x:9.5,y:3,radius:0.45},{x:13.5,y:3,radius:0.45}],
 };
 return withRoutes(s,{...MUSEUM_PATHS});
}


export {museumMission02,museumMission03,museumMission04,museumMission05,MUSEUM_02_PATHS} from './museumLaterMissions';

export {museumMission06,museumMission07,museumMission08,museumMission09,museumMission10} from './museumDeepMissions';
