/** Museum extension: five authored exhibit circuits, with a distinct service-side escape after lockdown. */
import type {V13Mission,V13Structure} from './v13Types';

/** Security constants are copied from these reviewed Museum archetypes, never strengthened here. */
export const MUSEUM_EXPANSION_ARCHETYPES:Record<string,string>={
 '01-06':'01-01','01-07':'01-02','01-08':'01-03','01-09':'01-04','01-10':'01-05',
};
export const MUSEUM_EXPANSION_NAMES_KO=['서쪽 전시동','조각 안뜰','보존실 순환로','카메라 교차로','왕관 수집실'];

type Spec={id:string;title:string;widths:[number,number,number];heights:[number,number,number];
  topDoor:number;westDoor:number;entryDoor:number;eastDoor:number;serviceDoor:number;guards:2|3;camera:boolean;
  riskWestDoor?:number;riskEntryDoor?:number;publicName:string;restrictedName:string;serviceName:string;identity:string;feature:'cases'|'sculpture'|'conservation'|'camera'|'crown'};

/* The plans share an architectural vocabulary (public wing / secure chamber / service wing), but every
 * footprint, opening offset, exhibit island and patrol rhythm below is authored. The drawing helper only
 * fills the named rectangles and three-tile thresholds; it never invents routes, guards or decoration. */
function exhibitCircuit(s:Spec):V13Mission{
 const [lw,mw,rw]=s.widths,[th,mh,bh]=s.heights;
 const x0=1,x1=lw+3,x2=lw+mw+5,y0=1,y1=th+3,y2=th+mh+5;
 const W=x2+rw+1,H=y2+bh+1;
 const cells=Array.from({length:H},()=>Array<string>(W).fill('#'));
 const fill=(x:number,y:number,w:number,h:number,ch:string)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)cells[yy][xx]=ch;};
 fill(x0,y0,lw,th,'r');fill(x1,y0,mw,th,'o');fill(x2,y0,rw,th,'x');
 fill(x0,y1,lw,mh,'p');fill(x1,y1,mw,mh,'s');fill(x2,y1,rw,mh,'t');
 fill(x0,y2,lw,bh,'e');
 // Each threshold belongs to one adjacent zone, keeping every zone bounding box disjoint.
 fill(s.entryDoor,y1+mh,3,2,'e');fill(s.westDoor,y0+th,3,2,'p');
 if(s.riskEntryDoor!==undefined)fill(s.riskEntryDoor,y1+mh,3,2,'e');
 if(s.riskWestDoor!==undefined)fill(s.riskWestDoor,y0+th,3,2,'p');
 fill(x0+lw,s.topDoor,2,3,'r');fill(x1+mw,s.topDoor,2,3,'x');
 fill(x1+1,y0+th,3,2,'s');fill(x1+mw,s.serviceDoor,2,3,'t');
 fill(s.eastDoor,y0+th,3,2,'t');
 // A real opaque vault pier gives an escape shoulder within six tiles of pickup.
 const pier={x:s.feature==='crown'?x1+mw-4:x1+Math.floor(mw/2),y:s.feature==='crown'?3:th-3,h:s.feature==='crown'?3:2};
 fill(pier.x,pier.y,1,pier.h,'#');
 const entry={x:2.3,y:y2+bh-1.5},objective={x:x1+mw-1.8,y:2.4},exit={x:x2+rw-1.5,y:2.3};
 const oh={x:x1+mw-1,y:th-1},ph={x:lw-.25,y:y1+mh/2},rh={x:lw-.25,y:th-1};
 const sh={x:x1+2.5,y:y1+mh/2},tx={x:x2+rw-2,y:y1+mh/2},xh={x:x2+rw-2,y:th-1};
 const centre=(x:number,y:number,w:number,h:number)=>({x:x+w/2,y:y+h/2});
 const art=(name:string,kind:V13Structure['kind'],asset:V13Structure['asset'],x:number,y:number,scale:number,roles:V13Structure['roles']=['hiding','losBreak']):V13Structure=>({name,kind,asset,x,y,scale,roles});
 const pc=centre(x0,y1,lw,mh),rc=centre(x0,y0,lw,th),sc=centre(x1,y1,mw,mh),tc=centre(x2,y1,rw,mh);
 const structures:V13Structure[]=[
  art('Arrival Information Desk','counter','museum_security_desk',x0+lw/2,y2+bh/2,1.6,['hiding','divider']),
  art('Public Exhibit Island',s.feature==='sculpture'?'statue':'displayCase',s.feature==='sculpture'?'museum_statue_large':'museum_display_case_large',pc.x,pc.y,1.6,['hiding','losBreak','divider']),
  art('Restricted Exhibit Screen','partition','museum_partition',rc.x,rc.y,1.6,['hiding','losBreak','divider']),
  art('Service Workstation','counter','museum_security_desk',sc.x+1,sc.y+.4,1.35,['hiding','divider']),
  art('East Wing Collection Case','displayCase','museum_display_case_large',tc.x-.7,tc.y,1.5,['hiding','losBreak']),
  art('Exit Lobby Column','pillar','museum_column',x2+rw/2,Math.max(3,th/2),1.2,['hiding','losBreak']),
  art('Objective Archive Portrait','painting','museum_painting',x1+1.9,1.3,1.2,['decor']),
  art('West Wing Painting','painting','museum_painting',2,y1+.3,1,['decor']),
  art('Restricted Painting','painting','museum_painting',2,1.3,1,['decor']),
 ];
 if(s.feature==='sculpture')structures.push(art('East Exit Waiting Statue','statue','museum_statue_large',23.8,6,1.1,['hiding','losBreak']),art('Marble Study Waiting Statue','statue','museum_statue_large',2.6,5.8,1,['hiding','losBreak']));
 if(s.feature==='conservation')structures.push(art('Conservation Approach Screen','partition','museum_partition',7,11.6,1.2,['hiding','losBreak']));
 if(s.feature==='conservation')structures.push(art('Conservation Cabinet','shelf','museum_display_case_large',x1+mw-2,y1+mh-1.7,1.2,['divider','hiding']));
 if(s.feature==='crown')structures.push(art('Crown Collection Portrait','painting','museum_painting',lw-1.5,1.3,1.2,['decor']));
 const westCross={x:s.westDoor+1.5,y:th+1},entryCross={x:s.entryDoor+1.5,y:y2-1};
 const riskWest={x:(s.riskWestDoor??s.westDoor)+1.5,y:th+1},riskEntry={x:(s.riskEntryDoor??s.entryDoor)+1.5,y:y2-1};
 const topWest={x:lw+2,y:s.topDoor+1.5},topEast={x:x1+mw+1,y:s.topDoor+1.5};
 const southExit={x:x1+2.5,y:th+1},eastCross={x:s.eastDoor+1.5,y:th+1};
 const serviceCross={x:x1+mw+1,y:s.serviceDoor+1.5};
 const stop=(x:number,y:number,lookX:number,lookY:number,wait=2)=>({x,y,look:{x:lookX,y:lookY},wait});
 const guards:V13Mission['guards']=[{
  role:'lobby',zone:'public',watches:`The ${s.publicName} exhibit island and western threshold, leaving a readable waiting side`,
  stops:[stop(2.1,y1+1.4,lw-1,y1+1.4,2.5),stop(lw-1,y1+mh-1.2,lw-1,y1+1,2)],
 }];
 if(s.guards===3)guards.push({role:'escape',zone:'eastService',watches:'The service junction from separate inspection posts; the corridor wall separates it from the prize',
  stops:[stop(x2+1.4,y1+1.5,x2+rw-1,y1+1.5,2.5),stop(x2+rw-1.3,y1+mh-1.2,x2+1,y1+mh-1.2,2)]});
 guards.push({role:'objective',zone:'objective',watches:'The prize from the east side of the vault pier, then the secure west threshold',
  stops:[stop(objective.x,4,objective.x,objective.y,2),s.feature==='sculpture'?stop(x1+1.3,3.1,x1-1,3.1,3):stop(x1+mw-1.3,th-1,x1+1,th-1,3),
   // The cover-check inspection turns stop 0 toward the pier's exposed shoulder.
   // Return to the same clear post with a separate prize-facing inspection, so the empty stand is discovered naturally.
   ...(s.feature==='sculpture'?[stop(objective.x,4,objective.x,objective.y,2)]:[])],startDelay:3});
 return {
  id:s.id,title:s.title,family:'Museum',topology:s.identity,map:cells.map(row=>row.join('')),
  zones:{
   e:{id:'entry',name:'Visitor Vestibule',role:'public',purpose:'Protected arrival with a desk before the western guard wing',hub:{x:2,y:y2+1.3}},
   p:{id:'public',name:s.publicName,role:'public',purpose:'An exhibit island divides a careful wall-side approach from the central crossing',hub:ph},
   r:{id:'restricted',name:s.restrictedName,role:'restricted',purpose:'Restricted approach to the collection chamber; the screen lets a player read the next post',hub:rh},
   o:{id:'objective',name:`${s.title} Chamber`,role:'objective',purpose:'Offset prize and opaque vault pier; a short doorway leads directly to the east exit',hub:oh},
   s:{id:'southService',name:s.serviceName,role:'escape',purpose:'First new service zone after the collection shortcut is closed',hub:sh},
   t:{id:'eastService',name:'East Service Wing',role:'escape',purpose:'Second independent escape zone, with a junction to the north exit',hub:tx},
   x:{id:'exit',name:'East Exit Lobby',role:'escape',purpose:'Green exit beacon visible after the northward service-wing approach',hub:xh},
  },entry,objective,exit,entryEdge:'left',exitEdge:'top',placement:['bottom-left','top-centre','top-right'],
  edges:[
   {from:'entry',to:'public',role:'approach',via:[{x:lw-1,y:y2+1},{x:entryCross.x,y:y2+1},entryCross,{x:entryCross.x,y:y1+mh-1}]},
   {from:'entry',to:'public',role:'risk',via:[riskEntry,{x:riskEntry.x,y:y1+mh-.8},{x:ph.x,y:y1+mh-.8}]},
   {from:'public',to:'restricted',role:'approach',via:[{x:lw-1,y:y1+1},westCross,{x:westCross.x,y:th-1}]},
   {from:'public',to:'restricted',role:'risk',via:[{x:2.1,y:ph.y},{x:2.1,y:y1+.8},{x:riskWest.x,y:y1+.8},riskWest,{x:riskWest.x,y:th-.8},{x:rh.x,y:th-.8}]},
   {from:'restricted',to:'objective',role:'approach',via:[topWest],door:{at:topWest,orientation:'vertical'}},
   {from:'objective',to:'exit',role:'quickEscape',via:[topEast],door:{at:topEast,orientation:'vertical',lockdown:true}},
   {from:'objective',to:'southService',role:'alternateEscape',via:[{x:objective.x,y:th-.2},{x:x1+2.5,y:th-.2},southExit]},
   {from:'southService',to:'eastService',role:'alternateEscape',via:[serviceCross]},
   {from:'eastService',to:'exit',role:'alternateEscape',via:[{x:tx.x,y:y1+.8},{x:eastCross.x,y:y1+.8},eastCross,{x:eastCross.x,y:th-.8},{x:xh.x,y:th-.8}]},
  ],
  approach:['entry','public','restricted','objective'],risk:['entry','public','restricted','objective'],quickEscape:['objective','exit'],alternateEscape:['objective','southService','eastService','exit'],
  cover:{safe:['Arrival Information Desk','Public Exhibit Island','Restricted Exhibit Screen','Vault Pier'],risk:['Public Exhibit Island','Restricted Exhibit Screen'],escape:['Vault Pier','Service Workstation','East Wing Collection Case','Exit Lobby Column']},
  structures,walls:[{name:'Vault Pier',roles:['hiding','losBreak','divider'],at:`opaque wall pier at ${pier.x},${pier.y}, one tile wide and ${pier.h} tiles high`}],guards,
  cameras:s.camera?[{zone:'restricted',at:{x:lw-.75,y:th-2},facing:Math.PI,watches:'The restricted west doorway; its sweep is readable from the public side'}]:[],
 };
}

export const V13_MUSEUM_EXPANSION:V13Mission[]=[
 exhibitCircuit({id:'01-06',title:'West Exhibits',widths:[7,7,7],heights:[7,7,5],topDoor:2,westDoor:2,entryDoor:4,eastDoor:20,serviceDoor:12,guards:2,camera:false,publicName:'West Exhibit Walk',restrictedName:'Silver Collection Gallery',serviceName:'Packing Room',identity:'Offset west ascent with a low packing-room escape',feature:'cases'}),
 exhibitCircuit({id:'01-07',title:'Sculpture Court',widths:[8,6,8],heights:[8,6,6],topDoor:4,westDoor:5,riskWestDoor:1,entryDoor:2,eastDoor:20,serviceDoor:12,guards:2,camera:false,publicName:'Sculpture Court',restrictedName:'Marble Study',serviceName:'Sculpture Workshop',identity:'Wide sculpture court feeding a tight collection chamber',feature:'sculpture'}),
 exhibitCircuit({id:'01-08',title:'Conservation Loop',widths:[9,8,6],heights:[6,8,5],topDoor:2,westDoor:2,riskWestDoor:6,entryDoor:2,eastDoor:23,serviceDoor:11,guards:3,camera:false,publicName:'Conservation Display',restrictedName:'Conservation Archive',serviceName:'Restoration Workshop',identity:'Tall conservation wing with a watched east service return',feature:'conservation'}),
 exhibitCircuit({id:'01-09',title:'Camera Crossing',widths:[8,8,6],heights:[7,6,6],topDoor:3,westDoor:5,riskWestDoor:1,entryDoor:2,eastDoor:22,serviceDoor:10,guards:2,camera:true,publicName:'Observation Gallery',restrictedName:'Camera Crossing',serviceName:'Monitoring Backroom',identity:'CCTV observation across an offset north crossing',feature:'camera'}),
 exhibitCircuit({id:'01-10',title:'Crown Collection',widths:[7,9,8],heights:[8,7,5],topDoor:3,westDoor:2,entryDoor:5,riskEntryDoor:1,eastDoor:24,serviceDoor:13,guards:3,camera:true,publicName:'Ceremonial Gallery',restrictedName:'Crown Antechamber',serviceName:'Collection Handling Room',identity:'Broad final collection loop with three separate guard responsibilities',feature:'crown'}),
];
