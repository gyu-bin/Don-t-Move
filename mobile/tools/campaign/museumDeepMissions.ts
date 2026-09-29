import {architecture,mission} from './museumLaterMissions';
const N=-Math.PI/2,S=Math.PI/2,W=Math.PI,E=0;

/** A working conservation cross: equipment islands, translucent-looking display bays,
 * and two distinct returns from the north restoration vault to the south service door. */
export function museumMission06(){return mission(6,'Conservation Lab',
 'West intake → restoration work bays → north specimen storage → east equipment aisle or central crossing → south service exit',
 architecture(19,19,[[1,7,5,5],[5,8,2,3],[7,5,5,9],[7,1,9,3],[9,3,2,3],[13,5,4,10],[14,3,2,3],[11,8,3,3],[7,15,10,3],[9,13,2,3],[14,14,2,2]]),
 {safe:[[1.5,9.5],[4,9.5],[4,10.5],[8,10.5],[8,6],[10,6],[10,2.5],[14.5,2.5]],
 risk:[[1.5,9.5],[8,9.5],[15,9.5],[15,6],[15,2.5],[14.5,2.5]],
 escape:[[14.5,2.5],[15,6],[15,12],[15,16.5],[9.5,16.5],[9.5,17.5]],alternateEscape:[[14.5,2.5],[10,2.5],[10,6],[11,6],[11,11.5],[10,11.5],[10,16.5],[9.5,17.5]]},
 [{kind:'table',x:9.5,y:8,scale:1.3,collisionScale:1.3},{kind:'equipment',x:8,y:12.5},{kind:'displayCase',x:13.5,y:7},
 {kind:'table',x:13,y:17.6},{kind:'lamp',x:8,y:1}],
 {name:'Restoration Workbench',kind:'table',x:9.5,y:8},[
 {subject:'Intake door / restoration crossing',points:[[9.5,6.5],[10.5,10.5]],look:[S,W],role:'room'},
 {subject:'Equipment aisle / service junction',points:[[15.5,12],[15.5,16.5]],look:[N,W],role:'roaming',roaming:true},
 {subject:'Specimen storage / case inspection',points:[[12,2.5],[15,3.3]],look:[E,W],role:'objective'},
 ]);}

/** Narrow private rooms around a central void create a long U, with a short
 * VIP bridge that can be opened by drawing the two stronger observers away. */
export function museumMission07(){return mission(7,'Private Gallery',
 'North private foyer → west portrait rooms or exposed VIP bridge → south objective salon → west side gallery → service exit',
 architecture(17,20,[[6,1,6,4],[3,5,5,10],[10,5,5,10],[6,4,2,2],[10,4,2,2],[3,15,12,3],[7,9,4,2],[1,6,3,3]]),
 {safe:[[8.5,1.5],[7,3.5],[7,6.5],[4.5,6.5],[4.5,13.5],[4.5,16.5],[12.5,16.5]],
 risk:[[8.5,1.5],[10.5,3.5],[10.5,6.5],[12.5,6.5],[12.5,13.5],[12.5,16.5]],
 escape:[[12.5,16.5],[10.5,16.5],[7,16.5],[4.5,16.5],[4.5,10],[4.5,7.5],[1.5,7.5]],alternateEscape:[[12.5,16.5],[12.5,10],[9,10],[4.5,10],[4.5,7.5],[1.5,7.5]]},
 [{kind:'statue',x:6.5,y:12.5},{kind:'painting',x:4,y:5},{kind:'sofa',x:9,y:17.7},
 {kind:'displayCase',x:13.8,y:9},{kind:'lamp',x:11,y:1}],
 {name:'VIP Portrait Salon',kind:'statue',x:6.5,y:12.5},[
 {subject:'Private door / VIP bridge / side gallery',points:[[6,7],[6,10],[6,14]],look:[S,E,N],role:'corridor',range:4.6},
 {subject:'Objective salon / private collection entrance',points:[[12.5,12],[11,16],[14,16]],look:[N,E,W],role:'objective',range:4.6},
 ]);}

/** Four surveillance spokes around one junction. Each spoke supplies a sheltered
 * read position; the lower-left bypass avoids the most exposed central crossing. */
export function museumMission08(){return mission(8,'Security Core',
 'East checkpoint → multi-door junction → north restricted hall → central crossing or west maintenance bypass → south evacuation desk',
 architecture(21,19,[[7,6,7,7],[8,1,5,4],[9,4,3,3],[1,7,5,5],[5,8,3,3],[15,7,5,5],[13,8,3,3],[8,14,8,4],[10,12,3,3],[3,11,3,5],[5,14,4,2]]),
 {safe:[[19,9.5],[16,9.5],[16,10.5],[12.5,10.5],[12.5,7],[10.5,7],[10.5,4],[10.5,2.5]],
 risk:[[19,9.5],[10.5,9.5],[10.5,4],[10.5,2.5]],
 escape:[[10.5,2.5],[10.5,7],[8,7],[8,9.5],[4.5,9.5],[4.5,15],[10.5,15],[14,15],[14,17.5]],alternateEscape:[[10.5,2.5],[10.5,9.5],[11.5,9.5],[11.5,15],[14,15],[14,17.5]]},
 [{kind:'counter',x:9,y:11.5},{kind:'equipment',x:12.5,y:12.3},{kind:'cctv',x:8,y:1},
 {kind:'counter',x:3,y:8.5},{kind:'counter',x:11,y:17.5},{kind:'lamp',x:16,y:7}],
 {name:'Central Security Desk',kind:'counter',x:9,y:11.5},[
 {subject:'East access checkpoint',points:[[16,8],[18,10.5]],look:[S,W],role:'room'},
 {subject:'Junction / west maintenance door',points:[[8,8],[11,8],[11,11.5]],look:[E,W,N],role:'corridor'},
 {subject:'Evacuation desk / service junction',points:[[9,15],[14.5,16]],look:[E,N],role:'exit'},
 {subject:'Restricted hall / security archive case',points:[[9,2.5],[11.7,3.5]],look:[E,W],role:'objective'},
 ]);}

/** A tall chain of exhibition pockets, not an open arena. The upper connector
 * and southern circuit provide different reads on the same final north exit. */
export function museumMission09(){return mission(9,'Master Exhibition',
 'North vestibule → west sculpture pockets → south collection loop → east master case → upper portrait connector → north final-heist door',
 architecture(22,22,[[1,1,6,5],[1,7,6,6],[3,5,3,3],[1,15,7,5],[3,12,3,4],[9,12,5,8],[7,16,3,3],[16,9,4,11],[13,15,4,3],[14,1,6,6],[16,6,3,4],[9,5,7,3],[5,6,5,3],[10,7,3,6]]),
 {safe:[[3,1.5],[3,4.5],[4.5,4.5],[4.5,9],[4.5,15.5],[2.5,15.5],[2.5,17.5],[10.5,17.5],[11.5,17.5],[11.5,16.5],[18,16.5],[18,18]],
 risk:[[3,1.5],[3,4.5],[4.5,4.5],[4.5,7.5],[12.5,7.5],[12.5,12],[10.5,12],[10.5,16.5],[18,16.5],[18,18]],
 escape:[[18,18],[18.5,16],[18.5,11],[17.5,11],[17.5,5],[17.5,1.5]],alternateEscape:[[18,18],[18,16.5],[11.5,16.5],[11.5,6.5],[17.5,6.5],[17.5,1.5]]},
 [{kind:'statue',x:2.5,y:10.5},{kind:'statue',x:6.5,y:18.8},{kind:'pillar',x:12.7,y:14},
 {kind:'displayCase',x:16.8,y:12.5},{kind:'painting',x:15,y:1},{kind:'lamp',x:3,y:1}],
 {name:'Master Sculpture Suite',kind:'statue',x:2.5,y:10.5},[
 {subject:'Vestibule / sculpture threshold',points:[[2.5,8.5],[5.5,10]],look:[E,S],role:'room'},
 {subject:'South collection intersection',points:[[3,16.5],[6,17]],look:[E,W],role:'room'},
 {subject:'Middle gallery / portrait connector',points:[[11.5,10],[11.5,14]],look:[N,S],role:'roaming',roaming:true},
 {subject:'Final-heist door / north portrait room',points:[[15.5,3],[18,5]],look:[E,N],role:'exit'},
 {subject:'Master case / east gallery approach',points:[[17,15],[18.5,19]],look:[S,N],role:'objective'},
 ]);}

/** Grand heist uses an asymmetric ring and an inner security shortcut. The
 * diamond lives in the far north-east; escape crosses three distributed posts
 * before reaching the west staff door. No guard cluster at the objective. */
export function museumMission10(){return mission(10,'Grand Heist',
 'South entry → Grand Exhibition → western galleries or high-security shortcut → north Master Diamond Chamber → theft → west service circulation → service exit',
 architecture(25,24,[[9,15,7,8],[3,12,5,8],[7,16,3,3],[3,4,6,6],[4,9,3,4],[11,1,11,6],[8,5,5,3],[18,9,5,11],[18,6,3,4],[15,17,4,3],[11,9,5,4],[12,12,3,4],[14,6,2,4],[1,13,3,3]]),
 {safe:[[11.5,22.5],[11.5,17.5],[5.5,17.5],[5.5,14],[5.5,7],[8,7],[12,7],[12,5],[16,5],[19.5,3]],
 risk:[[11.5,22.5],[13.5,19],[13.5,11],[15,11],[15,7],[15,5],[19.5,5],[19.5,3]],
 escape:[[19.5,3],[19.5,5],[16,5],[12,5],[12,7],[8,7],[5.5,7],[5.5,11],[5.5,14.5],[1.5,14.5]],alternateEscape:[[19.5,3],[19.5,11],[19.5,18.5],[13.5,18.5],[13.5,17.5],[5.5,17.5],[5.5,14.5],[1.5,14.5]]},
 [{kind:'statue',x:10.5,y:19.5,scale:1.4,collisionScale:1.4},{kind:'displayCase',x:4,y:16},
 {kind:'statue',x:7.5,y:5.5},{kind:'counter',x:12,y:11.5},{kind:'pillar',x:17.5,y:3.5},
 {kind:'equipment',x:20.8,y:16},{kind:'diamondPedestal',x:20.5,y:2},{kind:'lamp',x:11,y:1}],
 {name:'Master Diamond Chamber',kind:'diamondPedestal',x:20.5,y:2},[
 {subject:'Grand Exhibition arrival / south crossing',points:[[14.5,20.5],[14.5,17]],look:[N,N],role:'room'},
 {subject:'Service door / western escape intersection',points:[[4.5,13],[6.5,18]],look:[S,N],role:'exit'},
 {subject:'Western exhibition / chamber threshold',points:[[4.5,5.5],[7.5,8]],look:[E,W],role:'corridor'},
 {subject:'High security shortcut',points:[[13,10],[14.8,12]],look:[E,N],role:'corridor'},
 {subject:'Eastern maintenance circuit',points:[[20,11],[20,18]],look:[S,N],role:'roaming',roaming:true},
 {subject:'Master Diamond case / northern hall',points:[[14,3],[20.5,4.5]],look:[E,W],role:'objective'},
 ]);}
