/** Central gameplay islands: authored redistribution, not extra dressing or automatic placement. */
import type {PropKind,StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
type Move={kind:PropKind;from:[number,number];to:[number,number];purpose:string;scale?:number};
export const CENTRAL_COVER_MOVES:Record<string,Move[]>={
 '01-02':[{kind:'pillar',from:[9,7],to:[7.7,9.7],purpose:'Rotunda center crossing pause; southern safe recess and north risk crossing remain open'}],
 '01-05':[
  {kind:'displayCase',from:[8.1,12.55],to:[8.9,11.82],purpose:'Central Collection exhibition island: west observation / east service bypass'},
  {kind:'pillar',from:[10.55,5.2],to:[8.85,7.09],purpose:'Restricted Gallery center retreat linking northern screen to collection pillar'},
 ],
 '01-08':[
  {kind:'counter',from:[9,11.5],to:[9,10.8],purpose:'Central console island splits approach and gives a retreat off the exposed junction axis'},
 ],
 '01-09':[
  {kind:'statue',from:[2.5,10.5],to:[3.15,9.9],purpose:'West sculpture cell: north/south movement has inner and outer flanks'},
  {kind:'statue',from:[11.2,19.6],to:[12.6,15.65],scale:1,purpose:'Middle exhibition cell: inner shortcut and east collection approach split around master sculpture'},
  {kind:'displayCase',from:[16.8,12.5],to:[17.4,13.4],scale:.75,purpose:'East exhibition cell: long escape gallery gains central interruption with east/west bypass'},
 ],
};
export function applyMuseumCentralCover(s:StageDefinition){
 for(const move of CENTRAL_COVER_MOVES[s.id]??[]){
  const p=s.props.find(p=>p.kind===move.kind&&p.x===move.from[0]&&p.y===move.from[1]);if(!p)throw Error(`${s.id}: missing central-cover source ${move.kind} ${move.from}`);
  p.x=move.to[0];p.y=move.to[1];if(move.scale!==undefined){p.scale=move.scale;p.collisionScale=move.scale;}
  if(s.landmark?.kind===move.kind&&s.landmark.x===move.from[0]&&s.landmark.y===move.from[1]){s.landmark.x=p.x;s.landmark.y=p.y;}
  for(const light of s.lights)if(light.x===move.from[0]&&light.y===move.from[1]){light.x=p.x;light.y=p.y;}
 }
 // Close named decorative edge slits physically and visually, without changing corridors.
 const relocateDetail=(kind:string,x:number,y:number,nx:number,ny:number)=>{for(const c of s.dressing??[])for(const p of c.items)if(p.kind===kind&&p.x===x&&p.y===y){p.x=nx;p.y=ny;}};
 if(s.mission===1){relocateDetail('pedestal_small',16.45,10.45,16.8,10.45);const p=s.props.find(p=>p.kind==='partition')!;p.x=3.1;p.y=8.455;}
 if(s.mission===5){
  const edge=s.props.find(p=>p.kind==='displayCase'&&p.x===5&&p.y===12.9)!;edge.x=5.4;
  const chamber=s.props.find(p=>p.kind==='statue'&&p.x===15.3&&p.y===3.8)!;chamber.x=14.6;chamber.y=4.7;
  relocateDetail('pedestal_small',10.55,12.5,10.8,12.5);
  relocateDetail('sculpture_small',9.3,12.55,9.1,12.2);
 }
 if(s.mission===9)relocateDetail('bench_museum',4.3,19.5,4.5,20);
 if(s.mission===7){const p=s.props.find(p=>p.kind==='statue'&&p.x===8.5&&p.y===15.9)!;p.y=15.84;}

 // Individual comfort-width repairs. Each adjustment opens at least .9 tile or
 // attaches the solid to the adjacent wall; no global collider padding changes.
 const shift=(kind:PropKind,x:number,y:number,nx:number,ny:number)=>{
  const p=s.props.find(p=>p.kind===kind&&p.x===x&&p.y===y);if(!p)throw Error(`${s.id}: missing gap-repair prop ${kind} ${x},${y}`);
  p.x=nx;p.y=ny;
  if(s.landmark?.kind===kind&&s.landmark.x===x&&s.landmark.y===y){s.landmark.x=nx;s.landmark.y=ny;}
  for(const l of s.lights)if(l.x===x&&l.y===y){l.x=nx;l.y=ny;}
 };
 if(s.mission===1)relocateDetail('bench_museum',11.7,2,11.7,1.4);
 if(s.mission===3)shift('shelf',8.3,5.5,8.3,4.7);
 if(s.mission===4)shift('counter',7.2,8.7,7.36,8.7);
 if(s.mission===5){
  shift('pillar',15.05,6,15.6,6);
  for(const c of s.dressing??[])for(const p of c.items)if(p.kind==='sculpture_small'&&p.x===9.1&&p.y===12.2){p.scale=.75;p.x=7.1575;p.y=13;}
 }
 if(s.mission===6)shift('equipment',8,12.5,8.4,12.5);
 if(s.mission===7)shift('displayCase',13.8,9,13.5,9);
 if(s.mission===8){
  shift('partition',9.2,3.9,8.7,3.9);
  shift('shelf',2.7,11.3,2.7,11.1);
  shift('partition',9.1,12.3,9.1,12.1);
  shift('counter',11,17.5,11,17.1);
 }
 if(s.mission===9)relocateDetail('pedestal_small',13.3,18.8,13.8,18.8);
 if(s.mission===10){
  shift('statue',7.5,5.5,7.5,5.61);
  const p=s.props.find(p=>p.kind==='statue'&&p.x===10.5&&p.y===19.5)!;p.scale=1.3;p.collisionScale=1.3;
 }
 const stage=compileStage(s);
 for(const r of [...s.testRoutes??[],...s.escapeRoutes??[]])for(let i=1;i<r.points.length;i++){
  const a=r.points[i-1],b=r.points[i];if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,stage.movementBlockers,BODY.playerRadius))throw Error(`${s.id}: central island blocks ${r.name} ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
 }
 return s;
}
