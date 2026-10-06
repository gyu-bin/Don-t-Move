"""Native confirmed-theft/door observation through normal HID input only."""
import sys,time,json,math,hashlib,os
import v12Phase3QA as qa
qa.OUT=qa.ROOT/'Reports/V12Phase4A'
mid=sys.argv[1];stage=qa.DEFS[mid];mode=os.getenv('QA_APPROACH_MODE','WALK')
log={'id':mid,'source':'actual iPhone17Pro native HID / read-only observer','campaignSHA256':hashlib.sha256((qa.ROOT/'src/game/levels/stages/campaignStages.json').read_bytes()).hexdigest(),'samples':[],'screenshots':[]}
def aim(q,target):
 p=q['player'];z=q['zoom'];cam=q['cam'];px=(p['x']-cam['x'])*z;py=(p['y']-cam['y'])*z
 dx=(target[0]-p['x'])*z;dy=(target[1]-p['y'])*z;k=1.
 for a,b,lo,hi in [(px,dx,12,390),(py,dy,145,755)]:
  if b>0:k=min(k,(hi-a)/b)
  elif b<0:k=min(k,(lo-a)/b)
 k=max(.05,min(1,k));qa.tap(max(12,min(390,px+dx*k)),max(145,min(755,py+dy*k)))
try:
 q=qa.open_mission(mid);qa.tap(mode);start=time.time();leg=1
 route=next(r for r in stage['testRoutes'] if r['name'].startswith('safe'))['points']
 points=[(p['x']*40,p['y']*40)for p in route];hidden=(stage['safeZones'][1]['x']*40,stage['safeZones'][1]['y']*40)
 last=0;hold=False;closed=False
 while time.time()-start<85:
  q=qa.qa()
  if not q or q['missionId']!=mid:raise RuntimeError('read-only observer unavailable')
  log['samples'].append(q)
  if q['events']['caught'] or q['mission']['complete']:break
  pos=(q['player']['x'],q['player']['y'])
  if q['mission']['treasure']:
   if not any('pickup' in p for p in log['screenshots']):log['screenshots'].append(qa.shot(mid,'lockdown-pickup'))
   target=hidden
   if math.dist(pos,hidden)<8:
    if not hold:qa.tap('IDLE');hold=True
    doors=q.get('doors',[])
    if any(d['state']=='CLOSING' for d in doors) and not any('closing' in p for p in log['screenshots']):log['screenshots'].append(qa.shot(mid,'lockdown-closing'))
    if any(d['state']=='CLOSED' for d in doors):
     log['screenshots'].append(qa.shot(mid,'lockdown-closed'));closed=True;break
    time.sleep(.2);continue
  else:
   while leg<len(points) and math.dist(pos,points[leg])<8:leg+=1
   target=points[min(leg,len(points)-1)]
   near=[g for g in q['guards'] if math.dist(pos,(g['x'],g['y']))<85 and math.dist(target,(g['x'],g['y']))<math.dist(pos,(g['x'],g['y']))]
   if near:
    if q['playerMode']!=0:qa.tap('IDLE')
    time.sleep(.3);continue
   if q['playerMode']==0:qa.tap(mode)
  if time.time()-last>.4:aim(q,target);last=time.time()
  time.sleep(.15)
 log['final']=q;log['closedObserved']=closed
 log['result']='CLOSED OBSERVED' if closed else 'CAUGHT' if q['events']['caught'] else 'TEST LIMITATION'
except Exception as error:
 log['error']=str(error);q=qa.qa();log['final']=q;log['result']='CAUGHT' if q and q['events']['caught'] else 'TEST LIMITATION'
log['screenshots'].append(qa.shot(mid,'lockdown-terminal'))
(qa.OUT/'native'/mid/'lockdown-observation.json').write_text(json.dumps(log,indent=2));print(mid,log['result'],log.get('error',''),flush=True)
