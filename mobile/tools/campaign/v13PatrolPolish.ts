import type {V13Mission,V13Stop} from './v13Types';

type Edit={guard:number;why:string}&(
 {after:number;stop:V13Stop}|{at:number;look:{x:number;y:number}}
);
/** Reviewed local patrol repairs, after cover assignments and chapter derivation.
 * No new guards, speed/perception changes or architecture changes. */
export const PATROL_POLISH:Record<string,Edit[]>={
 '05-02':[{guard:3,after:0,stop:{x:3.6,y:16.5,look:{x:3.6,y:15.5},wait:0},
  why:'Pass the east side of the cashier cage before turning toward the jewel; leave body clearance on the return leg.'}],
 '06-01':[
  {guard:0,after:0,stop:{x:11.75,y:2.5,look:{x:18.5,y:2.5},wait:2},
   why:'Inspect the north corridor between the existing sculpture and south-gallery stops; interrupt an immediate sprint while retaining a timed crossing.'},
  {guard:2,at:0,look:{x:3.2,y:16.5},
   why:'At the west loading post, check the service exit before walking east; do not stare back into the same corridor at both stops.'},
 ],
};

export function polishPatrol(m:V13Mission):V13Mission {
 const edits=PATROL_POLISH[m.id];if(!edits)return m;
 const guards=m.guards.map(g=>({...g,stops:g.stops.map(s=>({...s,look:{...s.look}}))}));
 for(const e of edits){
  const g=guards[e.guard];
  if('after' in e){
   if(!g.stops.some(p=>p.x===e.stop.x&&p.y===e.stop.y))g.stops.splice(e.after+1,0,{...e.stop,look:{...e.stop.look}});
  }else g.stops[e.at].look={...e.look};
  if(!g.watches.includes(e.why))g.watches+=`; ${e.why}`;
 }
 return {...m,guards};
}
