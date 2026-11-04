/** Gallery extension: layered portrait halls feeding a separate handling/loading escape. */
import type {V13Mission,V13Structure} from './v13Types';

export const GALLERY_EXPANSION_ARCHETYPES:Record<string,string>={
 '02-06':'02-01','02-07':'02-02','02-08':'02-03','02-09':'02-04','02-10':'02-05',
};
export const GALLERY_EXPANSION_NAMES_KO=['서쪽 초상화전','조각 회랑','큐레이터 보관실','회전 전시실','마지막 걸작'];

type Spec={id:string;title:string;columns:[number,number,number];rows:[number,number,number];
 westOpening:number;eastOpening:number;riskOpening:number;arrivalDoor:number;handlingDoor:number;
 loadingDoor:number;quickDoor:number;guards:2|3;camera:boolean;island:'portraits'|'sculptures'|'archive'|'rotation'|'masterpiece'};

/** Rectangle filling is only a drafting aid. Thresholds, sight breaks and patrol subjects are explicit. */
function galleryLayers(s:Spec):V13Mission{
 const [a,b,c]=s.columns,[north,middle,south]=s.rows;
 const x=1+a+2,z=x+b+2,y=1+north+2,v=y+middle+2,W=z+c+1,H=v+south+1;
 const grid=Array.from({length:H},()=>Array<string>(W).fill('#'));
 const fill=(xx:number,yy:number,w:number,h:number,ch:string)=>{for(let j=yy;j<yy+h;j++)for(let i=xx;i<xx+w;i++)grid[j][i]=ch;};
 fill(1,1,a,north,'h');fill(x,1,b,north,'r');fill(z,1,c,north,'o');
 fill(1,y,a,middle,'e');fill(x,y,b,middle,'b');fill(z,y,c,middle,'q');
 fill(x,v,b,south,'k');fill(z,v,c,south,'t');
 fill(s.arrivalDoor,north+1,3,2,'h');
 fill(a+1,s.westOpening,2,3,'h');fill(a+1,s.riskOpening,2,3,'h');
 fill(x+b,s.eastOpening,2,3,'r');
 fill(s.handlingDoor,north+1,3,2,'r');
 fill(s.loadingDoor,y+middle,3,2,'b');
 fill(z+1,north+1,3,2,'q');fill(s.quickDoor,y+middle,3,2,'q');
 fill(x+b,v+1,2,3,'k');
 if(s.island==='masterpiece')fill(x+b,y+1,2,3,'b');
 const pier={x:z+c-4,y:1,h:s.island==='masterpiece'||s.island==='rotation'||s.island==='archive'?4:3};fill(pier.x,pier.y,1,pier.h,'#');
 // A second, staggered art-wall mass differentiates a protected upper lane from the south crossing.
 const screen={x:x+Math.floor(b/2),y:north-2};if(s.island!=='sculptures')fill(screen.x,screen.y,1,2,'#');
 if(s.island==='sculptures')fill(x+4,3,2,2,'#');
 if(s.island==='rotation'){fill(z,1,1,2,'#');fill(z,y+middle-2,2,2,'#');}
 const entry={x:2.3,y:y+middle-1.6},objective={x:z+c-1.8,y:2.2},exit={x:z+c-1.5,y:v+south-1.5};
 const eh={x:a-.8,y:y+middle/2},hh={x:a-.8,y:north-1},rh={x:x+1.2,y:north-1},oh={x:z+c-1.2,y:north-1};
 const bh={x:x+1.5,y:y+middle-1.3},kh={x:x+b-1.3,y:v+south-1.5},qh={x:z+c-1.4,y:y+middle/2},th={x:z+c-1.4,y:v+south-1.5};
 const art=(name:string,kind:V13Structure['kind'],asset:V13Structure['asset'],xx:number,yy:number,scale:number,roles:V13Structure['roles']=['hiding','losBreak']):V13Structure=>({name,kind,asset,x:xx,y:yy,scale,roles});
 const structures:V13Structure[]=[
  art('Reception Portrait Wall','partition','gallery_movable_art_wall',a/2+1,y+middle/2,1.5,['divider','hiding','losBreak']),
  art('Arrival Bench','bench','gallery_modern_bench',1.8,y+1.1,.9,['divider','hiding']),
  art('Portrait Approach Wall','partition','gallery_movable_art_wall',a/2+1,north/2+1,1.8,['divider','hiding','losBreak']),
  art('Curator Sculpture','statue','gallery_sculpture_large',s.island==='sculptures'?x+b-2.2:x+b-3,s.island==='sculptures'?5.7:north-2.1,s.island==='sculptures'?1:1.4,['hiding','losBreak','divider']),
  art('Handling Entry Sculpture','statue','gallery_sculpture_large',x+3.8,y+.9,1.2,['hiding','losBreak']),
  art('Handling Art Wall','partition','gallery_movable_art_wall',x+b/2,y+middle/2,1.6,['hiding','losBreak','divider']),
  art('Loading Sculpture','statue','gallery_sculpture_large',x+b/2,v+south/2,1.5,['hiding','losBreak']),
  art('Quick Gallery Sculpture','statue','gallery_sculpture_large',z+c-2.9,y+middle/2,1.3,['hiding','losBreak']),
  art('Exit Bench','bench','gallery_modern_bench',z+1.8,v+1.2,1.3,['hiding','divider']),
  art('North Portrait A','painting','gallery_portrait_frame_a',2.2,1.3,1.4,['decor']),
  art('North Portrait C','painting','gallery_portrait_frame_c',x+2,1.3,1.4,['decor']),
  art('Private Portrait E','painting','gallery_portrait_frame_e',z+1.5,1.3,1.4,['decor']),
 ];
 if(s.island==='sculptures')structures.push(art('Handling South Screen','partition','gallery_movable_art_wall',x+3.4,y+middle-1,1.3,['hiding','losBreak']),art('Sculpture Core Portrait','painting','gallery_portrait_frame_c',x+4.5,3,1.3,['decor']));
 if(s.island==='archive')structures.push(art('Archive Catalogue Plinth','table','gallery_central_plinth',x+8,3,1.4,['divider','hiding']),art('Archive Glass Divider','galleryGlassPanelVertical',undefined,x+4,5.5,1.6,['divider','sightline']),art('Archive Opaque End','partition','gallery_movable_art_wall',x+4,6.8,1.5,['hiding','losBreak']));
 if(s.island==='rotation')structures.push(art('Rotating Exhibition Portrait','painting','gallery_portrait_frame_c',z+2,y+.3,1.4,['decor']));
 if(s.island==='masterpiece')structures.push(art('Handling South Screen','partition','gallery_movable_art_wall',x+3.4,y+middle-1,1.3,['hiding','losBreak']),art('Final Approach Screen','partition','gallery_movable_art_wall',a-2.15,north-1,1.1,['hiding','losBreak']),art('Masterpiece Forecourt Plinth','table','gallery_central_plinth',x+4,3,1.4,['divider','hiding']),art('Final Collection Portrait','painting','gallery_portrait_frame_a',x+b-1.5,1.3,1.5,['decor']));
 const stop=(xx:number,yy:number,lx:number,ly:number,wait=2)=>({x:xx,y:yy,look:{x:lx,y:ly},wait});
 const guards:V13Mission['guards']=[{role:'crossing',zone:'portrait',watches:'The upper portrait wall and the lower crossing from two visible inspection posts',stops:[stop(s.island==='rotation'?5.5:2.1,s.island==='archive'?4:s.island==='rotation'?2.8:3,a-1,s.island==='archive'?4:s.island==='rotation'?2.8:3,3),stop(a-1,north-1.2,2.1,north-1.2,2.5)]}];
 if(s.guards===3)guards.push({role:'escape',zone:'handling',watches:'Handling-side turn and loading threshold, leaving the far wall as a waiting side',stops:s.island==='masterpiece'?[stop(x+b-1.3,y+1.5,x+b-1.3,y+.5,4),stop(x+1.3,y+middle-1.2,x+1.3,y+1,3)]:[stop(x+2.8,y+2.3,x+b-1,y+2.3,2.5),stop(x+b-1.3,y+middle-1.1,x+1,y+middle-1.1,2.5)]});
 guards.push({role:'objective',zone:'private',watches:'Inspect the painting, then leave its bay to inspect the curator-side threshold',stops:[stop(objective.x,4.2,objective.x,objective.y,2),stop(z+1.4,north-1.3,x+b-1,north-1.3,4),...(s.island==='rotation'?[stop(x+b-.8,north-1.2,x+b+1,north-1.2,2)]:[])],startDelay:3});
 const west={x:a+2,y:s.westOpening+1.5},risk={x:a+2,y:s.riskOpening+1.5},east={x:x+b+1,y:s.eastOpening+1.5};
 const arrival={x:s.arrivalDoor+1.5,y:north+2},handling={x:s.handlingDoor+1.5,y:north+2},loading={x:s.loadingDoor+1.5,y:y+middle+1};
 const quick={x:s.quickDoor+1.5,y:y+middle+1};
 const mission:V13Mission={id:s.id,title:s.title,highSecurity:false,family:'Gallery',topology:`Layered ${s.island} halls with split portrait crossings`,map:grid.map(r=>r.join('')),
  zones:{
   e:{id:'entry',name:'After-hours Reception',role:'public',purpose:'Bench-side arrival before the portrait crossing',hub:eh},
   h:{id:'portrait',name:'West Portrait Walk',role:'public',purpose:'Opaque portrait wall divides a protected upper lane from the shorter lower crossing',hub:hh},
   r:{id:'curator',name:'Curator Gallery',role:'restricted',purpose:'Staggered sculpture and wall pier frame the private collection threshold',hub:rh},
   o:{id:'private',name:s.title+' Collection',role:'objective',purpose:'Painting behind an opaque collection pier, with a southward quick exit',hub:oh},
   q:{id:'quick',name:'East Exhibition Hall',role:'escape',purpose:'Short exhibition route; its southern door closes during lockdown',hub:qh},
   b:{id:'handling',name:'Art Handling Room',role:'escape',purpose:'Independent art-handling room reached by the curator-side alternate',hub:bh},
   k:{id:'loading',name:'Loading Gallery',role:'escape',purpose:'Second separate service zone leading east to the exit',hub:kh},
   t:{id:'exit',name:'South Exit',role:'escape',purpose:'Exit from the quick hall or the independent loading gallery',hub:th},
  },entry,objective,exit,entryEdge:'left',exitEdge:'bottom',placement:['left-centre','top-right','bottom-right'],
  edges:[
   {from:'entry',to:'portrait',role:'approach',via:[{x:arrival.x,y:y+middle-1},arrival,{x:arrival.x,y:north-1}]},
   {from:'portrait',to:'curator',role:'approach',via:[{x:hh.x,y:west.y},west,{x:rh.x,y:west.y}]},
   {from:'portrait',to:'curator',role:'risk',via:[{x:hh.x,y:risk.y},risk,{x:rh.x,y:risk.y}]},
   {from:'curator',to:'private',role:'approach',via:[{x:x+b-1.3,y:s.eastOpening+1.5},east],door:{at:east,orientation:'vertical'}},
   {from:'private',to:'quick',role:'quickEscape',via:[{x:z+2.5,y:north-1},{x:z+2.5,y:north+2},{x:z+2.5,y:y+1.1},{x:qh.x,y:y+1.1}]},
   {from:'quick',to:'exit',role:'quickEscape',via:[{x:quick.x,y:y+middle-1},quick,{x:quick.x,y:v+1}],door:{at:quick,orientation:'horizontal',lockdown:true}},
   {from:'private',to:'curator',role:'alternateEscape',via:[east]},
   {from:'curator',to:'handling',role:'alternateEscape',via:[{x:rh.x,y:north+.2},{x:handling.x,y:north+.2},handling,{x:handling.x,y:y+1}]},
   {from:'handling',to:'loading',role:'alternateEscape',via:[{x:loading.x,y:y+middle-1},loading,{x:loading.x,y:v+1}]},
   {from:'loading',to:'exit',role:'alternateEscape',via:[{x:x+b+1,y:v+2.5}]},
  ],approach:['entry','portrait','curator','private'],risk:['entry','portrait','curator','private'],quickEscape:['private','quick','exit'],alternateEscape:['private','curator','handling','loading','exit'],
  cover:{safe:['Arrival Bench','Portrait Approach Wall','Curator Sculpture','Curator Wall Pier','Collection Pier'],risk:['Portrait Approach Wall','Curator Sculpture'],escape:['Collection Pier','Quick Gallery Sculpture','Handling Art Wall','Loading Sculpture','Exit Bench']},structures,
  walls:[{name:'Collection Pier',roles:['hiding','losBreak','divider'],at:`opaque collection pier at ${pier.x},${pier.y}, ${pier.h} tiles long`},{name:'Curator Wall Pier',roles:['hiding','losBreak','divider'],at:`curator pier at ${screen.x},${screen.y}`}],guards,
  cameras:s.camera?[{zone:'curator',at:{x:x+1.2,y:2},facing:Math.PI/2,watches:'The curator-side lower crossing, readable before leaving the portrait wall'}]:[],
 };
 if(s.island==='masterpiece'){
  mission.alternateEscape=['private','quick','handling','loading','exit'];
  mission.edges=mission.edges.filter(e=>!(e.role==='alternateEscape'&&['private','curator'].includes(e.from)));
  const south=mission.edges.find(e=>e.from==='private'&&e.to==='quick')!;
  mission.edges.push({...south,role:'alternateEscape'},{from:'quick',to:'handling',role:'alternateEscape',via:[{x:qh.x,y:y+2.5},{x:x+b+1,y:y+2.5},{x:bh.x,y:y+2.5}]});
 }
 return mission;
}

export const V13_GALLERY_EXPANSION:V13Mission[]=[
 galleryLayers({id:'02-06',title:'West Portraits',columns:[7,9,7],rows:[8,7,5],westOpening:2,eastOpening:3,riskOpening:6,arrivalDoor:3,handlingDoor:11,loadingDoor:15,quickDoor:23,guards:2,camera:false,island:'portraits'}),
 galleryLayers({id:'02-07',title:'Sculpture Arcade',columns:[8,10,6],rows:[7,8,6],westOpening:1,eastOpening:2,riskOpening:5,arrivalDoor:4,handlingDoor:12,loadingDoor:17,quickDoor:25,guards:2,camera:false,island:'sculptures'}),
 galleryLayers({id:'02-08',title:'Curator Archive',columns:[7,11,7],rows:[9,6,5],westOpening:2,eastOpening:5,riskOpening:7,arrivalDoor:2,handlingDoor:11,loadingDoor:16,quickDoor:25,guards:3,camera:false,island:'archive'}),
 galleryLayers({id:'02-09',title:'Rotating Exhibition',columns:[9,9,7],rows:[8,8,5],westOpening:1,eastOpening:4,riskOpening:6,arrivalDoor:5,handlingDoor:13,loadingDoor:17,quickDoor:25,guards:2,camera:true,island:'rotation'}),
 galleryLayers({id:'02-10',title:'The Last Masterpiece',columns:[8,11,8],rows:[9,7,6],westOpening:3,eastOpening:4,riskOpening:7,arrivalDoor:3,handlingDoor:13,loadingDoor:18,quickDoor:26,guards:3,camera:true,island:'masterpiece'}),
];
