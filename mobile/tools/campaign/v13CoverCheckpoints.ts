import authored from './v13CoverCheckpoints.json';
import type {V13Mission} from './v13Types';

type Point={x:number;y:number};
export interface CoverCheckpoint {
 structure:string;guard:number;stop:number;post:Point;hidden:Point;exposed:Point;look:Point;
 /** Architecture is the cover in the glass-gallery corner probes. */
 wall?:boolean;
}
/** Fixed, per-mission inspection assignments, after all chapter derivations.
 * Props are not scattered or generated, glass never becomes opaque, and no
 * checkpoint/hidden player coordinates are loaded by runtime AI. */
export const COVER_CHECKPOINTS=authored as Record<string,CoverCheckpoint[]>;
export function authorCoverCheckpoints(m:V13Mission):V13Mission {
 const checkpoints=COVER_CHECKPOINTS[m.id];if(!checkpoints)return m;
 const names=new Set(checkpoints.filter(p=>!p.wall).map(p=>p.structure));
 return {...m,
  structures:m.structures.map(s=>names.has(s.name)?{...s,roles:[...new Set([...s.roles,'observation' as const])]}:s),
  guards:m.guards.map((g,i)=>{
   const own=checkpoints.filter(p=>p.guard===i);if(!own.length)return g;
   return {...g,watches:`${g.watches}; check the exposed shoulders of ${own.map(p=>p.structure).join(' / ')} between walks`,
    stops:g.stops.map((s,j)=>{const p=own.find(p=>p.stop===j);return p?{...s,...p.post,look:{...p.look}}:s;})};
  })};
}
