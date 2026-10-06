/** Individually authored Chapter 4–9 floor graphs. No rotations or scaled ring generator.
 * Room rectangles are functional cells; all circulation is explicit three-tile portals.
 * Numerical geometry is a playtest hypothesis, not a verified difficulty claim. */
import type {V124bPlan,V124bRoom,V124bEdge,Point} from './v124bTypes';
const p=(x:number,y:number):Point=>({x,y});
const room=(id:string,name:string,role:V124bRoom['role'],x:number,y:number,w=5,h=5,purpose?:string):V124bRoom=>({id,name,role,x,y,w,h,purpose});
const edge=(from:string,to:string,role:V124bEdge['role'],via?:Point[],door?:V124bEdge['door']):V124bEdge=>({from,to,role,width:3,via,door});
const close=(x:number,y:number,orientation:'horizontal'|'vertical',glass=false):NonNullable<V124bEdge['door']>=>({at:p(x,y),orientation,type:glass?'glass':'solid',lockdown:true});
const labPlans:V124bPlan[]=[
 {id:'04-01',title:'Research Reception',family:'lab-offset-u / clean research reception to cryo interior',
 rooms:[room('P','Reception','public',1,17),room('T','Research Bench Hall','transition',1,9,6,5),room('R','Restricted Samples','restricted',9,9),room('O','Prototype Chamber','objective',9,1),room('B','Decontamination Bay','escape',17,1),room('E','Utility Corridor','escape',17,9),room('X','Service Loading Exit','escape',17,17)],
 edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(11.5,19.5)]),edge('R','E','quickEscape',undefined,close(15.5,11.5,'vertical',true)),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','E','X'],alternateEscape:['O','B','E','X'],
 structures:[{kind:'labLargeTable',x:2.1,y:11.5,scale:.85},{kind:'labGlassCorridor',x:6.9,y:11.5,scale:.75},{kind:'labCryoUnit',x:10,y:2.2,scale:.8},{kind:'labCart',x:18,y:10.1,scale:.8}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:-Math.PI/2}]},
 {id:'04-02',title:'Observation Wing',family:'lab-horizontal-s / observation bypass and top service return',
 rooms:[room('P','Visitor Check-in','public',1,17),room('T','Research Workstations','transition',9,17,6,5),room('R','Glass Observation','restricted',9,9,6,5),room('O','Restricted Experiment','objective',18,9,6,5),room('B','Equipment Preparation','escape',18,1,6,5),room('E','Sterile Service','escape',9,1,6,5),room('X','Emergency Stair Exit','escape',1,1)],
 edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(3.5,11.5)]),edge('R','E','quickEscape',undefined,close(12,7.5,'horizontal')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','E','X'],alternateEscape:['O','B','E','X'],
 structures:[{kind:'labWorkstation',x:10.4,y:18.3,scale:.8},{kind:'labGlassCorridor',x:10.3,y:9.8,scale:.7},{kind:'labObservationConsole',x:13.7,y:10.3,scale:.85},{kind:'labExperimentMachine',x:22.7,y:10.2,scale:.85},{kind:'labEquipmentRack',x:22.6,y:2.2,scale:.8}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:0}]},
 {id:'04-03',title:'Glass Research',family:'lab-forked-t / transparent observation wall with opaque cleaning escape',
 rooms:[room('P','Reception Vestibule','public',9,18),room('T','Glass Research Junction','transition',9,10,6,5),room('R','Specimen Antechamber','restricted',1,10),room('O','Prototype Isolation','objective',1,1),room('B','Cleaning Bay','escape',9,1,6,5),room('E','Waste Treatment','escape',18,1),room('X','Side Service Exit','escape',18,10)],
 edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(3.5,20.5)]),edge('T','X','quickEscape',undefined,close(16.5,12.5,'vertical',true)),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','T','X'],alternateEscape:['O','B','E','X'],
 structures:[{kind:'labGlassWall',x:13.8,y:12.5,scale:.8},{kind:'labLargeTable',x:10.2,y:11.2,scale:.75},{kind:'labSampleStorage',x:2.1,y:11.4,scale:.8},{kind:'labPrototypeMachine',x:2,y:2.1,scale:.75},{kind:'labCart',x:19,y:2.1,scale:.75}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'O',role:'objective'}],cameras:[{room:'T',facing:Math.PI}]},
 {id:'04-04',title:'Cryo Research',family:'lab-stepped-diagonal / research staircase to northern cryo bank',
 rooms:[room('P','South Reception','public',1,18),room('T','Analysis Bench','transition',1,10,6,5),room('R','Restricted Cryo Access','restricted',9,10),room('O','Cryo Prototype','objective',9,1,6,5),room('B','Refrigeration Plant','escape',18,1,6,5),room('E','Plant Access','escape',18,10),room('X','North Loading Annex','escape',27,10)],
 edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(11.5,20.5)]),edge('R','E','quickEscape',undefined,close(16,12.5,'vertical')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','E','X'],alternateEscape:['O','B','E','X'],
 structures:[{kind:'labLargeTable',x:2.2,y:11.3,scale:.85},{kind:'labGlassCorridor',x:10.3,y:10.6,scale:.75},{kind:'labCryoChamber',x:10.3,y:2.2,scale:.75},{kind:'labCryoUnit',x:13.7,y:2.1,scale:.65},{kind:'labEquipmentRack',x:22.7,y:2.1,scale:.9}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:-Math.PI/2}]},
 {id:'04-05',title:'Prototype Heist',family:'lab-deep-in-side-out / compact research stack with eastern maintenance dogleg',
 rooms:[room('P','Visitor Reception','public',1,19),room('T','Research Hall','transition',1,11,6,5),room('R','Restricted Clean Room','restricted',1,3,6,5),room('O','Prototype Containment','objective',10,3,6,5),room('B','Containment Service','escape',19,3),room('E','Maintenance Switchback','escape',19,11),room('X','East Loading Exit','escape',10,19,6,5)],
 edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','T','risk',[p(5,21.5),p(5,13.5)]),edge('R','X','quickEscape',[p(9.5,5.5),p(9.5,21.5)],close(9.5,10,'horizontal')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape',[p(21.5,21.5)])],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','T','R','O'],quickEscape:['O','R','X'],alternateEscape:['O','B','E','X'],
 structures:[{kind:'labCentralExperiment',x:2.1,y:14.7,scale:.7},{kind:'labGlassCorridor',x:5.3,y:3.8,scale:.65},{kind:'labPrototypeMachine',x:11.3,y:4.2,scale:.75},{kind:'labEquipmentRack',x:20.2,y:4.2,scale:.75},{kind:'labCart',x:20,y:12.1,scale:.75}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:Math.PI/2}]},
];
// Public intake, mechanical first-break and exit-document check are deliberately distinct jobs.
labPlans[0].structures!.push({kind:'labWorkstation',x:2.1,y:18.2,scale:.75},{kind:'labEquipmentRack',x:18.1,y:2.2,scale:.75},{kind:'labSampleCase',x:18.1,y:18.2,scale:.75});
labPlans[1].structures!.push({kind:'labWorkstation',x:2.1,y:18.2,scale:.75},{kind:'labCart',x:10.2,y:2.2,scale:.75},{kind:'labSampleCase',x:2.1,y:2.2,scale:.75});
labPlans[2].structures!.push({kind:'labWorkstation',x:10.2,y:19.2,scale:.75},{kind:'labEquipmentRack',x:10.2,y:2.2,scale:.75},{kind:'labSampleCase',x:19.2,y:11.2,scale:.75});
labPlans[3].structures!.push({kind:'labWorkstation',x:2.1,y:19.2,scale:.75},{kind:'labCart',x:19.2,y:11.2,scale:.75},{kind:'labSampleCase',x:28.2,y:11.2,scale:.75});
labPlans[4].structures!.push({kind:'labWorkstation',x:2.1,y:20.2,scale:.75},{kind:'labSampleCase',x:11.2,y:20.2,scale:.75});

const casinoPlans:V124bPlan[]=[
 {id:'05-01',title:'Cashier Floor',family:'casino-hinged-l / slot aisles into secure cashier',rooms:[room('P','Casino Entrance','public',1,17),room('T','Slot Floor','transition',1,9,6,6),room('R','Staff Count Room','restricted',10,9),room('O','Cashier Secure Cage','objective',10,1,6,5),room('B','Cash Transport Vestibule','escape',19,1),room('E','Bar Supply Corridor','escape',19,9),room('X','East Staff Exit','escape',10,18,6,5)],edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(7.5,19.5),p(7.5,11.5)]),edge('R','X','quickEscape',undefined,close(13,16.5,'horizontal')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape',[p(21.5,20.5)])],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','X'],alternateEscape:['O','B','E','X'],structures:[{kind:'casinoSlotBank',x:2.2,y:10.2,scale:.8},{kind:'casinoRouletteTable',x:5.8,y:13.5,scale:.65},{kind:'casinoSecurityStation',x:11.1,y:10.1,scale:.8},{kind:'casinoCashierCage',x:11.2,y:2.2,scale:.7},{kind:'casinoChipCart',x:20.1,y:2.2,scale:.75},{kind:'casinoBarCounter',x:20.1,y:10.1,scale:.7},{kind:'casinoDivider',x:11.1,y:19.2,scale:.75}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'E',role:'roaming'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:-Math.PI/2},{room:'T',facing:0}]},
 {id:'05-02',title:'High Roller Rooms',family:'casino-step-up / lounge to VIP north wing, staff stair east',rooms:[room('P','Public Lounge','public',10,18),room('T','Table Salon','transition',1,10,6,6),room('R','VIP Foyer','restricted',1,1,6,5),room('O','VIP Secure Cash','objective',10,1,6,5),room('B','VIP Service Pantry','escape',20,1),room('E','Staff Wardrobe','escape',20,10),room('X','Staff Stair Exit','escape',20,18),room('A','VIP Gaming Bypass','transition',10,10)],edges:[edge('P','T','approach',[p(4,20.5)]),edge('T','R','approach'),edge('R','O','approach'),edge('P','A','risk'),edge('A','R','risk',[p(4,12.5)]),edge('P','X','quickEscape',undefined,close(17.5,20.5,'vertical')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','A','R','O'],quickEscape:['O','R','T','P','X'],alternateEscape:['O','B','E','X'],structures:[{kind:'casinoBlackjackTable',x:11.2,y:11.2,scale:.6},{kind:'sofa',x:11.3,y:19.3,scale:.8},{kind:'casinoHighRollerTable',x:2.3,y:11.5,scale:.65},{kind:'casinoDivider',x:5.8,y:2.2,scale:.75},{kind:'casinoCashierVault',x:11.3,y:2.3,scale:.7},{kind:'casinoChipCart',x:21.2,y:2.2,scale:.75},{kind:'casinoBarCounter',x:21.2,y:11.2,scale:.75},{kind:'casinoSecurityStation',x:21.2,y:19.2,scale:.75}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'E',role:'roaming'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:0},{room:'T',facing:Math.PI/2}]},
 {id:'05-03',title:'Surveillance Suite',family:'casino-central-cross / bar inspection to sealed surveillance side-room',rooms:[room('P','Floor Reception','public',10,18),room('T','Bar Crossing','transition',10,10,6,6),room('R','Staff Surveillance','restricted',1,10,6,5),room('O','Surveillance Strongroom','objective',1,1,6,5),room('B','Camera Service','escape',10,1,6,5),room('E','Kitchen Dispatch','escape',20,1),room('X','Delivery Exit','escape',20,10)],edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(4,20.5)]),edge('T','X','quickEscape',undefined,close(18,13,'vertical')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','T','X'],alternateEscape:['O','B','E','X'],structures:[{kind:'casinoSlotMachine',x:11.2,y:19.2,scale:.8},{kind:'casinoBarIsland',x:11.4,y:11.5,scale:.75},{kind:'casinoSecurityStation',x:2.2,y:11.2,scale:.75},{kind:'casinoCashierCage',x:2.3,y:2.2,scale:.7},{kind:'casinoChipCart',x:11.2,y:2.2,scale:.75},{kind:'casinoBarCounter',x:21.2,y:2.2,scale:.7},{kind:'casinoDivider',x:21.2,y:11.2,scale:.75}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'E',role:'roaming'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:-Math.PI/2},{room:'T',facing:Math.PI}]},
 {id:'05-04',title:'Roulette Exchange',family:'casino-right-to-left / cashier spine with upper vault service',rooms:[room('P','Casino East Entrance','public',21,18),room('T','Roulette Salon','transition',21,9,6,6),room('R','Cash Counting','restricted',12,9,6,5),room('O','Exchange Strongroom','objective',3,9,6,5),room('B','Secure Cash Service','escape',3,1,6,5),room('E','Bar Back Office','escape',12,1,6,5),room('X','North Staff Exit','escape',21,1)],edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(15,20.5)]),edge('T','X','quickEscape',undefined,close(23.5,7.5,'horizontal')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','T','X'],alternateEscape:['O','B','E','X'],structures:[{kind:'casinoSlotBank',x:22.2,y:19.2,scale:.75},{kind:'casinoRouletteCenterpiece',x:22.3,y:10.4,scale:.7},{kind:'casinoBlackjackTable',x:25.7,y:13.7,scale:.65},{kind:'casinoChipCart',x:13.2,y:10.2,scale:.75},{kind:'casinoCashierVault',x:4.2,y:10.2,scale:.7},{kind:'casinoSecurityStation',x:4.2,y:2.2,scale:.75},{kind:'casinoBarCounter',x:13.2,y:2.2,scale:.7},{kind:'casinoDivider',x:22.2,y:2.2,scale:.75}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'E',role:'roaming'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:Math.PI},{room:'T',facing:-Math.PI/2}]},
 {id:'05-05',title:'Casino Heist',family:'casino-double-dogleg / slot and staff elbow to secure cash, loading side-out',rooms:[room('P','Public Gaming Entry','public',1,19),room('T','Slot and Table Floor','transition',1,10,6,6),room('R','VIP Cashier Access','restricted',10,10,6,5),room('O','Secure Cash Chamber','objective',19,10,6,5),room('B','Cash Transfer Bay','escape',19,1,6,5),room('E','Service Office','escape',10,1,6,5),room('X','North Loading Exit','escape',1,1)],edges:[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach'),edge('P','R','risk',[p(13,21.5)]),edge('T','X','quickEscape',undefined,close(3.5,8,'horizontal')),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape')],entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach:['P','T','R','O'],risk:['P','R','O'],quickEscape:['O','R','T','X'],alternateEscape:['O','B','E','X'],structures:[{kind:'casinoSlotMachine',x:2.2,y:20.2,scale:.8},{kind:'casinoSlotBank',x:2.3,y:11.3,scale:.75},{kind:'casinoBlackjackTable',x:5.7,y:14.7,scale:.65},{kind:'casinoSecurityStation',x:11.2,y:11.2,scale:.75},{kind:'casinoCashierVault',x:20.2,y:11.2,scale:.7},{kind:'casinoChipCart',x:20.2,y:2.2,scale:.75},{kind:'casinoBarCounter',x:11.2,y:2.2,scale:.7},{kind:'casinoDivider',x:2.2,y:2.2,scale:.75}],patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'E',role:'roaming'},{room:'O',role:'objective'}],cameras:[{room:'R',facing:0},{room:'T',facing:-Math.PI/2}]},
];

/** Orthogonalize authored portal chains, preserving every authored waypoint and its order. */
function axisAligned(plan:V124bPlan){for(const e of plan.edges){const a=plan.rooms.find(r=>r.id===e.from)!,b=plan.rooms.find(r=>r.id===e.to)!;let last=p(a.x+a.w/2,a.y+a.h/2);const via:Point[]=[];for(const q of [...e.via??[],p(b.x+b.w/2,b.y+b.h/2)]){if(last.x!==q.x&&last.y!==q.y)via.push(p(q.x,last.y));via.push(q);last=q;}e.via=via.slice(0,-1);}return plan;}

type CompactSpec={id:string;title:string;family:string;cells:[number,number,number?,number?][];names:string[];kinds:NonNullable<V124bPlan['structures']>[number]['kind'][];riskVia:Point[];quick:[string,string,Point,'horizontal'|'vertical'];escapeVia?:Point[];glass?:boolean;secondRestricted?:{rect:[number,number,number,number];name:string;kind:NonNullable<V124bPlan['structures']>[number]['kind']};};
/** Common contract only. Spatial rectangles, portal elbows and room functions remain hand-authored per mission. */
function authored(s:CompactSpec):V124bPlan{
 const ids=['P','T','R','O','B','E','X'],roles:V124bRoom['role'][]=['public','transition','restricted','objective','escape','escape','escape'];
 const rooms=s.cells.map(([x,y,w=5,h=5],i)=>room(ids[i],s.names[i],roles[i],x,y,w,h));
 const approach=['P','T','R','O'];const approachEdges=[edge('P','T','approach'),edge('T','R','approach'),edge('R','O','approach')];
 // Named working furniture has useful body-sized cover; tiny decorative boxes cannot carry room identity.
 const size:Record<string,number>={counter:1.15,table:1.2,sofa:1.25,shelf:1.3,equipment:1.35,crate:1.4,partition:1.1};
 const structures=rooms.map((r,i)=>({kind:s.kinds[i],x:r.x+1.2,y:r.y+1.2,scale:i===6?.7:size[s.kinds[i]]??1,collisionScale:i===6?.7:size[s.kinds[i]]??1}));
 if(s.secondRestricted){const a=s.secondRestricted;rooms.push(room('S',a.name,'restricted',...a.rect));approach.splice(3,0,'S');approachEdges.splice(2,1,edge('R','S','approach'),edge('S','O','approach'));structures.push({kind:a.kind,x:a.rect[0]+1.15,y:a.rect[1]+1.2,scale:.7,collisionScale:.7});}
 const [qf,qt,at,orientation]=s.quick;
 const edges=[...approachEdges,edge('P','T','risk',s.riskVia),edge(qf,qt,'quickEscape',undefined,close(at.x,at.y,orientation,s.glass)),edge('O','B','alternateEscape'),edge('B','E','alternateEscape'),edge('E','X','alternateEscape',s.escapeVia)];
 // Reverse only as far as the authored quick junction. CLOSED route never traverses entry.
 const reverse=[...approach].reverse();const quickEscape=[...reverse.slice(0,reverse.indexOf(qf)+1),qt];if(qt==='E')quickEscape.push('X');
 return {id:s.id,title:s.title,family:s.family,rooms,edges,entryRoom:'P',objectiveRoom:'O',exitRoom:'X',approach,risk:approach,quickEscape,alternateEscape:['O','B','E','X'],structures,patrols:[{room:'T'},{room:'R',role:'corridor'},{room:'B',role:'roaming'},{room:'E',role:'roaming'},...(s.secondRestricted?[{room:'S',role:'corridor' as const}]:[]),{room:'O',role:'objective'}],cameras:[{room:'R',facing:-Math.PI/2},{room:'T',facing:0},{room:s.secondRestricted?'S':'B',facing:Math.PI/2}]};
}
const mansionPlans:V124bPlan[]=[
 authored({id:'06-01',title:'Reception Wing',family:'mansion-left-in-right-out / drawing rooms into private study',cells:[[1,18],[1,10,6,5],[10,10],[10,1,6,5],[20,1],[20,10],[20,18]],names:['Guest Vestibule','Drawing Room','Private Wing Foyer','Study Vault','Butler Pantry','Service Stair','Garden Gate'],kinds:['counter','sofa','shelf','shelf','table','equipment','statue'],riskVia:[p(7.5,20.5),p(7.5,12.5)],quick:['R','E',p(17.5,12.5),'vertical']}),
 authored({id:'06-02',title:'Library Passage',family:'mansion-bottom-to-top-s / book aisle turns to secret study, upper gallery out',cells:[[1,18],[10,18,6,5],[10,10,6,5],[20,10,6,5],[20,1],[10,1,6,5],[1,1]],names:['Visitor Salon','Reading Room','Private Library','Hidden Study Safe','Library Service','Upper Gallery','North Staff Stair'],kinds:['sofa','shelf','shelf','shelf','equipment','table','counter'],riskVia:[p(4,24),p(13,24)],quick:['R','E',p(13,8),'horizontal']}),
 authored({id:'06-03',title:'Private Courtyard',family:'mansion-courtyard-cross / private wing west and garden escape east',cells:[[11,19],[11,10,6,6],[1,10],[1,1,6,5],[11,1,6,5],[21,1],[21,10]],names:['Public Dining Lobby','Courtyard Salon','Private Wing Doorway','Collector Study','Gardener Passage','Glasshouse Service','East Garden Exit'],kinds:['table','statue','shelf','shelf','equipment','table','counter'],riskVia:[p(18,21.5),p(18,13)],quick:['T','X',p(20.5,13),'vertical']}),
 authored({id:'06-04',title:'East Family Wing',family:'mansion-east-to-west / bedroom corridor with northern servants return',cells:[[21,18],[21,9,6,6],[12,9,6,5],[2,9,6,5],[2,1,6,5],[12,1,6,5],[21,1]],names:['East Guest Entry','Family Drawing Room','Private Gallery','Secret Family Vault','Linen Store','Servant Corridor','North Kitchen Exit'],kinds:['sofa','sofa','shelf','shelf','equipment','table','counter'],riskVia:[p(29,20.5),p(29,12)],quick:['T','X',p(23.5,7.5),'horizontal']}),
 authored({id:'06-05',title:'Secret Vault',family:'mansion-deep-in-side-out / salon library study spine and distant cellar exit',cells:[[1,20],[1,11,6,5],[1,2,6,5],[11,2,6,5],[21,2],[21,11],[11,20,6,5]],names:['Grand Vestibule','Formal Salon','Private Library','Secret Vault Study','Cellar Antechamber','Service Kitchen','Delivery Courtyard Exit'],kinds:['counter','sofa','shelf','shelf','equipment','table','crate'],riskVia:[p(7.5,22.5),p(7.5,13.5)],quick:['T','X',p(9,13.5),'vertical'],escapeVia:[p(23.5,22.5)]}),
];
const warehousePlans:V124bPlan[]=[
 authored({id:'07-01',title:'Loading Aisles',family:'warehouse-west-to-east-z / rack turns and northern freight escape',cells:[[1,19],[1,10,6,6],[11,10,6,5],[21,10,6,5],[21,1,6,5],[11,1,6,5],[1,1]],names:['Receiving Dock','Storage Rack Lanes','Restricted Cargo Check','Secure Container','Freight Sorting','Maintenance Rack','North Loading Exit'],kinds:['crate','shelf','equipment','crate','crate','equipment','crate'],riskVia:[p(7.5,21.5),p(7.5,13)],quick:['T','X',p(3.5,8),'horizontal']}),
 authored({id:'07-02',title:'Restricted Freight',family:'warehouse-offset-u / long rack shoulder to secure cargo bay',cells:[[1,20],[1,11,6,5],[11,11],[11,2,6,5],[22,2],[22,11],[22,20]],names:['Truck Unloading','Rack Storage','Cargo Verification','Sealed Freight Container','Handling Machinery','Forklift Service','East Shipping Exit'],kinds:['crate','shelf','equipment','crate','equipment','crate','counter'],riskVia:[p(7.5,22.5),p(7.5,13.5)],quick:['R','E',p(19,13.5),'vertical']}),
 authored({id:'07-03',title:'Machinery Cross',family:'warehouse-t-dispatch / receiving spine with western cargo and eastern workshops',cells:[[11,20],[11,11,6,6],[1,11,6,5],[1,2,6,5],[11,2,6,5],[22,2],[22,11]],names:['Receiving Entry','Machinery Crossing','Restricted Storage','Locked Cargo Cage','Packaging Service','Workshop Lane','Workshop Yard Exit'],kinds:['crate','equipment','shelf','crate','table','equipment','crate'],riskVia:[p(18,22.5),p(18,14)],quick:['T','X',p(20,14),'vertical']}),
 authored({id:'07-04',title:'Container Spine',family:'warehouse-staggered-in / rack elbow to inner container and high service exit',cells:[[1,20],[10,20,6,5],[10,11,6,5],[20,11,6,5],[20,2,6,5],[10,2,6,5],[1,2]],names:['South Loading Entry','Forklift Dispatch','Restricted Rack Passage','Inner Secure Container','Container Handling','Upper Storage Service','North Freight Exit'],kinds:['crate','equipment','shelf','crate','equipment','crate','counter'],riskVia:[p(3.5,26),p(13,26)],quick:['R','E',p(13,9),'horizontal']}),
 authored({id:'07-05',title:'Secure Container',family:'warehouse-stacked-loading / deep restricted cargo, eastern service dogleg',cells:[[1,21],[1,12,6,5],[1,3,6,5],[11,3,6,5],[22,3],[22,12],[11,21,6,5]],names:['Public Receiving','Storage Loading Lane','Restricted Cargo Depot','Secure Container Interior','Crane Service','Maintenance Workshop','Remote Shipping Exit'],kinds:['crate','shelf','equipment','crate','equipment','table','crate'],riskVia:[p(7.5,23.5),p(7.5,14.5)],quick:['T','X',p(9,14.5),'vertical'],escapeVia:[p(24.5,23.5)]}),
];
const hqPlans:V124bPlan[]=[
 authored({id:'08-01',title:'Monitoring Spine',family:'hq-horizontal-security-layers / office checkpoints into separated control interior',cells:[[1,20],[1,11,6,5],[11,11,6,5],[31,11,6,5],[31,2,6,5],[21,2,6,5],[11,2]],names:['Public Office','Security Office','Access Control','Control Core','Core Cable Service','Network Maintenance','North Staff Exit'],kinds:['counter','equipment','equipment','equipment','shelf','equipment','counter'],riskVia:[p(7.5,22.5),p(7.5,13.5)],quick:['R','X',p(13.5,9),'horizontal'],secondRestricted:{rect:[21,11,6,5],name:'Monitoring Checkpoint',kind:'equipment'}}),
 authored({id:'08-02',title:'Guard Network',family:'hq-vertical-three-threshold / checkpoint stack and eastern data-service return',cells:[[1,29],[1,20,6,5],[1,11,6,5],[11,2,6,5],[21,2,6,5],[21,11,6,5],[21,20]],names:['Office Arrival','Security Administration','Guard Dispatch','Restricted Data Core','Core Service','Data Maintenance','East Staff Exit'],kinds:['counter','table','equipment','equipment','equipment','shelf','counter'],riskVia:[p(7.5,31.5),p(7.5,22.5)],quick:['T','X',p(15,22.5),'vertical'],secondRestricted:{rect:[1,2,6,5],name:'Monitoring Antechamber',kind:'equipment'}}),
 authored({id:'08-03',title:'Surveillance Junction',family:'hq-forked-control / watched central spine and west monitoring core',cells:[[11,29],[11,20,6,5],[11,11,6,5],[1,2,6,5],[11,2,6,5],[21,2,6,5],[21,11]],names:['Office Reception','Security Cross Hall','Network Dispatch','Surveillance Core','Server Service','Electrical Bay','East Maintenance Exit'],kinds:['counter','equipment','equipment','equipment','shelf','equipment','counter'],riskVia:[p(18,31.5),p(18,22.5)],quick:['R','X',p(19,13.5),'vertical'],secondRestricted:{rect:[1,11,6,5],name:'Private Monitoring',kind:'equipment'}}),
 authored({id:'08-04',title:'Operations Block',family:'hq-right-to-left layered-staff / operations depth and upper cable return',cells:[[31,20],[31,11,6,5],[21,11,6,5],[1,11,6,5],[1,2,6,5],[11,2,6,5],[21,2]],names:['East Office Entrance','Security Team Office','Monitoring Gate','Operations Control','Core Cable Room','Repair Corridor','North Dispatch Exit'],kinds:['counter','table','equipment','equipment','shelf','equipment','counter'],riskVia:[p(38,22.5),p(38,13.5)],quick:['R','X',p(23.5,9),'horizontal'],secondRestricted:{rect:[11,11,6,5],name:'Private Operations Access',kind:'equipment'}}),
 authored({id:'08-05',title:'Control Core Heist',family:'hq-stepped-core / staff ascent to central command, far eastern network egress',cells:[[1,21],[11,21,6,5],[11,12,6,5],[21,3,6,5],[31,3,6,5],[31,12,6,5],[31,21]],names:['Public Office Entry','Security Administration','Network Control Gate','Final Control Core','Cable Antechamber','Network Maintenance','East Service Exit'],kinds:['counter','table','equipment','equipment','shelf','equipment','counter'],riskVia:[p(3.5,27),p(14,27)],quick:['R','E',p(24,14.5),'vertical'],secondRestricted:{rect:[11,3,6,5],name:'Private Monitoring',kind:'equipment'}}),
];
const vaultPlans:V124bPlan[]=[
 authored({id:'09-01',title:'Inner Core Ring',family:'vault-clockwise-perimeter-to-central-core / bottom east security and north west extraction',cells:[[1,25],[10,25,6,5],[20,25,6,5],[10,15,6,5],[1,12],[1,5],[10,5]],names:['Outer Loading Access','Outer Screening','East Inner Ring','Central Vault Interior','Vault Service Shoulder','North Emergency Service','North Extraction'],kinds:['counter','partition','equipment','pillar','equipment','shelf','counter'],riskVia:[p(3.5,32),p(13,32)],quick:['S','X',p(23,12.5),'horizontal'],secondRestricted:{rect:[20,15,6,5],name:'Inner Ring Security',kind:'partition'}}),
 authored({id:'09-02',title:'Split Perimeter',family:'vault-top-in-bottom-out / public west entry with upper security perimeter and lower cash extraction',cells:[[1,14],[1,4,6,5],[11,4,6,5],[21,14,6,5],[21,24,6,5],[11,24,6,5],[1,24]],names:['Outer West Vestibule','Upper Screening','Inner Ring North','East Vault Interior','Vault Machine Service','South Emergency Corridor','West Extraction Exit'],kinds:['counter','partition','equipment','pillar','equipment','shelf','counter'],riskVia:[p(7.5,16.5),p(7.5,6.5)],quick:['R','E',p(14,16.5),'horizontal'],secondRestricted:{rect:[21,4,6,5],name:'East Reinforced Approach',kind:'partition'}}),
 authored({id:'09-03',title:'Layered Vault Spine',family:'vault-five-level-horizontal-infiltration / four successive guarded shells and northern maintenance out',cells:[[1,12],[10,12,6,5],[19,12,6,5],[37,12,6,5],[37,2,6,5],[28,2,6,5],[19,2]],names:['Outer Transfer Entry','Screening Chamber','Inner Ring Chamber','Final East Vault','Pressure Machinery','North Reinforced Service','North Extraction Exit'],kinds:['counter','partition','equipment','pillar','equipment','shelf','counter'],riskVia:[p(3.5,19),p(13,19)],quick:['R','X',p(21.5,9.5),'horizontal'],secondRestricted:{rect:[28,12,6,5],name:'Final Reinforced Corridor',kind:'partition'}}),
 authored({id:'09-04',title:'Counterclockwise Shell',family:'vault-west-security-coil / southern arrival climbs three west checkpoints and descends east escape',cells:[[11,26],[1,26,6,5],[1,16,6,5],[11,6,6,5],[21,6,6,5],[21,16,6,5],[21,26]],names:['Outer South Entry','West Screening','West Inner Ring','Upper Vault Interior','East Vault Machinery','East Emergency Service','South East Extraction'],kinds:['counter','partition','equipment','pillar','equipment','shelf','counter'],riskVia:[p(13.5,33),p(4,33)],quick:['R','E',p(14,18.5),'vertical'],secondRestricted:{rect:[1,6,6,5],name:'Upper Security Corridor',kind:'partition'}}),
 authored({id:'09-05',title:'Final Vault Core',family:'vault-inner-core-and-detached-upper-extraction / left access layer leads central vault, northern emergency ring',cells:[[13,28],[3,28,6,5],[3,18,6,5],[13,18,6,5],[13,1,6,5],[23,1,6,5],[23,18]],names:['Outer South Check','West Screening','Inner West Ring','Final Central Vault Interior','North Pressure Service','North Cooling Ring','East Independent Extraction'],kinds:['counter','partition','equipment','pillar','equipment','shelf','counter'],riskVia:[p(15.5,35),p(6,35)],quick:['O','X',p(21,20.5),'vertical'],secondRestricted:{rect:[3,8,6,5],name:'Upper Secure Access',kind:'partition'}}),
];
// Chapter 9 has its own room order and service elbows; these are not enlarged HQ silhouettes.
vaultPlans[0].edges.find(e=>e.from==='S'&&e.to==='X')!.via=[p(23,7.5)];
vaultPlans[0].edges.find(e=>e.from==='O'&&e.to==='B')!.via=[p(13,12.5),p(3.5,12.5)];
vaultPlans[1].edges.find(e=>e.from==='O'&&e.to==='B')!.via=[p(29,16.5),p(29,26.5)];
vaultPlans[2].edges.find(e=>e.from==='O'&&e.to==='B')!.via=[p(45,14.5),p(45,4.5)];
vaultPlans[3].edges.find(e=>e.from==='O'&&e.to==='B')!.via=[p(14,3.5),p(24,3.5)];
vaultPlans[4].edges.find(e=>e.from==='S'&&e.to==='O')!.via=[p(11.5,10.5),p(11.5,20.5)];
vaultPlans[4].edges.find(e=>e.from==='O'&&e.to==='B')!.via=[p(11.5,20.5),p(11.5,3.5)];
for(const plan of vaultPlans){const core=plan.rooms.find(r=>r.id==='O')!;plan.structures!.push({kind:'bankVaultDoor',visualAssetId:'bank_vault_door',x:core.x+1.2,y:core.y+core.h-1,scale:.6,collisionScale:.6},{kind:'pillar',x:core.x+core.w-1,y:core.y+core.h-1,scale:1.2,collisionScale:1.2});}
export const V124B_LATE_PLANS:V124bPlan[]=[...labPlans,...casinoPlans,...mansionPlans,...warehousePlans,...hqPlans,...vaultPlans];
const productionArt:Record<string,NonNullable<NonNullable<V124bPlan['structures']>[number]['visualAssetId']>>={
 labLargeTable:'lab_large_table',labGlassCorridor:'lab_glass_corridor',labGlassWall:'lab_glass_wall',labCryoUnit:'lab_cryo_unit',labCart:'lab_cart',labWorkstation:'lab_workstation',labObservationConsole:'lab_observation_console',labExperimentMachine:'lab_experiment_machine',labEquipmentRack:'lab_equipment_rack',labSampleStorage:'lab_sample_storage',labPrototypeMachine:'lab_prototype_machine',labCryoChamber:'lab_cryo_chamber',labCentralExperiment:'lab_central_experiment',labSampleCase:'lab_sample_case',
 casinoSlotBank:'casino_slot_bank',casinoSlotMachine:'casino_slot_machine',casinoRouletteTable:'casino_roulette_table',casinoBlackjackTable:'casino_blackjack_table',casinoSecurityStation:'casino_security_station',casinoCashierCage:'casino_cashier_cage',casinoChipCart:'casino_chip_cart',casinoBarCounter:'casino_bar_counter',casinoDivider:'casino_divider',casinoHighRollerTable:'casino_high_roller_table',casinoCashierVault:'casino_cashier_vault',casinoBarIsland:'casino_bar_island',casinoRouletteCenterpiece:'casino_roulette_centerpiece'};
V124B_LATE_PLANS.forEach(plan=>{axisAligned(plan);
 if(plan.id.startsWith('04-')||plan.id.startsWith('05-')){
  const hall=plan.rooms.find(r=>r.id==='T')!;
  // A low central working island leaves readable upper and lower circulation shoulders.
  // Room centre remains free: it is the declared crossing observation point, never a colliding waypoint.
  const lab=plan.id.startsWith('04-');
  plan.structures!.push({kind:lab?'labExperimentMachine':'casinoRouletteTable',x:hall.x+hall.w/2+(plan.id==='04-05'?1:0),y:hall.y+(plan.id==='05-04'||plan.id==='05-05'?hall.h-1:1.25),scale:lab?(plan.id==='04-05'?.7:.85):.65,collisionScale:lab?(plan.id==='04-05'?.7:.85):.65});
  plan.lights=[...(plan.lights??[]),{x:hall.x+hall.w/2,y:hall.y+1.25,radius:3,kind:lab?'cool':'warm',intensity:.48}];
 }

 // Cameras face the actual circulation cell from its opposite wall shoulder, not a prop corner.
 for(const camera of plan.cameras??[]){const r=plan.rooms.find(r=>r.id===camera.room)!;camera.at=p(r.x+r.w-1.2,r.y+1.2);camera.facing=Math.atan2(r.h/2-1.2,1.2-r.w/2);}
if(plan.id.startsWith('04-')||plan.id.startsWith('05-'))for(const item of plan.structures??[])if(productionArt[item.kind])item.visualAssetId=productionArt[item.kind];});

/** Opaque service elbows are authored real walls, not immunity or a hidden cover label.
 * These bends are selected only after 28px body-clear reachability and pickup/inspection LOS proof. */
const FIRST_BREAK_ESCAPE_ELBOWS:Record<string,{shift:[number,number];via:Point[]}>= {
 "04-01": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 11.5,
    "y": 4.5
   },
   {
    "x": 19.5,
    "y": 4.5
   }
  ]
 },
 "04-03": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 3.5,
    "y": 8.5
   },
   {
    "x": 12,
    "y": 8.5
   }
  ]
 },
 "04-04": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 12,
    "y": 4.5
   },
   {
    "x": 21,
    "y": 4.5
   }
  ]
 },
 "05-01": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 13,
    "y": 4.5
   },
   {
    "x": 21.5,
    "y": 4.5
   }
  ]
 },
 "05-02": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 13,
    "y": 4.5
   },
   {
    "x": 22.5,
    "y": 4.5
   }
  ]
 },
 "05-03": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 4,
    "y": 8.5
   },
   {
    "x": 13,
    "y": 8.5
   }
  ]
 },
 "05-04": {
  "shift": [
   6,
   0
  ],
  "via": [
   {
    "x": 7,
    "y": 11.5
   },
   {
    "x": 7,
    "y": 3.5
   }
  ]
 },
 "05-05": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 27,
    "y": 12.5
   },
   {
    "x": 27,
    "y": 3.5
   }
  ]
 },
 "06-01": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 13,
    "y": 4.5
   },
   {
    "x": 22.5,
    "y": 4.5
   }
  ]
 },
 "06-02": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 28,
    "y": 12.5
   },
   {
    "x": 28,
    "y": 3.5
   }
  ]
 },
 "06-03": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 4,
    "y": 8.5
   },
   {
    "x": 14,
    "y": 8.5
   }
  ]
 },
 "06-04": {
  "shift": [
   6,
   0
  ],
  "via": [
   {
    "x": 6,
    "y": 11.5
   },
   {
    "x": 6,
    "y": 3.5
   }
  ]
 },
 "06-05": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 14,
    "y": 5.5
   },
   {
    "x": 23.5,
    "y": 5.5
   }
  ]
 },
 "07-01": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 29,
    "y": 12.5
   },
   {
    "x": 29,
    "y": 3.5
   }
  ]
 },
 "07-02": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 14,
    "y": 5.5
   },
   {
    "x": 24.5,
    "y": 5.5
   }
  ]
 },
 "07-03": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 4,
    "y": 9.5
   },
   {
    "x": 14,
    "y": 9.5
   }
  ]
 },
 "07-04": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 28,
    "y": 13.5
   },
   {
    "x": 28,
    "y": 4.5
   }
  ]
 },
 "07-05": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 14,
    "y": 6.5
   },
   {
    "x": 24.5,
    "y": 6.5
   }
  ]
 },
 "08-01": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 39,
    "y": 13.5
   },
   {
    "x": 39,
    "y": 4.5
   }
  ]
 },
 "08-02": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 14,
    "y": 5.5
   },
   {
    "x": 24,
    "y": 5.5
   }
  ]
 },
 "08-03": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 4,
    "y": 9.5
   },
   {
    "x": 14,
    "y": 9.5
   }
  ]
 },
 "08-04": {
  "shift": [
   6,
   0
  ],
  "via": [
   {
    "x": 5,
    "y": 13.5
   },
   {
    "x": 5,
    "y": 4.5
   }
  ]
 },
 "08-05": {
  "shift": [
   0,
   6
  ],
  "via": [
   {
    "x": 24,
    "y": 6.5
   },
   {
    "x": 34,
    "y": 6.5
   }
  ]
 },
 "04-02": {
  "shift": [
   0,
   0
  ],
  "via": [
   {
    "x": 26,
    "y": 11.5
   },
   {
    "x": 26,
    "y": 3.5
   }
  ]
 }
};
for(const plan of V124B_LATE_PLANS){
 const fix=FIRST_BREAK_ESCAPE_ELBOWS[plan.id];if(!fix)continue;const [dx,dy]=fix.shift;
 for(const r of plan.rooms){r.x+=dx;r.y+=dy;}
 for(const e of plan.edges){for(const q of e.via??[]){q.x+=dx;q.y+=dy;}if(e.door){e.door.at.x+=dx;e.door.at.y+=dy;}}
 for(const q of [...plan.structures??[],...plan.lights??[],...plan.islands??[]]){q.x+=dx;q.y+=dy;}
 for(const camera of plan.cameras??[])if(camera.at){camera.at.x+=dx;camera.at.y+=dy;}
 for(const patrol of plan.patrols??[])for(const q of patrol.points??[]){q.x+=dx;q.y+=dy;}
 for(const key of ['entry','objective','exit','firstBreak'] as const){const q=plan[key];if(q){q.x+=dx;q.y+=dy;}}
 plan.edges.find(e=>e.from==='O'&&e.to==='B')!.via=fix.via.map(q=>({...q}));axisAligned(plan);
 if(plan.id==='04-02'){
  const machine=plan.structures!.findLast(q=>q.kind==='labExperimentMachine')!;machine.scale=.7;machine.collisionScale=.7;
  const r=plan.rooms.find(r=>r.id==='R')!,cam=plan.cameras![0];cam.at=p(r.x+1.2,r.y+r.h-1.2);cam.facing=-Math.PI/4;
 }
}

/** Direct secure-transfer gates create the actual short extraction choice.
 * Closing them leaves the certified opaque maintenance elbow and both service rooms. */
const QUICK_EXTRACTION_GATES:Record<string,{from:string;to:string;via:Point[];at:Point;orientation:'horizontal'|'vertical';ids:string[]}>= {
 '04-02':{from:'O',to:'E',via:[p(21,3.5)],at:p(21,7.5),orientation:'horizontal',ids:['O','E','X']},
 '04-05':{from:'O',to:'X',via:[p(9.5,5.5),p(9.5,21.5)],at:p(9.5,10),orientation:'horizontal',ids:['O','X']},
 '05-02':{from:'O',to:'E',via:[p(22.5,9.5)],at:p(18,9.5),orientation:'vertical',ids:['O','E','X']},
 '08-02':{from:'O',to:'E',via:[p(24,10.5)],at:p(19,10.5),orientation:'vertical',ids:['O','E','X']},
 '08-05':{from:'O',to:'E',via:[p(34,11.5)],at:p(29,11.5),orientation:'vertical',ids:['O','E','X']},
 '09-01':{from:'O',to:'X',via:[p(12.5,17.5)],at:p(12.5,10.5),orientation:'horizontal',ids:['O','X']},
 '09-02':{from:'O',to:'E',via:[p(14,16.5)],at:p(19,16.5),orientation:'vertical',ids:['O','E','X']},
 '09-04':{from:'O',to:'E',via:[p(24,8.5)],at:p(19,8.5),orientation:'vertical',ids:['O','E','X']},
};
for(const plan of V124B_LATE_PLANS){const gate=QUICK_EXTRACTION_GATES[plan.id];if(!gate)continue;
 plan.edges=plan.edges.filter(e=>e.role!=='quickEscape');
 plan.edges.push(edge(gate.from,gate.to,'quickEscape',gate.via.map(q=>({...q})),{at:{...gate.at},orientation:gate.orientation,type:'solid',lockdown:true}));
 plan.quickEscape=[...gate.ids];axisAligned(plan);
}
// Casino 05-01 protected table shoulder is a real right-hand lane; the exposed staff cut remains shorter.
const cashierFloor=V124B_LATE_PLANS.find(p=>p.id==='05-01')!;
cashierFloor.edges.find(e=>e.from==='P'&&e.to==='T'&&e.role==='approach')!.via=[p(5.5,25.5),p(5.5,18)];
axisAligned(cashierFloor);
