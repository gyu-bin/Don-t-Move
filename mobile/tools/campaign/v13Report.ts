/** Writes the per-mission section of the V13 Phase 1 report from the authored missions and Reports/V13Phase1/mission-qa.json. */
import fs from 'node:fs';
import {V13_MISSIONS} from './v13Build';
import {v13Rooms} from './v13Builder';
const qa=JSON.parse(fs.readFileSync('Reports/V13Phase1/mission-qa.json','utf8')) as {id:string;size:string;lengths:{safe:number;risk:number;quick:number;alternate:number};scripted:{clears:string;safe:number;risk:number};emptiness:{worst:{clearance:number}}}[];
const verdict:Record<string,string>=JSON.parse(fs.readFileSync('tools/campaign/v13SimulatorVerdicts.json','utf8'));
const out:string[]=[];
for(const m of V13_MISSIONS){
 const rooms=v13Rooms(m),name=(id:string)=>rooms.find(r=>r.id===id)!.name,q=qa.find(r=>r.id===m.id)!;
 const zone=(p:{x:number;y:number})=>rooms.find(r=>p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y&&p.y<r.y+r.h)!.name;
 const major=[...m.structures.filter(s=>!s.roles.every(r=>r==='decor')).map(s=>`${s.name} (${s.roles.join(', ')})`),...m.walls.map(w=>`${w.name} — wall (${w.roles.join(', ')})`)];
 out.push(`### ${m.id} ${m.title}`,'',
  `- **Architecture:** ${q.size} tiles, ${rooms.length} zones: ${rooms.map(r=>r.name).join(', ')}.`,
  `- **Entry:** ${m.placement[0]} — ${zone(m.entry)}.`,
  `- **Objective:** ${m.placement[1]} — ${zone(m.objective)} (${rooms.find(r=>r.name===zone(m.objective))!.purpose}).`,
  `- **Exit:** ${m.placement[2]} — ${zone(m.exit)}.`,
  `- **Topology:** ${m.topology}.`,
  `- **Cover graph:** safe ${m.cover.safe.join(' → ')}; risk ${m.cover.risk.join(' → ')}; escape ${m.cover.escape.join(' → ')}.`,
  `- **Safe route:** ${m.approach.map(name).join(' → ')} (${q.lengths.safe} tiles).`,
  `- **Risk route:** ${m.risk.map(name).join(' → ')} (${q.lengths.risk} tiles).`,
  `- **Escape:** quick ${m.quickEscape.map(name).join(' → ')} (${q.lengths.quick}); after lockdown ${m.alternateEscape.map(name).join(' → ')} (${q.lengths.alternate}).`,
  `- **Major structures:** ${major.join('; ')}.`,
  `- **Guard roles:** ${m.guards.map(g=>`${g.role} in ${name(g.role==='objective'?rooms.find(r=>r.name===zone(m.objective))!.id:g.zone)} — ${g.watches}`).join(' / ')}.`,
  `- **CCTV:** ${m.cameras.length?m.cameras.map(c=>`1 in ${name(c.zone)} — ${c.watches}`).join(' / '):'none'}.`,
  `- **Simulator verdict:** ${verdict[m.id]}`,
  `- Scripted thief (supporting only): ${q.scripted.clears} clears, safe ${q.scripted.safe}/12, risk ${q.scripted.risk}/12. Largest open disc ${q.emptiness.worst.clearance} tiles.`,'');
}
fs.writeFileSync('Reports/V13Phase1/missions.md',out.join('\n'));
console.log(`Wrote ${V13_MISSIONS.length} mission sections.`);
