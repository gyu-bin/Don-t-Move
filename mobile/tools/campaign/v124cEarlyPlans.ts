/** Phase 4C architectural fixtures, authored against full-body corridor clearance.
 * Historical Phase 4B inputs remain untouched for actual-render comparisons. */
import {V124B_EARLY_PLANS} from './v124bEarlyPlans';
import type {V124bPlan} from './v124bTypes';
import type {PropDef} from '../../src/game/levels/StageDefinition';
const fixture=(kind:PropDef['kind'],x:number,y:number,scale:number,visualAssetId?:PropDef['visualAssetId']):PropDef=>({kind,x,y,scale,collisionScale:scale,...(visualAssetId?{visualAssetId}:{})});
const fixtures:Record<string,PropDef[]>={
 '01-01':[
  fixture('displayCase',13.8,2.5,1.2,'museum_display_case_large'),
  fixture('counter',3.1,16.5,2,'museum_security_desk'),
  fixture('statue',3.4,8.2,2.7,'museum_statue_large'),
  fixture('pillar',6,11.1,1.8,'museum_column'),
  fixture('displayCase',11.2,7.9,1.8,'museum_display_case_large'),
  fixture('table',13.2,11,1.6,'museum_display_low'),
  fixture('crate',23.6,2.4,1.6),
  fixture('table',25.4,5.5,1.6,'museum_display_low'),
  fixture('shelf',23.5,18.8,1.8),
  fixture('counter',12.1,19.2,1.28,'museum_security_desk'),
 ],
 '01-02':[
  fixture('statue',29.5,13.5,1.6,'museum_statue_large'),
  fixture('displayCase',28.3,8.9,1.6,'museum_display_case_large'),
  fixture('counter',3.5,10.4,2,'museum_security_desk'),
  fixture('statue',12.8,9.4,2.8,'museum_statue_large'),
  fixture('pillar',14.7,12.3,1.8,'museum_column'),
  fixture('displayCase',10,2.6,1.44,'museum_display_case_large'),
  fixture('table',20.5,8.9,2,'museum_display_low'),
  fixture('crate',29.6,19.9,1.7),
  fixture('shelf',20,19.9,2.1),
  fixture('counter',9,19.4,1.8,'museum_security_desk'),
 ],
 '01-03':[
  fixture('statue',16,21.5,1.6,'museum_statue_large'),
  fixture('displayCase',11.3,21.2,1.8,'museum_display_case_large'),
  fixture('counter',3.4,2.4,2,'museum_security_desk'),
  fixture('shelf',2.7,10.8,2.2),
  fixture('shelf',5.5,13.4,1.6),
  fixture('displayCase',14.5,14.6,1.8,'museum_display_case_large'),
  fixture('table',22.5,20.7,2.07,'museum_display_low'),
  fixture('shelf',21.5,10.5,1.84),
  fixture('crate',22.4,2.5,1.6),
 ],
 '01-04':[
  fixture('displayCase',12.2,4,1.7,'museum_display_case_large'),
  fixture('displayCase',15.7,5.9,1.7,'museum_display_case_large'),
  fixture('counter',11.5,22.4,1.68,'museum_security_desk'),
  fixture('counter',12.3,13.7,2.8,'museum_security_desk'),
  fixture('equipment',15,15.9,1.5),
  fixture('shelf',2.9,13.7,2.1),
  fixture('counter',3.6,5.7,2.3,'museum_security_desk'),
  fixture('equipment',5.8,8.2,1.5),
  fixture('counter',22.5,3.3,2.1,'museum_security_desk'),
  fixture('shelf',21.3,12.9,1.8),
  fixture('counter',29.8,12.4,1.8,'museum_security_desk'),
 ],
 '01-05':[
  fixture('displayCase',12.8,2.9,1.8,'museum_display_case_large'),
  fixture('table',15.5,6,1.7,'museum_display_low'),
  fixture('counter',3,21.6,2.34,'museum_security_desk'),
  fixture('statue',3.4,12.6,3,'museum_statue_large'),
  fixture('pillar',6.7,15,1.8,'museum_column'),
  fixture('displayCase',12.5,12.4,2,'museum_display_case_large'),
  fixture('statue',15.5,15.4,2,'museum_statue_large'),
  fixture('shelf',25.4,2.8,2.2),
  fixture('crate',26.8,5,1.4),
  fixture('counter',33.9,12.5,2,'museum_security_desk'),
 ],
 '02-01':[
  fixture('painting',13,1.6,2.3,'gallery_portrait_frame_c'),
  fixture('statue',11.4,2.7,2.1,'gallery_sculpture_large'),
  fixture('bench',3.5,21.2,1.15,'gallery_modern_bench'),
  fixture('painting',11,19.6,1.7,'gallery_portrait_frame_a'),
  fixture('painting',15,19.6,1.7,'gallery_portrait_frame_b'),
  fixture('partition',13,20.9,2.8,'gallery_movable_art_wall'),
  fixture('statuePedestal',16,23.7,1.8,'gallery_central_plinth'),
  fixture('statue',21.3,12.2,2.3,'gallery_sculpture_large'),
  fixture('partition',23.4,14.4,1.6,'gallery_movable_art_wall'),
  fixture('table',3.5,2.9,2.4,'gallery_low_pedestal'),
  fixture('shelf',2.5,11.9,1.84),
  fixture('bench',12.5,11.4,1.15,'gallery_modern_bench'),
 ],
 '02-02':[
  fixture('statue',22,4,1.6,'gallery_sculpture_large'),
  fixture('statue',24.3,2.9,2.5,'gallery_sculpture_large'),
  fixture('painting',25,1.6,2,'gallery_abstract_frame'),
  fixture('bench',14.6,22.2,1.15,'gallery_modern_bench'),
  fixture('statue',12.7,12.4,3.2,'gallery_sculpture_large'),
  fixture('partition',15.6,15.6,2.6,'gallery_movable_art_wall'),
  fixture('statuePedestal',24.5,12.4,3.1,'gallery_central_plinth'),
  fixture('table',14,2.9,2.43,'gallery_low_pedestal'),
  fixture('shelf',2.5,11.8,1.8),
  fixture('bench',3,2.2,1.15,'gallery_modern_bench'),
 ],
 '02-03':[
  fixture('statue',25,17.5,1.6,'gallery_sculpture_large'),
  fixture('painting',25,11.6,2.2,'gallery_abstract_frame_c'),
  fixture('statuePedestal',23.5,12.9,2.4,'gallery_central_plinth'),
  fixture('bench',3.5,2.2,1.15,'gallery_modern_bench'),
  fixture('galleryGlassPanelVertical',12.1,5.1,2.7),
  fixture('statuePedestal',16.3,3.1,2.8,'gallery_central_plinth'),
  fixture('statue',11.6,14.8,3,'gallery_sculpture_large'),
  fixture('partition',14.8,16.2,2.3,'gallery_movable_art_wall'),
  fixture('table',24,23.8,2.24,'gallery_low_pedestal'),
  fixture('shelf',12.8,23.7,2.24),
  fixture('bench',3.5,23.2,1.15,'gallery_modern_bench'),
 ],
 '02-04':[
  fixture('statue',18.5,4.1,2.16,'gallery_sculpture_large'),
  fixture('bench',8,21.2,1.15,'gallery_modern_bench'),
  fixture('statue',17.4,15.6,3.2,'gallery_sculpture_large'),
  fixture('partition',20.6,19,2.6,'gallery_movable_art_wall'),
  fixture('partition',30,10.2,2.48,'gallery_movable_art_wall'),
  fixture('statuePedestal',32,12.4,1.8,'gallery_central_plinth'),
  fixture('table',8.3,3,2.52,'gallery_low_pedestal'),
  fixture('shelf',7.5,12.4,1.76),
  fixture('bench',32.5,23.2,1.15,'gallery_modern_bench'),
 ],
 '02-05':[
  fixture('painting',25,1.6,2.8,'gallery_masterpiece_wall'),
  fixture('statuePedestal',23.4,2.9,2.3,'gallery_central_plinth'),
  fixture('bench',3.5,22.2,1.15,'gallery_modern_bench'),
  fixture('partition',13.2,21.3,3,'gallery_movable_art_wall'),
  fixture('statuePedestal',16.3,24.2,2.1,'gallery_central_plinth'),
  fixture('statue',23.8,13.3,2.7,'gallery_sculpture_large'),
  fixture('partition',26.2,15.4,1.6,'gallery_movable_art_wall'),
  fixture('table',14,3.4,2.8,'gallery_low_pedestal'),
  fixture('shelf',3.7,3,2.6),
  fixture('bench',2.5,12.2,1.15,'gallery_modern_bench'),
 ],
 '03-01':[
  fixture('bankSmallSafe',18,4,1.6,'bank_small_safe'),
  fixture('bankDepositBoxWall',14.3,2.4,1.7,'bank_deposit_box_wall'),
  fixture('bankSmallSafe',16.3,4.5,1.3,'bank_small_safe'),
  fixture('bankOfficeDesk',4,21.9,1.6,'bank_office_desk'),
  fixture('bankTellerCounter',4.5,11.7,1.7,'bank_teller_counter'),
  fixture('bankQueueBarrier',6,15,1.4,'bank_queue_barrier'),
  fixture('bankOfficeDesk',14.3,11.8,1.65,'bank_office_desk'),
  fixture('bankCashProcessingTable',26.7,3.1,1.9,'bank_cash_processing_table'),
  fixture('bankFilingCabinet',25.7,13.4,1.8,'bank_filing_cabinet'),
  fixture('bankOfficeDesk',35.6,13.9,1.5,'bank_office_desk'),
 ],
 '03-02':[
  fixture('bankSmallSafe',4,8.5,1.6,'bank_small_safe'),
  fixture('bankSmallSafe',2.8,10.6,2.2,'bank_small_safe'),
  fixture('bankDepositBoxWall',4.5,13.6,1.45,'bank_deposit_box_wall'),
  fixture('bankOfficeDesk',26.5,21.9,1.6,'bank_office_desk'),
  fixture('bankOfficeDesk',16.2,21.1,1.8,'bank_office_desk'),
  fixture('bankFilingCabinet',19.7,23.4,1.7,'bank_filing_cabinet'),
  fixture('bankSecurityCheckpoint',16.5,10.7,1.35,'bank_security_checkpoint'),
  fixture('bankFilingCabinet',3,2.7,2.2,'bank_filing_cabinet'),
  fixture('bankOfficeDesk',27.5,2.5,1.5,'bank_office_desk'),
 ],
 '03-03':[
  fixture('bankSmallSafe',25,17.5,1.6,'bank_small_safe'),
  fixture('bankSmallSafe',26.6,15,1.4,'bank_small_safe'),
  fixture('bankOfficeDesk',3.5,2.5,1.44,'bank_office_desk'),
  fixture('bankOfficeDesk',12.6,2.7,1.62,'bank_office_desk'),
  fixture('bankCashProcessingTable',12.3,13.7,2.1,'bank_cash_processing_table'),
  fixture('bankCashProcessingTable',15.3,16.7,1.5,'bank_cash_processing_table'),
  fixture('bankFilingCabinet',12.3,23.9,2.2,'bank_filing_cabinet'),
  fixture('bankOfficeDesk',3,23.9,1.6,'bank_office_desk'),
 ],
 '03-04':[
  fixture('bankSmallSafe',26,7.5,1.6,'bank_small_safe'),
  fixture('bankSmallSafe',27.5,5,1.4,'bank_small_safe'),
  fixture('bankOfficeDesk',3.5,21.5,1.44,'bank_office_desk'),
  fixture('bankOfficeDesk',3.8,12,1.9,'bank_office_desk'),
  fixture('bankFilingCabinet',13,11.8,2.2,'bank_filing_cabinet'),
  fixture('bankSecurityCheckpoint',13.7,2.7,1.35,'bank_security_checkpoint'),
  fixture('bankCashProcessingTable',25.2,13.8,1.52,'bank_cash_processing_table'),
  fixture('bankFilingCabinet',36,13.7,2.1,'bank_filing_cabinet'),
  fixture('bankOfficeDesk',35.1,23.8,1.7,'bank_office_desk'),
 ],
 '03-05':[
  fixture('bankSmallSafe',36,4,1.6,'bank_small_safe'),
  fixture('bankDepositBoxWall',32.6,2.3,1.8,'bank_deposit_box_wall'),
  fixture('bankSmallSafe',34.6,4.5,1.5,'bank_small_safe'),
  fixture('bankTellerCounter',3.6,22.3,1.1,'bank_teller_counter'),
  fixture('bankOfficeDesk',12.8,22.1,1.9,'bank_office_desk'),
  fixture('bankSecurityCheckpoint',21.9,21.6,1.098,'bank_security_checkpoint'),
  fixture('bankCashProcessingTable',22.6,12.1,1.9,'bank_cash_processing_table'),
  fixture('bankDepositBoxWall',24.2,14.6,1.2,'bank_deposit_box_wall'),
  fixture('bankDepositBoxWall',34.2,12,1.44,'bank_deposit_box_wall'),
  fixture('bankFilingCabinet',42.1,2.7,2.2,'bank_filing_cabinet'),
  fixture('bankCashProcessingTable',41.9,22.2,1.62,'bank_cash_processing_table'),
  fixture('bankOfficeDesk',50.5,21.8,1.8,'bank_office_desk'),
 ],
};
export const V124C_EARLY_PLANS:V124bPlan[]=structuredClone(V124B_EARLY_PLANS);
for(const plan of V124C_EARLY_PLANS){
 plan.visualRevision='v12-4c';
 plan.structures=fixtures[plan.id];
 plan.family=`architectural 4C / ${plan.family}`;
 if(plan.id.startsWith('03')){plan.objectiveVisualAssetId='bank_small_safe';plan.objectiveScale=1.15;}
}

// Service transfer corridors turn behind the building, outside the public return spine.
const transferElbows:Record<string,{from:string;to:string;via:{x:number;y:number}[]}[]>={
 '03-01':[{from:'processing',to:'service',via:[{x:28,y:4},{x:28,y:14.5}]}],
 '03-03':[{from:'transport',to:'sorting',via:[{x:25,y:29},{x:13,y:29}]}],
};
for(const plan of V124C_EARLY_PLANS)for(const a of transferElbows[plan.id]??[])plan.edges.find(e=>e.from===a.from&&e.to===a.to)!.via=a.via;
// Two ends of the public security corridor seal; staff loading cannot leak into its lower half.
{
 const plan=V124C_EARLY_PLANS.find(p=>p.id==='03-04')!;
 const e=structuredClone(plan.edges.find(e=>e.role==='quickEscape')!);
 e.id='public-return-lower-portal';e.door={at:{x:31,y:20},orientation:'horizontal',lockdown:true,style:'bankSecurityPortal4c'};
 plan.edges.push(e);
}

// Return hall desks face the public gate without obstructing its open approach.
for(const [id,x,y] of [['01-04',29.3,15.8],['01-05',33.4,15.7]] as const){
 const p=V124C_EARLY_PLANS.find(p=>p.id===id)!;
 const q=p.structures!.find(q=>Math.abs(q.x-x)<.8&&q.y>10&&q.x>=27);
 if(q)q.y=y;
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='03-05')!;
 const q=p.structures!.find(q=>q.kind==='bankDepositBoxWall'&&q.y>10&&q.x>30)!;
 q.x=33;q.y=15.5;q.scale=1.6;q.collisionScale=1.6;
}

{const p=V124C_EARLY_PLANS.find(p=>p.id==='02-05')!;const q=p.structures!.find(q=>q.kind==='bench'&&q.y<15)!;q.x=4.3;q.y=14.9;}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='02-05')!;
 p.islands=[{x:8,y:3,w:2,h:3}];
 p.edges.find(e=>e.from==='handling'&&e.to==='preparation')!.via=[{x:11,y:4},{x:11,y:2.5},{x:7,y:2.5},{x:7,y:4}];
}

/** The fast route is the staffed public return hall; service rooms lead to the same exterior court. */
const publicReturns:Record<string,[number,number,number,number,string]>={
 '01-01':[16,7,4,5,'Main Public Exit Security Hall'],
 '01-02':[20,12,3,4,'Public Exhibition Return Checkpoint'],
 '01-03':[17,3,3,5,'Main Archive Return Hall'],
 '01-04':[16,8,3,3,'Main Museum Security Return'],
 '01-05':[18,8,3,3,'Grand Public Exit Checkpoint'],
 '02-01':[16,8,3,5,'Main Gallery Entrance Return'],
 '02-02':[18,7,3,3,'Main Sculpture Gallery Return'],
 '02-03':[16,19,5,3,'Main Glass Gallery Exit Hall'],
 '02-04':[23,18,4,4,'Main Atrium Exit Checkpoint'],
 '02-05':[7,7,5,3,'Main Masterpiece Gallery Return'],
 '03-01':[18,8,4,3,'Main Bank Security Return Portal'],
 '03-02':[20,6,3,5,'Main Staff Access Checkpoint'],
 '03-03':[11,19,5,3,'Main Cash Floor Security Return'],
 '03-04':[29,10,4,5,'Main Public Security Spine'],
 '03-05':[38,15,3,4,'Main Vault Security Return Hall'],
};
for(const plan of V124C_EARLY_PLANS){
 const [x,y,w,h,name]=publicReturns[plan.id];
 const existing=plan.rooms.find(r=>['fastVestibule','privateVestibule'].includes(r.id));
 if(existing){existing.name=name;existing.purpose='Main staffed return checkpoint: lockdown closes public egress and directs the thief through independent service handling.';}
 else plan.rooms.push({id:'publicReturn',name,role:'restricted',x,y,w,h,purpose:'Primary staffed escape route; its shutter closes at lockdown. The separate handling/loading wing stays passable.'});
 const exit=plan.rooms.find(r=>r.id===plan.exitRoom)!;
 exit.name=plan.id.startsWith('03')?'Exterior Bank Exit Court':plan.id.startsWith('02')?'Exterior Gallery Exit Court':'Exterior Museum Exit Court';
 exit.purpose='Exterior egress court reached through the public checkpoint before lockdown or the independent service wing afterward.';
 if(plan.id.startsWith('03'))for(const e of plan.edges)if(e.door?.lockdown)e.door.style='bankSecurityPortal4c';
}

// Staggered structural returns form handling cells, so closure is a route change rather than a lateral sidestep.
const serviceBaffles:Record<string,NonNullable<V124bPlan['islands']>>={"01-04":[{"x":24,"y":11,"w":1,"h":2},{"x":20,"y":6,"w":2,"h":1}],"01-05":[{"x":27,"y":10,"w":1,"h":3}],"03-02":[{"x":4,"y":5,"w":2,"h":1}],"03-04":[{"x":33,"y":16,"w":3,"h":1},{"x":36,"y":19,"w":1,"h":2}]};
for(const plan of V124C_EARLY_PLANS)if(serviceBaffles[plan.id])plan.islands=[...(plan.islands??[]),...serviceBaffles[plan.id]];

// Ordinary circulation and access-control portals occupy actual wall apertures, not decorative wall props.
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='01-02')!;
 p.edges.find(e=>e.from==='entry'&&e.to==='rotunda')!.door={at:{x:7.5,y:11.5},orientation:'vertical',style:'museumExhibition4c'};
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='02-01')!;
 p.edges.find(e=>e.from==='entry'&&e.to==='portraits')!.door={at:{x:7.5,y:22.5},orientation:'vertical',style:'galleryMinimal4c'};
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='03-05')!;
 p.edges.find(e=>e.from==='entry'&&e.to==='staff')!.door={at:{x:7.5,y:23.5},orientation:'vertical',style:'bankStaff4c'};
 p.edges.find(e=>e.from==='checkpoint'&&e.to==='cash')!.door={at:{x:23,y:18},orientation:'horizontal',style:'bankSecurity4c'};
 p.secureDoorStyle='bankVault4c';
}

// Actual-render review: south-wall desks were occluded; columns mark the public court jamb instead.
for(const [id,x] of [['01-04',28],['01-05',32]] as const){
 const p=V124C_EARLY_PLANS.find(p=>p.id===id)!;
 p.structures=p.structures!.filter(q=>!(q.kind==='counter'&&q.x>27));
 p.structures.push(fixture('pillar',x,12.8,1.5,'museum_column'));
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='03-05')!;
 p.structures=p.structures!.filter(q=>!(q.kind==='bankDepositBoxWall'&&q.x>30&&q.y>10));
}
// A low modern work plinth remains subordinate to sculpture and movable exhibition walls.
for(const p of V124C_EARLY_PLANS.filter(p=>p.id.startsWith('02')))for(const q of p.structures!)if(q.kind==='table'&&q.visualAssetId==='gallery_low_pedestal')q.visualAssetId='gallery_central_plinth';
// Review of the rendered objective and exhibition sightlines, not collision tests alone.
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='03-02')!;
 p.structures=p.structures!.filter(q=>!(q.kind==='bankDepositBoxWall'&&q.y>12));
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='01-03')!;
 const q=p.structures!.find(q=>q.kind==='displayCase'&&q.y>12&&q.y<16)!;
 q.x=14.8;q.y=13;q.scale=1.4;q.collisionScale=1.4;
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='02-01')!;
 p.structures!.find(q=>q.kind==='partition'&&q.y>20)!.y=24.1;
 p.structures!.find(q=>q.kind==='painting'&&q.y<5)!.scale=1.6;
}

/** Only inspected connector gaps compress. Rooms, actors and fixture dimensions stay full scale.
 * The omitted gaps carry narrow secure/lockdown apertures and must retain their wall margin. */
const compressedGaps:Record<string,{x?:[number,number][];y?:[number,number][]}>={
 '01-01':{x:[[7,10]],y:[[12,15]]},'01-02':{x:[[24,27]]},
 '01-03':{x:[[7,10]],y:[[6,9]]},'01-04':{y:[[18,21]]},
 '01-05':{x:[[8,11],[28,31]],y:[[17,20]]},
 '02-01':{x:[[6,9]],y:[[16,19]]},'02-02':{y:[[18,21]]},
 '02-03':{x:[[6,10]],y:[[18,22]]},'02-04':{x:[[11,15]]},
 '02-05':{x:[[18,22]],y:[[17,20]]},
 '03-01':{x:[[9,12]],y:[[17,20]]},'03-02':{x:[[7,14],[21,25]]},
 '03-03':{x:[[6,10]]},'03-04':{x:[[17,23]],y:[[7,10]]},
 '03-05':{x:[[6,10],[16,20],[26,30],[45,48]],y:[[7,10],[16,20]]},
};
for(const p of V124C_EARLY_PLANS)for(const axis of ['x','y'] as const){
 const gaps=compressedGaps[p.id][axis]??[],size=axis==='x'?'w':'h';
 const shift=(v:number)=>v-gaps.reduce((n,[a,b])=>n+(v>a?Math.min(v-a,b-a)*(b-a-2)/(b-a):0),0);
 for(const r of [...p.rooms,...p.islands??[]]){const a=r[axis],b=a+r[size];r[axis]=shift(a);r[size]=shift(b)-shift(a);}
 for(const e of p.edges){for(const q of e.via??[])q[axis]=shift(q[axis]);if(e.door)e.door.at[axis]=shift(e.door.at[axis]);}
 for(const q of [...p.structures??[],...p.lights??[]])q[axis]=shift(q[axis]);
 for(const c of p.cameras??[])if(c.at)c.at[axis]=shift(c.at[axis]);
 for(const a of p.patrols??[])for(const q of a.points??[])q[axis]=shift(q[axis]);
 for(const key of ['firstBreak','entry','objective','exit'] as const){const q=p[key];if(q)q[axis]=shift(q[axis]);}
}

// 45-second runtime sweep review: north-facing checkpoint equipment occluded the old east cameras.
// Mount on the southeast wall shoulder, looking across the open inspection floor; detection settings stay inherited.
for(const id of ['03-02','03-04']){
 const p=V124C_EARLY_PLANS.find(p=>p.id===id)!,r=p.rooms.find(r=>r.id==='checkpoint')!;
 p.cameras=[{room:r.id,at:{x:r.x+r.w-1,y:r.y+r.h-1},facing:-Math.PI*3/4}];
}

// Final image review: shorten the outside service leg to a nearby exterior court.
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='02-04')!;
 const r=p.rooms.find(r=>r.id==='exit')!;r.x=12;r.y=27;
 p.edges.find(e=>e.from==='staff'&&e.to==='exit')!.via=[{x:3,y:13.5},{x:3,y:29.5}];
 p.edges.find(e=>e.role==='quickEscape')!.via=[{x:23,y:4},{x:23,y:29.5}];
 const q=p.structures!.find(q=>q.kind==='bench'&&q.x>28)!;q.x=14.5;q.y=28;
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='03-03')!;
 p.edges.find(e=>e.from==='transport'&&e.to==='sorting')!.via=[{x:23,y:28},{x:11,y:28}];
 // A full-scale cash-transfer cart marks the armored loading bay without closing its approach.
 p.structures!.push(fixture('bankCashCart',24.3,22.5,1.7,'bank_cash_cart'));
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='01-05')!;
 const q=p.structures!.find(q=>q.kind==='statue'&&q.x>10)!;q.y=15;q.scale=1.7;q.collisionScale=1.7;
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='02-01')!;
 const q=p.structures!.find(q=>q.kind==='painting'&&q.y<5)!;q.y=2.7;q.x=14.5;
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='01-03')!;
 const q=p.structures!.find(q=>q.kind==='displayCase'&&q.y>10&&q.y<16)!;
 q.kind='table';q.visualAssetId='museum_display_low';q.scale=1.7;q.collisionScale=1.7;
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='03-01')!;
 p.structures!.find(q=>q.kind==='bankOfficeDesk'&&q.x>30)!.y=12.6;
}
// The glass-room camera observes the clear east approach shoulder, outside the tall art-wall silhouette.
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='02-03')!;
 p.cameras=[{room:'installation',at:{x:14,y:12},facing:Math.PI/2}];
}
// Upper study and art-store connections now meet at the nearest room shoulder.
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='01-02')!;
 p.edges.find(e=>e.from==='study'&&e.to==='threshold')!.via=[{x:16.5,y:3},{x:16.5,y:9.5}];
}
{
 const p=V124C_EARLY_PLANS.find(p=>p.id==='02-03')!;
 p.rooms.find(r=>r.id==='preparation')!.h=3;
 const q=p.structures!.find(q=>q.kind==='table'&&q.x>20)!;q.x=21.3;q.y=21;q.scale=1.8;q.collisionScale=1.8;
 p.edges.find(e=>e.from==='preparation'&&e.to==='store')!.via=[{x:23,y:25},{x:11,y:25}];
}
