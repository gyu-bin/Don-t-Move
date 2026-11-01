/**
 * Before/after table for changed missions from variants.ts output files (<outDir>/<id>_baseline.json and _<name>.json).
 *   node --import tsx tools/gameplay-improvement/compareMissions.ts <varDir> <id:variant,…>
 */
import fs from 'node:fs';

type Out={summary:Record<string,unknown>;vsBase?:Record<string,unknown>;runs:{outcome:string}[]};
const [dir,list]=process.argv.slice(2);
const load=(name:string)=>JSON.parse(fs.readFileSync(`${dir}/${name.replace(':','_')}.json`,'utf8')) as Out;
const rows:string[]=['| 지표 | 변경 전 | 변경 후 |','|---|---|---|'];
const out:string[]=[];
for (const item of list.split(',')) {
  const [id,variant]=item.split(':'), a=load(`${id}:baseline`), b=load(`${id}:${variant}`);
  const sa=a.summary, sb=b.summary;
  const causes=(o:Out)=>{const c:Record<string,number>={};for(const r of o.runs)c[r.outcome]=(c[r.outcome]??0)+1;return Object.entries(c).sort().map(([k,v])=>`${k} ${v}`).join(', ');};
  const sim=(o:Out)=>o.vsBase?`${o.vsBase.similarity} (plan ${o.vsBase.planAgreement}, strategy ${o.vsBase.strategySimilarity}, bottleneck ${o.vsBase.bottleneckOverlap}, fastest ${o.vsBase.sameFastest}, wait ${o.vsBase.waitSimilarity})`:'N/A';
  const ar=(s:Record<string,unknown>)=>{const x=s.approachRisk as Record<string,number>;return `접근 병목 ${x.tightApproach} / 탈출 병목 ${x.tightEscape}; 실패(획득 전 ${x.pickupFailures}, 탈출 ${x.escapeFailures})`;};
  const line=(k:string,f:(s:Record<string,unknown>)=>unknown)=>`| ${k} | ${f(sa)} | ${f(sb)} |`;
  out.push(`### ${id} — ${variant}`,'',...rows,
    `| 원본 미션과의 해법 유사도(0–1) | ${sim(a)} | ${sim(b)} |`,
    line('DDI',s=>s.ddi),line('전문가 결과 벡터(안전 경로 S W R M · 위험 경로 S W R M; 2 무발각, 1 발각 후, 0 실패)',s=>s.planVector),
    line('무발각 성공 전략 수(이동 방식×경로)',s=>(s.unseenStrategies as string[]).length),line('무발각 가능한 이동 방식',s=>(s.gaitsUnseen as string[]).join(', ')),
    line('가장 빠른 전문가',s=>s.fastest),line('전문가 중앙 클리어 시간 s',s=>s.expertMedianSeconds),line('전문가 중앙 대기 s',s=>s.expertMedianWait),
    line('반응형 클리어',s=>s.reactiveClear),line('반응형 평균 / 중앙 클리어 s',s=>`${s.reactiveMeanSeconds} / ${s.reactiveMedianSeconds}`),
    `| 반응형 결과 원인 | ${causes(a)} | ${causes(b)} |`,
    line('반응형 경비 최대 의심도 평균',s=>s.reactiveMaxGuardSuspicionMean),line('반응형 발각 실행 수',s=>s.reactiveSpottedRuns),
    line('반응형 접촉 체포',s=>s.reactiveContact),line('반응형 추격 체포',s=>s.reactiveChaseCaught),
    line('목표 접근·탈출 위험',ar),line('출발 지연에 따른 결과 변화 비율',s=>s.reactiveDelaySensitivity),'');
}
console.log(out.join('\n'));
