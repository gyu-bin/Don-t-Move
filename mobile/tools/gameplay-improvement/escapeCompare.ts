/** Escape-oracle comparison for missions before/after (stage JSON files): spotted at 2.5 / 3.5 / 4.5 tiles by each guard.
 *   node --import tsx tools/gameplay-improvement/escapeCompare.ts <out.json> <label=stage.json[#id]>… */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {escapeOptions,provokeScenarios} from './chaseFlow';
const [out,...specs]=process.argv.slice(2); const res:Record<string,unknown>={};
for (const spec of specs) { const [label,rest]=spec.split('='), [file,id]=rest.split('#');
  const defs=JSON.parse(fs.readFileSync(file,'utf8')) as StageDefinition[], def=id?defs.find(d=>d.id===id)!:defs[0];
  const rows=[2.5,3.5,4.5].flatMap(dist=>provokeScenarios(def,[dist]).map(sc=>({guard:sc.guard,distance:dist,...escapeOptions(def,sc)})));
  const sp=rows.filter(r=>r.spotted);
  res[label]={scenarios:rows.length,spotted:sp.length,escapeExists:sp.filter(r=>r.successes>0).length,survivalExists:sp.filter(r=>r.survived>0).length,rows};
  console.log(label,'scenarios',rows.length,'spotted',sp.length,'calm escape exists',sp.filter(r=>r.successes>0).length,'survive exists',sp.filter(r=>r.survived>0).length); }
fs.writeFileSync(out,JSON.stringify(res,null,1)+'\n');
