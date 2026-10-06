"""Phase 5 full-heist attempts on the real iPhone 17 Pro Simulator runtime (native HID taps, DEV telemetry read-only).

The scripted thief waits outside guard/CCTV cones, runs when seen, takes the quick escape and switches to the
secondary route once lockdown is active. Input arrives ~0.4s late compared with a human, so a failure here is
evidence to classify, not a verdict on the level.
Usage: python3 tools/native/v12Phase5QA.py <mission> <safe|risk> [patience_seconds]
"""
import json,math,pathlib,sys,time
import v12Phase3QA as qa

def open_mission(mid):
 """Scroll-safe mission open (same steps as the Phase 4C harness)."""
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
  last=None
  for _ in range(20):
   items=[e for e in qa.ax() if (e.get('AXLabel')or'').startswith(prefix) and 'Button' in e.get('traits',[])]
   if not items:raise RuntimeError('card not present '+prefix)
   f=items[0]['frame']
   if f['y']>=165 and f['y']+f['height']<=795:
    qa.tap(f['x']+f['width']/2,f['y']+f['height']/2);time.sleep(.8);return
   # The last card of a list cannot scroll up into the band: once it stops moving, tap it where it is.
   if last is not None and abs(last-f['y'])<2 and f['y']+f['height']/2<850:
    qa.tap(f['x']+f['width']/2,f['y']+f['height']/2);time.sleep(.8);return
   last=f['y']
   down=f['y']>=165
   qa.cmd('idb','ui','swipe','--udid',qa.UDID,'200','700' if down else '330','200','420' if down else '650','--duration','.35');time.sleep(.6)
  raise RuntimeError('card not visible '+prefix)
 select(mid[:2]+' ')
 # A chapter card that is not the current one is only selected by the first tap; the second tap opens it.
 if not any((e.get('AXLabel')or'').startswith(mid[:2]+'-') for e in qa.ax()):select(mid[:2]+' ')
 select(mid+',')
 for _ in range(25):
  q=qa.qa()
  if q and q.get('missionId')==mid and not q['transitioning']:return q
  time.sleep(.2)
 raise RuntimeError('mission did not open '+mid)
qa.OUT=pathlib.Path(__file__).resolve().parents[2]/'Reports/V12Phase5'
qa.OUT.mkdir(parents=True,exist_ok=True)
DEFS=qa.DEFS

def in_cone(o,pt,margin=1.1,extra=0.2):
 dx,dy=pt[0]-o['x'],pt[1]-o['y'];d=math.hypot(dx,dy)
 if d>o['visionRange']*margin:return False
 if d<30:return True
 a=abs((math.atan2(dy,dx)-o['facing']+math.pi)%(2*math.pi)-math.pi)
 return a<o['visionHalfAngle']+extra

def heist(mid,route='safe',patience=8.0,timeout=150):
 q=open_mission(mid);d=DEFS[mid]
 r=next((x for x in d['testRoutes'] if x['name'].startswith(route)),d['testRoutes'][0])
 approach=[(p['x']*40,p['y']*40) for p in r['points'][1:]]
 quick=[(p['x']*40,p['y']*40) for p in d['escapeRoutes'][0]['points'][1:]]
 alt=[(p['x']*40,p['y']*40) for p in d['escapeRoutes'][1]['points'][1:]]
 log={'id':mid,'source':'iPhone 17 Pro Simulator / native HID touch','route':r['name'],'patience':patience,'started':time.time(),'events':[],'samples':0}
 mode=None;leg=0;eleg=0;secondary=False;waited=0.0;start=time.time();prev=None;lastwall=time.time()
 pickup=theft=spotted=lockdown=first_break=None;seen_post=0.0;wait_total=0.0
 def setmode(m):
  nonlocal mode
  if mode!=m:
   try:qa.tap(m);mode=m
   except RuntimeError:pass
 def goto(q,target):
  z=q['zoom'];cam=q['cam'];p=q['player']
  px=(p['x']-cam['x'])*z;py=(p['y']-cam['y'])*z;dx=(target[0]-cam['x'])*z-px;dy=(target[1]-cam['y'])*z-py;k=1.
  for a,b,lo,hi in[(px,dx,12,390),(py,dy,145,755)]:
   if b>0:k=min(k,(hi-a)/b)
   elif b<0:k=min(k,(lo-a)/b)
  k=max(.05,min(1,k));qa.tap(max(12,min(390,px+dx*k)),max(145,min(755,py+dy*k)))
 q_last=q
 while time.time()-start<timeout:
  q=qa.qa()
  if not q:
   labels=[e.get('AXLabel','')for e in qa.ax()]
   done='CLEAR' if any('MISSION COMPLETE' in x or '미션 완료' in x or '챕터 완료' in x for x in labels) else 'CAUGHT' if any('CAUGHT' in x or '체포' in x or '붙잡' in x for x in labels) else None
   if done:log['result']=done;break
   time.sleep(.2);continue
  now=time.time();dt=now-lastwall;lastwall=now;q_last=q;log['samples']+=1
  ev=q['events'];t=q['time'];p=q['player'];pos=(p['x'],p['y'])
  key=(q['mission']['treasure'],ev['phase'],ev['alerts'],ev.get('lockdown'))
  if key!=prev:log['events'].append({'t':t,'treasure':key[0],'phase':key[1],'alerts':key[2],'lockdown':key[3],'pos':[round(pos[0]),round(pos[1])]});prev=key
  seen=any(g['canSee'] for g in q['guards']) or any(c['canSee'] for c in q['cameras'])
  if q['mission']['treasure'] and pickup is None:pickup=t
  if ev['phase'] in('THEFT_ALERT','SEARCH','PLAYER_SPOTTED') and theft is None and q['mission']['treasure']:theft=t
  if ev['phase']=='PLAYER_SPOTTED' and spotted is None:spotted=t
  if ev.get('lockdown') and lockdown is None:lockdown=t
  if theft is not None and first_break is None and not seen:first_break=round(t-theft,2)
  if seen and q['mission']['treasure']:seen_post+=dt
  if ev['caught']:log['result']='CAUGHT';log['caughtBy']=ev.get('caughtBy');break
  if q['mission']['complete']:log['result']='CLEAR';break
  watchers=q['guards']+q['cameras']
  if not q['mission']['treasure']:
   while leg<len(approach)-1 and math.dist(pos,approach[leg])<8:leg+=1
   tgt=approach[leg];dist=math.dist(pos,tgt) or 1
   ahead=[(pos[0]+(tgt[0]-pos[0])*min(1,k/dist),pos[1]+(tgt[1]-pos[1])*min(1,k/dist)) for k in(40,80)]
   danger=any(in_cone(o,a) for o in watchers for a in ahead)
   if seen:setmode('RUN');goto(q,tgt);waited=0
   elif danger and waited<patience:setmode('IDLE');waited+=dt;wait_total+=dt
   else:
    setmode('WALK' if danger else 'SNEAK');goto(q,tgt)
    if not danger:waited=0
  else:
   setmode('RUN')
   if ev.get('lockdown') and not secondary:
    secondary=True;eleg=min(range(len(alt)),key=lambda i:math.dist(pos,alt[i]))
   path=alt if secondary else quick
   while eleg<len(path)-1 and math.dist(pos,path[eleg])<10:eleg+=1
   m=q['mission'];goto(q,path[eleg] if eleg<len(path)-1 else (m['exitX']+m['exitW']/2,m['exitY']+m['exitH']/2))
  time.sleep(.05)
 else:log['result']='TIMEOUT'
 log.update({'pickupAt':pickup,'theftAt':theft,'spottedAt':spotted,'lockdownAt':lockdown,'firstBreakAfterTheft':first_break,'usedSecondaryEscape':secondary,'seenAfterPickup':round(seen_post,1),'waitSeconds':round(wait_total,1),
  'time':q_last and q_last['time'],'leg':leg,'position':q_last and [q_last['player']['x'],q_last['player']['y']],'durationWall':round(time.time()-start,1)})
 log['screenshot']=qa.shot(mid,'heist-%s-%d'%(route,int(log['started'])))
 out=qa.OUT/'native'/mid;out.mkdir(parents=True,exist_ok=True);(out/('heist-%s-%d.json'%(route,int(log['started'])))).write_text(json.dumps(log,indent=1))
 return log

def replay(mid,name="safe",timeout=110):
 """Replay an offline clearing run (tools/campaign/v12Phase5Bot.ts witness) in the Simulator by game time.
 The same production simulation produced the trace, so guards are in the same places at the same game time;
 only input latency differs."""
 w=json.loads((qa.OUT/'witness'/f'{mid}-{name}.json').read_text());trace=w['trace']
 q=open_mission(mid);names=['IDLE','SNEAK','WALK','RUN'];mode=None;prev=None;lastwall=time.time()
 # Gait buttons are tapped by cached coordinates: a label lookup costs ~1s of game time per switch.
 buttons={e['AXLabel']:(e['frame']['x']+e['frame']['width']/2,e['frame']['y']+e['frame']['height']/2) for e in qa.ax() if e.get('AXLabel') in names}
 start=time.time()
 log={'id':mid,'source':'iPhone 17 Pro Simulator / native HID touch','replayOf':f'{name} witness delay {w["startDelay"]} patience {w["patience"]}','events':[],'started':start,'maxDrift':0}
 pickup=theft=spotted=lockdown=first_break=None;q_last=q;idx=0;stuck=0;lastpos=None
 while time.time()-start<timeout:
  q=qa.qa()
  if not q:
   labels=[e.get('AXLabel','')for e in qa.ax()]
   done='CLEAR' if any('MISSION COMPLETE' in x or '미션 완료' in x or '챕터 완료' in x for x in labels) else 'CAUGHT' if any('CAUGHT' in x or '체포' in x or '붙잡' in x for x in labels) else None
   if done:log['result']=done;break
   time.sleep(.2);continue
  q_last=q;ev=q['events'];t=q['time'];p=q['player']
  key=(q['mission']['treasure'],ev['phase'],ev['alerts'],ev.get('lockdown'))
  if key!=prev:log['events'].append({'t':t,'treasure':key[0],'phase':key[1],'alerts':key[2],'lockdown':key[3],'pos':[round(p['x']),round(p['y'])]});prev=key
  seen=any(g['canSee'] for g in q['guards']) or any(c['canSee'] for c in q['cameras'])
  if q['mission']['treasure'] and pickup is None:pickup=t
  if ev['phase'] in('THEFT_ALERT','SEARCH','PLAYER_SPOTTED') and theft is None and q['mission']['treasure']:theft=t
  if ev['phase']=='PLAYER_SPOTTED' and spotted is None:spotted=t
  if ev.get('lockdown') and lockdown is None:lockdown=t
  if theft is not None and first_break is None and not seen:first_break=round(t-theft,2)
  if ev['caught']:log['result']='CAUGHT';log['caughtBy']=ev.get('caughtBy');break
  if q['mission']['complete']:log['result']='CLEAR';break
  # Follow the recorded path by progress, never by clock alone: the index only advances once the player has
  # actually reached that part of the path, so the pickup and every corner are honoured. Being ahead of the
  # recorded schedule means waiting; being behind means moving one gait faster.
  pos=(p['x'],p['y'])
  # Wedged on a corner by aiming ahead: fall back to the exact recorded point until moving again.
  stuck=stuck+1 if lastpos and math.dist(pos,lastpos)<1.5 and mode not in(None,'IDLE') else 0;lastpos=pos
  while idx<len(trace)-1 and math.dist(pos,(trace[idx]['x'],trace[idx]['y']))<26:idx+=1
  here=trace[idx];log['maxDrift']=max(log['maxDrift'],round(math.dist(pos,(here['x'],here['y']))))
  ahead=here['t']-t
  want=names[here['mode']] if here['mode'] in(1,2,3) else 'SNEAK'
  if ahead>0.6:want='IDLE'
  elif ahead<-2.5:want='RUN'
  elif ahead<-0.4 and want!='RUN':want=names[min(3,names.index(want)+1)]
  if mode!=want:
   if want in buttons:qa.tap(*buttons[want]);mode=want
   else:
    try:qa.tap(want);mode=want
    except RuntimeError:pass
  if want!='IDLE':
   # Aim about a second further along the recorded path so the player keeps moving between polls,
   # but never past a recorded wait (the thief stood still there on purpose).
   j=idx
   while j<min(len(trace)-1,idx+(0 if stuck>=2 else 6)) and trace[j]['mode']!=0:j+=1
   z=q['zoom'];cam=q['cam'];tx,ty=trace[j]['x'],trace[j]['y']
   px=(p['x']-cam['x'])*z;py=(p['y']-cam['y'])*z;dx=(tx-cam['x'])*z-px;dy=(ty-cam['y'])*z-py;k=1.
   for a,b,lo,hi in[(px,dx,12,390),(py,dy,145,755)]:
    if b>0:k=min(k,(hi-a)/b)
    elif b<0:k=min(k,(lo-a)/b)
   k=max(.05,min(1,k));qa.tap(max(12,min(390,px+dx*k)),max(145,min(755,py+dy*k)))
 else:log['result']='TIMEOUT'
 log.update({'pickupAt':pickup,'theftAt':theft,'spottedAt':spotted,'lockdownAt':lockdown,'firstBreakAfterTheft':first_break,'time':q_last and q_last['time'],'offline':w['run']})
 log['screenshot']=qa.shot(mid,'replay-%s-%d'%(name,int(start)))
 out=qa.OUT/'native'/mid;out.mkdir(parents=True,exist_ok=True);(out/('replay-%s-%d.json'%(name,int(start)))).write_text(json.dumps(log,indent=1))
 return log

if __name__=='__main__':
 mid,route=sys.argv[1],sys.argv[2]
 try:
  if len(sys.argv)>3 and sys.argv[3]=='replay':r=replay(mid,route)
  else:r=heist(mid,route,float(sys.argv[3]) if len(sys.argv)>3 else 8.0)
  print(mid,route,r['result'],'t',r['time'],'pickup',r['pickupAt'],'theft',r['theftAt'],'spotted',r['spottedAt'],'firstBreak',r['firstBreakAfterTheft'],'lockdown',r['lockdownAt'],'by',r.get('caughtBy'),'drift',r.get('maxDrift'),flush=True)
  for e in r['events']:print('   ',e,flush=True)
 except Exception as error:
  print(mid,route,'TEST LIMITATION',str(error)[:200],flush=True)
