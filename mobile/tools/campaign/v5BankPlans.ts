/** V5 Bank: explicit corrections following the ten actual Debug-OFF images. */
import {BANK_PLANS as BEFORE,BANK_GUARD_PATROLS as PATROLS} from './v3BankPlans';
import type {BankPlan,BankProp} from './v3BankPlans';
export const BANK_PLANS:BankPlan[]=JSON.parse(JSON.stringify(BEFORE));
export const BANK_GUARD_PATROLS:number[][][][]=JSON.parse(JSON.stringify(PATROLS));
export const BANK_V5_VOIDS:Record<number,{x:number;y:number;w:number;h:number}[]>={
 3:[{x:9,y:11,w:2,h:2}],
 4:[{x:2,y:14,w:2,h:2},{x:9,y:19,w:2,h:3},{x:2,y:3,w:2,h:2}],
 7:[{x:7,y:8,w:6,h:3}],
 8:[{x:4,y:2,w:2,h:3},{x:22,y:8,w:4,h:2}],
 10:[{x:29,y:2,w:2,h:3},{x:39,y:2,w:2,h:3}],
};
export const BANK_V5_OBJECTIVES:Record<number,{x:number;y:number}>={10:{x:35,y:5.75}};
const add=(m:number,kind:BankProp['kind'],zone:number,dx:number,dy:number,reason:string)=>BANK_PLANS[m-1].props.push({kind,zone,dx,dy,reason});
// 01: a public queue is a spatial sequence, not a rope on an empty floor.
add(1,'bankTellerCounter',0,7,3,'Paired teller island defines staffed and public queue sides');
add(1,'bankQueueBarrier',0,3.5,3,'Two readable queue lanes stop short of the teller crossing');
// Omit back-office desk: its wall/counter slot looked passable but lacked body clearance.
// 02: long teller spine preserved; southern staff work bay becomes an actual office.
add(2,'bankOfficeDesk',0,4,4.5,'Public consultation bay makes the entrance observation readable');
add(2,'bankOfficeDesk',3,5.2,3,'Staff desks share one counter-administration workspace');
add(2,'bankFilingCabinet',3,3.5,4.8,'Staff records cover chain protects the long service turn');
add(2,'bankFilingCabinet',3,4.3,4.8,'Attached administration records bank closes ambiguous cabinet gaps');
// 03: three office cells around a central shared records spine; stepped office envelope.
add(3,'bankOfficeDesk',1,2.7,2.8,'West clerk workstation of the office junction');
add(3,'bankOfficeDesk',1,6.2,4.7,'East clerk workstation creates a second passage around shared records');
add(3,'bankFilingCabinet',1,4,4.2,'Central shared records island creates an interior LOS break');
add(3,'bankFilingCabinet',1,4.8,4.2,'Connected central records spine');
add(3,'bankOfficeDesk',3,1.5,5.5,'Restricted records clerk establishes objective ownership');
add(3,'bankOfficeDesk',4,3,3,'Loading dispatch desk makes the exit a working bank space');
add(3,'bankCashCart',4,5.5,3,'Outgoing document cart attached to dispatch workflow');
// 04: staggered cabinet banks create actual short sightline alcoves, not an archive clone.
add(4,'bankFilingCabinet',1,4.7,3,'Connected west ledger bank extension');
add(4,'bankFilingCabinet',1,5.5,3,'Ledger bank end leaves an honest north/south choice');
add(4,'bankFilingCabinet',1,6.3,5,'Second connected staggered ledger row');
add(4,'bankOfficeDesk',2,7,3,'Restricted audit table beside secure ledger objective');
add(4,'bankOfficeDesk',0,2,3.8,'Document intake counter pair forms a staffed observation cell');
add(4,'bankFilingCabinet',3,4,5,'Audit records island provides escape-side LOS break');
// 05: deposit-wall storage and service dispatch linked to the asset, not generic empty rooms.
add(5,'bankDepositBoxWall',3,5,3.45,'Parallel deposit wall defines the secure asset aisle');
add(5,'bankDepositBoxWall',2,3.5,1,'Deposit lane becomes a repeated bank storage system');
add(5,'bankOfficeDesk',4,2.75,3.5,'Deposit returns verification cell beside the records cover');
add(5,'bankCashCart',5,2.7,3,'Sealed deposit dispatch at the separate service exit');
// 06: split the 15-tile empty staff hall into two real connected workrooms.
const gate=BANK_PLANS[5];gate.rooms[3].h=8;
gate.rooms.push({name:'Staff Authorization Office',x:2,y:20,w:7,h:5,purpose:['service-route','chase-break'],features:['LOS-challenge','cover-interaction'],safeReason:'Authorization office exchanges distance for a gate bypass with a sheltered records corner'});
gate.links=gate.links.filter(([a,b])=>!(a===3&&b===2));gate.links.push([3,5],[5,2]);gate.safe=[0,3,5,2];
gate.props=gate.props.filter(p=>!(p.zone===3&&p.kind==='bankFilingCabinet'));
add(6,'bankFilingCabinet',5,3.5,2,'Authorization records shelter between two staff rooms');
add(6,'bankOfficeDesk',5,4.75,2,'Authorization desk owns the bypass records');
add(6,'bankOfficeDesk',0,4,3,'Reception authorization desk explains the checkpoint');
// 07: two table assemblies and record cover define sorting/audit/dispatch cells.
add(7,'bankCashProcessingTable',1,5,3,'Central sorting workstation closes the vacant northwestern work floor');
add(7,'bankCashProcessingTable',1,7,3,'Connected sorting assembly leaves two readable approach sides');
add(7,'bankCashCart',1,12,5.5,'Transfer cart identifies the moving-cash lane between workcells');
add(7,'bankCashProcessingTable',3,2.5,4.5,'Loading inspection table makes the escape a second workflow phase');
// 08: the command desk connects to security office workcells and a real central junction.
add(8,'bankOfficeDesk',3,2,6.7,'Command analyst bay flanks the secure asset desk');
add(8,'bankOfficeDesk',3,6,6.7,'Second command bay creates central surveillance composition');
add(8,'bankFilingCabinet',3,4,8.3,'Command records shield the objective-side return');
add(8,'bankFilingCabinet',2,7.5,5.5,'East junction refuge balances the camera/guard network');
add(8,'bankOfficeDesk',1,2.5,3.5,'Staff verification assembly rather than singleton desk');
add(8,'bankQueueBarrier',0,3,5,'Public/staff boundary gives entrance a bank context');
// 09: the vault door belongs to the reinforced threshold, not a pedestal in a giant room.
BANK_PLANS[8].props[2].dx=5;BANK_PLANS[8].props[2].dy=.65;
BANK_PLANS[8].props[2].reason='Vault threshold mounted against the reinforced northern chamber wall';
add(9,'bankDepositBoxWall',2,5,4,'Secure asset bank inside the vault antechamber');
add(9,'bankOfficeDesk',0,2,3,'Paired inspection work bay');
add(9,'bankFilingCabinet',4,7.5,4.8,'Service dispatch records creates interior escape cover');
// 10: objective is behind a wall-mounted vault face, inside the actual inner chamber.
const final=BANK_PLANS[9];final.fantasy='Penetrate staff checkpoint and inner security, steal the core asset inside the Main Vault, then traverse the east service and west records evacuation circuits.';
final.identity='Stepped inner vault chamber behind reinforced threshold; staffed security approach and distinct southern service escape';
final.props[6].dy=1.45;final.props[6].reason='Main vault face mounted to the north chamber architecture; core asset is stored inside its secure chamber';
add(10,'bankDepositBoxWall',4,2.2,5.3,'West secure deposit bank defines the inner vault storage cell');
add(10,'bankDepositBoxWall',4,9.8,5.3,'East secure deposit bank encloses the core asset chamber');
add(10,'bankOfficeDesk',2,3,3,'Inner-security verification bay joins the actual security island');
add(10,'bankFilingCabinet',2,8,5.5,'Inner central refuge compensates for camera pressure');
add(10,'bankOfficeDesk',5,3.5,2.5,'Service dispatch workcell at the alternate vault escape turn');
add(10,'bankOfficeDesk',5,3.5,8,'Lower service-work cell defines route rhythm before the return dogleg');
add(10,'bankFilingCabinet',5,4.9,8,'Attached dispatch records provide an actual LOS break');
// A secure case is the support for every Bank asset. The objective remains reachable from its sides.
for(let m=1;m<=10;m++){const p=BANK_PLANS[m-1],r=p.rooms[p.goal],o=BANK_V5_OBJECTIVES[m]??{x:r.x+r.w/2,y:r.y+r.h-2};add(m,'objectiveCase',p.goal,o.x-r.x,o.y-r.y+.45,'Secure asset case directly supports the cyan target; never a loose floor item');}

BANK_GUARD_PATROLS[0][0]=[[10,1.1],[10,6.7],[5.5,6.7],[5.5,1.1]];
BANK_GUARD_PATROLS[2][1]=[[2.7,4.8],[2.7,1.2],[6.7,1.2],[5.5,5.7]];
// Full graph rebuilds below supersede the draft workcell-only candidates.
const room=(name:string,x:number,y:number,w:number,h:number,purpose:BankPlan['rooms'][number]['purpose'],features:BankPlan['rooms'][number]['features'],safeReason?:string)=>({name,x,y,w,h,purpose,features,safeReason});
const prop=(kind:BankProp['kind'],zone:number,dx:number,dy:number,reason:string)=>({kind,zone,dx,dy,reason});
BANK_PLANS[2]={title:'Staff Offices',fantasy:'Enter the branch reception, pass through linked clerk offices to the restricted audit asset, then leave through the opposite loading wing.',identity:'Six-room staggered office network with shared central record bank and diagonal dispatch escape',shape:'northwest-to-east-to-southeast staggered office circuit',rooms:[
 room('Branch Reception',2,2,8,6,['approach','observation'],['cover-interaction','meaningful-traversal'],'Reception is the readable first planning pocket'),
 room('West Clerk Office',2,10,8,7,['timing','chase-break'],['LOS-challenge','cover-interaction']),
 room('Shared Records Junction',12,10,9,7,['junction','safe-risk-choice'],['route-choice','cover-interaction','security-pressure']),
 room('East Audit Office',23,7,8,9,['objective'],['objective','landmark','security-pressure']),
 room('Supervisor Office',12,2,9,6,['service-route','timing'],['route-choice','cover-interaction']),
 room('Loading Dispatch',23,19,8,7,['escape','chase-break'],['LOS-challenge','cover-interaction'],'Dispatch paperwork bay provides the post-chase break before the loading door')],links:[[0,1],[0,4],[1,2],[4,2],[2,3],[3,5],[2,5]],entry:{zone:0,side:'top'},exit:{zone:5,side:'bottom'},goal:3,main:[0,1,2,3],safe:[0,4,2,3],risk:[0,1,2,3],escape:[3,2,5],guardZones:[1,2,3,4],cameras:[2],landmark:7,props:[
 prop('bankOfficeDesk',0,4,3,'Reception desk establishes office use'),prop('bankOfficeDesk',1,3,3,'Clerk station one'),prop('bankOfficeDesk',1,4.7,3,'Paired clerk station two'),prop('bankFilingCabinet',1,4.2,4.8,'Clerk records shared between workstations'),
 prop('bankFilingCabinet',2,4.5,3,'Central shared audit records island'),prop('bankFilingCabinet',2,5.3,3,'Connected central record bank'),prop('bankOfficeDesk',2,2,4.8,'Junction records administration desk'),
 prop('bankFilingCabinet',3,4,3.5,'Restricted audit bank directly identifies target ownership'),prop('bankFilingCabinet',3,4.8,3.5,'Audit bank continuation'),prop('bankOfficeDesk',3,2,5,'Audit clerk bay alongside secure asset'),prop('bankOfficeDesk',4,4.5,3,'Supervisor verification station'),
 prop('bankOfficeDesk',5,4,3.2,'Loading dispatch workcell'),prop('bankCashCart',5,5.3,3.2,'Sealed records cart at dispatch'),prop('bankFilingCabinet',5,2,4.8,'Dispatch shelter before alternate exit'),prop('objectiveCase',3,4,7.45,'Secure audit case physically supports the target') ]};
BANK_GUARD_PATROLS[2]=[[[1.3,1.2],[6.7,1.2],[6.7,5.8],[1.3,5.8]],[[7.3,5.8],[7.3,1.2],[1.3,1.2],[1.3,5.8]],[[6.7,7.5],[6.7,1.2],[1.2,1.2],[1.2,7.5]],[[1.3,1.2],[7.5,1.2],[7.5,4.8],[1.3,4.8]]];
delete BANK_V5_VOIDS[3];
BANK_PLANS[3]={title:'Records Room',fantasy:'Enter east document intake, weave between short ledger banks to secure western ledgers and leave through the northern audit wing.',identity:'Stepped records network: narrow intake, ledger spine, secure audit alcove and separate upper verification return',shape:'east-to-southwest-to-north stepped records loop',rooms:[
 room('Document Intake',17,12,8,6,['approach','timing'],['security-pressure','cover-interaction']),room('Ledger Spine',6,12,9,9,['narrow-stealth','junction'],['LOS-challenge','cover-interaction','route-choice']),room('Secure Ledger Alcove',2,2,9,7,['objective'],['objective','landmark','cover-interaction']),room('Audit Verification',13,2,8,7,['escape','security-check'],['security-pressure','route-choice']),room('Records Bridge',6,9,5,3,['service-route','chase-break'],['LOS-challenge','meaningful-traversal'],'Ledger bridge is a short corner shelter between the two records rooms')],links:[[0,1],[1,4],[4,2],[2,3],[0,3]],entry:{zone:0,side:'right'},exit:{zone:3,side:'top'},goal:2,main:[0,1,4,2],safe:[0,3,2],risk:[0,1,4,2],escape:[2,3],guardZones:[0,1,2,3],cameras:[],landmark:5,props:[
 prop('bankOfficeDesk',0,4,3,'Document intake verification desk'),prop('bankOfficeDesk',0,2.3,3,'Connected intake workflow'),prop('bankFilingCabinet',1,3,3,'West ledger bank'),prop('bankFilingCabinet',1,3.8,3,'Connected short western bank'),prop('bankFilingCabinet',1,5.5,5.5,'Staggered east ledger bank'),prop('bankFilingCabinet',2,4.5,3,'Secure ledger landmark'),prop('bankFilingCabinet',2,5.3,3,'Secure audit bank continuation'),prop('bankOfficeDesk',2,2,3,'Restricted ledger clerk bay'),prop('bankOfficeDesk',3,4,3,'Audit verification desk'),prop('bankFilingCabinet',3,4,4.8,'Escape-side audit cover'),prop('objectiveCase',2,4.5,5.45,'Secure ledger case below the actual ledger bank') ]};
BANK_GUARD_PATROLS[3]=[[[1.2,1.2],[6.5,1.2],[6.5,4.8],[1.2,4.8]],[[7.5,7.5],[7.5,1.2],[1.2,1.2],[1.2,7.5]],[[7.5,5.8],[7.5,1.2],[1.2,1.2],[1.2,5.8]],[[6.7,1.2],[6.7,5.8],[1.2,5.8],[1.2,1.2]]];
delete BANK_V5_VOIDS[4];
BANK_PLANS[7]={title:'Inner Security',fantasy:'Cross the branch staff gate into a staffed security junction, steal the command-room asset and break camera sight through the separate east verification exit.',identity:'Seven-zone command network with central security hub, western analysis loop and east audit return',shape:'southwest-to-northeast-to-southeast command loop',rooms:[
 room('Public Access',2,20,8,6,['approach'],['cover-interaction','meaningful-traversal'],'Public planning pocket before the staff threshold'),room('Staff Gate',12,20,8,6,['security-check','timing'],['security-pressure','cover-interaction']),room('Command Junction',12,10,11,8,['junction','safe-risk-choice'],['route-choice','security-pressure','cover-interaction']),room('Inner Security Command',25,2,9,10,['objective'],['objective','landmark','security-pressure']),room('East Audit Return',25,15,9,7,['escape','chase-break'],['LOS-challenge','security-pressure']),room('West Analysis Office',2,10,8,8,['service-route','chase-break'],['LOS-challenge','cover-interaction'],'Analysis office is a longer protected approach behind the staff checkpoint'),room('North Observation Link',12,2,11,6,['timing','security-check'],['security-pressure','meaningful-traversal'])],links:[[0,1],[0,5],[5,2],[1,2],[2,6],[6,3],[2,3],[3,4],[2,4]],entry:{zone:0,side:'left'},exit:{zone:4,side:'right'},goal:3,main:[0,1,2,6,3],safe:[0,5,2,3],risk:[0,1,2,3],escape:[3,2,4],guardZones:[1,2,3,4,6],cameras:[2,4],landmark:4,props:[
 prop('bankTellerCounter',0,4,3,'Public bank threshold'),prop('bankSecurityGate',1,4,.5,'Open gate spans staff crossing'),prop('bankOfficeDesk',1,4,3.8,'Staff access verification'),prop('bankSecurityCheckpoint',2,5.5,3.5,'Central staffed command island'),prop('bankSecurityCheckpoint',3,4.5,5,'Command asset ownership landmark'),prop('bankOfficeDesk',3,2.1,7,'Command analyst bay one'),prop('bankOfficeDesk',3,6.9,7,'Command analyst bay two'),prop('bankFilingCabinet',2,8.2,5.5,'East hub refuge before audit return'),prop('bankFilingCabinet',2,9,5.5,'Connected command records bank'),prop('bankOfficeDesk',5,4,3.5,'Analysis office workstation'),prop('bankFilingCabinet',5,4,5.3,'Analyst records shield'),prop('bankVaultCorridorWall',6,5.5,3,'Reinforced northern approach creates observation timing'),prop('bankOfficeDesk',4,4.5,3.5,'Audit return verification cell'),prop('objectiveCase',3,4.5,8.45,'Command secure case under the marked asset') ]};
BANK_GUARD_PATROLS[7]=[[[1.2,1.2],[6.7,1.2],[6.7,4.8],[1.2,4.8]],[[9.5,6.5],[9.5,1.2],[1.2,1.2],[1.2,6.5]],[[7.5,8.5],[7.5,1.2],[1.2,1.2],[1.2,8.5]],[[1.2,1.2],[7.5,1.2],[7.5,5.8],[1.2,5.8]],[[1.2,1.2],[9.5,1.2],[9.5,4.8],[1.2,4.8]]];
delete BANK_V5_VOIDS[8];
BANK_PLANS[9]={title:'Main Vault',fantasy:'Penetrate staff checkpoint and inner security, steal the core asset inside the Main Vault and take the east service loop through dispatch and records evacuation.',identity:'Eight-zone final vault circuit: west staff infiltration, upper reinforced vault, eastern cash dispatch and separate south records evacuation',shape:'southwest-to-northeast-to-southeast deep-in alternate-out',rooms:[
 room('Staff Entry',2,24,8,7,['approach'],['cover-interaction','meaningful-traversal'],'Initial staff records planning pocket'),room('Security Checkpoint',12,24,9,7,['security-check','timing'],['security-pressure','cover-interaction']),room('Inner Security',12,13,11,8,['security-check','junction'],['route-choice','security-pressure','cover-interaction']),room('Vault Antechamber',12,2,11,8,['timing','observation'],['LOS-challenge','security-pressure']),room('Main Vault',26,2,12,11,['objective','lockdown'],['objective','landmark','security-pressure']),room('East Cash Service',29,16,9,10,['service-route','chase-break'],['cover-interaction','security-pressure']),room('Dispatch Junction',23,29,15,6,['junction','chase-break'],['route-choice','cover-interaction','security-pressure']),room('Records Evacuation',27,38,11,7,['escape'],['cover-interaction','LOS-challenge'],'Records exit shelter is a post-chase refuge after two security zones')],links:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[2,5],[1,6]],entry:{zone:0,side:'left'},exit:{zone:7,side:'right'},goal:4,main:[0,1,2,3,4],safe:[0,1,2,5,4],risk:[0,1,2,3,4],escape:[4,5,6,7],guardZones:[1,2,3,4,5,6,7],cameras:[2,3,6],landmark:6,props:[
 prop('bankOfficeDesk',0,4,3.5,'Staff arrival desk identifies restricted entrance'),prop('bankFilingCabinet',0,6,4.8,'Entry records planning shelter'),prop('bankSecurityGate',1,4.5,.5,'Actual staff-security threshold gate'),prop('bankSecurityCheckpoint',1,4.5,4,'Staff credential verification island'),prop('bankSecurityCheckpoint',2,5.5,3.5,'Inner staffed security hub'),prop('bankFilingCabinet',2,8.5,5.5,'Inner security escape refuge'),
 prop('bankMainVault',4,6,.6,'Main vault face mounted to reinforced northern wall with asset stored inside the chamber'),prop('bankVaultCorridorWall',3,5.5,3.5,'Reinforced antechamber observation island'),prop('bankDepositBoxWall',4,2.5,6.5,'Western vault asset storage bank'),prop('bankDepositBoxWall',4,9.5,6.5,'Eastern secure deposit bank frames the core asset'),prop('bankSmallSafe',4,2.5,8.5,'Vault storage side cell'),prop('bankSmallSafe',4,9.5,8.5,'Second secure vault storage cell'),
 prop('bankOfficeDesk',5,4.5,3,'Cash-service verification workcell'),prop('bankCashProcessingTable',5,4.5,6,'Cash dispatch assembly'),prop('bankFilingCabinet',5,7,6,'Service records refuge'),prop('bankCashCart',5,2,6,'Cash cart identifies the actual alternate escape'),prop('bankCashProcessingTable',6,5,3.2,'Dispatch checkpoint cell one'),prop('bankCashProcessingTable',6,7,3.2,'Connected dispatch assembly defines two pass sides'),prop('bankFilingCabinet',6,11.5,3.5,'Dispatch junction chase break'),prop('bankOfficeDesk',7,5.5,3,'Records evacuation authorization desk'),prop('bankFilingCabinet',7,3,4.8,'Final escape shelter'),prop('bankFilingCabinet',7,3.8,4.8,'Connected final records shelter'),prop('objectiveCase',4,6,5.2,'Cyan core asset directly supported by the secure vault case inside Main Vault') ]};
BANK_V5_OBJECTIVES[10]={x:32,y:6.75};
BANK_GUARD_PATROLS[9]=[[[1.2,1.2],[7.5,1.2],[7.5,5.8],[1.2,5.8]],[[1.2,1.2],[9.5,1.2],[9.5,6.5],[1.2,6.5]],[[1.2,1.2],[9.5,1.2],[9.5,6.5],[1.2,6.5]],[[10.5,9.5],[10.5,2.5],[1.2,2.5],[1.2,9.5]],[[1.2,1.2],[7.5,1.2],[7.5,8.5],[1.2,8.5]],[[1.2,1.2],[13.5,1.2],[13.5,4.8],[1.2,4.8]],[[1.2,1.2],[9.5,1.2],[9.5,5.8],[1.2,5.8]]];
delete BANK_V5_VOIDS[10];

BANK_GUARD_PATROLS[6][3]=[[1.2,1.2],[7.5,1.2],[7.5,4.8],[1.2,4.8]];
// Actual failed-playtest refinement: a spotted runner met the evacuation Guard
// head-on in the single exit choke. A reinforced dispatch record bank shelters
// a real wait/route decision while that Guard moves north to the shared LKP.
const dispatchCover=BANK_PLANS[9].props.find(p=>p.zone===6&&p.kind==='bankFilingCabinet')!;
dispatchCover.kind='bankVaultCorridorWall';dispatchCover.dx=11.5;dispatchCover.dy=4.8;
dispatchCover.reason='Reinforced dispatch records bank creates a sheltered south-side wait before the evacuation choke; both end passages remain body-clear';
