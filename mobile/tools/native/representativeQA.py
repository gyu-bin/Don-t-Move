"""Limited representative native observations: at most two 45-second attempts.
No simulation, game mutation, or success-oriented controller changes.
"""
import json,time
from simulatorPlay import run,OUT

MISSIONS=['01-03','01-08','02-06','03-06','04-03','05-02','06-03','07-02','08-03','09-04']
path=OUT/'representative-results.json'
results=json.loads(path.read_text()) if path.exists() else []
OUT.mkdir(parents=True,exist_ok=True)
for mid in MISSIONS:
 previous=next((item for item in results if item['id']==mid),None)
 if previous and 'verdict' in previous:continue
 item=previous or {'id':mid,'attempts':[],'freeze':'N/A: no timed FREEZE mechanic in current runtime'}
 results=[r for r in results if r['id']!=mid]
 for attempt in range(len(item['attempts'])+1,3):
  print('OPENING',mid,'attempt',attempt,flush=True)
  try:
   log=run(mid,timeout=45)
   samples=log['samples']
   item['attempts'].append({'attempt':attempt,'result':log['result'],'durationWall':log['durationWall'],
    'problem':log.get('problem'),'screenshots':log['screenshots'],
    'nativeLoaded':bool(samples),'playerMoved':len(samples)>1 and any(s['player']['x']!=samples[0]['player']['x'] or s['player']['y']!=samples[0]['player']['y'] for s in samples),
    'guardMoved':len(samples)>1 and any(s['guards']!=samples[0]['guards'] for s in samples),
    'objective':log['final']['mission']['treasure'],'caught':log['final']['events']['caught'],'complete':log['final']['mission']['complete'],
    'final':log['final']})
   if log['result']=='COMPLETE':break
  except Exception as error:
   item['attempts'].append({'attempt':attempt,'result':'TESTLIMITATION','error':str(error)})
   print(mid,'TESTLIMITATION',error,flush=True)
  path.write_text(json.dumps(results+[item],indent=2))
 item['verdict']='OBSERVED_CLEAR' if any(a.get('complete') for a in item['attempts']) else 'TESTLIMITATION: clear not reached within bounded native attempts' if any(a.get('nativeLoaded') for a in item['attempts']) else 'NOT_PLAYED: native menu navigation failed within two attempts'
 results.append(item);path.write_text(json.dumps(results,indent=2))
 print('REPRESENTATIVE_DONE',mid,item['verdict'],flush=True)
