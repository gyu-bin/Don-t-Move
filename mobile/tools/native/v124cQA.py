"""Phase4C actual iPhone17Pro HID attempts. Read-only observer; no state mutation."""
import pathlib,json,sys,hashlib,os
import v12Phase3QA as qa
qa.OUT=pathlib.Path(__file__).resolve().parents[2]/'Reports/V12Phase4C'
qa.OUT.mkdir(parents=True,exist_ok=True)

import time
def open_mission(mid):
 q=qa.qa()
 if q:
  if q['mission']['complete'] or q['events']['caught']:qa.tap('HOME')
  else:
   if not q['paused']:qa.tap('일시 정지')
   qa.tap('HOME')
 if any(e.get('role')=='AXHeading' and e.get('AXLabel') in ['MISSION SELECT','SETTINGS','미션 선택','설정'] for e in qa.ax()):qa.tap('BACK')
 labels=[e.get('AXLabel','')for e in qa.ax()]
 if not any(x in labels for x in ['CHOOSE YOUR NEXT MISSION','다음 임무를 선택하세요']):qa.tap('CHAPTER SELECT')
 def select(prefix):
  for _ in range(20):
   items=[e for e in qa.ax() if (e.get('AXLabel')or'').startswith(prefix) and 'Button' in e.get('traits',[])]
   if not items:raise RuntimeError('card not present '+prefix)
   f=items[0]['frame']
   if f['y']>=165 and f['y']+f['height']<=795:
    qa.tap(f['x']+f['width']/2,f['y']+f['height']/2);time.sleep(.8);return
   down=f['y']>=165
   qa.cmd('idb','ui','swipe','--udid',qa.UDID,'200','700' if down else '330','200','420' if down else '650','--duration','.35');time.sleep(.6)
  raise RuntimeError('card not visible '+prefix)
 select(mid[:2]+' ');select(mid+',')
 for _ in range(25):
  q=qa.qa()
  if q and q.get('missionId')==mid and not q['transitioning']:return q
  time.sleep(.2)
 raise RuntimeError('mission did not open '+mid)
qa.open_mission=open_mission
sourceHash=hashlib.sha256((qa.ROOT/'src/game/levels/stages/campaignStages.json').read_bytes()).hexdigest()
results=[]
for mission in sys.argv[1:]:
 try:
  result=qa.run(mission,mode=os.getenv('QA_APPROACH_MODE','WALK'),timeout=45)
 except Exception as error:
  print(mission,'TEST LIMITATION',str(error),flush=True)
  observed=qa.qa()
  result={'id':mission,'result':'CAUGHT' if observed and observed.get('missionId')==mission and observed['events']['caught'] else 'TEST LIMITATION','error':str(error),'final':observed,'screenshots':[qa.shot(mission,'terminal-observed')]}
 result['campaignSHA256']=sourceHash
 result['attemptCap']=2
 result['playCapSeconds']=45
 result['observerReadOnly']=True
 result['physicalTiltVerified']=False
 results.append(result)
 (qa.OUT/('native-results-'+sys.argv[1]+'.json')).write_text(json.dumps(results,indent=2))
