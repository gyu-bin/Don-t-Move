/**
 * Gameplay Improvement v3 — level-design rework of single derived missions (docs/reports/gameplay-improvement-v3/).
 *
 * A mirrored mission plays exactly like the plan it was mirrored from. A rework edits the finished mission (after
 * mirroring, refit, secure() and the Chapter 7–8 lane patches, in the mission's own coordinates): it may open or close
 * wall cells, re-draw route edges, re-route existing guards and cameras and move or add cover. Entry, prize, exit,
 * mission id and chapter order stay. Candidates are measured with tools/gameplay-improvement/v3/ before one is listed
 * in REWORK; a mission that is not listed is untouched.
 */
import type {V13Mission,V13Structure,V13Guard,V13Camera,V13Zone} from './v13Types';
import type {V124bEdge} from './v124bTypes';

export interface ReworkPatch {
  why:string;
  /** Map cells to set, [x, y, char]: a zone letter opens a wall cell, '#' closes a floor cell. Applied first. */
  cells?:[number,number,string][];
  /** Zone fields to change, by map letter (hub, purpose, name). */
  zones?:Record<string,Partial<V13Zone>>;
  /** Route lists to replace. */
  routes?:Partial<Pick<V13Mission,'approach'|'risk'|'quickEscape'|'alternateEscape'>>;
  /** Edges to drop ([from, to, role]) and edges to add. */
  dropEdges?:[string,string,V124bEdge['role']][];
  addEdges?:V124bEdge[];
  /** Existing guards by index (fields replaced) — nothing is added. */
  guards?:Record<number,Partial<V13Guard>>;
  /** Existing cameras by index (fields replaced). */
  cameras?:Record<number,Partial<V13Camera>>;
  /** Existing structures by name: new fields, or null to remove. */
  structures?:Record<string,Partial<V13Structure>|null>;
  /** Cover pieces appended to the structure list. */
  add?:Omit<V13Structure,'roles'>[];
  cover?:Partial<V13Mission['cover']>;
  topology?:string;
}

export function applyRework(m:V13Mission,p:ReworkPatch|undefined):V13Mission {
  if (!p) return m;
  const map=m.map.map(r=>[...r]);
  for (const [x,y,ch] of p.cells??[]) { if (map[y]?.[x]===undefined) throw Error(`${m.id}: cell ${x},${y} is off the map`); map[y][x]=ch; }
  const zones={...m.zones};
  for (const [k,z] of Object.entries(p.zones??{})) { if (!zones[k]) throw Error(`${m.id}: no zone ${k}`); zones[k]={...zones[k],...z}; }
  const drop=(e:V124bEdge)=>(p.dropEdges??[]).some(([f,t,r])=>e.from===f&&e.to===t&&e.role===r);
  for (const [f,t,r] of p.dropEdges??[]) if (!m.edges.some(e=>e.from===f&&e.to===t&&e.role===r)) throw Error(`${m.id}: no edge ${f}->${t} ${r}`);
  for (const i of Object.keys(p.guards??{})) if (!m.guards[+i]) throw Error(`${m.id}: no guard ${i}`);
  for (const i of Object.keys(p.cameras??{})) if (!m.cameras[+i]) throw Error(`${m.id}: no camera ${i}`);
  for (const n of Object.keys(p.structures??{})) if (!m.structures.some(s=>s.name===n)) throw Error(`${m.id}: no structure ${n}`);
  return {...m,map:map.map(r=>r.join('')),zones,...p.routes,...(p.topology?{topology:p.topology}:{}),
    edges:[...m.edges.filter(e=>!drop(e)),...(p.addEdges??[])],
    guards:m.guards.map((g,i)=>p.guards?.[i]?{...g,...p.guards[i]}:g),
    cameras:m.cameras.map((c,i)=>p.cameras?.[i]?{...c,...p.cameras[i]}:c),
    structures:[...m.structures.flatMap(s=>{const q=p.structures?.[s.name];return q===null?[]:q?[{...s,...q}]:[s];}),
      ...(p.add??[]).map(s=>({...s,roles:['hiding','losBreak'] as V13Structure['roles']}))],
    cover:{...m.cover,...p.cover}};
}

/** Reworks shipped in the campaign, by mission id. Measured in docs/reports/gameplay-improvement-v3/ (candidate 07-01:D1b). */
export const REWORK:Record<string,ReworkPatch>={
  // 01-01 mirrored had two approach lines into one door (the hall lane and the court crossing, both ending at the
  // collection's south door). Two openings add two lines into the collection's NORTH door, behind the objective guard:
  // the freight door (lobby → West Gallery → Side Gallery → foyer) and the court breach (court → foyer, under the foyer
  // camera, shut by the lockdown). The old lines are untouched.
  '07-01':{why:'Freight door and court breach: two new lines into the collection\'s north door, behind the objective guard; the plank stack and the side-gallery guard give the freight line a readable window.',
    cells:[[17,13,'w'],[18,13,'w'],[19,13,'w'],   // freight door: lobby → West Gallery
      [9,6,'t'],[10,6,'t'],[11,6,'t'],[11,7,'t']],  // court breach: court → foyer (the court pier keeps one cell)
    routes:{risk:['lobby','westGallery','sideGallery','foyer','collection']},
    dropEdges:[['hall','court','risk'],['court','wallGallery','risk']],
    addEdges:[
      {from:'lobby',to:'westGallery',role:'risk',via:[{x:18.5,y:13.5}]},
      {from:'sideGallery',to:'foyer',role:'risk',via:[{x:14.5,y:3.5}]},
      {from:'foyer',to:'collection',role:'risk',via:[{x:8.5,y:3.5}]},
      {from:'court',to:'foyer',role:'risk',door:{at:{x:10.5,y:6.5},orientation:'horizontal',lockdown:true,style:'warehouseIndustrial'}},
      {from:'westGallery',to:'sideGallery',role:'risk',via:[{x:20,y:11.5},{x:20,y:7.75},{x:18.75,y:7.75},{x:18.75,y:6.5}]},
    ] as V124bEdge[],
    // The plank stack half a tile west: the freight line climbs the east side of the West Gallery, out of the gallery camera's cone.
    structures:{'Side Wall':{x:17.5}},
    // The side-gallery guard watches the foyer mouth, then the gallery from its north-east corner (was: end to end along the freight line's own path).
    guards:{1:{watches:'The foyer mouth, then the side gallery from its north-east corner',
      stops:[{x:16.5,y:4.5,look:{x:14.5,y:4},wait:2},{x:20.5,y:2.5,look:{x:16.5,y:4.5},wait:2}]}},
    cover:{risk:['Lobby Security Desk','Side Wall','Side Wall Cases']},
    topology:'Loop'},
};

export const rework=(m:V13Mission):V13Mission=>applyRework(m,REWORK[m.id]);
