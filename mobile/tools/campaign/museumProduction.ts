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

export const MUSEUM_02_PATHS={
 safe:[[1.25,9],[2,9.8],[4.2,9.8],[4.2,9],[4.2,7],[4.2,5],[4.5,4.5],[6,4.5],[8,4.5],[10,4.5],[12,3.5]],
 risk:[[1.25,9],[4.3,9],[6.4,9],[6.4,7.6],[8,7.6],[10,7.6],[11.5,7.6],[11.5,6.5],[12,5.5],[12,3.5]],
 escape:[[12,3.5],[12.5,5.5],[12,6.5],[12,7.5],[13.5,7.5],[13.5,9.6],[10.5,9.6],[10.5,10.5],[9.5,13.5]],
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
   {x:5,y:9,w:1,h:2},{x:9,y:4,w:2,h:1},
   {x:13,y:4,w:2,h:1},{x:11,y:8,w:1,h:2},{x:17,y:8,w:1,h:2},
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
   {id:'01-01-g1',role:'room',x:9.7,y:10.8,routeId:'main-gallery',facing:Math.PI,pace:0.8,startDelay:1.5,visionRange:3.5,visionHalfAngle:Math.PI/6},
   {id:'01-01-g2',role:'objective',x:15.6,y:8,routeId:'exhibition',facing:0,pace:0.8,startDelay:4,visionRange:3.5,visionHalfAngle:Math.PI/6}],
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

/** Compact authored Main Exhibition: 15×15 (30.3% less than old 17×19). */
export function museumMission02():StageDefinition {
 const s:StageDefinition={
  id:'01-02',number:2,chapter:1,mission:2,title:'Main Exhibition',theme:'museum',
  structurePlan:'Painting Room / timed Central Crossing / Sculpture Room / Artifact Room / separate south Exit circulation',
  layout:floorLayout(15,15,[
   {x:1,y:1,w:13,h:6},                   // Sculpture / north gallery / Artifact rooms
   {x:1,y:6,w:13,h:5},                   // Painting Room + Central Crossing
   {x:1,y:10,w:5,h:3},                   // Painting Room lower pocket
   {x:8,y:10,w:3,h:4},                   // Exit corridor
  ],[
   [5,1],[5,2],[5,3],[5,5],[5,6],        // Sculpture ↔ north gallery, doorway at y4
   [9,1],[9,2],[9,5],[9,6],              // north gallery ↔ Artifact, doorway y3–4
   [1,6],[2,6],[5,6],[6,6],[7,6],[9,6],[10,6],[13,6], // room thresholds
   [5,7],[5,10],[5,11],[5,12],           // Painting ↔ Central, doorway y8–9
   [7,10],[7,11],[7,12],[7,13],[11,10],[11,11],[11,12],[11,13],
  ]),ambientDarkness:0.35,
  entryEdge:'left',entryPosition:{x:1.25,y:9},exitEdge:'bottom',exitPosition:{x:9.5,y:13.5},
  playerSpawn:{x:1.25,y:9,facing:0},objective:{kind:'artifact',x:12,y:3.5},exit:{x:8.9,y:12.9,w:1.2,h:1.2},
  props:[
   {kind:'partition',x:2.8,y:8.5,scale:1.4,collisionScale:1.4},
   {kind:'statue',x:2.8,y:5.4,scale:1.5,collisionScale:1.5},
   {kind:'pillar',x:7,y:2.8,scale:1.4,collisionScale:1.4},
   {kind:'displayCase',x:8.2,y:9.3,scale:1.4,collisionScale:1.4},
   {kind:'partition',x:9.4,y:7.25,scale:1.4,collisionScale:1.4},
   {kind:'pillar',x:10.5,y:2.8,scale:1.35,collisionScale:1.35},
   {kind:'statue',x:12.5,y:9.2,scale:1.4,collisionScale:1.4},
   {kind:'objectiveCase',x:12,y:3.62},
   {kind:'painting',x:2.8,y:7,scale:1.35},{kind:'painting',x:4.3,y:3,scale:0.9},
   {kind:'lamp',x:12,y:2},{kind:'lamp',x:2,y:8.5},
  ],
  landmark:{name:'Sculpture Room',kind:'statue',x:2.8,y:5.4},
  lights:[{x:12,y:3.5,radius:2.6,kind:'warm',intensity:0.94},
   {x:4.2,y:5.5,radius:2.1,kind:'warm',intensity:0.62},
   {x:2.7,y:9.3,radius:2,kind:'warm',intensity:0.38},
   {x:8.1,y:8.2,radius:2.2,kind:'warm',intensity:0.46},
   {x:9,y:12.8,radius:1.6,kind:'warm',intensity:0.3}],
  guards:[
   {id:'01-02-g1',role:'room',x:6.3,y:7.8,routeId:'01-02-g1',facing:0,pace:0.825,startDelay:0,visionRange:3.68,visionHalfAngle:Math.PI/6},
   {id:'01-02-g2',role:'objective',x:11.8,y:5.5,routeId:'01-02-g2',facing:-Math.PI/2,pace:0.825,startDelay:4,visionRange:3.68,visionHalfAngle:Math.PI/6}],
  patrolPlan:{
   zones:[{id:'A',name:'Cross aisle / observation floor'},{id:'B',name:'Artifact room'}],
   anchors:[
    {id:'aisle-west',zone:'A',subject:'Painting Room threshold',x:6.3,y:7.8,wait:1.5,look:Math.PI},
    {id:'aisle-east',zone:'A',subject:'Central sightline',x:9.8,y:7.8,wait:1.4,look:Math.PI},
    {id:'return-door',zone:'A',subject:'Exit corridor turn',x:9.5,y:10.8,wait:1.8,look:Math.PI/2},
    {id:'artifact-door',zone:'B',subject:'Artifact room entrance',x:11.8,y:5.5,wait:2.5,look:-Math.PI/2},
    {id:'artifact-west',zone:'B',subject:'Artifact sightline',x:10,y:4.2,wait:2,look:0},
    {id:'artifact-north',zone:'B',subject:'North gallery wall',x:12.2,y:2.5,wait:2,look:Math.PI},
   ],
   assignments:[
    {guardId:'01-02-g1',zones:['A'],anchors:['aisle-west','aisle-east','return-door'],roaming:false},
    {guardId:'01-02-g2',zones:['B'],anchors:['artifact-door','artifact-west','artifact-north'],roaming:false},
   ],
  },
  patrolRoutes:[
   {id:'01-02-g1',mode:'waitAndLook',points:[
    {x:6.3,y:7.8,waitDuration:1.5,lookDirection:Math.PI,turnDuration:1.1},
    {x:9.8,y:7.8,waitDuration:1.4,lookDirection:Math.PI,turnDuration:1.1},
    {x:9.5,y:10.8,waitDuration:1.8,lookDirection:Math.PI/2,turnDuration:1.1}]},
   {id:'01-02-g2',mode:'pingpong',points:[
    {x:11.8,y:5.5,waitDuration:4.5,lookDirection:-Math.PI/2,turnDuration:1.1},
    {x:10,y:4.2,waitDuration:2,lookDirection:0,turnDuration:1.1},
    {x:12.2,y:2.5,waitDuration:2,lookDirection:Math.PI,turnDuration:1.1}]},
  ],
  securityZones:[{name:'Central Crossing / Painting threshold',x:8,y:8.5,radius:3.5,guardId:'01-02-g1'},
   {name:'Artifact / Sculpture rooms',x:10.8,y:4.5,radius:3.5,guardId:'01-02-g2'}],
  objectiveZone:{guardId:'01-02-g2',spotlight:true},
  safeZones:[{x:2.5,y:9.5,radius:0.5},{x:3,y:5,radius:0.45}],
 };
 return withRoutes(s,MUSEUM_02_PATHS);
}
