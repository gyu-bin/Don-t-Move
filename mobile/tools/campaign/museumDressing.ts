/** Curated, offline Museum vignettes. Every coordinate is authored; no density-driven scattering. */
import type {StageDefinition,LightDef} from '../../src/game/levels/StageDefinition';
import type {DressingKind} from '../../src/game/world/dressingKit';
type Item=[DressingKind,number,number,number?];
type Vignette=[string,string,Item[],LightDef['kind']?];
const CURATED:Vignette[][]=[
 [
  ['A','Visitor welcome',[['plaque',1.8,8.2],['pedestal_small',1.55,12.3],['painting_wall',3.9,8.1],['spotlight_small',1.7,12.1]]],
  ['B','Sculpture collection guide',[['plaque',6.3,5.2],['floor_runner',8.2,11],['pedestal_small',6.5,12.45],['spotlight_small',7.2,7.6]]],
  ['B','Upper painting recess',[['painting_wall',10.6,1.1],['painting_wall',13.2,1.1],['plaque',12.2,1.2],['bench_museum',11.7,2.0]]],
  ['C','Diamond arrival suite',[['painting_wall',16,5.1],['plaque',16.1,5.3],['pedestal_small',16.45,10.45],['spotlight_small',15.6,6.1]]],
 ],
 [
  ['A','Gallery introduction',[['painting_wall',1.8,6.1],['plaque',2.9,6.2],['spotlight_small',1.5,7.4]]],
  ['B','Rotunda antiquities',[['pedestal_small',7.4,5.65],['pedestal_small',8.3,5.65],['plaque',7.8,5.2],['floor_runner',7.5,9.5],['spotlight_small',7.8,6.0]]],
  ['C','Northern sculpture showcase',[['painting_wall',11.5,1.1],['display_glass_small',13.45,2.0],['plaque',12.7,1.2],['spotlight_small',12.2,2.1]]],
 ],
 [
  ['A','Staff archive access',[['archive_label',1.2,2],['security_panel',1.2,3.5],['floor_runner',2.5,3.3]],'cool'],
  ['B','Catalogued archive shelving',[['archive_label',6.5,4.2],['archive_label',8.8,4.2],['restoration_tray',6.15,4.75],['spotlight_small',6.1,4.4]]],
  ['C','Document dispatch',[['archive_label',15,11.1],['plaque',16,11.1],['spotlight_small',15.6,12.4]],'cool'],
  ['D','Sealed records',[['archive_label',12,6.2],['security_panel',13.7,6.3],['spotlight_small',12.8,7.8]],'cool'],
 ],
 [
  ['A','Visitor security office',[['security_panel',2.5,9.15],['archive_label',4,9.15],['restoration_tray',1.6,12.4],['spotlight_small',3,9.5]],'cool'],
  ['B','Control equipment station',[['security_panel',6.2,9.1],['plaque',6.2,10],['floor_runner',8.4,12.2]],'cool'],
  ['C','Access-control junction',[['security_panel',10.6,4.1],['plaque',11.7,4.1],['spotlight_small',10.7,4.3]],'cool'],
  ['D','Restricted passage signage',[['security_panel',12.2,3.2],['archive_label',12.2,7.5],['spotlight_small',13,1.5]],'cool'],
 ],
 [
  ['A','Restricted collection welcome',[['painting_wall',3,7.1],['plaque',4.3,7.15],['pedestal_small',1.5,11.7],['spotlight_small',2.2,8.6]]],
  ['B','Collection island labels',[['plaque',7.2,11.9],['floor_runner',9,11.5],['spotlight_small',8.2,12.1]]],
  ['B','Cabinet of miniatures',[['pedestal_small',10.55,12.5],['sculpture_small',9.3,12.55],['painting_wall',7.05,9.0],['plaque',10.5,12.8]]],
  ['C','Restricted antiquities',[['painting_wall',9,4.1],['plaque',7.2,4.6],['restoration_tray',8.75,7.4],['spotlight_small',8.25,5.1]]],
  ['D','Diamond focal exhibit',[['plaque',14.9,4.3],['floor_runner',14.1,6.4],['spotlight_small',14.6,5.0]]],
  ['E','Service dispatch',[['archive_label',15,10.15],['security_panel',15.8,12.4],['restoration_tray',15.45,12.65]],'cool'],
 ],
 [
  ['A','Conservation receiving',[['archive_label',2.5,7.15],['utility_cart',3.3,7.75],['restoration_tray',2.55,7.75],['spotlight_small',3.3,8.1]],'cool'],
  ['B','Restoration workbay',[['restoration_tray',11.2,12.7],['archive_label',7.2,6.4],['floor_runner',9.3,11.6],['spotlight_small',9.5,7.7]],'cool'],
  ['C','Specimen catalog',[['archive_label',11.6,1.15],['restoration_tray',11.6,1.7],['security_panel',15.6,1.2],['spotlight_small',13.2,1.6]],'cool'],
  ['D','Equipment inspection',[['security_panel',16.8,6.4],['archive_label',16.8,10.5],['utility_cart',16.35,13.6],['spotlight_small',16.3,12.5]],'cool'],
  ['E','Clean tools return',[['restoration_tray',11.9,17.55],['archive_label',12.4,15.1],['plaque',15.8,15.1],['floor_runner',10.8,16.7]],'cool'],
 ],
 [
  ['A','Private patron foyer',[['painting_wall',7.1,1.1],['pedestal_medium',6.6,1.9],['plaque',6.8,1.2],['spotlight_small',6.8,2.0]]],
  ['B','Portrait conversation alcove',[['painting_wall',3.15,9],['painting_wall',3.15,12],['plaque',3.2,11],['pedestal_small',3.5,11.5],['spotlight_small',3.6,11.8]]],
  ['C','VIP invitation threshold',[['plaque',8.5,9.1],['floor_runner',8.5,10],['spotlight_small',8,9.4]]],
  ['D','Private collection miniatures',[['painting_wall',14.8,10.5],['pedestal_medium',14.35,11.7],['plaque',14.8,11.7],['spotlight_small',14.3,11.3]]],
  ['E','Salon west portrait recess',[['painting_wall',3.1,15.8],['plaque',3.15,16.65],['bench_museum',6,17.6],['floor_runner',6.6,17.05]]],
  ['E','Salon final reveal',[['plaque',13.5,15.1],['pedestal_small',14.5,17.45],['floor_runner',10.9,16.7],['spotlight_small',12.5,16.0]]],
 ],
 [
  ['A','Access console',[['security_panel',16.2,7.1],['plaque',17.6,7.15],['archive_label',19.8,8.2],['spotlight_small',17.2,8.3]],'cool'],
  ['B','Monitoring records',[['security_panel',1.15,8.8],['archive_label',2.8,7.1],['restoration_tray',2.2,7.65],['floor_runner',3,10]],'cool'],
  ['C','Central control junction',[['security_panel',13.8,7.2],['archive_label',13.8,10.5],['plaque',7.2,6.4],['spotlight_small',9,11.2]],'cool'],
  ['D','Restricted archive authentication',[['security_panel',10.5,1.1],['archive_label',11.5,1.15],['restoration_tray',10.5,1.65],['spotlight_small',10.6,2.2]],'cool'],
  ['E','Evacuation service records',[['archive_label',15.5,14.1],['security_panel',15.8,16.1],['restoration_tray',15.4,17.5],['floor_runner',12.8,16.8]],'cool'],
 ],
 [
  ['A','Master collection prologue',[['painting_wall',2.7,1.1],['pedestal_small',1.55,2.7],['plaque',1.2,2],['floor_runner',4.4,3.1],['spotlight_small',2,2.6]]],
  ['B','Sculpture provenance',[['painting_wall',5.7,7.1],['display_low',6.1,8.7],['plaque',6.8,8],['spotlight_small',5.9,8.2]]],
  ['B','Small antiquities pair',[['pedestal_small',1.55,8.0],['pedestal_small',1.55,9.0],['archive_label',1.1,8.5],['spotlight_small',1.8,8.5]]],
  ['C','Southern exhibit island',[['painting_wall',5.3,15.1],['pedestal_medium',5.4,15.8],['plaque',5.8,15.2],['floor_runner',4,18.6],['spotlight_small',5.5,16.0]]],
  ['C','Collection seating recess',[['bench_museum',4.3,19.5],['plaque',5.7,19.8],['spotlight_small',4.3,19.2]]],
  ['D','Master island annotation',[['plaque',10,19.6],['pedestal_small',13.3,18.8],['painting_wall',13.8,13.2],['floor_runner',12.4,18.2],['spotlight_small',11.4,19.2]]],
  ['D','Portrait bridge exhibit',[['painting_wall',10.3,5.1],['pedestal_small',10.1,5.75],['plaque',13.2,5.1],['spotlight_small',10.1,6.0]]],
  ['E','East gallery provenance sequence',[['painting_wall',19.85,10.6],['painting_wall',19.85,12.1],['plaque',19.85,11.35],['pedestal_small',19.45,10.25],['floor_runner',18.6,13.25]]],
  ['E','Master acquisition room',[['painting_wall',19.8,14.5],['pedestal_small',19.45,14.5],['plaque',19.8,17],['spotlight_small',18.6,18.0]]],
  ['F','Final portrait gallery',[['painting_wall',16.1,1.1],['pedestal_medium',15.2,1.85],['plaque',15,1.2],['floor_runner',18.3,4],['spotlight_small',15.3,2.0]]],
 ],
 [
  ['A','Grand exhibition welcome',[['painting_wall',12,15.1],['pedestal_medium',12,15.8],['plaque',12.4,15.2],['floor_runner',12.2,21.4],['spotlight_small',12.1,16.1]]],
  ['A','Grand sculpture companion',[['pedestal_small',15.35,20.1],['plaque',15.8,20.1],['spotlight_small',15.2,20.4]]],
  ['B','Staff dispatch corridor',[['security_panel',3.15,14.4],['archive_label',7.8,15],['restoration_tray',7.4,19.4]],'cool'],
  ['C','Western gallery chronology',[['painting_wall',3.15,7.0],['plaque',3.15,8.0],['painting_wall',4.15,10.5],['floor_runner',5.55,10.9]]],
  ['C','Historic sculpture salon',[['painting_wall',5.4,4.1],['pedestal_small',5.1,4.75],['plaque',4.6,4.2],['floor_runner',6.5,9.2],['spotlight_small',5.1,5.0]]],
  ['D','Inner security station',[['security_panel',15.8,10.2],['archive_label',11.2,10.5],['restoration_tray',11.6,12.5],['spotlight_small',12.1,11.2]],'cool'],
  ['E','Master diamond presentation',[['plaque',21.6,3.2],['floor_runner',18.6,4.3],['spotlight_small',20.2,3.2]]],
  ['F','Maintenance route equipment records',[['security_panel',22.85,10.1],['archive_label',22.85,12.2],['archive_label',22.85,14.9],['floor_runner',21.3,14.7]],'cool'],
  ['F','Eastern maintenance inspection',[['utility_cart',21.6,18.9],['archive_label',22.8,17],['security_panel',22.8,18.5],['floor_runner',21.3,17.6],['spotlight_small',21.7,18.7]],'cool'],
 ],
];
export function applyMuseumDressing(s:StageDefinition):StageDefinition{
 if(s.chapter!==1)return s;
 const plan=CURATED[(s.mission??0)-1];if(!plan)throw Error(`No authored dressing for ${s.id}`);
 s.dressing=plan.map(([zone,identity,items,lightKind],i)=>{
  const spot=items.find(item=>item[0]==='spotlight_small');
  return {id:`${s.id}-exhibit-${i+1}`,zoneId:`${s.id}-${zone}`,identity,
   items:items.map(([kind,x,y,scale])=>({kind,x,y,...(scale===undefined?{}:{scale})})),
   ...(spot?{light:{x:spot[1],y:spot[2],radius:1.3,kind:lightKind??'warm',intensity:0.22}}:{})};
 });
 return s;
}
