import {applyV5MuseumGallery} from './v5MuseumGallery';
import {applyFurnishing} from './furnishingPass';
import {BANK_PRODUCTION} from './bankProductionDesign';
import {applyV3MuseumGallery} from './v3MuseumGallery';
import {applySecurityData} from './bankSecurityOverlay';
import type {StageDefinition,PropKind,PatrolPoint} from '../../src/game/levels/StageDefinition';
import {CHAPTERS,MISSION_COUNT} from '../../src/game/levels/campaignCatalog';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment,findPath,nodeX,nodeY} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {PROP_KIT} from '../../src/game/world/propKit';
import {STAGE_PALETTES} from '../../src/game/levels/stagePresentation';
import {BLUEPRINTS} from './blueprints';
import {applyMuseumFinalDesign} from './museumFinalDesign';
import {applyMuseumDressing} from './museumDressing';
import {applyMuseumCentralCover} from './museumCentralCover';
import {applyMuseumSecurityCleanup} from './museumSecurityCleanup';
import {applyMuseumTargetedAudit} from './museumTargetedAudit';
import {galleryEnvironmentMission} from './galleryEnvironmentDesign';
import {enrichGallery} from './galleryEnrichment';
import {missionEdges,inwardFacing} from '../../src/game/levels/missionContinuity';
import {CHAPTER_AREAS,LANDMARKS,LANDMARK_KINDS} from '../../src/game/levels/chapterArt';
import {museumMission02,museumMission03,museumMission04,museumMission05,museumMission06,museumMission07,museumMission08,museumMission09,museumMission10,museumProduction} from './museumProduction';
const museumExpandedMissions=[museumMission06,museumMission07,museumMission08,museumMission09,museumMission10];
type Point={x:number;y:number};
const palette:PropKind[][]=[['statue','pillar','bench','plant','painting'],['partition','painting','statue','bench'],['counter','partition','displayCase','door'],['equipment','table','partition','pillar'],['table','counter','pillar','sofa'],['sofa','table','displayCase','painting'],['crate','shelf','crate','counter'],['equipment','counter','partition','cctv'],['pillar','displayCase','equipment','door']];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
function buildLegacyMission(index:number):StageDefinition {
 if(index===0)return museumProduction();
 if(index===1)return museumMission02();
 if(index===2)return museumMission03();
 if(index===3)return museumMission04();
 if(index===4)return museumMission05();
 const blueprint=BLUEPRINTS[index],chapter=Math.floor(index/5),mission=index%5,c=CHAPTERS[chapter];
 let [w,h]=blueprint.size;
 let floor=Array.from({length:h},(_,y)=>Array.from({length:w},(_,x)=>x>0&&y>0&&x<w-1&&y<h-1));
 for(const [x,y,bw,bh] of [...blueprint.walls,...blueprint.cuts])for(let j=y;j<y+bh;j++)for(let i=x;i<x+bw;i++)if(floor[j]?.[i]!==undefined)floor[j][i]=false;
 let anchors=[{x:2.5,y:h-3.5},{x:w-3.5,y:3.5},{x:w-3.5,y:h-3.5},{x:2.5,y:3.5}];
 // Authored entrances face different sides; geometry and all anchors rotate together.
 for(let turn=0;turn<(chapter+mission)%4;turn++){
  floor=Array.from({length:w},(_,y)=>Array.from({length:h},(_,x)=>floor[h-1-x][y]));
  anchors=anchors.map(p=>({x:h-p.y,y:p.x}));[w,h]=[h,w];
 }
 const s:StageDefinition={id:`${String(chapter+1).padStart(2,'0')}-${String(mission+1).padStart(2,'0')}`,number:index+1,chapter:chapter+1,mission:mission+1,title:CHAPTER_AREAS[chapter][mission],theme:c.theme,structurePlan:blueprint.plan,
  layout:floor.map((row,y)=>row.map((v,x)=>v?'.':[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor[y+dy]?.[x+dx]))?'#':' ').join('')),
  props:[],lights:[],guards:[],patrolRoutes:[],playerSpawn:{...anchors[0],facing:0},objective:{...anchors[1],kind:c.objective[mission%c.objective.length]},exit:{...anchors[2],w:1.2,h:1.2},ambientDarkness:STAGE_PALETTES[c.theme].darkness,
 };
 let stage=compileStage(s),nav=buildNavigation(stage,BODY.playerRadius);
 const available=()=>nav.walkable.map((v,i)=>v?{x:nodeX(nav,i)/TILE,y:nodeY(nav,i)/TILE}:null).filter((p):p is Point=>!!p);
 const nearest=(p:Point)=>available().sort((a,b)=>distance(a,p)-distance(b,p))[0];
 anchors=anchors.map(nearest);
 const edges=missionEdges(index);
 const portal=(edge:string,avoid:Point[])=>{
  const points=available().filter(p=>avoid.every(a=>distance(a,p)>4.5));
  const edgeDistance=(p:Point)=>edge==='left'?p.x:edge==='right'?w-p.x:edge==='top'?p.y:h-p.y;
  const minimum=Math.min(...points.map(edgeDistance));
  const along=(p:Point)=>edge==='left'||edge==='right'?p.y/h:p.x/w;
  const position=[0.35,0.65,0.45,0.7,0.5][mission];
  return points.filter(p=>edgeDistance(p)<minimum+0.6).sort((a,b)=>Math.abs(along(a)-position)-Math.abs(along(b)-position))[0];
 };
 anchors[0]=portal(edges.entry,[anchors[1]]);anchors[2]=portal(edges.exit,[anchors[0],anchors[1]]);
 if(!anchors[0]||!anchors[2])throw Error(`${s.id}: no authored portal space`);
 s.entryEdge=edges.entry;s.exitEdge=edges.exit;s.entryPosition=anchors[0];s.exitPosition=anchors[2];
 s.playerSpawn={...anchors[0],facing:inwardFacing[edges.entry]};s.objective={...s.objective!,...anchors[1]};s.exit={x:anchors[2].x-0.6,y:anchors[2].y-0.6,w:1.2,h:1.2};
 function path(a:Point,b:Point):Point[]{const p=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);if(p.at(-2)!==b.x*TILE||p.at(-1)!==b.y*TILE)throw Error(`${s.id}: unreachable route`);return [a,...Array.from({length:p.length/2},(_,i)=>({x:p[i*2]/TILE,y:p[i*2+1]/TILE}))];}
 const risk=path(anchors[0],anchors[1]),safe=[...path(anchors[0],anchors[3]),...path(anchors[3],anchors[1]).slice(1)],escape=path(anchors[1],anchors[2]);
 const protectedRoutes=[risk,safe,escape];
 const segments=protectedRoutes.flatMap(r=>r.slice(1).map((p,i)=>[r[i],p]));
 const protectedAnchors=[...anchors];
 const wallBlockers=nav.blockers;
 const kinds=[LANDMARK_KINDS[chapter][mission],...palette[chapter]];
 // Functional props occupy rooms, not protected walking corridors. Every role comes from PROP_KIT.
 for(let y=2.1;y<h-1;y+=2.1)for(let x=2.1;x<w-1;x+=2.1){
  const kind=kinds[s.props.length%kinds.length],spec=PROP_KIT[kind];
  const p={x,y,kind};if(!floor[Math.floor(y)]?.[Math.floor(x)])continue;
  if(protectedAnchors.some(a=>distance(a,p)<1.5))continue;
  const hw=spec.footprint.w/2,ph=spec.footprint.h;
  if(![-hw,hw].every(dx=>[-ph,0].every(dy=>clearSegment((x+dx)*TILE,(y+dy)*TILE,(x+dx)*TILE,(y+dy)*TILE,wallBlockers,12))))continue;
  const box=[(x-hw)*TILE,(y-ph)*TILE,(x+hw)*TILE,y*TILE];
  if(spec.blocksMovement&&segments.some(([a,b])=>!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,box,14)))continue;
  s.props.push(p);
 }
 s.props.push({kind:'objectiveCase',x:anchors[1].x,y:anchors[1].y+0.12});
 const landmarkKind=LANDMARK_KINDS[chapter][mission];
 const landmark=s.props.filter(p=>p.kind===landmarkKind).sort((a,b)=>distance(a,anchors[0])-distance(b,anchors[0]))[0];
 if(!landmark)throw Error(`${s.id}: no room for landmark`);
 s.landmark={name:LANDMARKS[chapter][mission],kind:landmark.kind,x:landmark.x,y:landmark.y};
 s.lights=[{...anchors[1],radius:2.4,kind:'warm',intensity:0.9},...anchors.filter((_,i)=>i!==1).map(p=>({...p,radius:3.2,kind:STAGE_PALETTES[c.theme].light,intensity:0.5}))];
 s.lights.push({x:landmark.x,y:landmark.y,radius:2.5,kind:STAGE_PALETTES[c.theme].light,intensity:0.8});
 s.testRoutes=[{name:'safe: wall-side observation and cover approach',points:safe},{name:'risk: direct cross-room approach',points:risk}];
 s.escapeRoutes=[{name:'escape: independent objective-to-exit leg',points:escape}];
 stage=compileStage(s);nav=buildNavigation(stage,BODY.guardRadius);
 const nodes=available().filter(p=>clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,nav.blockers,BODY.playerRadius));
 const guardCount=Math.min(6,2+Math.floor(chapter/3)+Math.floor(mission/2));
 const roamingCount=mission<2?0:Math.min(guardCount-1,mission-1);
 const used:Point[]=[];
 // Objective watcher has one inspection stop and look-away waits: never a permanent cone gate.
 const objective=anchors[1];
 const watchers=nodes.filter(p=>distance(p,anchors[0])>5&&distance(p,objective)>2&&distance(p,objective)<3.4&&clearSegment(p.x*TILE,p.y*TILE,objective.x*TILE,objective.y*TILE,stage.visionBlockers));
 if(!watchers.length)throw Error(`${s.id}: no visible case inspection point`);
 const watcher=watchers.sort((a,b)=>distance(b,anchors[2])-distance(a,anchors[2]))[0];used.push(watcher);
 for(let i=0;i<guardCount;i++){
  const isObjective=i===guardCount-1;
  let start=watcher;
  if(!isObjective){
   const candidates=nodes.filter(p=>distance(p,objective)>4&&distance(p,anchors[0])>5&&used.every(q=>distance(p,q)>3));
   if(!candidates.length)throw Error(`${s.id}: guard density exceeds available zones`);
   const exitPost=mission>=3&&i===guardCount-2&&i>=roamingCount;
   start=candidates.sort((a,b)=>exitPost?distance(a,anchors[2])-distance(b,anchors[2]):Math.min(...used.map(q=>distance(b,q)))-Math.min(...used.map(q=>distance(a,q))))[0];used.push(start);
  }
  const role=isObjective?'objective':i<roamingCount?'roaming':mission>=3&&i===guardCount-2?'exit':i%2?'corridor':'room';
  const stops=nodes.filter(p=>distance(p,start)>=1.5&&distance(p,start)<(role==='roaming'?5:3.5)&&distance(p,anchors[0])>4.8&&
   (isObjective||distance(p,objective)>3.7)&&clearSegment(start.x*TILE,start.y*TILE,p.x*TILE,p.y*TILE,nav.blockers,BODY.guardRadius));
  // Prototype chamber's long cross-lab escape needs a longer inspection interval.
  const inspectionWait=s.id==='04-05'?7:5;
  const points:PatrolPoint[]=[{...start,waitDuration:isObjective?inspectionWait:1.5,lookDirection:isObjective?Math.atan2(objective.y-start.y,objective.x-start.x):undefined,turnDuration:1.1}];
  for(const p of stops.sort((a,b)=>distance(b,start)-distance(a,start))){
   if(points.every(q=>distance(p,q)>1&&clearSegment(p.x*TILE,p.y*TILE,q.x*TILE,q.y*TILE,nav.blockers,BODY.guardRadius)))points.push({...p,waitDuration:isObjective?2:1+mission*0.2,lookDirection:isObjective?Math.atan2(objective.y-p.y,objective.x-p.x):undefined,turnDuration:1.1});
   if(points.length===3)break;
  }
  if(points.length<2)throw Error(`${s.id}: patrol cannot move`);
  const id=`${s.id}-g${i+1}`;
  s.guards.push({...start,id,role,routeId:id,facing:isObjective?Math.atan2(start.y-objective.y,start.x-objective.x):Math.atan2(points[1].y-start.y,points[1].x-start.x),pace:0.8+mission*0.025,startDelay:isObjective?4:i*0.65,visionRange:3.5+mission*0.18,visionHalfAngle:Math.PI/6});
  s.patrolRoutes.push({id,points,mode:role==='roaming'?'roaming':isObjective?'pingpong':i%2?'waitAndLook':'loop'});
  (s.securityZones??=[]).push({name:role,x:start.x,y:start.y,radius:role==='roaming'?5:3.5,guardId:id});
  if(isObjective)s.objectiveZone={guardId:id,spotlight:true};
 }
 // Safe pockets are geometrically sheltered or outside every initial detection range.
 s.safeZones=nodes.filter(p=>distance(p,anchors[0])<3&&s.guards.every(g=>distance(g,p)>g.visionRange!||!clearSegment(g.x*TILE,g.y*TILE,p.x*TILE,p.y*TILE,stage.visionBlockers))).slice(0,2).map(p=>({...p,radius:0.25}));
 if(!s.safeZones.length)throw Error(`${s.id}: no safe waiting pocket`);
 return s;
}
// Non-Museum authoring keeps its original blueprint indices and serialized numbers.
// Campaign position is always resolved from the stable mission ID at runtime.
function buildAuthoredMission(index:number):StageDefinition {
 if(index<5)return applyMuseumTargetedAudit(applyMuseumCentralCover(applyMuseumDressing(applyMuseumFinalDesign(buildLegacyMission(index)))));
 if(index<10)return applyMuseumSecurityCleanup(applyMuseumCentralCover(applyMuseumDressing(applyMuseumFinalDesign(museumExpandedMissions[index-5]()))));
 if(index<20)return enrichGallery(galleryEnvironmentMission(index-9));
 if(index<30)return BANK_PRODUCTION[index-20];
 return buildLegacyMission(index-15);
}
/** Masterpiece (02-10) and Main Vault (03-10). */
export const HIGH_SECURITY_MISSIONS=new Set(['02-10','03-10']);
export function buildMission(index:number):StageDefinition {
 const authored=buildAuthoredMission(index);
 const secured=index<30?applySecurityData(authored):authored;
 const def=applyFurnishing(index<20?applyV5MuseumGallery(applyV3MuseumGallery(secured)):secured);
 // Chapter finales guard their prize with a pickup alarm instead of waiting for a witness.
 if(HIGH_SECURITY_MISSIONS.has(def.id)&&def.objective)return {...def,objective:{...def.objective,highSecurity:true}};
 return def;
}
export const buildCampaign=()=>Array.from({length:MISSION_COUNT},(_,i)=>buildMission(i));
