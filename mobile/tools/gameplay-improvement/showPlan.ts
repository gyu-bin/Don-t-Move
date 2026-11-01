/** Prints a V13 mission plan as the bake sees it (after every layer): zones, chains, guard stops, cameras, ASCII map.
 *   node --import tsx tools/gameplay-improvement/showPlan.ts <id,…> */
import {V13_MISSIONS} from '../campaign/v13Build';
for (const id of (process.argv[2]??'').split(',')) { const m=V13_MISSIONS.find(x=>x.id===id);
  if (!m) throw Error(`unknown mission ${id}`);
  console.log('==',id,m.title,'entry',JSON.stringify(m.entry),'obj',JSON.stringify(m.objective),'exit',JSON.stringify(m.exit));
  console.log(' zones',Object.entries(m.zones).map(([k,z])=>`${k}:${z.name}(${z.role})`).join(' | '));
  console.log(' approach',m.approach.join('>'),'| risk',m.risk.join('>'),'| quick',m.quickEscape.join('>'),'| alt',m.alternateEscape.join('>'));
  m.guards.forEach((g,i)=>console.log(` g${i+1}`,g.role,g.zone,'loop',!!g.loop,'delay',g.startDelay??0,JSON.stringify(g.stops.map(s=>[s.x,s.y,s.wait??1.5,[s.look.x,s.look.y]])),'|',g.watches));
  m.cameras.forEach((c,i)=>console.log(` cam${i+1}`,c.zone,JSON.stringify(c.at),'facing',c.facing,'|',c.watches));
  console.log(m.map.map((r,j)=>String(j).padStart(2)+' '+r).join('\n'));
}
