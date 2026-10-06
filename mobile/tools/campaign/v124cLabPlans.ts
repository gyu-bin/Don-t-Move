/** Phase 4C: five authored research interiors. Geometry and footprint are one contract. */
import {V124B_LATE_PLANS} from './v124bLatePlans';
import type {V124bPlan} from './v124bTypes';
import type {PropDef} from '../../src/game/levels/StageDefinition';
const asset:Partial<Record<PropDef['kind'],NonNullable<PropDef['visualAssetId']>>>={labLargeTable:'lab_large_table',labGlassCorridor:'lab_glass_corridor',labGlassWall:'lab_glass_wall',labCryoUnit:'lab_cryo_unit',labCart:'lab_cart',labWorkstation:'lab_workstation',labObservationConsole:'lab_observation_console',labExperimentMachine:'lab_experiment_machine',labEquipmentRack:'lab_equipment_rack',labSampleStorage:'lab_sample_storage',labPrototypeMachine:'lab_prototype_machine',labCryoChamber:'lab_cryo_chamber',labCentralExperiment:'lab_central_experiment',labSampleCase:'lab_sample_case'};
export const V124C_LAB_PLANS:V124bPlan[]=structuredClone(V124B_LATE_PLANS.filter(p=>p.id.startsWith('04-')));
function furnish(p:V124bPlan,room:string,kind:PropDef['kind'],dx:number,dy:number,scale:number){const r=p.rooms.find(r=>r.id===room)!;p.structures!.push({kind,visualAssetId:asset[kind],x:r.x+dx,y:r.y+dy,scale,collisionScale:scale});}
for(const p of V124C_LAB_PLANS){p.visualRevision='v12-4c';p.secureDoorStyle='labPrototypeSecurity4c';p.objectiveVisualAssetId='lab_sample_case';p.objectiveScale=1.5;p.structures=[];p.lights=[];p.family=`phase4c architectural research / ${p.family}`;}
const [a,b,c,d,e]=V124C_LAB_PLANS;
// Reception desk checks admission; long bench is a real working island with two shoulders.
furnish(a,'P','labWorkstation',2.5,1.9,1.15);
furnish(a,'T','labLargeTable',3,1.85,1.2);
furnish(a,'T','labCart',5.1,4.4,1.05);
furnish(a,'R','labSampleStorage',1.35,4.4,1.05);
furnish(a,'O','labCryoUnit',1.2,3.5,1.1);
furnish(a,'B','labEquipmentRack',1.4,4.4,1.1);
furnish(a,'E','labWorkstation',1.35,4.4,1.05);

a.rooms.find(r=>r.id==='R')!.name='Sample Verification Airlock';
// Observation gallery: full glass divider tied to the eastern room edge, console opposing it.
furnish(b,'P','labWorkstation',1.3,1.9,1.15);
furnish(b,'T','labLargeTable',1.8,1.85,1.25);
furnish(b,'R','labGlassCorridor',4.4,1.5,1);
furnish(b,'R','labObservationConsole',1.6,4.25,1.05);
furnish(b,'O','labExperimentMachine',1.3,3.5,1.05);
furnish(b,'B','labEquipmentRack',1.3,4.4,1.1);
furnish(b,'E','labLargeTable',3,1.85,1.15);
furnish(b,'X','labSampleCase',2.5,1.7,1.1);
b.rooms.find(r=>r.id==='E')!.name='Public Observation Return / Emergency Lobby';
// Sample isolation: benches split the south research cell, specimen storage anchors the left wing.
furnish(c,'P','labWorkstation',2.5,1.85,1.1);
furnish(c,'T','labLargeTable',3,1.85,1.25);
furnish(c,'T','labGlassWall',4.4,1.5,1);
furnish(c,'R','labSampleStorage',1.35,4.4,1.05);
furnish(c,'O','labCryoUnit',1.2,3.5,1.15);
furnish(c,'B','labObservationConsole',3,1.85,1.15);
furnish(c,'E','labCart',1.1,4.3,1.1);

c.rooms.find(r=>r.id==='T')!.name='Public Glass Research Checkpoint';
// Cryogenic research has twin substantial tanks, not the reception mission's single miniature.
furnish(d,'P','labWorkstation',2.5,1.85,1.1);
furnish(d,'T','labLargeTable',3,1.85,1.25);
furnish(d,'R','labSampleStorage',1.35,4.4,1.1);
furnish(d,'O','labCryoUnit',1.15,3.5,1.2);
furnish(d,'O','labCryoUnit',4.8,3.5,1.2);
furnish(d,'B','labEquipmentRack',1.4,4.4,1.15);
furnish(d,'E','labCart',1.05,4.3,1.1);
furnish(d,'X','labSampleStorage',1.35,4.4,1.05);
d.rooms.find(r=>r.id==='R')!.name='Refrigeration Access Checkpoint';
// Final containment: sample objective is inside chamber, large machine is an offset landmark.
furnish(e,'P','labWorkstation',2.5,1.85,1.1);
furnish(e,'T','labLargeTable',1.8,1.85,1.25);
furnish(e,'T','labCart',5.1,4.4,1.1);
furnish(e,'R','labObservationConsole',1.6,4.25,1.05);
furnish(e,'O','labCryoUnit',1.1,4.1,1.15);
furnish(e,'O','labCryoUnit',4.8,4.1,1.15);
furnish(e,'B','labEquipmentRack',1.35,4.4,1.1);
furnish(e,'E','labWorkstation',1.35,4.4,1.15);
furnish(e,'X','labSampleStorage',1.35,4.4,1.05);
// Camera is mounted above the east observation lane, clear of the console's body.
b.cameras![0].at={x:14,y:11};b.cameras![0].facing=Math.PI;
// Architectural entry glass thresholds: these are wall-bounded apertures, not floating props.
for(const [p,x,y,orientation] of [[a,4,21.5,'horizontal'],[b,7.5,19.5,'vertical'],[c,12,16.5,'horizontal'],[d,4,22,'horizontal'],[e,4,17.5,'horizontal']] as const){
 p.edges.find(e=>e.role==='approach')!.door={at:{x,y},orientation,type:'glass',style:'labSliding4c'};
 for(const edge of p.edges)if(edge.door?.lockdown)edge.door.style='labRestrictedGlass4c';
}
/** Remove only unused inter-room gap strips (retain room sizes and body-clear interior lanes).
 * This compresses facility travel, unlike uniformly shrinking equipment and player clearance. */
for(const p of V124C_LAB_PLANS){
 for(const axis of ['x','y'] as const){
  if(p.id==='04-03'&&axis==='y'||p.id==='04-05'&&axis==='x')continue;
  const span=axis==='x'?'w':'h';const bands=p.rooms.map(r=>[r[axis],r[axis]+r[span]]).sort((a,b)=>a[0]-b[0]);
  const union:number[][]=[];for(const b of bands){const last=union.at(-1);if(last&&b[0]<=last[1])last[1]=Math.max(last[1],b[1]);else union.push([...b]);}
  const gaps=union.slice(1).map((b,i)=>({a:union[i][1],b:b[0]})).filter(g=>g.b-g.a>2);
  const remap=(v:number)=>v-gaps.reduce((sum,g)=>sum+(v<=g.a?0:v>=g.b?g.b-g.a-2:(v-g.a)*(g.b-g.a-2)/(g.b-g.a)),0);
  for(const r of p.rooms)r[axis]=remap(r[axis]);
  for(const q of [...p.structures??[],...p.lights??[],...p.islands??[]])q[axis]=remap(q[axis]);
  for(const edge of p.edges){for(const q of edge.via??[])q[axis]=remap(q[axis]);if(edge.door)edge.door.at[axis]=remap(edge.door.at[axis]);}
  for(const c of p.cameras??[])if(c.at)c.at[axis]=remap(c.at[axis]);
  for(const patrol of p.patrols??[])for(const q of patrol.points??[])q[axis]=remap(q[axis]);
  for(const key of ['entry','objective','exit','firstBreak'] as const)if(p[key])p[key]![axis]=remap(p[key]![axis]);
 }
}
