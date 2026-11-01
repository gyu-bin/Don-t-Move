/** Offline experiments only. No runtime imports this file. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {createGuardState,createGuardEvents,stepGuard,suspicionGain} from '../../src/game/guards/guardBrain';
import {pointVisible} from '../../src/game/guards/guardVision';
import {GUARD_TUNING,BODY} from '../../src/game/guards/guardTuning';
import {GAIT_SPEED} from '../../src/game/core/locomotion';
import {Awareness} from '../../src/game/core/types';
import {createSecurityCamera,stepSecurityCameras} from '../../src/game/security/cctv';
const ids=['01-02','05-02','05-03','08-03'];
const ref='87f6775';
const before=JSON.parse(execFileSync('git',['show',`${ref}:mobile/src/game/levels/stages/campaignStages.json`],{encoding:'utf8',maxBuffer:20*1024*1024})) as StageDefinition[];
const current=campaign as StageDefinition[];
const factors=GUARD_TUNING.movementFactor as unknown as number[],original=[...factors],originalCampaign=JSON.stringify(campaign);
const round=(v:number)=>+v.toFixed(5);
const scenarios=['sneak','walk','run','mixed','observe','chase-escape','theft-run'] as const;
type Scenario=typeof scenarios[number];
function run(def:StageDefinition,scenario:Scenario,route:number,delay:number){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 const entry=(def.testRoutes![route]??def.testRoutes![0]).points;
 const points=[...entry,...def.escapeRoutes![0].points.slice(1)].map(p=>({x:p.x*TILE,y:p.y*TILE}));
 let leg=1,wait=0,waitTotal=0,guardRisk=0,cameraRisk=0,seen=0,spotted=0,chase=0,chaseBreaks=0;
 let pickup:number|null=null,spottedAt:number|null=null,previousSpotted=false,previousChase=false,previousSeen=false;
 const cameraPeak=s.securityCameras.map(()=>0),guardPeak=s.guards.map(()=>0);
 for(let f=0;f<60*90&&!s.events.caught&&!s.mission.complete;f++){
  const p=s.player,target=points[leg],blockers=s.effectiveVisionBlockers??stage.visionBlockers;
  const watched=(x:number,y:number)=>s.guards.some(g=>pointVisible(g,x,y,blockers))||s.securityCameras.some(c=>pointVisible(c,x,y,blockers));
  const here=watched(p.x,p.y),d=Math.hypot(target.x-p.x,target.y-p.y)||1;
  const ahead=watched(p.x+(target.x-p.x)*Math.min(1,TILE/d),p.y+(target.y-p.y)*Math.min(1,TILE/d));
  if(s.t>=delay){
   let mode=scenario==='sneak'?1:scenario==='run'?3:2;
   if(scenario==='mixed')mode=here||ahead?1:3;
   if(scenario==='theft-run')mode=s.mission.treasure?3:1;
   if(scenario==='chase-escape')mode=s.events.spottedEpisode||s.mission.treasure?3:2;
   if(scenario==='observe')mode=here||s.mission.treasure?3:ahead?2:1;
   if(scenario==='observe'&&!here&&ahead&&wait<4&&!s.mission.treasure){s.playerMode=0;p.hasTarget=false;wait+=1/60;waitTotal+=1/60;}
   else {s.playerMode=mode;p.tx=target.x;p.ty=target.y;p.hasTarget=true;if(!ahead)wait=0;}
  }
  const oldGuard=s.guards.map(g=>g.suspicion),oldCamera=s.securityCameras.map(c=>c.suspicion);
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  s.guards.forEach((g,i)=>{guardRisk+=Math.max(0,g.suspicion-oldGuard[i]);guardPeak[i]=Math.max(guardPeak[i],g.suspicion);});
  s.securityCameras.forEach((c,i)=>{cameraRisk+=Math.max(0,c.suspicion-oldCamera[i]);cameraPeak[i]=Math.max(cameraPeak[i],c.suspicion);});
  const nowSeen=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
  const nowChase=s.guards.some(g=>g.awareness===Awareness.Chase);
  if(nowSeen)seen+=1/60;
  if(s.events.spottedEpisode&&!previousSpotted){spotted++;if(spottedAt===null)spottedAt=s.t;}
  if(nowChase&&!previousChase)chase++;
  if(previousSeen&&!nowSeen&&previousChase)chaseBreaks++;
  previousSpotted=s.events.spottedEpisode;previousChase=nowChase;previousSeen=nowSeen;
  if(s.mission.treasure&&pickup===null)pickup=s.t;
  if(p.hasTarget&&Math.hypot(p.x-p.tx,p.y-p.ty)<2&&leg<points.length-1)leg++;
 }
 return {id:def.id,scenario,route,delay,clear:s.mission.complete,caught:s.events.caught,timeout:!s.events.caught&&!s.mission.complete,
  caughtBy:s.events.caughtBy||null,seconds:round(s.t),pickupAt:pickup===null?null:round(pickup),spottedAt:spottedAt===null?null:round(spottedAt),
  guardSuspicionGain:round(guardRisk),cameraSuspicionGain:round(cameraRisk),guardPeak:guardPeak.map(round),cameraPeak:cameraPeak.map(round),
  spottedEpisodes:spotted,chaseEntries:chase,chaseLosBreaks:chaseBreaks,clearAfterSpotted:s.mission.complete&&spotted>0,
  clearAfterChase:s.mission.complete&&chase>0,seenSeconds:round(seen),waitSeconds:round(waitTotal),
  unavoidableRisk:'NOT_PROVEN: fixed-route failures cannot establish human unavoidability'};
}
function controlled(mode:number,seconds:number,distance:number,sustained=false){
 const base=compileStage(current.find(d=>d.id==='01-02')!).guards[0];
 const g=createGuardState({...base,x:0,y:0,facing:0,visionRange:400,visionHalfAngle:Math.PI/3});
 const events=createGuardEvents();let t=0,gain=0,alertAt:number|null=null;
 while(t<seconds-1e-9){
  const dt=Math.min(1/60,seconds-t);t+=dt;
  const previousFactor=factors[mode];
  // Candidate C: only this one guard has the exposure age. No shared-state approximation in mission runs.
  if(sustained&&mode===3)factors[mode]=original[mode]*(1+0.5*Math.min(1,Math.max(0,t-.4)/1.6));
  stepGuard(g,{x:180,y:-distance/2+distance*t/seconds,gait:mode},[],dt,events,t,false);
  gain+=suspicionGain(g,mode)*dt;
  factors[mode]=previousFactor;
  if(alertAt===null&&events.alertCount>0)alertAt=t;
 }
 return {mode,seconds:round(seconds),distance,accumulatedGain:round(gain),finalSuspicion:round(g.suspicion),alertAt:alertAt===null?null:round(alertAt)};
}
function cameraCross(mode:number,distance:number){
 const camera=createSecurityCamera({id:'controlled',x:0,y:0,centerFacing:0,sweepAngle:0,sweepSpeed:0,pauseAtEnds:0,range:400,visionAngle:Math.PI*2/3,suspicionRate:.4});
 const events=createGuardEvents();const seconds=distance/GAIT_SPEED[mode];let t=0,gain=0;
 while(t<seconds-1e-9){const dt=Math.min(1/60,seconds-t);t+=dt;stepSecurityCameras([camera],{x:180,y:-distance/2+distance*t/seconds,gait:mode},[],events,dt,t);gain+=camera.detectionGain*dt;}
 return {mode,distance,seconds:round(seconds),accumulatedGain:round(gain),suspicion:round(camera.suspicion),alert:camera.alerted};
}
const variants=[
 {name:'BASELINE_BEFORE',factor:original,defs:before,delayShift:0},
 {name:'PATROL_FIX_ONLY',factor:original,defs:current,delayShift:0},
 {name:'A_RUN_1_8',factor:[original[0],original[1],original[2],1.8],defs:current,delayShift:0},
 {name:'B_CURVE',factor:[original[0],.32,.75,1.8],defs:current,delayShift:0},
 {name:'D_TIMING_PROXY',factor:original,defs:current,delayShift:1},
];
const results=[];
try{
 for(const variant of variants){
  factors.splice(0,factors.length,...variant.factor);
  const controls={equalDistance:[24,80].map(distance=>({distance,runs:[1,2,3].map(m=>controlled(m,distance/GAIT_SPEED[m],distance))})),
   equalTime:[.3,2,4].map(seconds=>({seconds,runs:[1,2,3].map(m=>controlled(m,seconds,0))})),
   cctv:[24,80].map(distance=>({distance,runs:[1,2,3].map(m=>cameraCross(m,distance))}))};
  const runs=ids.flatMap(id=>scenarios.flatMap(scenario=>[0,1].flatMap(route=>[0,2,4].map(delay=>run(variant.defs.find(d=>d.id===id)!,scenario,route,delay+variant.delayShift)))));
  results.push({name:variant.name,movementFactors:variant.factor,controls,runs});
  console.log(variant.name,runs.length,'runs',runs.filter(r=>r.clear).length,'clear');
 }
}finally{factors.splice(0,factors.length,...original);}
const c=[.3,2,4].map(seconds=>({seconds,runs:[1,2,3].map(mode=>controlled(mode,seconds,0,true))}));
const cDistance=[24,80].map(distance=>({distance,runs:[1,2,3].map(mode=>controlled(mode,distance/GAIT_SPEED[mode],distance,true))}));
assert.equal(JSON.stringify(campaign),originalCampaign,'Campaign changed in experiment');
assert.deepEqual(factors,original,'Factors leaked');
assert.deepEqual(controlled(3,.16,24),results[1].controls.equalDistance[0].runs[2],'Controlled replay');
assert.deepEqual(run(current.find(d=>d.id==='01-02')!,'run',0,0),results[1].runs.find(r=>r.id==='01-02'&&r.scenario==='run'&&r.route===0&&r.delay===0),'Mission replay');
const output=process.argv[2]??'docs/reports/gameplay-balance-2026-10-23/experiments.json';
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({baselineRef:ref,method:'60Hz production stepPlayground; four missions, seven named strategies, two authored approach routes, first authored escape, three start delays. No teleport/invulnerability/state forcing. Candidate factors memory-only restored. Deterministic replay assertions.',
 limits:'C only controlled guard fixture; production per-guard exposure age is absent, so no full mission claim. D only departure timing +1s proxy, no stage edits. Bot failure does not establish impossible/unfair route. Suspicion metric sums positive observed changes across guards/cameras, excludes capped gain and may include state assignment; it is not a probability. Chase entries count rising any-guard Chase, not number of individual guards. 90s cap. No human/device/FPS validation.',
 beforeCampaignSha256:crypto.createHash('sha256').update(JSON.stringify(before)).digest('hex'),afterCampaignSha256:crypto.createHash('sha256').update(originalCampaign).digest('hex'),assertions:4,
 candidateC:{name:'C_CONTINUOUS_EXPOSURE_ONLY',definition:'Run multiplier starts after .4s uninterrupted visible exposure and ramps linearly to1.5x at2s; reset outside sight. Fixture stays visible. No production implementation.',equalTime:c,equalDistance:cDistance},results},null,2)+'\n');
console.log(output);
const pct=(n:number)=>`${(n*100).toFixed(2)}%`;
const mean=(rs:ReturnType<typeof run>[],key:'seconds'|'guardSuspicionGain'|'cameraSuspicionGain')=>round(rs.reduce((n,r)=>n+r[key],0)/rs.length);
const lines=[
 '# 이동 밸런스 실험 — 2026-10-23',
 '',
 '## 결론',
 '',
 '프로덕션 탐지 배율 적용을 보류한다. A는 동일 거리 Run 위험 역전을 제거하지만 후반 고정 경로의 성공 창도 줄였다. B는 Sneak/Walk를 낮췄는데도 A보다 이 표본의 완주가 늘지 않는다. C는 짧은 통과 이점을 보존하나 긴 Run 노출은 이미 빠르게 발각되므로 복잡한 누적 상태 추가의 이득이 검증되지 않았다. D는 관찰 타이밍의 중요성을 보여주는 출발 시각 실험이며 맵 재설계 대안의 안전성을 검증한 결과가 아니다.',
 '',
 '## 재현 방법 및 해석',
 '',
 '`node --import tsx tools/performance/gameplayBalanceV1.ts` — 과거 안정화 결과를 덮어쓰지 않는다. Before는 git87f6775의 캠페인, After는 실행 당시 현재 캠페인이다. 양쪽 모두 현재 프로덕션 stepPlayground를 사용하며 이번 수정이 데이터 전용 순찰 보정이라는 전제다. 4미션×7전략×진입경로2×출발0/2/4초=168회/후보, 5비교=840회. 60Hz, 90초 상한, 해당 미션 첫 탈출 경로만 사용한다. D만 출발1/3/5초. 임의 난수·무적·텔레포트·강제 발각을 쓰지 않는다. 메모리상의 튜닝만 일시 변경하고 finally로 원복한다. 캠페인 불변, 튜닝 복원, 제어 실험과 미션 결정성 assertion4개를 실행한다.',
 '',
 'Sneak/Walk/Run은 목표 획득 후에도 같은 gait를 유지한다. Mixed는 현재/한 타일 앞에 시야가 있으면 Sneak, 아니면 Run. Observe는 안전한 곳에서 앞 시야가 열릴 때까지 최대4초 대기하고 노출/획득 뒤 Run. Chase-escape는 Walk로 접근하다 실제 spotted 또는 획득 뒤 Run. Theft-run은 Sneak 접근 후 획득 뒤 Run이다. 이름이 Chase-escape여도 실제 발각이 안 된 실행은 추격 검증으로 세지 않는다.',
 '',
 '시간은 실패/완주까지, 의심도는 모든 경비/카메라의 프레임 간 양의 변화 합이다. 의심도는 확률이 아니며 100% 상한 뒤 gain을 포함하지 않고 Search 등의 상태 대입이 포함될 수 있다. Spotted는 spottedEpisode 상승, Chase는 경비 중 하나라도 Chase로 진입한 묶음의 상승 횟수다. 서로 다른 경비별 진입 수와 다르다. 실패는 실제 caught/contact이며 단순 고정 경로 봇이므로 회피 불가 판정으로 사용하지 않는다.',
 '',
 '## 현재 계약',
 '',
 '실제 속도 Sneak38 / Walk72 / Run150, 경비 배율 .35/.8/1.6, 가까운60unit 안은 최소.7. 연속 실제 속도→gait 보간을 사용한다. 경비 gain=.62×난이도×이동×거리×cone×몸노출. 시야 밖 .5초 기억 뒤 초당.2 감소하되 로컬 조사 중 확인 시간이 끝나야 감소한다. CCTV는 별도 이동계수 .68/1/1.1과 거리·가장자리 약화를 사용한다. 직접 추격168이며 Run150은 평지 직선 경주에서 지속 추격을 떼는 속도가 아니다. 엄폐/시야 단절이 필요하다. Tilt1.75° dead zone /8°max /.07초 smoothing 및 속도는 그대로다.',
 '',
 '## A/B/C/D 비교',
 '',
 '| 후보 | Sneak/Walk/Run 배율 | 같은24unit Sneak/Walk/Run 의심도 | 완주/168 | 적용 |',
 '|---|---|---|---:|---|',
];
for(const v of results){
 lines.push(`|${v.name}|${v.movementFactors.slice(1).join('/')}|${v.controls.equalDistance[0].runs.map(r=>pct(r.finalSuspicion)).join('/')}|${v.runs.filter(r=>r.clear).length}|${v.name==='PATROL_FIX_ONLY'?'순찰 보정만':'오프라인 비교'}|`);
}
lines.push('', 'C는 기본 Run1.6에서 연속 시야 노출.4초 이후 가산을 시작하고2초에1.5배가 된다. 제어된 단일 경비 실험만 실행했다. 경비별 연속 노출 상태를 런타임에 추가해야 하므로 전체 미션 결과는 **미검증**이다. 보이는 모든 경비에게 같은 타이머를 적용하는 부정확한 대리 실험은 사용하지 않았다.',
 '', '### 동일 시간 노출 — 고정 관측점의 입력 gait fixture', '',
 '다음 표는 실제 이동 궤적이 아니라 동일 위치에서 입력 gait만 바꿔 risk 함수 차이를 격리한다. 실제 속도→gait 연결과 가속/추격은 위 전체 미션 시뮬레이션에 포함된다. 누적 gain은 100% 이후도 적분하며 최종 gauge와 구별한다.', '',
 '| 후보 | .3초 Sneak/Walk/Run gain |2초 Sneak/Walk/Run gain|4초 Sneak/Walk/Run gain|Run 첫 Alert|', '|---|---|---|---|---|');
for(const v of results.filter(v=>['PATROL_FIX_ONLY','A_RUN_1_8','B_CURVE'].includes(v.name))){
 lines.push(`|${v.name}|${v.controls.equalTime.map(c=>c.runs.map(r=>pct(r.accumulatedGain)).join('/')).join('|')}|${v.controls.equalTime[2].runs[2].alertAt}s|`);
}
lines.push(`|C 지속노출|${c.map(x=>x.runs.map(r=>pct(r.accumulatedGain)).join('/')).join('|')}|${c[2].runs[2].alertAt}s|`,
 '', '현재 동일 거리 Run/Walk 비용 비는(1.6/150)/(.8/72)=.96. A1.8에서는1.08, B에서는1.152. 수학적 역전 제거가 곧 전체 미션의 공정성 향상은 아니다. C의 .3초 노출은 현재와 같고, 2/4초 누적은 커지지만 첫 Alert는 기존.883초→.85초에 불과하다. 이미100%가 된 이후의 많은 추가 gain은 플레이 경험의 개선 증거가 아니다.',
 '', `C 동일거리24/80unit Run 의심도: ${cDistance.map(d=>pct(d.runs[2].finalSuspicion)).join('/')} — 짧은 횡단의 Run 비용 역전을 해결하지 않는다.`, '', '### CCTV 독립 실험', '',
 '고정 CCTV, 거리180, range400, 120°cone, rate.4, sweep없음. 실제 stepSecurityCameras로24/80unit횡단을 측정했다. 모든 후보에서 CCTV 상수/데이터는 동일하며 결과도 같다.', '',
 '| 거리 | Sneak gain / 시간 | Walk gain / 시간 | Run gain / 시간 |', '|---|---|---|---|');
for(const sample of results[1].controls.cctv)lines.push(`|${sample.distance}|${sample.runs.map(r=>`${pct(r.accumulatedGain)} /${r.seconds}s`).join('|')}|`);
lines.push('', 'CCTV는 현재 구현에서 빠른 횡단이 짧게 노출되는 이점을 갖는다. 경비 Run 배율만 바꾸면 CCTV 위험 곡선은 교정되지 않는다. CCTV까지 함께 강화하면 이번 최소 변경 범위를 넘어 별도 실기기 검증이 필요하다.',
 '', '## 대표 미션별 비교', '',
 '| 후보 | Mission | 완주/42 | 접촉 실패 | Spotted episodes | Chase 진입 | 추격 후 완주 | Chase LOS break |', '|---|---|---:|---:|---:|---:|---:|---:|');
for(const v of results)for(const id of ids){const rs=v.runs.filter(r=>r.id===id);lines.push(`|${v.name}|${id}|${rs.filter(r=>r.clear).length}|${rs.filter(r=>r.caught).length}|${rs.reduce((n,r)=>n+r.spottedEpisodes,0)}|${rs.reduce((n,r)=>n+r.chaseEntries,0)}|${rs.filter(r=>r.clearAfterChase).length}|${rs.reduce((n,r)=>n+r.chaseLosBreaks,0)}|`);}
lines.push('', '### 전략별 Before→After（실제 순찰 보정만）', '',
 '| Mission | 전략 | 완주 Before→After /6 | 평균시간 Before→After | 경비 누적gain Before→After | CCTV 누적gain Before→After |', '|---|---|---|---|---|---|');
for(const id of ids)for(const scenario of scenarios){const b=results[0].runs.filter(r=>r.id===id&&r.scenario===scenario),a=results[1].runs.filter(r=>r.id===id&&r.scenario===scenario);lines.push(`|${id}|${scenario}|${b.filter(r=>r.clear).length}→${a.filter(r=>r.clear).length}|${mean(b,'seconds')}→${mean(a,'seconds')}|${mean(b,'guardSuspicionGain')}→${mean(a,'guardSuspicionGain')}|${mean(b,'cameraSuspicionGain')}→${mean(a,'cameraSuspicionGain')}|`);}
lines.push('', '## 판단 한계 및 다음 검증', '',
 '01-02는 기본 학습 표본, 05-02는 별도 접촉 재현 로그와 함께 판단, 05-03은 경비/CCTV 복합, 08-03은 후반 고압 표본이다. 경비 위상·로컬 조사 때문에 대기 전략이 항상 유리하지 않다. 성공한 고정 Run과 실패한 관찰봇이 함께 존재해도 사람에게 Run만 최적이라고 단정할 수 없다.',
 '',
 'A/B는 선택한 후반 미션의 완주 창을 줄였고 C는 전체 미션 및 UI worklet 상태 검증이 없다. 따라서 **순찰 보정만 적용, 탐지 수치 유지**를 권고한다. 다음 우선순위는 iPhone에서 동일4미션의 짧은 노출 vs 긴 노출, 사람의 관찰 후 이동, 발각 직후 LOS break를 비교하는 것이다. 추격 이후 전체 완주 표본이 적고 의도한 한 번의 코너 회피가 매번 가능함을 보장하지 않는다. 봇의 못 피한 접촉을 불합리한 접촉이라고 분류하지 않았다. 실제 Tilt·FPS·발열·체감 난이도는 미검증이다.',
 '', '검사: performance TypeScript 및 이 도구 ESLint PASS. 실제 전체 suite/빌드는 상위 README 결과를 참조한다. 상세 개별 실행은 experiments.json에 보존한다.');
fs.writeFileSync(path.join(path.dirname(output),'EXPERIMENTS.md'),lines.join('\n')+'\n');
