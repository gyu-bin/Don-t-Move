/** Prints every mission's guards and cameras (plan level), one line each: for before/after comparison of a pass that must not move security. */
import {V13_MISSIONS} from './v13Build';
for(const m of V13_MISSIONS){
 console.log(m.id,'G',m.guards.map(g=>`${g.role}@${g.zone}:${g.stops.map(s=>`${s.x},${s.y}>${s.look.x},${s.look.y}w${s.wait??''}`).join('|')}`).join(' ; '));
 console.log(m.id,'C',m.cameras.map(c=>`${c.zone}@${c.at.x},${c.at.y}f${c.facing}`).join(' ; '));
 console.log(m.id,'P',`${m.entry.x},${m.entry.y} ${m.objective.x},${m.objective.y} ${m.exit.x},${m.exit.y}`,m.edges.map(e=>`${e.from}>${e.to}:${e.role}:${(e.via??[]).map(v=>v.x+','+v.y).join('/')}${e.door?`:d${e.door.at.x},${e.door.at.y}`:''}`).join(' '));
}
