/**
 * Aggregates the audit outputs into CSV tables, a summary JSON and Markdown table fragments, so every number in the
 * reports is generated from the raw files (no hand-copied values).
 *   node --import tsx tools/gameplay-audit/summarize.ts <reactive.json> <expert.json[,expert2.json…]> <controlled.json> <outDir> [layout_reuse.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import type {RunResult} from './campaignAudit';
import type {PlanResult} from './expertPlanner';
import {difficultyIndex,DDI_FORMULA} from './difficultyIndex';
import type {MissionMetrics} from './difficultyIndex';
import {missionNotes} from './missionNotes';

type Structure = {id:string;chapter:number;mission:number;title:string;theme:string;cols:number;rows:number;floorCells:number;guards:number;
  cameras:number;doors:number;lockdownDoors:number;props:number;blockingProps:number;patrolStops:number;shortestApproachTiles:number;
  objectiveToExitTiles:number;spawnSeenInIdle60s:boolean;coverage:Record<string,{tiles:number;samples:number;everWatchedPct:number;meanWatchedPct:number;
  overlapSamples:number;dangerSections:number;longestDangerTiles:number;timingSamples:number;pinnedSamples:number}>};
type Plan = PlanResult & {candidate:string};

const [reactivePath,expertPaths,controlledPath,outDir,layoutPath,recheckPaths]=process.argv.slice(2);
if (!outDir) throw Error('usage: summarize.ts <reactive.json> <expert.json,…> <controlled.json> <outDir>');
const reactive=JSON.parse(fs.readFileSync(reactivePath,'utf8')) as {structure:Structure[];runs:RunResult[];campaignSha256:string};
const expertFiles=expertPaths.split(',').map(p=>JSON.parse(fs.readFileSync(p,'utf8')) as {plans:Plan[];campaignSha256:string});
const controlled=JSON.parse(fs.readFileSync(controlledPath,'utf8'));
for (const e of expertFiles) if (e.campaignSha256!==reactive.campaignSha256) throw Error('expert and reactive runs used different campaigns');
const plans=expertFiles.flatMap(e=>e.plans);
const structure=reactive.structure, runs=reactive.runs;
fs.mkdirSync(path.join(outDir,'data'),{recursive:true});

const mean=(a:number[])=>a.length?a.reduce((x,y)=>x+y,0)/a.length:NaN;
const median=(a:number[])=>{if(!a.length)return NaN;const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2;};
const f=(v:number,d=2)=>Number.isFinite(v)?v.toFixed(d):'N/A';
const pct=(v:number)=>Number.isFinite(v)?`${Math.round(v*100)}%`:'N/A';
const csv=(rows:Record<string,unknown>[])=>{const keys=Object.keys(rows[0]);return [keys.join(','),...rows.map(r=>keys.map(k=>{const v=r[k];const s=v===null||v===undefined||(typeof v==='number'&&!Number.isFinite(v))?'N/A':String(v);return /[,"\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}).join(','))].join('\n')+'\n';};
const write=(name:string,body:string)=>fs.writeFileSync(path.join(outDir,name),body);
const candidates=[...new Set(runs.map(r=>r.candidate))];
const ids=structure.map(s=>s.id);

// ---------------------------------------------------------------- per mission × strategy (reactive bots)
const strategyRows:Record<string,unknown>[]=[];
for (const c of candidates) for (const id of ids) for (const st of [...new Set(runs.map(r=>r.strategy))]) {
  const rs=runs.filter(r=>r.candidate===c&&r.id===id&&r.strategy===st); if (!rs.length) continue;
  const ok=rs.filter(r=>r.clear), causes:Record<string,number>={};
  for (const r of rs) if (!r.clear) causes[r.outcome]=(causes[r.outcome]??0)+1;
  // delay sensitivity: for each route, do different start delays give different outcomes?
  const routes=[...new Set(rs.map(r=>String(r.route)))];
  const sensitive=routes.filter(rt=>new Set(rs.filter(r=>String(r.route)===rt).map(r=>r.clear)).size>1).length;
  strategyRows.push({candidate:c,id,strategy:st,attempts:rs.length,successes:ok.length,successRate:+(ok.length/rs.length).toFixed(3),
    meanClearSeconds:ok.length?+mean(ok.map(r=>r.seconds)).toFixed(2):null,medianClearSeconds:ok.length?+median(ok.map(r=>r.seconds)).toFixed(2):null,
    meanExposureSeconds:+mean(rs.map(r=>r.exposureSeconds)).toFixed(2),maxGuardSuspicion:+Math.max(...rs.map(r=>r.maxGuardSuspicion)).toFixed(3),
    maxCameraSuspicion:+Math.max(...rs.map(r=>r.maxCameraSuspicion)).toFixed(3),spottedEpisodes:rs.reduce((n,r)=>n+r.spottedEpisodes,0),
    chaseEntries:rs.reduce((n,r)=>n+r.chaseEntries,0),contactFailures:rs.filter(r=>r.outcome==='caught-contact').length,
    timeouts:rs.filter(r=>r.timeout).length,stuck:rs.filter(r=>r.stuck).length,clearAfterChase:rs.filter(r=>r.clearAfterChase).length,
    failureCauses:Object.entries(causes).map(([k,v])=>`${k}:${v}`).join(' '),successPaths:[...new Set(ok.map(r=>`route${r.route}/delay${r.delay}`))].join(' '),
    delaySensitiveRoutes:`${sensitive}/${routes.length}`});
}
write('data/reactive_strategy_summary.csv',csv(strategyRows));
write('data/reactive_runs.csv',csv(runs.map(r=>({...r,secondsByGait:r.secondsByGait.join('|')}))));
write('data/expert_plans.csv',csv(plans.map(p=>({...p,windows:p.windows.join('|')}))));

// ---------------------------------------------------------------- per mission metrics (candidate A) + DDI
function metrics(id:string,c='A'):MissionMetrics {
  const s=structure.find(x=>x.id===id)!;
  const ps=plans.filter(p=>p.id===id&&p.candidate===c), rs=runs.filter(r=>r.id===id&&r.candidate===c);
  const clear=ps.filter(p=>p.clear);
  const byGait=(g:string)=>ps.filter(p=>p.gait===g);
  const gaitOk=(g:string)=>byGait(g).some(p=>p.clear&&p.unseen);
  return {id,chapter:s.chapter,mission:s.mission,title:s.title,theme:s.theme,
    expertPlans:ps.length,expertClear:clear.length,expertUnseen:clear.filter(p=>p.unseen).length,
    expertScore:mean(ps.map(p=>p.clear?(p.unseen?1:0.5):0)),
    bottleneckWindow:clear.length?median(clear.map(p=>p.windowMin as number)):0,
    meanWindow:clear.length?mean(clear.map(p=>p.windowMean as number)):0,
    tightSegments:clear.length?median(clear.map(p=>p.tightSegments)):NaN,
    expertWaitSeconds:clear.length?median(clear.map(p=>p.waitSeconds)):NaN,
    expertSeconds:clear.length?Math.min(...clear.map(p=>p.seconds as number)):NaN,
    gaitsUnseen:['sneak','walk','run','mixed'].filter(gaitOk),
    fastestGait:clear.length?[...clear].sort((a,b)=>(a.seconds as number)-(b.seconds as number))[0].gait:'none',
    altEscapeNeeded:clear.length>0&&clear.every(p=>p.escape==='alt'),
    reactiveClearRate:rs.filter(r=>r.clear).length/rs.length,
    reactiveContactShare:rs.filter(r=>r.outcome==='caught-contact').length/rs.length,
    reactiveChaseShare:rs.filter(r=>r.outcome==='caught-in-chase').length/rs.length,
    reactiveChaseEntries:rs.reduce((n,r)=>n+r.chaseEntries,0),reactiveClearAfterChase:rs.filter(r=>r.clearAfterChase).length,
    reactiveDelaySensitivity:(()=>{const groups=new Map<string,boolean[]>();for(const r of rs){const k=r.strategy+'|'+r.route;groups.set(k,[...(groups.get(k)??[]),r.clear]);}
      const g=[...groups.values()].filter(v=>v.length>1);return g.filter(v=>new Set(v).size>1).length/g.length;})(),
    routeWatched:mean([s.coverage.safe.meanWatchedPct,s.coverage.risk.meanWatchedPct]),
    routeEverWatched:mean([s.coverage.safe.everWatchedPct,s.coverage.risk.everWatchedPct]),
    dangerSections:s.coverage.safe.dangerSections+s.coverage.risk.dangerSections,
    escapeWatched:s.coverage.quickEscape.meanWatchedPct,
    overlapSamples:s.coverage.safe.overlapSamples+s.coverage.risk.overlapSamples,
    floorCells:s.floorCells,guards:s.guards,cameras:s.cameras,doors:s.doors,blockingProps:s.blockingProps,
    shortestApproachTiles:s.shortestApproachTiles,safeRouteTiles:s.coverage.safe.tiles,riskRouteTiles:s.coverage.risk.tiles,
    quickEscapeTiles:s.coverage.quickEscape.tiles,altEscapeTiles:s.coverage.altEscape.tiles};
}
const missionRows=ids.map(id=>{const m=metrics(id);return {...m,ddi:difficultyIndex(m)};});
write('data/missions.csv',csv(missionRows.map(m=>({...m,gaitsUnseen:m.gaitsUnseen.join('|'),ddi:m.ddi.total,ddiP:m.ddi.parts.P,ddiW:m.ddi.parts.W,ddiN:m.ddi.parts.N,ddiC:m.ddi.parts.C}))));

// ---------------------------------------------------------------- candidates
const candidateRows:Record<string,unknown>[]=[];
for (const c of candidates) for (let ch=1;ch<=9;ch++) {
  const ps=plans.filter(p=>p.candidate===c&&+p.id.slice(0,2)===ch), rs=runs.filter(r=>r.candidate===c&&+r.id.slice(0,2)===ch);
  const g=(gait:string)=>ps.filter(p=>p.gait===gait);
  candidateRows.push({candidate:c,chapter:ch,expertPlans:ps.length,expertClear:ps.filter(p=>p.clear).length,expertUnseen:ps.filter(p=>p.clear&&p.unseen).length,
    sneakClear:g('sneak').filter(p=>p.clear).length,walkClear:g('walk').filter(p=>p.clear).length,runClear:g('run').filter(p=>p.clear).length,mixedClear:g('mixed').filter(p=>p.clear).length,
    medianBottleneck:+median(ps.filter(p=>p.clear).map(p=>p.windowMin as number)).toFixed(3),
    reactiveRuns:rs.length,reactiveClear:rs.filter(r=>r.clear).length,reactiveRunClear:rs.filter(r=>r.strategy==='run'&&r.clear).length,
    reactiveSneakClear:rs.filter(r=>r.strategy==='sneak'&&r.clear).length,reactiveWalkClear:rs.filter(r=>r.strategy==='walk'&&r.clear).length,
    reactiveChaseEscapes:rs.filter(r=>r.clearAfterChase).length,reactiveChaseEntries:rs.filter(r=>r.chaseEntries>0).length});
}
write('data/candidates_by_chapter.csv',csv(candidateRows));

// ---------------------------------------------------------------- chapters (candidate A)
const chapterRows=[1,2,3,4,5,6,7,8,9].map(ch=>{
  const ms=missionRows.filter(m=>m.chapter===ch);
  return {chapter:ch,themes:[...new Set(ms.map(m=>m.theme))].join('|'),ddiMean:+mean(ms.map(m=>m.ddi.total)).toFixed(1),ddiMin:Math.min(...ms.map(m=>m.ddi.total)),ddiMax:Math.max(...ms.map(m=>m.ddi.total)),
    floorCells:+mean(ms.map(m=>m.floorCells)).toFixed(0),guards:+mean(ms.map(m=>m.guards)).toFixed(1),cameras:+mean(ms.map(m=>m.cameras)).toFixed(1),doors:+mean(ms.map(m=>m.doors)).toFixed(1),
    routeWatched:+mean(ms.map(m=>m.routeWatched)).toFixed(3),dangerSections:+mean(ms.map(m=>m.dangerSections)).toFixed(1),
    safeRouteTiles:+mean(ms.map(m=>m.safeRouteTiles)).toFixed(1),expertScore:+mean(ms.map(m=>m.expertScore)).toFixed(3),
    bottleneckWindow:+mean(ms.map(m=>m.bottleneckWindow)).toFixed(3),tightSegments:+mean(ms.map(m=>m.tightSegments).filter(Number.isFinite)).toFixed(2),
    gaitBreadth:+mean(ms.map(m=>m.gaitsUnseen.length)).toFixed(2),reactiveClearRate:+mean(ms.map(m=>m.reactiveClearRate)).toFixed(3),
    reactiveChaseShare:+mean(ms.map(m=>m.reactiveChaseShare)).toFixed(3),reactiveDelaySensitivity:+mean(ms.map(m=>m.reactiveDelaySensitivity)).toFixed(3)};
});
write('data/chapters.csv',csv(chapterRows));

// ---------------------------------------------------------------- Markdown fragments
const md:string[]=[];
md.push('<!-- generated by tools/gameplay-audit/summarize.ts — do not edit by hand -->','','### Chapter table (candidate A = production)','',
  '| Ch | Themes | DDI mean (min–max) | Floor cells | Guards | CCTV | Route watched | Danger sections | Expert score | Bottleneck window | Gaits unseen (of 4) | Naive clear | Naive chase-caught | Delay-sensitive |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const c of chapterRows) md.push(`| ${c.chapter} | ${c.themes} | ${c.ddiMean} (${c.ddiMin}–${c.ddiMax}) | ${c.floorCells} | ${c.guards} | ${c.cameras} | ${pct(c.routeWatched)} | ${c.dangerSections} | ${f(c.expertScore)} | ${pct(c.bottleneckWindow)} | ${c.gaitBreadth} | ${pct(c.reactiveClearRate)} | ${pct(c.reactiveChaseShare)} | ${pct(c.reactiveDelaySensitivity)} |`);
md.push('','### Mission table (candidate A)','',
  '| ID | Title | Theme | DDI | P/W/N/C | Size (floor) | G/C/D | Approach tiles (short/safe/risk) | Route watched | Danger sec. | Expert clear/unseen of 8 | Gaits unseen | Fastest expert | Bottleneck | Tight seg. | Naive clear | Contact / chase caught |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const m of missionRows) md.push(`| ${m.id} | ${m.title} | ${m.theme} | **${m.ddi.total}** | ${m.ddi.parts.P}/${m.ddi.parts.W}/${m.ddi.parts.N}/${m.ddi.parts.C} | ${m.floorCells} | ${m.guards}/${m.cameras}/${m.doors} | ${f(m.shortestApproachTiles,0)}/${f(m.safeRouteTiles,0)}/${f(m.riskRouteTiles,0)} | ${pct(m.routeWatched)} | ${m.dangerSections} | ${m.expertClear}/${m.expertUnseen} | ${m.gaitsUnseen.join(', ')||'—'} | ${m.fastestGait} ${f(m.expertSeconds,1)} s | ${pct(m.bottleneckWindow)} | ${f(m.tightSegments,0)} | ${pct(m.reactiveClearRate)} | ${pct(m.reactiveContactShare)} / ${pct(m.reactiveChaseShare)} |`);
md.push('','### Candidate comparison by chapter','','| Ch | '+candidates.map(c=>`${c} expert clear (S/W/R/M)`).join(' | ')+' | '+candidates.map(c=>`${c} naive clear`).join(' | ')+' |','|---|'+candidates.map(()=>'---').join('|')+'|'+candidates.map(()=>'---').join('|')+'|');
for (let ch=1;ch<=9;ch++) {
  const r=(c:string)=>candidateRows.find(x=>x.candidate===c&&x.chapter===ch) as Record<string,number>;
  md.push(`| ${ch} | `+candidates.map(c=>`${r(c).expertClear}/${r(c).expertPlans} (${r(c).sneakClear}/${r(c).walkClear}/${r(c).runClear}/${r(c).mixedClear})`).join(' | ')+' | '+candidates.map(c=>`${r(c).reactiveClear}/${r(c).reactiveRuns}`).join(' | ')+' |');
}
const tot=(c:string,k:string)=>candidateRows.filter(x=>x.candidate===c).reduce((n,x)=>n+(x[k] as number),0);
md.push('| **All** | '+candidates.map(c=>`**${tot(c,'expertClear')}/${tot(c,'expertPlans')}** (${tot(c,'sneakClear')}/${tot(c,'walkClear')}/${tot(c,'runClear')}/${tot(c,'mixedClear')})`).join(' | ')+' | '+candidates.map(c=>`**${tot(c,'reactiveClear')}/${tot(c,'reactiveRuns')}**`).join(' | ')+' |');
md.push('','### Naive strategy totals (candidate A, all 45 missions)','','| Strategy | Runs | Clear | Rate | Median clear s | Mean exposure s | Contact caught | Chase entries | Clear after chase | Stuck |','|---|---|---|---|---|---|---|---|---|---|');
for (const st of [...new Set(runs.map(r=>r.strategy))]) { const rs=runs.filter(r=>r.candidate==='A'&&r.strategy===st), ok=rs.filter(r=>r.clear);
  md.push(`| ${st} | ${rs.length} | ${ok.length} | ${pct(ok.length/rs.length)} | ${f(median(ok.map(r=>r.seconds)),1)} | ${f(mean(rs.map(r=>r.exposureSeconds)),1)} | ${rs.filter(r=>r.outcome==='caught-contact').length} | ${rs.reduce((n,r)=>n+r.chaseEntries,0)} | ${rs.filter(r=>r.clearAfterChase).length} | ${rs.filter(r=>r.stuck).length} |`); }
md.push('','### Expert gait comparison (candidate A, 90 plans per gait)','','| Gait | Clear | Unseen | Median clear s | Median wait s | Median bottleneck | Fastest in N missions |','|---|---|---|---|---|---|---|');
for (const g of ['sneak','walk','run','mixed']) { const ps=plans.filter(p=>p.candidate==='A'&&p.gait===g), ok=ps.filter(p=>p.clear);
  md.push(`| ${g} | ${ok.length}/${ps.length} | ${ok.filter(p=>p.unseen).length} | ${f(median(ok.map(p=>p.seconds as number)),1)} | ${f(median(ok.map(p=>p.waitSeconds)),1)} | ${pct(median(ok.map(p=>p.windowMin as number)))} | ${missionRows.filter(m=>m.fastestGait===g).length} |`); }
// ---------------------------------------------------------------- controlled fixtures
type Pass={gait:string;suspicion:number;alertAt:number|null};
const CA=controlled.results.A as {equalDistance:{depthFrac:number;tiles:number;guard:Pass[];camera:Pass[]}[];equalTime:{depthFrac:number;seconds:number;guard:Pass[];camera:Pass[]}[];timeToAlert:{depthFrac:number;seconds:Record<string,number|null>}[]};
const gm=controlled.guardMedian, cm=controlled.cameraMedian;
md.push('',`### Controlled fixtures (median guard: range ${gm.rangeTiles} tiles, half-angle ${gm.halfAngleDeg}°; median CCTV: range ${cm.rangeTiles} tiles, angle ${f(cm.angleDeg,1)}°, rate ${cm.suspicionRate})`,'',
  '**Equal distance** — suspicion after crossing N tiles perpendicular to the cone axis at depth d × range (S / W / R). Bold = lowest.','',
  '| Depth | Tiles | Guard S / W / R | CCTV S / W / R |','|---|---|---|---|');
const bold=(xs:number[])=>{const m=Math.min(...xs);return xs.map(x=>x===m?`**${f(x)}**`:f(x)).join(' / ');};
for (const e of CA.equalDistance) md.push(`| ${e.depthFrac} | ${e.tiles} | ${bold(e.guard.map(g=>g.suspicion))} | ${bold(e.camera.map(c=>c.suspicion))} |`);
md.push('','**Equal time** — suspicion after T seconds standing/moving on the axis at depth d (Idle / S / W / R).','','| Depth | Seconds | Guard I / S / W / R | CCTV I / S / W / R |','|---|---|---|---|');
for (const e of CA.equalTime) md.push(`| ${e.depthFrac} | ${e.seconds} | ${e.guard.map(g=>f(g.suspicion)).join(' / ')} | ${e.camera.map(c=>f(c.suspicion)).join(' / ')} |`);
md.push('','**Seconds of continuous exposure until a guard alerts** (on axis; N/A = not within 10 s).','','| Depth | Idle | Sneak | Walk | Run |','|---|---|---|---|---|');
for (const e of CA.timeToAlert) md.push(`| ${e.depthFrac} | ${['idle','sneak','walk','run'].map(k=>e.seconds[k]===null?'N/A':f(e.seconds[k] as number)).join(' | ')} |`);
md.push('','**Candidates, guard, 2-tile crossing** (S / W / R).','','| Depth | '+Object.keys(controlled.results).join(' | ')+' |','|---|'+Object.keys(controlled.results).map(()=>'---').join('|')+'|');
for (const d of [0.3,0.6,0.9]) md.push(`| ${d} | `+Object.keys(controlled.results).map(k=>{const e=(controlled.results[k].equalDistance as {depthFrac:number;tiles:number;guard:Pass[]}[]).find(x=>x.depthFrac===d&&x.tiles===2)!;return bold(e.guard.map(g=>g.suspicion));}).join(' | ')+' |');
md.push('',DDI_FORMULA);
// ---------------------------------------------------------------- planner vs reactive, kept apart
// Planner index PI = round(100 × (P + W) / 2) uses only expert plans; Reactive index RI = round(100 × N) only bots.
const rank=(xs:number[])=>{const o=xs.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);const r=new Array(xs.length);
  for(let k=0;k<o.length;){let j=k;while(j+1<o.length&&o[j+1].v===o[k].v)j++;for(let q=k;q<=j;q++)r[o[q].i]=(k+j)/2;k=j+1;}return r as number[];};
const spearman=(a:number[],b:number[])=>{const ra=rank(a),rb=rank(b),ma=mean(ra),mb=mean(rb);
  const cov=ra.reduce((s2,v,i)=>s2+(v-ma)*(rb[i]-mb),0),va=ra.reduce((s2,v)=>s2+(v-ma)**2,0),vb=rb.reduce((s2,v)=>s2+(v-mb)**2,0);return cov/Math.sqrt(va*vb);};
const sep=missionRows.map(m=>({id:m.id,chapter:m.chapter,PI:Math.round(100*(m.ddi.parts.P+m.ddi.parts.W)/2),RI:Math.round(100*m.ddi.parts.N),DDI:m.ddi.total}));
const rho=spearman(sep.map(x=>x.PI),sep.map(x=>x.RI));
write('data/indices_separated.csv',csv(sep));
const sm:string[]=['','### Planner vs Reactive (separated, candidate A)','',
  `PI (planner only) = round(100 × (P + W) / 2); RI (reactive only) = round(100 × N). Spearman ρ(PI, RI) over 45 missions = **${rho.toFixed(2)}**.`,'',
  '| Ch | PI mean (min–max) | RI mean (min–max) |','|---|---|---|'];
for (let ch=1;ch<=9;ch++){const x=sep.filter(r=>r.chapter===ch);const st=(k:'PI'|'RI')=>`${mean(x.map(r=>r[k])).toFixed(1)} (${Math.min(...x.map(r=>r[k]))}–${Math.max(...x.map(r=>r[k]))})`;sm.push(`| ${ch} | ${st('PI')} | ${st('RI')} |`);}
const disagree=sep.map((r,i)=>({...r,d:rank(sep.map(x=>x.PI))[i]-rank(sep.map(x=>x.RI))[i]})).filter(r=>Math.abs(r.d)>=20);
sm.push('',`Missions whose PI and RI ranks differ by ≥ 20 places: ${disagree.map(r=>`${r.id} (PI ${r.PI}, RI ${r.RI})`).join(', ')||'none'}.`);
if (recheckPaths) {
  const rows=recheckPaths.split(',').flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8')).rows as {id:string;route:number;gait:string;verdict:string;budget:number}[]);
  const c=(v:string)=>rows.filter(r=>r.verdict===v).length;
  write('data/planner_failure_recheck.csv',csv(rows as unknown as Record<string,unknown>[]));
  sm.push('','### Planner failures re-planned with a larger budget (candidate A)','',
    `All ${rows.length} failures at the default budget (1,500 segment simulations per search) were re-run with ${rows[0]?.budget ?? 'N/A'}:`,'',
    '| Verdict | Count | Meaning |','|---|---|---|',
    `| resolved | ${c('resolved')} | clears with more search → search limit, not a game failure |`,
    `| unresolved | ${c('unresolved')} | still out of budget → unknown (neither proven possible nor impossible) |`,
    `| persistent-exhaustive | ${c('persistent-exhaustive')} | every ordered option explored without a clear → fails within this model (route × 8 waits × 2 start delays) |`,'',
    '| Gait | resolved / unresolved / exhaustive |','|---|---|');
  for (const g of ['sneak','walk','run','mixed']) { const x=rows.filter(r=>r.gait===g); sm.push(`| ${g} | ${x.filter(r=>r.verdict==='resolved').length} / ${x.filter(r=>r.verdict==='unresolved').length} / ${x.filter(r=>r.verdict==='persistent-exhaustive').length} |`); }
}
md.push(...sm);
write('generated_tables.md',md.join('\n')+'\n');
const pairs=layoutPath?JSON.parse(fs.readFileSync(layoutPath,'utf8')):[];
write('generated_missions.md',missionNotes(missionRows,plans,runs,pairs));
const summary={campaignSha256:reactive.campaignSha256,missions:ids.length,reactiveRuns:runs.length,expertPlans:plans.length,candidates,
  chapters:chapterRows,missions_:missionRows.map(m=>({id:m.id,ddi:m.ddi,expertClear:m.expertClear,expertUnseen:m.expertUnseen,gaitsUnseen:m.gaitsUnseen,reactiveClearRate:+m.reactiveClearRate.toFixed(3)})),
  controlledGuardMedian:controlled.guardMedian,controlledCameraMedian:controlled.cameraMedian};
write('data/summary.json',JSON.stringify(summary,null,1)+'\n');
console.log('wrote',outDir,'missions',ids.length,'runs',runs.length,'plans',plans.length);
