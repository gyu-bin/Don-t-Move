"""Real Simulator HID play. Reads DEV telemetry; never mutates game state.
All movement is delivered by idb UI taps to the normal native touch responder.
"""
import subprocess,json,time,math,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=ROOT/'Reports/LevelDesignV6'
UDID='2A6F5C91-5CFF-4A9C-9D1F-4F08E725D9A9'
DEFS={d['id']:d for d in json.loads((ROOT/'src/game/levels/stages/campaignStages.json').read_text())}
def cmd(*a):
 r=subprocess.run(a,capture_output=True,text=True,timeout=20)
 if r.returncode: raise RuntimeError(r.stderr or r.stdout)
 return r.stdout

def tap(*args):
 if len(args)==1:
  for _ in range(12):
   try:
    out=cmd('idb','ui','tap','--api','ax','--udid',UDID,str(args[0]));time.sleep(.6);return out
   except RuntimeError:time.sleep(.2)
  raise RuntimeError('native button not found '+str(args))
 out=cmd('idb','ui','tap','--udid',UDID,*map(lambda n:str(round(float(n))),args));time.sleep(.15);return out
def ax():return json.loads(cmd('idb','ui','describe-all','--udid',UDID,'--json'))
def qa():
 for e in ax():
  if (e.get('AXLabel')or'').startswith('NATIVE_QA '):return json.loads(e['AXLabel'][10:])
 return None

def shot(mid,name):
 p=OUT/'native-before'/mid/(name+'.png');p.parent.mkdir(parents=True,exist_ok=True)
 cmd('xcrun','simctl','io',UDID,'screenshot',str(p));return str(p)

def open_mission(mid):
 q=qa()
 if q:
  labels=[e.get('AXLabel','')for e in ax()]
  if q['mission']['complete'] or q['events']['caught']:tap('HOME')
  else:
   if not q['paused']:tap(368,84)
   tap('HOME')
 labels=[e.get('AXLabel','')for e in ax()]
 if any(e.get('role')=='AXHeading' and e.get('AXLabel') in ['MISSION SELECT','SETTINGS'] for e in ax()):tap('BACK')
 labels=[e.get('AXLabel','')for e in ax()]
 if 'CHOOSE YOUR NEXT MISSION' not in labels:tap('CHAPTER SELECT')
 for _ in range(18):
  found=[e for e in ax() if (e.get('AXLabel')or'').startswith(mid[:2]+' ') and 'Button' in e.get('traits',[])]
  if found and 100<found[0]['frame']['y']<760:
   tap(found[0]['AXLabel']);break
  down=not found or found[0]['frame']['y']>760
  cmd('idb','ui','swipe','--udid',UDID,'210','735' if down else '315','210','315' if down else '735','--duration','0.35')
 else:raise RuntimeError('chapter card not found '+mid[:2])
 for _ in range(8):
  found=[e for e in ax() if (e.get('AXLabel')or'').startswith(mid+',')]
  if found and 140<found[0]['frame']['y']<780:
   tap(mid+',');break
  cmd('idb','ui','swipe','--udid',UDID,'210','735','210','315','--duration','0.35')
 else:raise RuntimeError('mission card not found '+mid)
 for _ in range(15):
  q=qa()
  if q and q.get('missionId')==mid and not q['transitioning']:return q
  time.sleep(.2)
 raise RuntimeError('mission did not open '+mid)

def run(mid,route=None,mode='SNEAK',timeout=45):
 q=open_mission(mid);d=DEFS[mid]
 routes=d['testRoutes'];r=next((x for x in routes if x['name'].startswith(route or 'safe')),routes[0])
 pts=r['points'][1:]+d['escapeRoutes'][0]['points'][1:]
 pts=[(p['x']*40,p['y']*40)for p in pts]
 log={'id':mid,'source':'iPhone 17 Pro / iOS27 / native HID touch','route':r['name'],'inputMode':mode,'started':time.time(),'samples':[],'screenshots':[]}
 log['screenshots'].append(shot(mid,'spawn'));tap(mode)
 leg=0;last_tap=0;last_shot=0;start=time.time();lastpos=(q['player']['x'],q['player']['y']);stuck=0
 while time.time()-start<timeout:
  q=qa()
  if not q:
   labels=[e.get('AXLabel','')for e in ax()]
   if 'CAUGHT' in labels or 'MISSION COMPLETE' in labels:
    q=log['samples'][-1];q=json.loads(json.dumps(q));q['events']['caught']='CAUGHT' in labels;q['mission']['complete']='MISSION COMPLETE' in labels;log['resultEvidence']=labels;break
   raise RuntimeError('native observation missing')
  if q.get('missionId')!=mid or abs(time.time()*1000-q.get('sampleWallMs',0))>5000:raise RuntimeError('wrong/stale native observation')
  log['samples'].append(q)
  if len(log['samples'])%20==0:print(mid,'native',q['time'],'leg',leg,'xy',q['player']['x'],q['player']['y'],flush=True)
  p=q['player'];pos=(p['x'],p['y'])
  if q['mission']['treasure'] and not any('objective' in x for x in log['screenshots']):log['screenshots'].append(shot(mid,'objective'));tap('RUN')
  if q['events']['caught'] or q['mission']['complete']:break
  while leg<len(pts) and math.dist(pos,pts[leg])<8:leg+=1
  if leg>=len(pts):
   # Enter actual exit body after final authored waypoint.
   m=q['mission'];target=(m['exitX']+m['exitW']/2,m['exitY']+m['exitH']/2)
  else:target=pts[leg]
  if time.time()-last_shot>12:
   log['screenshots'].append(shot(mid,'leg-%02d-%03d'%(leg,q['time'])));last_shot=time.time()
  near=[g for g in q['guards'] if math.dist(pos,(g['x'],g['y']))<75 and math.dist(target,(g['x'],g['y']))<math.dist(pos,(g['x'],g['y']))]
  if near and not q['mission']['treasure']:
   tap('IDLE');time.sleep(.5);stuck=0;lastpos=pos;continue
  elif q['playerMode']==0:tap(mode if not q['mission']['treasure'] else 'RUN')
  if time.time()-last_tap>.4:
   z=q['zoom'];cam=q['cam'];sx=(target[0]-cam['x'])*z;sy=(target[1]-cam['y'])*z
   # Stay inside native gameplay area, outside header and gait buttons.
   px=(pos[0]-cam['x'])*z;py=(pos[1]-cam['y'])*z
   dx,dy=sx-px,sy-py;k=1.
   for a,b,lo,hi in[(px,dx,12,390),(py,dy,145,730)]:
    if b>0:k=min(k,(hi-a)/b)
    elif b<0:k=min(k,(lo-a)/b)
   k=max(.05,min(1,k));tap(max(12,min(390,px+dx*k)),max(145,min(730,py+dy*k)));last_tap=time.time()
  stuck=stuck+1 if math.dist(pos,lastpos)<.8 else 0;lastpos=pos
  if stuck>25:log['problem']='collision/route stall at leg '+str(leg);break
  time.sleep(.15)
 log['final']=q;log['leg']=leg;log['durationWall']=time.time()-start
 log['result']='COMPLETE' if q['mission']['complete'] else 'CAUGHT' if q['events']['caught'] else 'INCOMPLETE'
 log['screenshots'].append(shot(mid,log['result'].lower()))
 p=OUT/'native-before'/mid/('play-'+str(int(log['started']))+'.json');p.write_text(json.dumps(log,indent=2));print(mid,log['result'],'leg',leg,'time',q['time'],flush=True)
 return log
if __name__=='__main__':
 failed=False
 for mid in sys.argv[1:]:
  try:failed=run(mid)['result']!='COMPLETE' or failed
  except Exception as e:print(mid,'ERROR',str(e),flush=True);sys.exit(2)
 sys.exit(1 if failed else 0)
