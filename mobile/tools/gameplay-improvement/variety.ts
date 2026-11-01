/**
 * Mission-variant patches for analysis (Gameplay Improvement v2). Re-route existing guards / re-aim existing cameras on
 * a V13 plan; nothing is added and nothing reaches the campaign — candidates are composed in memory by variants.ts.
 * (v2 tried shipping these through a campaign layer; every candidate either closed a route for simple play or did not
 * change the solution, so the layer was removed: docs/reports/gameplay-improvement-v2/.)
 */
import type {V13Mission,V13Stop,V13Guard,V13Camera} from '../campaign/v13Types';

export interface VarietyPatch {
  why:string;
  /** By guard index (0-based, order of the mission's guard list). Replaces the listed fields. */
  guards?:Record<number,Partial<Pick<V13Guard,'stops'|'loop'|'startDelay'|'zone'|'watches'>>&{stops?:V13Stop[]}>;
  /** By camera index (0-based). */
  cameras?:Record<number,Partial<Pick<V13Camera,'at'|'facing'|'zone'|'watches'>>>;
}

export function applyVariety(m:V13Mission,patch:VarietyPatch|undefined):V13Mission {
  if (!patch) return m;
  for (const i of Object.keys(patch.guards??{})) if (!m.guards[+i]) throw Error(`${m.id}: no guard ${i}`);
  for (const i of Object.keys(patch.cameras??{})) if (!m.cameras[+i]) throw Error(`${m.id}: no camera ${i}`);
  return {...m,
    guards:m.guards.map((g,i)=>patch.guards?.[i]?{...g,...patch.guards[i]}:g),
    cameras:m.cameras.map((c,i)=>patch.cameras?.[i]?{...c,...patch.cameras[i]}:c)};
}
