/**
 * Aggregates chase-lab outputs (one JSON per candidate, same scenarios) into Markdown tables + CSV.
 * Outcomes are kept apart: caught · LOS broken · survived 60 s · alert ended (calm) · re-infiltrated.
 *   node --import tsx tools/gameplay-improvement/v4/summarizeLab.ts <out.md> <out.csv> <A.json> [B.json …]
 */
import fs from 'node:fs';
import {STRATEGIES,STRATEGY_NAME} from './chaseLab';
import type {RunResult,Scenario} from './chaseLab';

type Sc=Scenario&{spotted:boolean;spotDistance?:number;guardsNear?:number;coverNear?:boolean;openShare?:number};
type Lab={candidate:string;scenarios:Sc[];runs:RunResult[]};
const [outMd,outCsv,...files]=process.argv.slice(2);
const labs=files.map(f=>JSON.parse(fs.readFileSync(f,'utf8')) as Lab);
const pct=(n:number,d:number)=>d?`${(100*n/d).toFixed(1)}`:'—';
const med=(a:number[])=>{if(!a.length)return '—';const b=[...a].sort((x,y)=>x-y),m=b.length>>1;return (b.length%2?b[m]:(b[m-1]+b[m])/2).toFixed(2);};
const md:string[]=[], csv:string[]=['candidate,group,key,runs,caught,caughtWithin1_5s,losBroken,survived60,calm,reinfOk,reinfTried,medianCatch'];
function row(lab:Lab,group:string,key:string,runs:RunResult[]) {
  const c=runs.filter(r=>r.caught), quick=c.filter(r=>(r.caughtAt??99)<=1.5).length, los=runs.filter(r=>r.losBreakAt!==null).length;
  const surv=runs.filter(r=>!r.caught&&r.survived>=59.9).length, calm=runs.filter(r=>r.calm).length;
  const tried=runs.filter(r=>r.reinfiltrated!==null).length, ok=runs.filter(r=>r.reinfiltrated===true).length;
  csv.push([lab.candidate,group,key,runs.length,c.length,quick,los,surv,calm,ok,tried,med(c.map(r=>r.caughtAt!))].join(','));
  return `| ${key} | ${runs.length} | ${pct(c.length,runs.length)} | ${pct(quick,runs.length)} | ${med(c.map(r=>r.caughtAt!))} | ${pct(los,runs.length)} | ${pct(calm,runs.length)} | ${pct(surv+calm,runs.length)} | ${tried?`${ok}/${tried}`:'—'} |`;
}
const HEAD='| 구분 | 실행 | 체포 % | 1.5초 안 체포 % | 체포 중앙 s | 시야 이탈 % | 경보 종료(calm) % | 60초 생존 또는 calm % | 재잠입 성공/시도 |\n|---|---|---|---|---|---|---|---|---|';
for (const lab of labs) {
  const sc=lab.scenarios, R=lab.runs, by=(f:(r:RunResult,s:Sc)=>string)=>{const m=new Map<string,RunResult[]>();for(const r of R){const k=f(r,sc[r.scenario]);m.set(k,[...(m.get(k)??[]),r]);}return [...m].sort((a,b)=>a[0].localeCompare(b[0]));};
  md.push(`## 후보 ${lab.candidate}`,'',`시나리오 ${sc.length} (발각 ${sc.filter(s=>s.spotted).length}) · 실행 ${R.length}`,'',HEAD,row(lab,'all','전체',R));
  md.push('','전략별','',HEAD,...STRATEGIES.map(s=>row(lab,'strategy',`${s} ${STRATEGY_NAME[s]}`,R.filter(r=>r.strategy===s))));
  md.push('','발각 조건별','',HEAD,
    ...by((r,s)=>`${s.kind==='camera'?'CCTV':'경비'}`).map(([k,v])=>row(lab,'kind',k,v)),
    ...by((r,s)=>`발각 거리 ${(s.spotDistance??0)<2.5?'짧음 <2.5':(s.spotDistance??0)<3.5?'중간 2.5–3.5':'김 ≥3.5'}`).map(([k,v])=>row(lab,'distance',k,v)),
    ...by((r,s)=>s.coverNear?'2.5타일 안 숨을 곳 있음':'2.5타일 안 숨을 곳 없음').map(([k,v])=>row(lab,'cover',k,v)),
    ...by((r,s)=>(s.openShare??0)>0.5?'개방(주변 절반 이상 노출)':'막힘').map(([k,v])=>row(lab,'open',k,v)),
    ...by((r,s)=>(s.guardsNear??0)>=3?'8타일 안 경비 3명 이상':'8타일 안 경비 1–2명').map(([k,v])=>row(lab,'guards',k,v)));
  md.push('','미션별','',HEAD,...by((r,s)=>s.mission).map(([k,v])=>row(lab,'mission',k,v)));
  const resp:Record<string,number>={}; for (const r of R) for (const w of r.respotBy??[]) resp[w]=(resp[w]??0)+1;
  const caughtState:Record<string,number>={}; for (const r of R.filter(x=>x.caught)) caughtState[r.caughtState??'?']=(caughtState[r.caughtState??'?']??0)+1;
  const stuck=R.filter(r=>!r.caught&&r.survived>=59.9&&!r.calm).length;
  md.push('',`재발견한 쪽(시야 이탈 후): ${JSON.stringify(resp)} · 체포한 경비 상태: ${JSON.stringify(caughtState)} (4 Chase, 5 Investigate, 3 Search, 6 Return, 0 Patrol) · `+
    `60초 생존했지만 경보가 끝나지 않음: ${stuck} · 경비 겹침(0.5타일) 프레임 평균 ${(R.reduce((n,r)=>n+r.stackFrames,0)/R.length).toFixed(1)} · 상태 전환 평균 ${(R.reduce((n,r)=>n+r.stateChanges,0)/R.length).toFixed(1)}`,'');
}
// paired comparison against the first lab (same scenarios, same strategies)
if (labs.length>1) {
  const base=labs[0], key=(r:RunResult)=>`${r.scenario}|${r.strategy}`, bm=new Map(base.runs.map(r=>[key(r),r]));
  md.push('## 짝 비교(같은 발각 상태 · 같은 전략)','','| 후보 | 짝 | 체포 → 생존 | 생존 → 체포 | calm 얻음 | calm 잃음 | 체포 시간 변화 중앙 s |','|---|---|---|---|---|---|---|');
  for (const lab of labs.slice(1)) {
    let n=0,saved=0,lost=0,calmUp=0,calmDown=0; const dt:number[]=[];
    for (const r of lab.runs) { const b=bm.get(key(r)); if (!b) continue; n++;
      if (b.caught&&!r.caught) saved++; if (!b.caught&&r.caught) lost++; if (!b.calm&&r.calm) calmUp++; if (b.calm&&!r.calm) calmDown++;
      if (b.caught&&r.caught) dt.push(r.caughtAt!-b.caughtAt!); }
    md.push(`| ${lab.candidate} | ${n} | ${saved} | ${lost} | ${calmUp} | ${calmDown} | ${med(dt)} |`);
  }
}
fs.writeFileSync(outMd,md.join('\n')+'\n'); fs.writeFileSync(outCsv,csv.join('\n')+'\n');
console.log(md.slice(0,40).join('\n'));
