"""Summarize paired, observed outcomes; no inferred successes or human success rates."""
import collections
import json
import pathlib
import statistics
import sys

source = pathlib.Path(sys.argv[1])
out = pathlib.Path(sys.argv[2])
d = json.loads(source.read_text())
groups = collections.defaultdict(list)
for r in d['runs']:
    groups[(r['mission'], r['candidate'])].append(r)


def stats(rows):
    rows = [r for r in rows if r['status'] == 'measured']
    def count(key):
        return sum(r.get(key) is True for r in rows)
    def median(key):
        values = [r[key] for r in rows if r.get(key) is not None]
        return round(statistics.median(values), 3) if values else None
    return dict(n=len(rows), los=sum(r.get('firstLosBreakAt') is not None for r in rows),
                rediscovered=count('rediscovered'), caught=count('caught'), calm=count('calm'),
                survival5=count('survival5'), survival10=count('survival10'), survival60=count('survival60'),
                survival60Unobserved=sum(r.get('survival60') is None for r in rows),
                reinfiltration=count('reinfiltrationPossible'), missionClear=count('missionClear'),
                unresolved=sum(r.get('missionClearStatus') == 'unresolved-budget-exhausted' for r in rows),
                contactEpisodes=sum(r['contactEpisodes'] for r in rows),
                losMedian=median('firstLosBreakAt'), captureMedian=median('caughtAt'),
                rediscoveryMedian=median('firstRediscoveryDelay'), calmMedian=median('calmAt'))


summary = {'settings': d['settings'], 'variants': [], 'paired': [], 'missionEvaluations': [], 'oracle': []}
for (mission, candidate), rows in groups.items():
    summary['variants'].append(dict(mission=mission, candidate=candidate, invalid=sum(r['status'] != 'measured' for r in rows),
                                    **stats(rows), strategies={s: stats([r for r in rows if r['strategy'] == s]) for s in d['settings']['strategies']}))
    if candidate == 'baseline':
        continue
    base = {(r['scenario'], r['strategy']): r for r in groups[(mission, 'baseline')]}
    matches = [(base[(r['scenario'], r['strategy'])], r) for r in rows
               if r['status'] == 'measured' and base[(r['scenario'], r['strategy'])]['status'] == 'measured']
    assert all(a['startHash'] == b['startHash'] for a, b in matches)
    changes = []
    for a, b in matches:
        if any(a.get(k) != b.get(k) for k in ['caught', 'calm', 'reinfiltrationPossible', 'missionClear']):
            changes.append(dict(scenario=b['scenario'], strategy=b['strategy'], before={k: a.get(k) for k in ['caught', 'calm', 'reinfiltrationPossible', 'missionClear']},
                                after={k: b.get(k) for k in ['caught', 'calm', 'reinfiltrationPossible', 'missionClear']}))
    summary['paired'].append(dict(mission=mission, candidate=candidate, n=len(matches),
                                  baseline=stats([a for a, b in matches]), candidateResult=stats([b for a, b in matches]), changes=changes))
for e in d['evaluations']:
    plans, runs = e['plans'], e['runs']
    summary['missionEvaluations'].append(dict(mission=e['mission'], candidate=e['candidate'], plans=len(plans),
        planClear=sum(p['clear'] for p in plans), planUnseen=sum(p['clear'] and p['unseen'] for p in plans),
        planUnresolved=sum(not p['clear'] and p['budgetExhausted'] for p in plans),
        planVector=e['summary']['planVector'], reactive=e['summary']['reactiveClear'],
        reactiveContact=sum(r['outcome'] == 'caught-contact' for r in runs),
        reactiveChase=sum(r['outcome'] == 'caught-in-chase' for r in runs),
        reactiveStuck=sum(r['stuck'] for r in runs), fastest=e['summary']['fastest']))
oracles = collections.defaultdict(list)
valid_starts = {(r['mission'], r['candidate'], r['scenario']): r['status'] == 'measured' for r in d['runs']}
summary['oracleExcludedInvalidStarts'] = []
for r in d['oracles']:
    if not valid_starts[(r['mission'], r['candidate'], r['scenario'])]:
        summary['oracleExcludedInvalidStarts'].append({k: r[k] for k in ['mission', 'candidate', 'scenario']})
        continue
    oracles[(r['mission'], r['candidate'])].append(r)
for (mission, candidate), rows in oracles.items():
    summary['oracle'].append(dict(mission=mission, candidate=candidate, scenarios=len(rows), options=sum(r['options'] for r in rows),
                                  scenariosWithCalm=sum(r['calm'] > 0 for r in rows), calmOptions=sum(r['calm'] for r in rows)))
out.mkdir(parents=True, exist_ok=True)
(out / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
lines = ['# v5 실제 관측 결과', '', '자동화된 시작 조건/전략의 결과이며 인간 성공률이 아니다. 생존60초의 미관측(null)은 성공으로 세지 않는다.', '',
         '| 미션 | 후보 | n | LOS | 재발견 실행 | 체포 | calm | 재잠입 이동 | clear | 미해결 예산 | 접촉 |',
         '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
for r in summary['variants']:
    lines.append('| ' + ' | '.join(str(r[k]) for k in ['mission', 'candidate', 'n', 'los', 'rediscovered', 'caught', 'calm', 'reinfiltration', 'missionClear', 'unresolved', 'contactEpisodes']) + ' |')
lines += ['', '후보별 공통 유효 시작 상태 비교:', '', '| 미션 | 후보 | 공통 n | LOS 전→후 | calm 전→후 | clear 전→후 |', '|---|---|---:|---:|---:|---:|']
for r in summary['paired']:
    a, b = r['baseline'], r['candidateResult']
    lines.append(f"| {r['mission']} | {r['candidate']} | {r['n']} | {a['los']}→{b['los']} | {a['calm']}→{b['calm']} | {a['missionClear']}→{b['missionClear']} |")
lines += ['', '## 미션별·전략별', '', '| 미션 | 후보 | 전략 | n | LOS | 체포 | calm | 재잠입 | clear |', '|---|---|---|---:|---:|---:|---:|---:|---:|']
for r in summary['variants']:
    for name, s in r['strategies'].items():
        lines.append(f"| {r['mission']} | {r['candidate']} | {name} | " + ' | '.join(str(s[k]) for k in ['n','los','caught','calm','reinfiltration','missionClear']) + ' |')
lines += ['', '## 정상 잠입: Planner와 Reactive 별도', '', '| 미션 | 후보 | Planner clear/8 | unseen | 미해결 | Reactive clear/54 | 접촉 체포 | 추격 체포 | stuck |', '|---|---|---:|---:|---:|---|---:|---:|---:|']
for r in summary['missionEvaluations']:
    lines.append('| ' + ' | '.join(str(r[k]) for k in ['mission','candidate','planClear','planUnseen','planUnresolved','reactive','reactiveContact','reactiveChase','reactiveStuck']) + ' |')
lines += ['', '## Escape Oracle(최대24개 단일 달리기 목적지)', '', '| 미션 | 후보 | 시작 상태 | 시도 목적지 | calm 존재 상태 | calm 목적지 |', '|---|---|---:|---:|---:|---:|']
for r in summary['oracle']:
    lines.append('| ' + ' | '.join(str(r[k]) for k in ['mission','candidate','scenarios','options','scenariosWithCalm','calmOptions']) + ' |')
(out / 'TABLES.md').write_text('\n'.join(lines) + '\n')
print(json.dumps({k: summary[k] for k in ['variants','paired','missionEvaluations','oracle']}))
