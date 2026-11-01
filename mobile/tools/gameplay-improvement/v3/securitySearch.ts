/**
 * Seeded search over re-routes of ONE existing guard on a v3 geometry candidate (two-stop patrol, nothing added),
 * scored by blind-run accessibility of every approach line (authored + extra): a line is OPEN when its best gait clears
 * unseen from ≥ 20 % of start times and a second gait from ≥ 5 %. Score = open lines + the weakest line's best window
 * + 0.05 × gaits with a window ≥ 10 %. Screening uses 21 start times (ACCESS_STEP=1); finalists go through evaluateV3.
 *   ACCESS_STEP=1 node --import tsx tools/gameplay-improvement/v3/securitySearch.ts <out.json> <candidate> <guardIndex> <zones> <n> [seed]
 */
import fs from 'node:fs';
import raw from '../../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {compileStage} from '../../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../../src/game/world/navigation';
import {BODY} from '../../../src/game/guards/guardTuning';
import {composeV13} from '../../campaign/v13Builder';
import {auditV124bTopology} from '../../campaign/v124bTopologyQA';
import {applyRework} from '../../campaign/v13Rework';
import type {V13Stop} from '../../campaign/v13Types';
import {accessibility} from '../accessibility';
import {rng} from '../patrolSearch';
import {candidatePlan} from './compose';
import {withExtraRoutes} from './evaluateV3';

type Access=Record<string,{unseenShare:number}>;
export function scoreAccess(a:Access, routes:number) {
  const lines=Array.from({length:routes},(_,r)=>['sneak','walk','run'].map(g=>a[`r${r}/${g}`]?.unseenShare??0));
  const open=lines.filter(w=>{const s=[...w].sort((x,y)=>y-x);return s[0]>=0.2&&s[1]>=0.05;}).length;
  const weakest=Math.min(...lines.map(w=>Math.max(...w)));
  const gaits=lines.flat().filter(v=>v>=0.1).length;
  return {open,weakest:+weakest.toFixed(3),gaits,score:+(open+weakest+0.05*gaits).toFixed(3),lines:lines.map(w=>w.map(v=>Math.round(v*100)).join('/'))};
}

if (process.argv[1]?.endsWith('securitySearch.ts')) {
  const [out,name,gi,zones,nArg,seedArg]=process.argv.slice(2), g=Number(gi), n=Number(nArg), next=rng(Number(seedArg??1));
  const plan=candidatePlan(name), def0=composeV13(plan,raw as StageDefinition[]), stage=compileStage(def0), nav=buildNavigation(stage,BODY.guardRadius);
  const cells:{x:number;y:number}[]=[];
  plan.map.forEach((row,y)=>[...row].forEach((ch,x)=>{ if (!zones.includes(ch)) return; const p={x:x+0.5,y:y+0.5};
    const far=(q:{x:number;y:number},d:number)=>Math.hypot(p.x-q.x,p.y-q.y)>=d;
    if (far(plan.objective,1.5)&&far(plan.exit,3)&&far(plan.entry,3)&&clearSegment(p.x*40,p.y*40,p.x*40,p.y*40,nav.blockers,BODY.guardRadius+4)) cells.push(p); }));
  const evalDef=(d:StageDefinition)=>withExtraRoutes(name,d);
  const base=evalDef(JSON.parse(JSON.stringify(def0)) as StageDefinition), baseAccess=accessibility(base) as Access, baseScore=scoreAccess(baseAccess,base.testRoutes!.length);
  process.stderr.write(`${name} as is: ${JSON.stringify(baseScore)}\n`);
  const results:Record<string,unknown>[]=[{k:'asIs',stops:plan.guards[g].stops,...baseScore}];
  const routePts=def0.testRoutes!.flatMap(r=>r.points);
  for (let k=0;k<n;k++) {
    let a=cells[Math.floor(next()*cells.length)], b=cells[Math.floor(next()*cells.length)], tries=0;
    while ((Math.hypot(a.x-b.x,a.y-b.y)<2.5||Math.hypot(a.x-b.x,a.y-b.y)>7||!clearSegment(a.x*40,a.y*40,b.x*40,b.y*40,nav.blockers,BODY.guardRadius))&&tries++<300) { a=cells[Math.floor(next()*cells.length)]; b=cells[Math.floor(next()*cells.length)]; }
    // each stop looks either down its own beat (at the other stop) or at the nearest approach-line point 2–4.5 tiles away
    const look=(p:{x:number;y:number},other:{x:number;y:number})=>{ if (next()<0.5) return other; const c=routePts.map(q=>({q,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(o=>o.d>=2&&o.d<=4.5).sort((u,v)=>u.d-v.d)[0]; return c?{x:c.q.x,y:c.q.y}:other; };
    const stops:V13Stop[]=[{...a,look:look(a,b),wait:next()<0.5?2:3},{...b,look:look(b,a),wait:next()<0.5?2:3}];
    let row:Record<string,unknown>={k,stops};
    try {
      const def=JSON.parse(JSON.stringify(composeV13(applyRework(plan,{why:'search',guards:{[g]:{stops}}}),raw as StageDefinition[]))) as StageDefinition;
      const errors=auditV124bTopology(def).errors; if (errors.length) throw Error(errors.join('; '));
      const d=evalDef(def); row={...row,...scoreAccess(accessibility(d) as Access,d.testRoutes!.length)};
    } catch (e) { row={...row,score:-1,error:String(e).slice(0,160)}; }
    results.push(row);
    process.stderr.write(`${k}: ${row.score} ${JSON.stringify(row.lines??row.error)} ${JSON.stringify(stops.map(s=>[s.x,s.y,s.look.x,s.look.y,s.wait]))}\n`);
  }
  results.sort((x,y)=>Number(y.score)-Number(x.score));
  fs.writeFileSync(out,JSON.stringify({name,guardIndex:g,zones,base:baseScore,results},null,1)+'\n');
}
