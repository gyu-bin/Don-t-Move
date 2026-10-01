/** Authored Chapter 02 pilot layouts. Geometry and semantic exhibit beats, not Museum recolours. */
import type {StageDefinition,PropDef} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {BODY} from '../../src/game/guards/guardTuning';
import {buildNavigation,clearSegment,findPath,nodeX,nodeY} from '../../src/game/world/navigation';

type EnvironmentAssetId=NonNullable<PropDef['visualAssetId']>;
type P={x:number;y:number};
type Room={name:string;purpose:string;x:number;y:number;w:number;h:number};
type Seed={title:string;rooms:Room[];links:Room[];entry:P;objective:P;exit:P;safe:P;guards:number;art:([number,EnvironmentAssetId,number?,number?,number?])[];required?:string[]};
const room=(name:string,purpose:string,x:number,y:number,w:number,h:number):Room=>({name,purpose,x,y,w,h});
const link=(x:number,y:number,w:number,h:number)=>room('Passage','connected circulation',x,y,w,h);
const SEEDS:Seed[]=[
 {title:'Front Exhibition',rooms:[room('Arrival','read the clean gallery axis',1,10,7,7),room('Sculpture Court','two-sided central artwork bypass',7,6,9,10),room('Featured Wall','approach artwork then take east exit',15,3,8,10)],links:[link(6,11,3,3),link(14,8,3,3)],entry:{x:2,y:14},objective:{x:20,y:5},exit:{x:21,y:11},safe:{x:10,y:14},guards:2,art:[[0,'gallery_white_wall',4.5,12],[1,'gallery_sculpture_large',11.5,11],[2,'gallery_masterpiece_wall',19.5,6],[2,'gallery_modern_bench',19,10],[1,'gallery_abstract_frame',11,6]]},
 {title:'Portrait Hall',rooms:[room('Reception','observe long axis',1,12,7,7),room('Portrait Spine','long LOS broken by paired art screens',7,3,8,16),room('Portrait Recess','side approach to featured collection',14,1,9,9)],links:[link(6,14,3,3),link(13,5,3,3)],entry:{x:2,y:16},objective:{x:20,y:3},exit:{x:21,y:8},safe:{x:9,y:6},guards:2,art:[[1,'gallery_movable_art_wall',11,14],[1,'gallery_white_wall',11,9],[1,'gallery_abstract_frame',10,3],[2,'gallery_masterpiece_wall',19.5,4],[0,'gallery_modern_bench',5,14]]},
 {title:'Sculpture Studio',rooms:[room('Studio Entrance','see sculpture before crossing',1,10,7,7),room('Model Studio','large sculptural island',7,5,10,12),room('Installation Annex','alternate installation path',8,1,9,5),room('Studio Collection','artwork and side return',16,5,8,10)],links:[link(6,12,3,3),link(15,8,3,3)],entry:{x:2,y:14},objective:{x:21,y:7},exit:{x:22,y:13},safe:{x:10,y:3},guards:3,art:[[1,'gallery_sculpture_large',11.5,11,1.6],[2,'gallery_installation_art',12,3.8],[3,'gallery_masterpiece_wall',20,8],[0,'gallery_low_pedestal',5,12],[3,'gallery_modern_bench',20,12]]},
 {title:'Modern Wing',rooms:[room('Arrival','read movable exhibition screens',1,13,8,7),room('Lower Installation','low plinths permit sight across route',8,11,11,9),room('Movable Wall Wing','alternate screen shoulders',8,2,10,9),room('Modern Collection','curated east wing',18,3,9,15)],links:[link(7,15,3,3),link(11,9,3,4),link(16,6,4,3),link(17,14,3,3)],entry:{x:2,y:17},objective:{x:24,y:5},exit:{x:25,y:16},safe:{x:10,y:5},guards:3,art:[[1,'gallery_central_plinth',13,16],[2,'gallery_movable_art_wall',13,7,1.8],[3,'gallery_sculpture_large',22,11],[3,'gallery_masterpiece_wall',23,6],[0,'gallery_modern_bench',5,15],[2,'gallery_low_pedestal',10,8]]},
 {title:"Collector's Room",rooms:[room('Reception','calm exhibit read',1,14,8,8),room('West Collection','safe screen-lined approach',1,4,8,9),room('Collector Atrium','central curated installation',9,7,11,13),room('Private Exhibition','mid-heist artwork',20,3,9,10),room('Service Gallery','independent return circulation',20,15,9,7)],links:[link(3,11,3,5),link(7,7,4,3),link(7,16,4,3),link(18,8,4,3),link(18,17,4,3),link(23,11,3,6)],entry:{x:2,y:19},objective:{x:26,y:5},exit:{x:27,y:20},safe:{x:5,y:6},guards:3,art:[[1,'gallery_movable_art_wall',5,9,1.5],[2,'gallery_installation_art',14,14,1.6],[2,'gallery_sculpture_large',17,10],[3,'gallery_masterpiece_wall',25,6],[4,'gallery_modern_bench',24,18],[0,'gallery_abstract_frame',5,14]]},
 {title:'Glass Gallery',rooms:[room('Threshold','distinguish route from inaccessible display',1,12,8,8),room('West Viewing Hall','long clean viewing line',1,2,8,10),room('Central Viewing Court','open installation crossing',9,6,10,14),room('East Viewing Hall','return axis opposite west',19,6,9,14),room('Glazed Study','featured wall, glazing needs full kit',19,1,9,5)],links:[link(4,10,3,4),link(7,15,4,3),link(7,7,4,3),link(17,15,4,3),link(21,4,3,4)],entry:{x:2,y:17},objective:{x:25,y:3},exit:{x:26,y:18},safe:{x:5,y:4},guards:3,art:[[1,'gallery_white_wall',5,8,1.7],[2,'gallery_installation_art',13.5,11,1.6],[3,'gallery_movable_art_wall',23,12,1.6],[4,'gallery_masterpiece_wall',24,4],[2,'gallery_low_pedestal',16,16]],required:['glass_panel','glazed_display_enclosure']},
 {title:"Curator's Floor",rooms:[room('Visitor Foyer','choose public or curator route',9,15,10,8),room('Public Portrait Wing','safe observation loop',1,8,9,14),room('Curator Study','investigation waypoint',1,1,10,7),room('Installation Crossroads','lure and break sight',11,3,10,12),room('Curated Collection','objective and east return',21,4,9,17)],links:[link(8,18,4,3),link(4,6,3,4),link(9,4,4,3),link(18,8,5,3),link(17,18,6,3)],entry:{x:12,y:21},objective:{x:27,y:6},exit:{x:28,y:19},safe:{x:4,y:3},guards:4,art:[[1,'gallery_movable_art_wall',5.5,15,1.6],[2,'gallery_central_plinth',6,4],[3,'gallery_installation_art',16,10,1.5],[4,'gallery_masterpiece_wall',26,7],[4,'gallery_sculpture_large',25,14],[0,'gallery_modern_bench',15,18]],required:['curator_desk']},
 {title:'Grand Atrium',rooms:[room('West Arrival','read the large open centre',1,12,8,8),room('North Art Terrace','safe upper bypass',6,1,18,7),room('Grand Atrium','exposed crossing with two sculpture shoulders',8,8,17,13),room('East Collection','featured artwork',25,4,8,13),room('South Return','independent escape corridor',15,22,18,7)],links:[link(4,6,4,8),link(7,14,3,3),link(16,6,4,4),link(23,10,4,3),link(28,15,3,9),link(18,19,3,5)],entry:{x:2,y:17},objective:{x:30,y:6},exit:{x:31,y:27},safe:{x:10,y:4},guards:4,art:[[2,'gallery_sculpture_large',13,15,1.7],[2,'gallery_installation_art',20,16,1.7],[1,'gallery_movable_art_wall',15,4.5,1.5],[3,'gallery_masterpiece_wall',29,7],[4,'gallery_modern_bench',24,25],[2,'gallery_central_plinth',17,11]]},
 {title:'Private Collection',rooms:[room('Reception','read paired collection routes',1,16,8,8),room('West Collection','safe exhibit cluster',1,5,8,10),room('North Salon','connect safe and risky approach',9,1,11,8),room('Central Collection','risk installation route',9,10,11,14),room('East Exhibition','masterpiece cluster',20,3,10,12),room('Private Return','exit pressure and respite',21,17,9,7)],links:[link(3,13,3,5),link(7,7,4,3),link(12,7,3,5),link(7,18,4,3),link(18,5,4,3),link(18,19,5,3),link(24,13,3,6)],entry:{x:2,y:21},objective:{x:27,y:5},exit:{x:28,y:22},safe:{x:12,y:4},guards:5,art:[[1,'gallery_movable_art_wall',5,10,1.6],[2,'gallery_sculpture_large',15.5,5.5,1.5],[3,'gallery_installation_art',14,17,1.7],[4,'gallery_masterpiece_wall',26,6],[4,'gallery_central_plinth',25,11],[5,'gallery_modern_bench',25,20],[3,'gallery_low_pedestal',17,13]],required:['private_collection_case']},
 {title:'Masterpiece',rooms:[room('South Entrance','establish opposite-side escape',11,20,11,8),room('West Installation','safe peripheral circulation',1,10,10,16),room('Portrait Terrace','upper bypass and refuge',1,1,13,9),room('Masterpiece Court','major artwork approach',14,1,15,10),room('Atrium Crossing','risk central installation',11,11,12,9),room('East Escape Gallery','post-theft opposite-side escape',24,11,9,16)],links:[link(9,22,4,3),link(5,8,3,4),link(12,4,4,3),link(17,9,3,4),link(21,15,5,3),link(25,8,3,5)],entry:{x:16,y:26},objective:{x:26,y:5},exit:{x:31,y:13},safe:{x:8,y:4},guards:5,art:[[1,'gallery_installation_art',6,17,1.7],[2,'gallery_movable_art_wall',8,6,1.6],[3,'gallery_masterpiece_wall',25,6],[3,'gallery_sculpture_large',20,6.5,1.7],[4,'gallery_installation_art',16,16,1.8],[5,'gallery_movable_art_wall',28,20,1.5],[0,'gallery_modern_bench',18,23],[4,'gallery_low_pedestal',20,13]]},
];
/** Per-zone authored exhibition clusters: modern screens shape circulation, not decorative scatter. */
type ExhibitPlan={central:EnvironmentAssetId;scale:number;fx:number;fy:number;edgeScale:number;soft:'gallery_low_pedestal'|'gallery_modern_bench'|'gallery_central_plinth'};
const exhibit=(central:EnvironmentAssetId,scale=1.6,fx=.65,fy=.56,edgeScale=1.4,soft:ExhibitPlan['soft']='gallery_low_pedestal'):ExhibitPlan=>({central,scale,fx,fy,edgeScale,soft});
const EXHIBITIONS:ExhibitPlan[][]=[
 [exhibit('gallery_movable_art_wall',1.7,.62,.6,1.3,'gallery_modern_bench'),exhibit('gallery_sculpture_large',2,.61,.58),exhibit('gallery_masterpiece_wall',1.5,.65,.6,1.3,'gallery_modern_bench')],
 [exhibit('gallery_sculpture_large',1.5,.65,.56),exhibit('gallery_movable_art_wall',2.4,.64,.53,1.5,'gallery_modern_bench'),exhibit('gallery_masterpiece_wall',1.6,.68,.65)],
 [exhibit('gallery_sculpture_large',1.6,.65,.6),exhibit('gallery_sculpture_large',2.5,.59,.6,1.7),exhibit('gallery_sculpture_large',1.5,.67,.65,1.3),exhibit('gallery_masterpiece_wall',1.5,.63,.61)],
 [exhibit('gallery_movable_art_wall',2,.64,.62),exhibit('gallery_movable_art_wall',2.7,.6,.55,1.8,'gallery_central_plinth'),exhibit('gallery_movable_art_wall',2.4,.61,.57,1.5),exhibit('gallery_installation_art',2,.65,.56,1.6,'gallery_modern_bench')],
 [exhibit('gallery_movable_art_wall',1.7,.62,.57),exhibit('gallery_sculpture_large',1.8,.65,.57,1.5),exhibit('gallery_installation_art',2.6,.59,.57,1.9,'gallery_central_plinth'),exhibit('gallery_masterpiece_wall',1.8,.61,.63),exhibit('gallery_movable_art_wall',2,.63,.6,1.5,'gallery_modern_bench')],
 [exhibit('gallery_movable_art_wall',1.8,.67,.6),exhibit('gallery_white_wall',1.6,.66,.67),exhibit('gallery_installation_art',2.3,.63,.55,1.9,'gallery_central_plinth'),exhibit('gallery_sculpture_large',2,.65,.6,1.8,'gallery_modern_bench'),exhibit('gallery_masterpiece_wall',1.6,.66,.68,1.3)],
 [exhibit('gallery_movable_art_wall',1.9,.61,.59),exhibit('gallery_sculpture_large',2.1,.66,.57,1.7,'gallery_modern_bench'),exhibit('gallery_installation_art',1.8,.64,.65,1.5,'gallery_central_plinth'),exhibit('gallery_movable_art_wall',2.5,.62,.57,1.8),exhibit('gallery_masterpiece_wall',1.9,.64,.58,1.6,'gallery_modern_bench')],
 [exhibit('gallery_movable_art_wall',1.8,.65,.6),exhibit('gallery_movable_art_wall',2.3,.6,.62,1.8,'gallery_modern_bench'),exhibit('gallery_sculpture_large',2.6,.57,.58,2,'gallery_central_plinth'),exhibit('gallery_masterpiece_wall',1.7,.63,.59,1.4),exhibit('gallery_movable_art_wall',2.7,.6,.6,1.8,'gallery_modern_bench')],
 [exhibit('gallery_movable_art_wall',1.8,.62,.6),exhibit('gallery_sculpture_large',2.1,.65,.58,1.6),exhibit('gallery_movable_art_wall',2.3,.62,.64,1.5,'gallery_modern_bench'),exhibit('gallery_installation_art',2.4,.62,.58,1.9,'gallery_central_plinth'),exhibit('gallery_masterpiece_wall',1.8,.62,.61,1.6),exhibit('gallery_movable_art_wall',2,.63,.61,1.4,'gallery_modern_bench')],
 [exhibit('gallery_movable_art_wall',2.2,.61,.6,1.6,'gallery_modern_bench'),exhibit('gallery_installation_art',2.4,.66,.56,1.9),exhibit('gallery_movable_art_wall',2.6,.65,.64,1.8,'gallery_modern_bench'),exhibit('gallery_masterpiece_wall',2.4,.63,.65,1.9),exhibit('gallery_installation_art',2.5,.63,.57,1.9,'gallery_central_plinth'),exhibit('gallery_movable_art_wall',2.1,.65,.62,1.8,'gallery_modern_bench')],
];
export function galleryExhibitClusters(mission:number){const seed=SEEDS[mission-1];return seed.rooms.map((r,i)=>({id:`02-${String(mission).padStart(2,'0')}-${String.fromCharCode(65+i)}`,name:r.name,bounds:{x:r.x,y:r.y,w:r.w,h:r.h},plan:EXHIBITIONS[mission-1][i],central:mission===6&&i===1?{x:7,y:9.7}:{x:r.x+r.w*EXHIBITIONS[mission-1][i].fx,y:r.y+r.h*EXHIBITIONS[mission-1][i].fy},edge:{x:r.x+2.32,y:r.y+.35*EXHIBITIONS[mission-1][i].edgeScale},soft:{x:r.x+(i===0&&mission<=3?1.55:1.85),y:r.y+r.h-1.65}}));}
export const GALLERY_FULL_KIT_REQUIRED=Object.fromEntries(SEEDS.map((s,i)=>[`02-${String(i+1).padStart(2,'0')}`,s.required??[]]));
const ASSET_KIND:Partial<Record<EnvironmentAssetId,PropDef['kind']>>={gallery_white_wall:'partition',gallery_movable_art_wall:'partition',gallery_sculpture_large:'statue',gallery_installation_art:'equipment',gallery_central_plinth:'table',gallery_low_pedestal:'statuePedestal',gallery_modern_bench:'bench',gallery_abstract_frame:'painting',gallery_track_light:'lamp',gallery_masterpiece_wall:'partition'};
function layout(seed:Seed){const spaces=[...seed.rooms,...seed.links],w=Math.max(...spaces.map(r=>r.x+r.w))+1,h=Math.max(...spaces.map(r=>r.y+r.h))+1;const floor=Array.from({length:h},()=>Array<boolean>(w).fill(false));for(const r of spaces)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)floor[y][x]=true;return floor.map((row,y)=>row.map((v,x)=>v?'.':[-1,0,1].some(dy=>[-1,0,1].some(dx=>floor[y+dy]?.[x+dx]))?'#':' ').join(''));}
const dist=(a:P,b:P)=>Math.hypot(a.x-b.x,a.y-b.y);
export function describeGalleryDesign(def:StageDefinition){const seed=SEEDS[(def.mission??1)-1];return {missionId:def.id,zones:seed.rooms.map((r,i)=>({id:`${def.id}-${String.fromCharCode(65+i)}`,name:r.name,purpose:r.purpose,bounds:{x:r.x,y:r.y,w:r.w,h:r.h},landmark:EXHIBITIONS[(def.mission??1)-1][i].central,guardIds:def.guards.filter(g=>def.securityZones?.find(z=>z.guardId===g.id)?.name===seed.rooms[i].name||(g.role==='objective'&&[2,2,3,3,3,4,4,3,4,3][(def.mission??1)-1]===i)).map(g=>g.id)})),fullKitRequired:seed.required??[],reviewStatus:'USER_PLAY_REVIEW_REQUIRED' as const};}
export function galleryEnvironmentMission(mission:number):StageDefinition{
 const source=SEEDS[mission-1];const seed=source?{...source,entry:{...source.entry},exit:{...source.exit}}:undefined;if(!seed)throw Error(`Unknown Gallery mission ${mission}`);const id=`02-${String(mission).padStart(2,'0')}`;
 const rows=layout(seed);seed.exit.x=rows[0].length-1.6;if(mission===7||mission===10)seed.entry.y=rows.length-1.6;
 if(mission===10)seed.exit={x:6,y:1.6};
 // Studio collection is stolen in the east; escape returns through the sculpture studio to the west entrance.
 if(mission===3)seed.exit={x:1.6,y:15.5};
 if(mission===4)seed.exit={x:1.6,y:18.5};
 if(mission===7)seed.exit={x:16,y:rows.length-1.6};
 // Intro escapes still stay compact, but leave the stolen-work room through an adjacent exhibit zone.
 if(mission===1)seed.exit={x:12.5,y:15.4};
 if(mission===2)seed.exit={x:7.6,y:4.5};
 if(mission===3)seed.safe={x:9,y:4.2};if(mission===7)seed.safe={x:9,y:2};if(mission===10)seed.safe={x:9.45,y:8};
 const props:PropDef[]=[];
 const add=(asset:EnvironmentAssetId,x:number,y:number,scale=1)=>props.push({kind:ASSET_KIND[asset]!,visualAssetId:asset,x,y,scale,collisionScale:scale});
 for(const c of galleryExhibitClusters(mission)){
  add(c.plan.central,c.central.x,c.central.y,c.plan.scale);
  add('gallery_movable_art_wall',c.edge.x,c.edge.y,c.plan.edgeScale);
  add(c.plan.soft,c.soft.x,c.soft.y,.85);
 }
 // Secondary atrium installation creates a second crossing shoulder, separated from the centerpiece.
 if(mission===8)add('gallery_installation_art',20.7,12.2,2.1);
 // Portrait spine uses a staggered wall-end: the direct line and sheltered return have different shoulders.
 if(mission===2)add('gallery_sculpture_large',12.5,8,1.4);
 if(mission===3){const soft=props.find(p=>p.visualAssetId==='gallery_low_pedestal'&&p.x===9.85)!;soft.y=4.7;}
 // Glazed, inaccessible exhibit bay. Vector technical placeholder is explicit FULL KIT REQUIRED.
 if(mission===6){
  const x=3.1,y=4.7,w=3.5,h=3,scale=w/1.4,verticalScale=h/1.4;
  props.push({kind:'galleryGlassPanel',x:x+w/2,y,scale,collisionScale:scale},{kind:'galleryGlassPanel',x:x+w/2,y:y+h,scale,collisionScale:scale},
   {kind:'galleryGlassPanelVertical',x,y:y+h,scale:verticalScale,collisionScale:verticalScale},{kind:'galleryGlassPanelVertical',x:x+w,y:y+h,scale:verticalScale,collisionScale:verticalScale});
  // The restricted study is visible through glass, not the mission's reachable objective.
  add('gallery_low_pedestal',x+w/2,y+h/2,1.4);
  // A medium sculptural exhibit is visible through the inaccessible glazed bay; the low base never blocks LOS.
  props.at(-1)!.visualAssetId='gallery_sculpture_large';
  seed.safe={x:2,y:5};
  const topSoft=props.find(p=>p.visualAssetId==='gallery_low_pedestal'&&p.x===20.85)!;topSoft.y=4.7;
  const westCentre=props.find(p=>p.visualAssetId==='gallery_white_wall')!;westCentre.x=7;westCentre.y=9.7;

 }
 // Objective interaction remains nonblocking; the artwork wall itself is a separate real divider.
 const goalZone=[2,2,3,3,3,4,4,3,4,3][mission-1],goalRoom=seed.rooms[goalZone];
 seed.objective={x:goalRoom.x+goalRoom.w-.95,y:goalRoom.y+2.6};
 if(mission===8)seed.objective={x:31.9,y:6.6};
 props.push({kind:'objectiveCase',x:seed.objective.x,y:seed.objective.y+.12,visualAssetId:'gallery_low_pedestal'});
 // Track fixtures and wall art are non-solid. Never fabricate unavailable glass / collector-case art.
 seed.rooms.forEach((r,i)=>{props.push({kind:'lamp',visualAssetId:'gallery_track_light',x:r.x+r.w/2,y:r.y+1});if(i%2===1)props.push({kind:'painting',visualAssetId:'gallery_abstract_frame',x:r.x+2,y:r.y,scale:.85});});
 const s:StageDefinition={id,number:10+mission,chapter:2,mission,title:seed.title,theme:'gallery',structurePlan:seed.rooms.map(r=>`${r.name} (${r.purpose})`).join(' → '),layout:layout(seed),props,lights:seed.rooms.map(r=>({x:r.x+r.w/2,y:r.y+r.h/2,radius:Math.min(r.w,r.h)*.55,kind:'warm' as const,intensity:.38})),ambientDarkness:.22,playerSpawn:{...seed.entry,facing:-Math.PI/2},objective:{...seed.objective,kind:'painting'},exit:{x:seed.exit.x-.6,y:seed.exit.y-.6,w:1.2,h:1.2},entryPosition:seed.entry,exitPosition:seed.exit,entryEdge:mission===7||mission===10?'bottom':'left',exitEdge:mission===10?'top':[2,3,4].includes(mission)?'left':[1,7].includes(mission)?'bottom':'right',guards:[],patrolRoutes:[]};
 const landmarkZone=[1,2,1,1,2,2,2,2,3,3][mission-1],landmarkPoint=galleryExhibitClusters(mission)[landmarkZone].central;
 const featured=props.find(p=>Math.abs(p.x-landmarkPoint.x)<.001&&Math.abs(p.y-landmarkPoint.y)<.001)!;s.landmark={name:`${seed.title} featured artwork`,kind:featured.kind,x:featured.x,y:featured.y};
 s.lights.push({...seed.objective,radius:2.8,kind:'warm',intensity:.9});
 let stage=compileStage(s),nav=buildNavigation(stage,BODY.playerRadius+9);
 const path=(a:P,b:P)=>{const p=findPath(nav,a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE);if(p.length<2||Math.hypot(p.at(-2)!/TILE-b.x,p.at(-1)!/TILE-b.y)>.01)throw Error(`${id}: authored route inaccessible ${JSON.stringify(a)} → ${JSON.stringify(b)}`);return [a,...Array.from({length:p.length/2},(_,i)=>({x:p[2*i]/TILE,y:p[2*i+1]/TILE}))];};
 const safe=[...path(seed.entry,seed.safe),...path(seed.safe,seed.objective).slice(1)],risk=path(seed.entry,seed.objective),escape=path(seed.objective,seed.exit);s.testRoutes=[{name:'safe: peripheral curated exhibit observation',points:safe},{name:'risk: open exhibition crossing',points:risk},{name:'main: featured artwork reveal',points:risk}];s.escapeRoutes=[{name:'escape: independent collection-to-exit circulation',points:escape},{name:'escape: sheltered return via observation terrace',points:[...path(seed.objective,seed.safe),...path(seed.safe,seed.exit).slice(1)]}];
 s.safeZones=[{...seed.entry,radius:.5},{...seed.safe,radius:.4}];
 nav=buildNavigation(stage,BODY.guardRadius);const nodes=nav.walkable.flatMap((v,i)=>v?[{x:nodeX(nav,i)/TILE,y:nodeY(nav,i)/TILE}]:[]).filter(p=>clearSegment(p.x*TILE,p.y*TILE,p.x*TILE,p.y*TILE,stage.movementBlockers,BODY.playerRadius));const used:P[]=[];
 for(let n=0;n<seed.guards;n++){
  const objective=n===seed.guards-1,zone=seed.rooms[objective?goalZone:(n+1)%seed.rooms.length];
  const candidates=nodes.filter(p=>dist(p,seed.entry)>5&&used.every(q=>dist(q,p)>3)&&(!objective||dist(p,seed.objective)>2&&dist(p,seed.objective)<3.5&&clearSegment(p.x*TILE,p.y*TILE,seed.objective.x*TILE,seed.objective.y*TILE,stage.visionBlockers)));
  const target=objective?seed.objective:{x:zone.x+zone.w*.6,y:zone.y+zone.h*.55};candidates.sort((a,b)=>dist(a,target)-dist(b,target));const start=candidates.find(p=>{const route=findPath(nav,seed.entry.x*TILE,seed.entry.y*TILE,p.x*TILE,p.y*TILE);return route.length>=2&&Math.hypot(route.at(-2)!-p.x*TILE,route.at(-1)!-p.y*TILE)<.01;});if(!start)throw Error(`${id}: no semantic patrol anchor`);used.push(start);
  const stop=nodes.filter(p=>dist(p,start)>2&&dist(p,start)<4&&dist(p,seed.entry)>4&&clearSegment(p.x*TILE,p.y*TILE,start.x*TILE,start.y*TILE,stage.movementBlockers,BODY.guardRadius)).sort((a,b)=>dist(b,start)-dist(a,start))[0];if(!stop)throw Error(`${id}: no patrol return`);
  const guardId=`${id}-g${n+1}`,role=objective?'objective':n===seed.guards-2&&mission>=5?'exit':n%2?'corridor':'room';
  const points=[start,stop].map((p,i)=>({...p,waitDuration:objective?(i?2:5):2,lookDirection:objective&&i===0?Math.atan2(seed.objective.y-p.y,seed.objective.x-p.x):Math.atan2(i?start.y-stop.y:stop.y-start.y,i?start.x-stop.x:stop.x-start.x),turnDuration:1.1}));
  s.guards.push({...start,id:guardId,routeId:guardId,role,theftRole:objective?'objective':role==='room'?'zone':role,theftPosts:[start,stop],facing:objective?Math.atan2(start.y-seed.objective.y,start.x-seed.objective.x):Math.atan2(stop.y-start.y,stop.x-start.x),pace:.8,startDelay:objective?4:n*.65,visionRange:3.5,visionHalfAngle:Math.PI/6});s.patrolRoutes.push({id:guardId,mode:'pingpong',points});(s.securityZones??=[]).push({name:objective?'Featured artwork inspection':zone.name,...start,radius:3.5,guardId});if(objective)s.objectiveZone={guardId,spotlight:true};
 }
 if(mission===8){const g=s.guards[1],r=s.patrolRoutes[1],a={x:19.5,y:14.5},b={x:22.5,y:17.5};g.x=a.x;g.y=a.y;g.facing=Math.atan2(b.y-a.y,b.x-a.x);g.theftPosts=[a,b];r.points=[a,b].map((p,i)=>({...p,waitDuration:2,lookDirection:Math.atan2(i?a.y-b.y:b.y-a.y,i?a.x-b.x:b.x-a.x),turnDuration:1.1}));Object.assign(s.securityZones![1],a);}
 s.patrolPlan={zones:seed.rooms.map((r,i)=>({id:`Z${i}`,name:r.name})),anchors:s.patrolRoutes.flatMap((r,n)=>r.points.map((p,i)=>({id:`${r.id}-${i}`,zone:`Z${n===s.guards.length-1?goalZone:(n+1)%seed.rooms.length}`,subject:objectiveSubject(s,n),x:p.x,y:p.y,look:p.lookDirection??0,wait:p.waitDuration??2}))),assignments:s.guards.map((g,n)=>({guardId:g.id,zones:[`Z${n===s.guards.length-1?goalZone:(n+1)%seed.rooms.length}`],anchors:[`${g.id}-0`,`${g.id}-1`],roaming:false}))};
 // Sixth final-mission guard covers the previously unstaffed east escape gallery, not the objective pile.
 if(mission===10){
  const id6=`${id}-g6`,a={x:25.25,y:17.25},b={x:26.25,y:22.75};
  const points=[a,b].map((p,i)=>({...p,waitDuration:2,lookDirection:Math.atan2(i?a.y-b.y:b.y-a.y,i?a.x-b.x:b.x-a.x),turnDuration:1.1}));
  s.guards.push({...a,id:id6,routeId:id6,role:'roaming',theftRole:'roaming',theftPosts:[a,b],facing:Math.atan2(b.y-a.y,b.x-a.x),pace:.8,startDelay:3.25,visionRange:3.5,visionHalfAngle:Math.PI/6});
  s.patrolRoutes.push({id:id6,mode:'pingpong',points});
  s.securityZones!.push({name:'East Escape Gallery / roaming response',...a,radius:3.5,guardId:id6});
  s.patrolPlan.anchors.push(...points.map((p,i)=>({id:`${id6}-${i}`,zone:'Z5',subject:'East Escape Gallery / roaming response',x:p.x,y:p.y,look:p.lookDirection,wait:p.waitDuration})));
  s.patrolPlan.assignments.push({guardId:id6,zones:['Z5'],anchors:[`${id6}-0`,`${id6}-1`],roaming:true});
  // Authored theft posts split objective verification, upper exit checks, crossing control and east search.
  s.guards[1].theftRole='exit';s.guards[1].theftPosts=[{x:6.5,y:2.5},{x:8.75,y:5.25}];
  s.guards[2].theftRole='corridor';s.guards[2].theftPosts=[{x:13.5,y:5.5},{x:17.2,y:5.5}];
  s.guards[3].theftRole='zone';
 }
 stage=compileStage(s);for(const r of [...s.testRoutes,...s.escapeRoutes])for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,BODY.playerRadius))throw Error(`${id}: route body collision`);}return s;
}
function objectiveSubject(s:StageDefinition,n:number){return n===s.guards.length-1?'Featured artwork inspection':SEEDS[s.mission!-1].rooms[(n+1)%SEEDS[s.mission!-1].rooms.length].name;}
