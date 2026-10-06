/** V12 4B: individual, authored early-campaign room graphs. No rotation/template expansion. */
import type {V124bPlan,V124bRoom,V124bEdge,Point} from './v124bTypes';
const p=(x:number,y:number):Point=>({x,y});
const room=(id:string,name:string,role:V124bRoom['role'],x:number,y:number,w:number,h:number,purpose:string):V124bRoom=>({id,name,role,x,y,w,h,purpose});
const edge=(from:string,to:string,role:V124bEdge['role'],via:Point[]=[],door?:V124bEdge['door']):V124bEdge=>({from,to,role,via,width:3,door});
export const V124B_EARLY_PLANS:V124bPlan[]=[
 {
 id:'01-01',title:'Entrance Hall',family:'arrival fork / inward collection / east service detour',
 rooms:[
 room('entry','Visitor Vestibule','public',1,15,5,5,'Protected first view of the admission gallery'),
 room('view','Admission Exhibit','transition',1,6,6,6,'A sculpture divides visitor crossing from the slow observation shoulder'),
 room('collection','Collection Threshold','restricted',10,6,5,6,'One readable staff-controlled threshold'),
 room('secure','Restricted Cameo Collection','objective',10,1,5,4,'Cameo diamond inside a private collection, beyond admission'),
 room('packing','Packing Gallery','escape',22,1,5,5,'First blind corner and art handling landmark'),
 room('loading','Loading Passage','escape',22,17,5,5,'Crates define a service route, not public backtracking'),
 room('exit','South Staff Exit','escape',11,18,5,4,'Separate staff delivery exit')],
 edges:[edge('entry','view','approach'),edge('view','collection','approach'),edge('collection','secure','approach'),
 edge('entry','collection','risk',[p(8,17.5),p(8,9)]),
 edge('secure','packing','alternateEscape'),edge('packing','loading','alternateEscape'),edge('loading','exit','alternateEscape'),
 edge('secure','exit','quickEscape',[p(18,3),p(18,20)],{at:p(18,13),orientation:'horizontal',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','view','collection','secure'],risk:['entry','collection','secure'],quickEscape:['secure','exit'],alternateEscape:['secure','packing','loading','exit'],
 structures:[{kind:'statue',x:4,y:7.5,scale:1.8},{kind:'displayCase',x:11,y:10},{kind:'crate',x:23,y:19}],patrols:[{room:'view',role:'room'},{room:'collection',role:'objective'}],firstBreak:p(17,3)
 },
 {
 id:'01-02',title:'Main Gallery',family:'west-east enfilade / upper observation loop / lower side egress',
 rooms:[
 room('entry','West Ticket Lobby','public',1,9,5,5,'Public entrance at the west end of the exhibition'),
 room('rotunda','Rotunda Viewing Cell','transition',9,7,7,7,'Central statue establishes two shoulders and a short exposed cross'),
 room('study','Upper Sculpture Study','transition',9,1,5,4,'Sheltered longer collection approach'),
 room('threshold','Curator Threshold','restricted',19,7,5,5,'Controlled collection antechamber'),
 room('secure','East Private Gallery','objective',27,7,5,6,'Diamond beyond the curator threshold'),
 room('handling','Art Handling Room','escape',27,18,5,5,'First corner after theft with packing cover'),
 room('service','South Service Gallery','escape',17,18,6,5,'Service transport passage across the exhibition back'),
 room('exit','South Delivery Exit','escape',7,18,5,5,'Exit on a separate facade, not the ticket lobby')],
 edges:[edge('entry','rotunda','approach'),edge('rotunda','study','approach'),edge('study','threshold','approach',[p(21.5,3)]),edge('threshold','secure','approach'),
 edge('rotunda','threshold','risk'),edge('secure','handling','alternateEscape'),edge('handling','service','alternateEscape'),edge('service','exit','alternateEscape'),
 edge('threshold','exit','quickEscape',[p(21.5,16.5),p(9.5,16.5)],{at:p(21.5,14.5),orientation:'horizontal',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','rotunda','study','threshold','secure'],risk:['entry','rotunda','threshold','secure'],quickEscape:['secure','threshold','exit'],alternateEscape:['secure','handling','service','exit'],
 structures:[{kind:'statue',x:12.5,y:8.5,scale:2},{kind:'statue',x:10.5,y:2},{kind:'displayCase',x:28.5,y:8},{kind:'crate',x:28.5,y:19}],patrols:[{room:'rotunda',role:'room'},{room:'threshold',role:'objective'}],firstBreak:p(29.5,15.5)
 },
 {
 id:'01-03',title:'Archive & Conservation',family:'stepped archive descent / conservation elbow / loading side-out',
 rooms:[
 room('entry','Public Reading Vestibule','public',1,1,5,5,'Visitors enter the archive front rather than the secure store'),
 room('archive','Catalog Archive','transition',1,9,6,5,'Storage shelves create clear protected observation positions'),
 room('work','Conservation Workroom','restricted',10,9,6,6,'Work tables separate public archive from preservation staff'),
 room('secure','Sealed Artifact Store','objective',10,19,6,5,'Artifact sits inside controlled conservation storage'),
 room('packing','Packing Alcove','escape',20,19,5,5,'Blind right turn immediately beyond collection'),
 room('loading','Upper Loading Gallery','escape',20,9,5,5,'Service handling circulation bypasses the catalog archive'),
 room('exit','Loading Dock Exit','escape',20,1,5,5,'Exit on the east face, far from public reading entry')],
 edges:[edge('entry','archive','approach'),edge('archive','work','approach'),edge('work','secure','approach'),
 edge('entry','work','risk',[p(8.5,3.5),p(8.5,11.5)]),edge('secure','packing','alternateEscape'),edge('packing','loading','alternateEscape'),edge('loading','exit','alternateEscape'),
 edge('work','exit','quickEscape',[p(18.5,12),p(18.5,3.5)],{at:p(16.8,12),orientation:'vertical',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','archive','work','secure'],risk:['entry','work','secure'],quickEscape:['secure','work','exit'],alternateEscape:['secure','packing','loading','exit'],
 structures:[{kind:'shelf',x:2.5,y:10},{kind:'table',x:12.5,y:10.5,scale:1.4},{kind:'crate',x:21.5,y:21},{kind:'crate',x:21.5,y:10}],patrols:[{room:'archive',role:'room'},{room:'work',role:'objective'}],firstBreak:p(18,21.5)
 },
 {
 id:'01-04',title:'Security Wing',family:'split observation cross / inner monitored room / northern dispatch branch',
 rooms:[
 room('entry','South Museum Corridor','public',10,20,5,5,'Low-pressure arrival with a visible security desk landmark'),
 room('desk','Security Desk Hall','transition',9,11,7,6,'Desk island defines a short crossing and protected outer shoulder'),
 room('records','West Access Records','transition',1,11,5,5,'Covered access-check detour around the desk sightline'),
 room('monitor','Monitoring Threshold','restricted',1,3,6,5,'Monitoring equipment marks restricted collection access'),
 room('secure','Restricted Collection Interior','objective',11,1,6,5,'Collection beyond the monitor room, not a corridor pedestal'),
 room('dispatch','Dispatch Room','escape',20,1,5,5,'Theft exits the collection through a separate dispatch corner'),
 room('staff','East Staff Passage','escape',20,10,5,5,'Staff equipment provides one readable refuge'),
 room('fastVestibule','Security Return Vestibule','restricted',16,7,3,3,'Controlled shortcut that seals during lockdown'),room('exit','East Dispatch Exit','escape',27,10,5,5,'External dispatch exit on the opposite side of the building')],
 edges:[edge('entry','desk','approach'),edge('desk','records','approach'),edge('records','monitor','approach'),edge('monitor','secure','approach',[p(4,1.5),p(14,1.5)],{at:p(8.5,1.5),orientation:'vertical'}),
 edge('desk','monitor','risk',[p(8.5,14),p(8.5,5.5)]),edge('secure','dispatch','alternateEscape'),edge('dispatch','staff','alternateEscape'),edge('staff','exit','alternateEscape'),
 edge('secure','fastVestibule','quickEscape',[p(17.5,3.5)],{at:p(17.5,6.8),orientation:'horizontal',lockdown:true}),edge('fastVestibule','exit','quickEscape',[p(29.5,8.5)],{at:p(25.5,8.5),orientation:'vertical',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','desk','records','monitor','secure'],risk:['entry','desk','monitor','secure'],quickEscape:['secure','fastVestibule','exit'],alternateEscape:['secure','dispatch','staff','exit'],
 structures:[{kind:'counter',x:12.5,y:12.2,scale:1.7},{kind:'equipment',x:2.5,y:4},{kind:'displayCase',x:12.2,y:2.2,scale:.65},{kind:'shelf',x:21.5,y:11}],patrols:[{room:'desk',role:'room'},{room:'monitor',role:'objective'}],cameras:[{room:'desk',at:p(15,12),facing:Math.PI}],firstBreak:p(18,3.5)
 },
 {
 id:'01-05',title:'Grand Heist',family:'grand lobby axial infiltration / private chamber / eastern cloister side exit',
 rooms:[
 room('entry','Grand Lobby Entry','public',1,20,6,5,'Clear protected read of the grand exhibition entrance'),
 room('exhibit','Main Exhibition','transition',1,10,7,7,'Grand sculpture island splits viewing shoulder from central cross'),
 room('collection','Restricted Collection','restricted',11,10,6,6,'Private collection checked beyond the public exhibition'),
 room('secure','Grand Objective Chamber','objective',11,1,6,6,'The diamond occupies a protected collection interior'),
 room('cloister','Art Service Cloister','escape',23,1,5,6,'First corner breaks collection sightlines'),
 room('preparation','East Preparation Room','escape',23,11,5,5,'Packing workspace provides the persistent escape refuge'),
 room('fastVestibule','Private Return Vestibule','restricted',18,8,3,3,'Fast collection return seals while service preparation remains open'),room('exit','East Side Exit','escape',31,11,5,5,'Separate side facade exit, never next to lobby')],
 edges:[edge('entry','exhibit','approach'),edge('exhibit','collection','approach'),edge('collection','secure','approach'),
 edge('entry','collection','risk',[p(9.5,22.5),p(9.5,13)]),edge('secure','cloister','alternateEscape'),edge('cloister','preparation','alternateEscape'),edge('preparation','exit','alternateEscape'),
 edge('secure','fastVestibule','quickEscape',[p(19.5,4)],{at:p(19.5,7.8),orientation:'horizontal',lockdown:true}),edge('fastVestibule','exit','quickEscape',[p(33.5,9.5)],{at:p(29.5,9.5),orientation:'vertical',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','exhibit','collection','secure'],risk:['entry','collection','secure'],quickEscape:['secure','fastVestibule','exit'],alternateEscape:['secure','cloister','preparation','exit'],
 structures:[{kind:'statue',x:4.5,y:11.5,scale:2},{kind:'displayCase',x:12.5,y:12},{kind:'statuePedestal',x:12.5,y:2},{kind:'crate',x:24.5,y:13}],patrols:[{room:'exhibit',role:'room'},{room:'collection',role:'objective'}],firstBreak:p(19,4)
 },
 {
 id:'02-01',title:'Portrait Hall',family:'serpentine portrait enfilade / northern conservation exit',
 rooms:[room('entry','Visitor Entrance','public',1,20,5,5,'Arrival shield before the long portrait hall'),room('portraits','Public Portrait Enfilade','transition',9,19,8,6,'Portrait rhythm and benches mark a long timed sightline'),room('curator','Curator Checkpoint','restricted',20,10,5,6,'Turn from public portraits to private collection'),room('secure','Private Portrait Collection','objective',10,1,6,6,'Protected portrait chamber holds the selected jewel'),room('restoration','West Restoration Room','escape',1,1,5,6,'First opaque corner separates the diamond from viewing circulation'),room('dispatch','West Dispatch Gallery','escape',1,10,5,5,'Restoration handling refuge with clear alternate exit approach'),room('privateVestibule','Private Access Vestibule','restricted',16,8,3,5,'A narrow staff-controlled private access corridor'),room('exit','Conservation Side Exit','escape',10,10,5,5,'Separate conservation facade exit')],
 edges:[edge('entry','portraits','approach'),edge('portraits','curator','approach',[p(22.5,22)]),edge('curator','secure','approach',[p(22.5,4)],{at:p(20.5,4),orientation:'vertical'}),edge('portraits','secure','risk',[p(18.5,22),p(18.5,4)]),edge('secure','restoration','alternateEscape'),edge('restoration','dispatch','alternateEscape'),edge('dispatch','exit','alternateEscape'),edge('secure','exit','quickEscape',[p(17.5,4),p(17.5,12.5)],{at:p(17.5,7.8),orientation:'horizontal',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','portraits','curator','secure'],risk:['entry','portraits','secure'],quickEscape:['secure','exit'],alternateEscape:['secure','restoration','dispatch','exit'],
 structures:[{kind:'bench',x:11,y:20},{kind:'partition',x:15,y:23},{kind:'displayCase',x:21,y:11},{kind:'statue',x:11.5,y:2},{kind:'table',x:2,y:2},{kind:'crate',x:2,y:11}],patrols:[{room:'portraits',role:'room'},{room:'curator',role:'objective'}],firstBreak:p(7.5,4)
 },
 {
 id:'02-02',title:'Sculpture Studio',family:'central studio fan / eastern private workshop / northwest loading exit',
 rooms:[room('entry','South Sculpture Reception','public',12,21,5,5,'Read of the sculptors public workspace'),room('studio','Open Sculpture Studio','transition',10,10,8,8,'Sculpture island presents covered shoulder and exposed direct cross'),room('workshop','East Workshop Threshold','restricted',22,10,6,6,'Private workspace behind the public studio'),room('secure','Private Commission Workshop','objective',22,1,6,6,'Commission jewel kept inside restricted production room'),room('preparation','North Preparation Studio','escape',11,1,6,5,'First collection corner and art crating landmark'),room('loading','West Loading Passage','escape',1,10,4,5,'Service movement around the public studio'),room('fastVestibule','Studio Return Vestibule','restricted',18,7,3,3,'Public quick return seals at both ends while loading remains open'),room('exit','Northwest Loading Exit','escape',1,1,4,5,'Separate loading exit')],
 edges:[edge('entry','studio','approach'),edge('studio','workshop','approach'),edge('workshop','secure','approach'),edge('entry','workshop','risk',[p(20,23.5),p(20,13)]),edge('secure','preparation','alternateEscape'),edge('preparation','loading','alternateEscape',[p(7.5,3.5),p(7.5,12.5)]),edge('loading','exit','alternateEscape'),edge('secure','fastVestibule','quickEscape',[p(19.5,4)],{at:p(19.5,6.8),orientation:'horizontal',lockdown:true}),edge('fastVestibule','exit','quickEscape',[p(3,8.5)],{at:p(5.5,8.5),orientation:'vertical',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','studio','workshop','secure'],risk:['entry','workshop','secure'],quickEscape:['secure','fastVestibule','exit'],alternateEscape:['secure','preparation','loading','exit'],
 structures:[{kind:'statue',x:14,y:12,scale:2},{kind:'statuePedestal',x:16,y:16},{kind:'table',x:23.5,y:11.5},{kind:'statue',x:23.5,y:2.5},{kind:'crate',x:12.5,y:2},{kind:'crate',x:2,y:11}],patrols:[{room:'studio',role:'room'},{room:'workshop',role:'objective'}],firstBreak:p(19.5,4)
 },
 {
 id:'02-03',title:'Glass Gallery',family:'north glazed observation / southeast private room / south-west opaque detour',
 rooms:[room('entry','West Gallery Reception','public',1,1,5,5,'Entry reveals a glass exhibition but no direct collection access'),room('glass','Glazed Viewing Gallery','transition',10,1,8,6,'Transparent partition divides physically blocked circulation from shared sightline'),room('installation','Installation Crossing','restricted',10,11,7,7,'Installation island anchors a longer exposed crossing'),room('installationThreshold','Private Installation Threshold','restricted',17,9,3,4,'Controlled installation-side access beneath the transparent observation panel'),room('secure','Private Glass Collection','objective',22,11,6,6,'Secure jewel inside private room beyond installation'),room('preparation','South Preparation Room','escape',22,22,6,5,'Opaque service turn after theft'),room('store','South Art Store','escape',10,22,6,5,'Packing cells shield the alternate circulation'),room('exit','Southwest Service Exit','escape',1,22,5,5,'Exit separated from north public reception by the whole building')],
 edges:[edge('entry','glass','approach'),edge('glass','installation','approach'),edge('installation','secure','approach'),edge('glass','installation','risk',[p(18.5,4),p(18.5,14.5)],{at:p(18.5,9),orientation:'horizontal',type:'glass'}),edge('secure','preparation','alternateEscape'),edge('preparation','store','alternateEscape'),edge('store','exit','alternateEscape'),edge('secure','exit','quickEscape',[p(25,20.5),p(3.5,20.5)],{at:p(20,20.5),orientation:'vertical',type:'glass',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','glass','installation','secure'],risk:['entry','glass','installation','secure'],quickEscape:['secure','exit'],alternateEscape:['secure','preparation','store','exit'],
 structures:[{kind:'galleryGlassPanelVertical',x:12,y:3},{kind:'statue',x:12,y:14,scale:1.8},{kind:'statuePedestal',x:15.5,y:16},{kind:'displayCase',x:23.5,y:12.5},{kind:'crate',x:23.5,y:23.5},{kind:'shelf',x:11.5,y:23.5}],patrols:[{room:'glass',role:'room'},{room:'installation',role:'objective'}],firstBreak:p(25,19.5)
 },
 {
 id:'02-04',title:'Grand Atrium',family:'atrium diagonal split / upper private wing / northern staff bridge',
 rooms:[room('entry','Southwest Arrival Gallery','public',1,20,4,5,'Protected arrival facing the atrium landmark'),room('atrium','Atrium Installation Floor','transition',10,13,8,8,'Two exhibit islands divide the broad atrium into readable crossing cells'),room('upper','Upper Art-Wall Gallery','restricted',22,8,6,6,'Movable art wall marks private collection transition'),room('privateVestibule','Restricted Atrium Vestibule','restricted',18,8,4,5,'Staff-controlled transition beyond the public atrium'),room('secure','North Private Installation','objective',12,1,6,6,'Diamond within a protected installation collection'),room('prep','West Art Preparation','escape',1,1,5,6,'First concealed collection turn into preparation'),room('staff','West Staff Gallery','escape',1,11,5,5,'Opaque staff shoulder separate from open atrium'),room('exit','Southeast Staff Exit','escape',25,22,5,5,'Staff exit opposite public arrival')],
 edges:[edge('entry','atrium','approach'),edge('atrium','upper','approach',[p(25,17)]),edge('upper','secure','approach',[p(25,4)],{at:p(22.5,4),orientation:'vertical'}),edge('atrium','upper','risk',[p(30,17),p(30,11)]),edge('secure','prep','alternateEscape'),edge('prep','staff','alternateEscape'),edge('staff','exit','alternateEscape',[p(-2,13.5),p(-2,28.5),p(27.5,28.5)]),edge('secure','exit','quickEscape',[p(20,4),p(20,24.5)],{at:p(20,22),orientation:'horizontal',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','atrium','upper','secure'],risk:['entry','atrium','upper','secure'],quickEscape:['secure','exit'],alternateEscape:['secure','prep','staff','exit'],
 structures:[{kind:'statue',x:14,y:15,scale:2},{kind:'statuePedestal',x:16,y:19},{kind:'partition',x:23.5,y:9.5},{kind:'statue',x:13.5,y:2.5},{kind:'crate',x:2.5,y:2.5},{kind:'table',x:2.5,y:12.5}],patrols:[{room:'atrium',role:'room'},{room:'upper',role:'objective'}],firstBreak:p(8.5,4)
 },
 {
 id:'02-05',title:'Masterpiece',family:'lower public enfilade / eastern curator climb / western preparation egress',
 rooms:[room('entry','Public West Vestibule','public',1,21,5,5,'Unobstructed arrival before private collection depth'),room('public','Main Public Collection','transition',10,20,8,6,'Long display rhythm divides safe shoulder from direct viewing lane'),room('curator','East Curator Gallery','restricted',22,11,6,6,'Curator-controlled wall displays separate public and private collections'),room('secure','Masterpiece Chamber','objective',22,1,6,6,'Masterpiece is inside the private exhibition room'),room('handling','North Handling Studio','escape',11,1,6,6,'Opaque first service corner after acquisition'),room('preparation','West Preparation Gallery','escape',1,1,6,6,'Art preparation creates alternate exit circulation'),room('exit','West Staff Exit','escape',1,11,5,5,'Staff side exit away from public vestibule')],
 edges:[edge('entry','public','approach'),edge('public','curator','approach',[p(25,23)]),edge('curator','secure','approach'),edge('public','curator','risk',[p(19.5,23),p(19.5,14)]),edge('secure','handling','alternateEscape'),edge('handling','preparation','alternateEscape'),edge('preparation','exit','alternateEscape'),edge('secure','exit','quickEscape',[p(25,8.5),p(3.5,8.5)],{at:p(8.5,8.5),orientation:'vertical',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','public','curator','secure'],risk:['entry','public','curator','secure'],quickEscape:['secure','exit'],alternateEscape:['secure','handling','preparation','exit'],
 structures:[{kind:'bench',x:11.5,y:21},{kind:'partition',x:16,y:24},{kind:'statue',x:23.5,y:12.5},{kind:'displayCase',x:23.5,y:2.5},{kind:'crate',x:12.5,y:2.5},{kind:'table',x:2.5,y:2.5}],patrols:[{room:'public',role:'room'},{room:'curator',role:'objective'}],highSecurity:true,firstBreak:p(19.5,4)
 },
 {
 id:'03-01',title:'Lobby / Teller',family:'bank public counter split / back cashier room / north cash dispatch',
 rooms:[room('entry','Public Bank Entrance','public',1,20,6,5,'Customers arrive beneath the teller-counter sightline'),room('lobby','Teller Hall','transition',1,10,8,7,'Counter island establishes public queue and staff-controlled shoulder'),room('staff','Staff Cash Office','restricted',12,10,6,6,'Bank staff access beyond customer counters'),room('secure','Secured Teller Cash Room','objective',12,1,6,6,'Cash jewel inside protected cashier store'),room('processing','Cash Dispatch Room','escape',24,1,6,6,'Cash handling corner provides first escape refuge'),room('service','Cash Service Passage','escape',24,12,5,5,'Separate protected circulation behind staff operations'),room('fastVestibule','Cash Return Checkpoint','restricted',18,8,4,3,'Cash-return shutters cut the direct delivery crossing'),room('exit','Cash Delivery Exit','escape',32,12,5,5,'Secondary bank delivery facade')],
 edges:[edge('entry','lobby','approach'),edge('lobby','staff','approach'),edge('staff','secure','approach',[p(15,8)],{at:p(15,8),orientation:'horizontal'}),edge('entry','staff','risk',[p(10.5,22.5),p(10.5,13)]),edge('secure','processing','alternateEscape'),edge('processing','service','alternateEscape'),edge('service','exit','alternateEscape'),edge('secure','fastVestibule','quickEscape',[p(20,4)],{at:p(20,7.8),orientation:'horizontal',lockdown:true}),edge('fastVestibule','exit','quickEscape',[p(34.5,9.5)],{at:p(30.5,9.5),orientation:'vertical',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','lobby','staff','secure'],risk:['entry','staff','secure'],quickEscape:['secure','fastVestibule','exit'],alternateEscape:['secure','processing','service','exit'],structures:[{kind:'bankTellerCounter',x:5,y:11.8,scale:1.35},{kind:'bankQueueBarrier',x:7,y:15},{kind:'bankOfficeDesk',x:13.5,y:11.5},{kind:'bankDepositBoxWall',x:13.5,y:2.5},{kind:'bankCashProcessingTable',x:25.5,y:2.5},{kind:'bankCashCart',x:25.5,y:13.5}],patrols:[{room:'lobby',role:'room'},{room:'staff',role:'corridor'},{room:'secure',role:'objective'}],cameras:[{room:'staff',at:p(17,11),facing:Math.PI}],firstBreak:p(20,4)
 },
 {
 id:'03-02',title:'Staff Offices',family:'office ladder / private cash room / opposite loading stair',
 rooms:[room('entry','East Public Reception','public',25,20,5,5,'Public reception starts outside employee offices'),room('office','Staff Office Floor','transition',14,19,7,6,'Desk group splits document shoulder from exposed office crossing'),room('checkpoint','Staff Security Checkpoint','restricted',14,9,6,6,'Dedicated checkpoint precedes protected cash records'),room('secure','Private Cash Records','objective',1,9,6,6,'Secured records contain the jewel behind staff security'),room('records','North Records Handling','escape',1,1,6,5,'First concealed turn behind record storage'),room('dispatch','North Document Dispatch','escape',14,1,6,5,'Bank-service corridor bypasses the office approach'),room('exit','Northeast Service Exit','escape',25,1,5,5,'Exit opposite the public reception')],
 edges:[edge('entry','office','approach'),edge('office','checkpoint','approach'),edge('checkpoint','secure','approach',[p(10,12)],{at:p(10,12),orientation:'vertical'}),edge('office','checkpoint','risk',[p(13,22),p(13,17.5),p(17,17.5)]),edge('secure','records','alternateEscape'),edge('records','dispatch','alternateEscape'),edge('dispatch','exit','alternateEscape'),edge('checkpoint','exit','quickEscape',[p(21.5,12),p(21.5,3.5)],{at:p(21.5,8.5),orientation:'horizontal',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','office','checkpoint','secure'],risk:['entry','office','checkpoint','secure'],quickEscape:['secure','checkpoint','exit'],alternateEscape:['secure','records','dispatch','exit'],structures:[{kind:'bankOfficeDesk',x:15.5,y:20.5},{kind:'bankFilingCabinet',x:19,y:23},{kind:'bankSecurityCheckpoint',x:15.5,y:10.5},{kind:'bankSmallSafe',x:2.5,y:10.5},{kind:'bankFilingCabinet',x:2.5,y:2},{kind:'bankCashCart',x:15.5,y:2}],patrols:[{room:'office',role:'room'},{room:'checkpoint',role:'corridor'},{room:'secure',role:'objective'}],cameras:[{room:'checkpoint',at:p(19,10),facing:Math.PI}],firstBreak:p(4,7.5)
 },
 {
 id:'03-03',title:'Cash Processing',family:'processing dogleg / split counting shoulders / secure transport exit',
 rooms:[room('entry','Customer Transfer Vestibule','public',1,1,5,5,'Public transfer entrance is outside cash-handling floor'),room('staff','Staff Transfer Office','transition',10,1,6,6,'Staff receiving desks mark the first access layer'),room('count','Cash Counting Floor','restricted',10,11,8,7,'Counting islands create safe shoulder and exposed crossing'),room('countingThreshold','Counting Security Vestibule','restricted',17,8,3,5,'Security layer at the staff to cash-handling side entrance'),room('secure','Protected Cash Store','objective',22,11,6,6,'Jewel inside the secured cash-processing store'),room('transport','South Armored Loading','escape',22,22,6,5,'First escape corner and armored packing refuge'),room('sorting','South Document Sorting','escape',10,22,6,5,'Cash service circulation bypasses staff entrance'),room('exit','Southwest Cash Exit','escape',1,22,5,5,'Delivery exit separated from north customer entrance')],
 edges:[edge('entry','staff','approach'),edge('staff','count','approach',[p(13,9)],{at:p(13,9),orientation:'horizontal'}),edge('count','secure','approach',[],{at:p(20.5,14.5),orientation:'vertical'}),edge('staff','count','risk',[p(18.5,4),p(18.5,14.5)]),edge('secure','transport','alternateEscape'),edge('transport','sorting','alternateEscape'),edge('sorting','exit','alternateEscape'),edge('count','exit','quickEscape',[p(14,20.5),p(3.5,20.5)],{at:p(14,18.8),orientation:'horizontal',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','staff','count','secure'],risk:['entry','staff','count','secure'],quickEscape:['secure','count','exit'],alternateEscape:['secure','transport','sorting','exit'],structures:[{kind:'bankOfficeDesk',x:11.5,y:2.5},{kind:'bankCashProcessingTable',x:14,y:12.5,scale:1.35},{kind:'bankCashCart',x:16,y:16},{kind:'bankDepositBoxWall',x:23.5,y:12.5},{kind:'bankCashCart',x:23.5,y:23.5},{kind:'bankFilingCabinet',x:11.5,y:23.5}],patrols:[{room:'staff',role:'room'},{room:'count',role:'corridor'},{room:'secure',role:'objective'}],cameras:[{room:'count',at:p(17,12),facing:Math.PI}],firstBreak:p(25,19.5)
 },
 {
 id:'03-04',title:'Security Corridor',family:'diagonal guarded access / parallel record shoulder / outer dispatch bypass',
 rooms:[room('entry','West Bank Vestibule','public',1,20,5,5,'Public read before security corridor'),room('staff','Staff Access Hall','transition',1,10,6,6,'Staff desks establish a cover-to-door approach'),room('records','Access Record Office','restricted',11,10,6,6,'Protected side office offers observation before checkpoint'),room('checkpoint','Security Checkpoint','restricted',11,1,6,6,'Purposeful monitored security threshold'),room('secure','Inner Deposit Store','objective',23,1,6,6,'Protected deposit store beyond checkpoint'),room('dispatch','Deposit Dispatch','escape',23,12,6,6,'First escape refuge and cash service route'),room('service','Eastern Staff Loading','escape',33,12,5,6,'Alternate staff circulation outside security approach'),room('exit','Eastern Armored Exit','escape',33,22,5,5,'Separate delivery exit')],
 edges:[edge('entry','staff','approach'),edge('staff','records','approach'),edge('records','checkpoint','approach',[p(14,8.5)],{at:p(14,8.5),orientation:'horizontal'}),edge('checkpoint','secure','approach'),edge('staff','checkpoint','risk',[p(8.5,13),p(8.5,4)]),edge('secure','dispatch','alternateEscape'),edge('dispatch','service','alternateEscape'),edge('service','exit','alternateEscape'),edge('secure','exit','quickEscape',[p(31,4),p(31,24.5)],{at:p(31,9),orientation:'horizontal',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','staff','records','checkpoint','secure'],risk:['entry','staff','checkpoint','secure'],quickEscape:['secure','exit'],alternateEscape:['secure','dispatch','service','exit'],structures:[{kind:'bankOfficeDesk',x:2.5,y:11.5},{kind:'bankFilingCabinet',x:12.5,y:11.5},{kind:'bankSecurityCheckpoint',x:12.5,y:2.5},{kind:'bankDepositBoxWall',x:24.5,y:2.5},{kind:'bankCashCart',x:24.5,y:13.5},{kind:'bankCashProcessingTable',x:34.5,y:13.5}],patrols:[{room:'staff',role:'room'},{room:'checkpoint',role:'corridor'},{room:'secure',role:'objective'}],cameras:[{room:'checkpoint',at:p(16,2),facing:Math.PI}],firstBreak:p(26,9)
 },
 {
 id:'03-05',title:'Main Vault',family:'seven-layer vault infiltration / south cash handling / northwest secondary exit',
 rooms:[room('entry','Public Bank Lobby','public',1,21,5,5,'Customer entrance reads the staff checkpoint depth'),room('staff','Staff Administration','transition',10,20,6,6,'Bank employees control access before security'),room('checkpoint','Security Checkpoint','restricted',20,20,5,6,'A dedicated access layer separates staff from cash storage'),room('cash','Cash / Deposit Handling','restricted',20,10,6,6,'Deposit drawers and counting equipment precede the vault'),room('antechamber','Vault Antechamber','restricted',30,10,6,6,'Protected approach facing the actual vault doorway'),room('secure','Main Vault Interior','objective',30,1,6,6,'Diamond INSIDE the vault beyond its north doorway'),room('service','Cash Service Passage','escape',40,1,5,6,'First right-angle break after vault theft'),room('loading','Staff Delivery Corridor','escape',40,20,5,6,'Cash-service circulation remains open after the main gate closes'),room('exit','Northeast Secondary Exit','escape',48,20,5,5,'Secondary armored bank exit, far from customer entrance')],
 edges:[edge('entry','staff','approach'),edge('staff','checkpoint','approach'),edge('checkpoint','cash','approach'),edge('cash','antechamber','approach'),edge('antechamber','secure','approach',[p(33,8.5)],{at:p(33,8.5),orientation:'horizontal'}),edge('staff','checkpoint','risk',[p(13,27.5),p(22.5,27.5)]),edge('secure','service','alternateEscape'),edge('service','loading','alternateEscape'),edge('loading','exit','alternateEscape'),edge('antechamber','loading','quickEscape',[p(39.5,13),p(39.5,23)],{at:p(37,13),orientation:'vertical',lockdown:true})],
 entryRoom:'entry',objectiveRoom:'secure',exitRoom:'exit',approach:['entry','staff','checkpoint','cash','antechamber','secure'],risk:['entry','staff','checkpoint','cash','antechamber','secure'],quickEscape:['secure','antechamber','loading','exit'],alternateEscape:['secure','service','loading','exit'],
 structures:[{kind:'bankOfficeDesk',x:11.5,y:21.5},{kind:'bankSecurityCheckpoint',x:21,y:21.5},{kind:'bankCashProcessingTable',x:21.5,y:11.5},{kind:'bankDepositBoxWall',x:24,y:14.5},{kind:'bankDepositBoxWall',x:31.5,y:11.5},{kind:'bankMainVault',x:31.5,y:2.5},{kind:'bankCashCart',x:41,y:2.5},{kind:'bankCashProcessingTable',x:41,y:21.5}],patrols:[{room:'staff',role:'room'},{room:'cash',role:'corridor'},{room:'antechamber',role:'objective'}],cameras:[{room:'antechamber',at:p(35,11),facing:Math.PI}],highSecurity:true,firstBreak:p(38,4)
 },
];

// Every serialized portal path has explicit orthogonal waypoints.
for (const plan of V124B_EARLY_PLANS) for (const e of plan.edges) {
 const a=plan.rooms.find(r=>r.id===e.from)!, b=plan.rooms.find(r=>r.id===e.to)!;
 const chain=[p(a.x+a.w/2,a.y+a.h/2),...(e.via??[]),p(b.x+b.w/2,b.y+b.h/2)];
 const orthogonal:Point[]=[chain[0]];
 for(const q of chain.slice(1)){const last=orthogonal.at(-1)!;if(last.x!==q.x&&last.y!==q.y)orthogonal.push(p(q.x,last.y));orthogonal.push(q);}
 e.via=orthogonal.slice(1,-1);
}

// Room-specific functional anchors: each marks a viewing shoulder, handling refuge or access desk.
const anchors:Record<string,V124bPlan['structures']>={
 '02-01':[{kind:'painting',visualAssetId:'gallery_portrait_frame_a',x:11,y:19.6,scale:1.3},{kind:'painting',visualAssetId:'gallery_portrait_frame_b',x:15,y:19.6,scale:1.3},{kind:'bench',x:14,y:24.2,scale:.75},{kind:'statuePedestal',x:13,y:21,scale:1.2},{kind:'displayCase',x:23.8,y:14.8,scale:.75},{kind:'painting',visualAssetId:'gallery_portrait_frame_c',x:13,y:1.6,scale:1.3},{kind:'crate',x:4.7,y:4.7,scale:.75},{kind:'shelf',x:4.7,y:13.7,scale:.65},{kind:'bench',x:11.2,y:11.2,scale:.65}],
 '02-02':[{kind:'statuePedestal',x:11.5,y:15.5,scale:1.2},{kind:'bench',x:16.5,y:11.5,scale:.75},{kind:'displayCase',x:26.8,y:14.8,scale:.75},{kind:'displayCase',x:26.8,y:5.8,scale:.75},{kind:'shelf',x:15.8,y:4.8,scale:.7},{kind:'table',x:3.8,y:13.8,scale:.65},{kind:'bench',x:13.2,y:22.2,scale:.7}],
 '02-03':[{kind:'statuePedestal',x:16.5,y:5,scale:1.1},{kind:'bench',x:11.2,y:5.7,scale:.7},{kind:'displayCase',x:26.8,y:15.8,scale:.75},{kind:'shelf',x:26.8,y:25.8,scale:.65},{kind:'table',x:14.8,y:25.8,scale:.7},{kind:'painting',visualAssetId:'gallery_abstract_frame_c',x:25,y:11.6,scale:1.3},{kind:'bench',x:2.2,y:2.2,scale:.7}],
 '02-04':[{kind:'statuePedestal',x:11.5,y:18.5,scale:1.2},{kind:'bench',x:16.5,y:14.5,scale:.75},{kind:'displayCase',x:26.8,y:12.8,scale:.75},{kind:'displayCase',x:16.8,y:5.8,scale:.75},{kind:'shelf',x:4.8,y:4.8,scale:.65},{kind:'table',x:4.8,y:14.8,scale:.7},{kind:'bench',x:26.2,y:23.2,scale:.7}],
 '02-05':[{kind:'statuePedestal',x:14,y:21.5,scale:1.6},{kind:'bench',x:16.5,y:24.8,scale:.75},{kind:'displayCase',x:26.8,y:15.8,scale:.75},{kind:'painting',visualAssetId:'gallery_masterpiece_wall',x:25,y:1.6,scale:1.4},{kind:'displayCase',x:26.8,y:5.8,scale:.75},{kind:'shelf',x:15.8,y:4.8,scale:.65},{kind:'table',x:5.7,y:5.7,scale:.65},{kind:'bench',x:2.2,y:12.2,scale:.7}],
 '03-01':[{kind:'bankOfficeDesk',x:2.2,y:21.2,scale:.7},{kind:'bankCashCart',x:16.8,y:14.8,scale:.75},{kind:'bankSmallSafe',x:16.8,y:5.8,scale:.75},{kind:'bankCashCart',x:28.8,y:5.8,scale:.75},{kind:'bankFilingCabinet',x:27.8,y:15.8,scale:.65},{kind:'bankQueueBarrier',x:33.2,y:13.2,scale:.7}],
 '03-02':[{kind:'bankFilingCabinet',x:15.2,y:23.8,scale:.7},{kind:'bankOfficeDesk',x:15.5,y:21.5,scale:.85},{kind:'bankCashCart',x:18.8,y:13.8,scale:.75},{kind:'bankFilingCabinet',x:5.8,y:13.8,scale:.7},{kind:'bankSmallSafe',x:5.8,y:4.8,scale:.75},{kind:'bankCashCart',x:18.8,y:4.8,scale:.75},{kind:'bankOfficeDesk',x:26.2,y:21.2,scale:.7}],
 '03-03':[{kind:'bankFilingCabinet',x:14.8,y:5.8,scale:.7},{kind:'bankCashCart',x:11.5,y:16.5,scale:.75},{kind:'bankSmallSafe',x:26.8,y:15.8,scale:.75},{kind:'bankFilingCabinet',x:26.8,y:25.8,scale:.7},{kind:'bankCashCart',x:14.8,y:25.8,scale:.75},{kind:'bankOfficeDesk',x:2.2,y:2.2,scale:.7}],
 '03-04':[{kind:'bankFilingCabinet',x:5.8,y:14.8,scale:.7},{kind:'bankSmallSafe',x:14,y:11.5,scale:.8},{kind:'bankCashCart',x:15.8,y:5.8,scale:.75},{kind:'bankSmallSafe',x:27.8,y:5.8,scale:.75},{kind:'bankFilingCabinet',x:27.8,y:16.8,scale:.7},{kind:'bankCashCart',x:36.8,y:16.8,scale:.75},{kind:'bankOfficeDesk',x:2.2,y:21.2,scale:.7}],
 '03-05':[{kind:'bankFilingCabinet',x:14.8,y:24.8,scale:.7},{kind:'bankCashCart',x:23.8,y:24.8,scale:.75},{kind:'bankSmallSafe',x:34.8,y:14.8,scale:.75},{kind:'bankDepositBoxWall',x:34.8,y:5.8,scale:.75},{kind:'bankFilingCabinet',x:43.8,y:5.8,scale:.7},{kind:'bankCashCart',x:43.8,y:24.8,scale:.75},{kind:'bankOfficeDesk',x:2.2,y:22.2,scale:.7}],

 '01-01':[{kind:'counter',visualAssetId:'museum_security_desk',x:2.2,y:16.2,scale:.7},{kind:'statuePedestal',x:5.7,y:10.7,scale:.7},{kind:'table',visualAssetId:'museum_display_low',x:13.8,y:7.2,scale:.7},{kind:'statue',visualAssetId:'museum_statue_large',x:11.1,y:2,scale:.65},{kind:'crate',x:23.2,y:2.2,scale:.8},{kind:'table',visualAssetId:'museum_display_low',x:25.7,y:4.7,scale:.7},{kind:'shelf',x:25.7,y:20.5,scale:.65},{kind:'bench',x:12.2,y:19.2,scale:.7}],
 '01-02':[{kind:'counter',visualAssetId:'museum_security_desk',x:2.2,y:10.2,scale:.7},{kind:'displayCase',x:14.7,y:12.7,scale:.7},{kind:'statuePedestal',x:10.3,y:11.9,scale:.7},{kind:'displayCase',x:12.7,y:2,scale:.6},{kind:'table',x:20.2,y:8.2,scale:.7},{kind:'statue',x:30.6,y:11.7,scale:.65},{kind:'shelf',x:31,y:22,scale:.6,collisionScale:.6},{kind:'crate',x:18.2,y:19.2,scale:.8},{kind:'table',x:21.7,y:21.7,scale:.65},{kind:'bench',x:8.2,y:19.2,scale:.7}],
 '01-03':[{kind:'counter',visualAssetId:'museum_security_desk',x:2.2,y:2.2,scale:.7},{kind:'shelf',x:5.7,y:12.7,scale:.65},{kind:'displayCase',x:14.7,y:13.7,scale:.65},{kind:'shelf',x:11.2,y:20.2,scale:.65},{kind:'displayCase',x:14.7,y:22.7,scale:.65},{kind:'table',x:23.7,y:22.7,scale:.65},{kind:'shelf',x:23.7,y:12.7,scale:.65},{kind:'crate',x:21.2,y:2.2,scale:.8}],
 '01-04':[{kind:'counter',visualAssetId:'museum_security_desk',x:11.2,y:21.2,scale:.7},{kind:'equipment',x:14.7,y:15.7,scale:.65},{kind:'counter',visualAssetId:'museum_security_desk',x:2.2,y:12.2,scale:.7},{kind:'shelf',x:4.7,y:14.7,scale:.65},{kind:'equipment',x:5.7,y:6.7,scale:.65},{kind:'displayCase',x:14.7,y:4.7,scale:.7},{kind:'counter',visualAssetId:'museum_security_desk',x:21.2,y:2.2,scale:.7},{kind:'crate',x:23.7,y:4.7,scale:.8},{kind:'equipment',x:23.7,y:13.7,scale:.65},{kind:'bench',x:28.2,y:11.2,scale:.65}],
 '01-05':[{kind:'counter',visualAssetId:'museum_security_desk',x:2.2,y:21.2,scale:.7},{kind:'displayCase',x:6.7,y:15.7,scale:.7},{kind:'statuePedestal',x:2.2,y:14.7,scale:.7},{kind:'statue',x:15.7,y:14.7,scale:.65},{kind:'displayCase',x:15.7,y:5.7,scale:.7},{kind:'crate',x:24.2,y:2.2,scale:.8},{kind:'shelf',x:26.7,y:5.7,scale:.65},{kind:'table',x:26.7,y:14.7,scale:.65},{kind:'bench',x:32.2,y:12.2,scale:.7}],
};
for(const plan of V124B_EARLY_PLANS){
 plan.structures!.push(...(anchors[plan.id]??[]));
 if(plan.id.startsWith('01')){for(const prop of plan.structures!){if(prop.kind==='statue')prop.visualAssetId='museum_statue_large';if(prop.kind==='displayCase')prop.visualAssetId='museum_display_case_large';if(prop.kind==='statuePedestal')prop.visualAssetId='museum_pedestal';if(prop.kind==='table')prop.visualAssetId='museum_display_low';}}
 if(plan.id.startsWith('02')){for(const prop of plan.structures!){if(prop.kind==='statue')prop.visualAssetId='gallery_sculpture_large';if(prop.kind==='statuePedestal')prop.visualAssetId='gallery_central_plinth';if(prop.kind==='partition')prop.visualAssetId='gallery_movable_art_wall';if(prop.kind==='bench')prop.visualAssetId='gallery_modern_bench';if(prop.kind==='displayCase'||prop.kind==='table')prop.visualAssetId='gallery_low_pedestal';}}
 for(const prop of plan.structures!){if(prop.scale)prop.collisionScale=prop.scale;}
 const bankAssets:Record<string,NonNullable<typeof plan.structures>[number]['visualAssetId']>={bankTellerCounter:'bank_teller_counter',bankQueueBarrier:'bank_queue_barrier',bankOfficeDesk:'bank_office_desk',bankDepositBoxWall:'bank_deposit_box_wall',bankCashProcessingTable:'bank_cash_processing_table',bankCashCart:'bank_cash_cart',bankFilingCabinet:'bank_filing_cabinet',bankSecurityCheckpoint:'bank_security_checkpoint',bankSmallSafe:'bank_small_safe',bankMainVault:'bank_main_vault'};
 if(plan.id.startsWith('03'))for(const prop of plan.structures!)prop.visualAssetId=bankAssets[prop.kind];
 const landmark=plan.structures!.find(s=>['statue','bankTellerCounter','bankCashProcessingTable','bankSecurityCheckpoint'].includes(s.kind));
 plan.lights=landmark?[{x:landmark.x,y:landmark.y-1,radius:3.2,kind:'warm',intensity:.4}]:[];
}
// North security threshold gets a complete one-tile exterior wall margin.
{
 const plan=V124B_EARLY_PLANS.find(p=>p.id==='01-04')!;
 for(const r of plan.rooms)r.y+=1;
 for(const e of plan.edges){for(const q of e.via??[])q.y+=1;if(e.door)e.door.at.y+=1;}
 for(const q of plan.structures??[])q.y+=1;for(const q of plan.lights??[])q.y+=1;
 for(const a of plan.cameras??[])if(a.at)a.at.y+=1;
 if(plan.firstBreak)plan.firstBreak.y+=1;
}

// The atrium staff route is OUTSIDE the visitor approach, never crossing its ingress portal.
{const plan=V124B_EARLY_PLANS.find(p=>p.id==='02-04')!;
 for(const r of plan.rooms)r.x+=5;for(const e of plan.edges){for(const q of e.via??[])q.x+=5;if(e.door)e.door.at.x+=5;}
 for(const q of plan.structures??[])q.x+=5;for(const q of plan.lights??[])q.x+=5;for(const a of plan.cameras??[])if(a.at)a.at.x+=5;if(plan.firstBreak)plan.firstBreak.x+=5;
}

// Dedicated escape-side opaque anchors create an actual first hide pocket, not a facing trick.
const firstCover:Record<string,Point>={
 '01-02':p(29.5,13.5),'01-03':p(16,21.5),'02-02':p(22,4),'02-03':p(25,17.5),
 '03-01':p(18,4),'03-02':p(4,8.5),'03-03':p(25,17.5),'03-04':p(26,7.5),'03-05':p(36,4),
};
for(const plan of V124B_EARLY_PLANS){const q=firstCover[plan.id];if(q)plan.structures!.push({...q,kind:plan.id.startsWith('03')?'bankSmallSafe':'statue',visualAssetId:plan.id.startsWith('01')?'museum_statue_large':plan.id.startsWith('02')?'gallery_sculpture_large':'bank_small_safe',scale:1.6,collisionScale:1.6});}
V124B_EARLY_PLANS.find(p=>p.id==='02-04')!.cameras=[{room:'upper',at:p(31.5,8.5),facing:2.2}];
V124B_EARLY_PLANS.find(p=>p.id==='02-05')!.cameras=[{room:'curator',at:p(26,11.5),facing:2.2}];

// These short transfer apertures flank a sculpture/column with two full Tilt shoulders.
for(const id of ['01-02','01-03']){const plan=V124B_EARLY_PLANS.find(p=>p.id===id)!;plan.edges.find(e=>e.role==='alternateEscape')!.width=4;}

// Service handling elbows keep the open public shortcut meaningfully shorter than lockdown egress.
{
 const adjustments:{id:string;from:string;to:string;via:Point[]}[]=[
  {id:'01-02',from:'handling',to:'service',via:[p(29.5,24),p(20,24)]},
  {id:'02-03',from:'preparation',to:'store',via:[p(25,28),p(13,28)]},
  {id:'03-03',from:'transport',to:'sorting',via:[p(25,25),p(13,25)]},
  {id:'03-05',from:'service',to:'loading',via:[p(43,4),p(43,23)]},
  {id:'03-04',from:'service',to:'exit',via:[p(36,15),p(36,24.5)]},
  {id:'01-03',from:'archive',to:'work',via:[p(4,15.5),p(13,15.5)]},
  {id:'01-03',from:'packing',to:'loading',via:[p(23,21.5),p(23,11.5)]},
  {id:'02-05',from:'public',to:'curator',via:[p(27,23),p(27,14)]},
 ];
 for(const a of adjustments)V124B_EARLY_PLANS.find(p=>p.id===a.id)!.edges.find(e=>e.from===a.from&&e.to===a.to)!.via=a.via;
}
