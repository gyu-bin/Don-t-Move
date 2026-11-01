/**
 * Tables for the v3 report from evaluateV3 outputs: one row per candidate (expert plans, reactive bots, blind-run
 * windows per line, similarity to the base mission, approach-route overlap). Writes Markdown to stdout and a CSV.
 *   node --import tsx tools/gameplay-improvement/v3/summarize.ts <evalDir> <out.csv> <id:name>…
 */
import fs from 'node:fs';

type Ev={name:string;routes:string[];summary:Record<string,unknown>;extraReactive:{clear:string};access:Record<string,{unseenShare:number}>;
  vsBase:Record<string,unknown>;overlap:Record<string,{baseApproaches:number;anyBaseRoute:number}>};
const [dir,csv,...names]=process.argv.slice(2);
const pct=(v:number|undefined)=>v===undefined?'—':String(Math.round(v*100));
const rows:string[][]=[]; const md:string[]=[];
md.push('| 후보 | 전문가 벡터 (안전 S W R M · 위험 S W R M) | 추가 노선 | 반응형 (2노선) | 반응형 (추가 노선) | 접촉 / 추격 체포 | 가장 빠른 계획 | 중앙 대기 s | DDI | 유사도 | 병목 겹침 |','|---|---|---|---|---|---|---|---|---|---|---|');
const lines:string[]=['| 후보 | 노선 | 단순 플레이 창 S / W / R % | 원본 접근 노선과 겹침 |','|---|---|---|---|'];
for (const n of names) {
  const f=`${dir}/${n.replace(':','_')}.json`; if (!fs.existsSync(f)) { md.push(`| ${n} | (평가 없음) |`); continue; }
  const e=JSON.parse(fs.readFileSync(f,'utf8')) as Ev, s=e.summary as Record<string,unknown>;
  const plans=s.plans as {route:number;clear:boolean;unseen:boolean}[];
  const extra=plans.filter(p=>p.route>=2).map(p=>p.clear?(p.unseen?2:1):0).join('')||'—';
  const row=[n,String(s.planVector),extra,String(s.reactiveClear),e.extraReactive.clear,`${s.reactiveContact} / ${s.reactiveChaseCaught}`,String(s.fastest),String(s.expertMedianWait),String(s.ddi),String(e.vsBase.similarity),String(e.vsBase.bottleneckOverlap)];
  rows.push(row); md.push(`| ${row.join(' | ')} |`);
  e.routes.forEach((r,i)=>{ const a=['sneak','walk','run'].map(g=>pct(e.access[`r${i}/${g}`]?.unseenShare)).join(' / ');
    lines.push(`| ${n} | r${i} ${r.replace(/\|/g,'/')} | ${a} | ${e.overlap[r]?.baseApproaches??'—'} |`); });
}
console.log(md.join('\n')+'\n\n'+lines.join('\n'));
fs.writeFileSync(csv,['candidate,planVector,extraPlans,reactive,reactiveExtra,contactChase,fastest,medianWait,ddi,similarity,bottleneckOverlap',...rows.map(r=>r.map(x=>`"${x}"`).join(','))].join('\n')+'\n');
