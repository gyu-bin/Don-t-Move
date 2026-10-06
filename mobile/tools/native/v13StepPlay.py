"""Stepped play in the real Simulator app.

The game runs only while a command executes and is paused between commands, so whoever issues the commands
(a person at a shell, or an agent) decides with the world frozen and then plays the next few seconds for real.
Movement is native HID taps on the touch fallback (TAP TO MOVE); nothing in the game state is written.
Metro must run with the normal camera. Run from tools/native:

  python3 v13StepPlay.py open 03-03                 open the mission, pause, print the state and the authored routes
  python3 v13StepPlay.py go 5.2,11.5 5.2,6.5        walk through the tile points in order, then pause and print
        options: mode=SNEAK|WALK|RUN (default WALK)  max=<seconds> (default 14)
                 seen=stop|ignore (default stop: stop the moment a guard or camera sees the thief)
                 shot=<name> (screenshot at the end of the step, before pausing)
  python3 v13StepPlay.py wait 4                     stand still for 4 seconds (stops early if seen), then pause and print
"""
import json,math,pathlib,sys,time
import v12Phase3QA as qa
import v12Phase5QA as p5
T=40
OUT=pathlib.Path(__file__).resolve().parents[2]/'Reports/V13_PHASE6/play'
def arrow(a):return'→↘↓↙←↖↑↗'[int(round(a/(math.pi/4)))%8]
def state(q,note=''):
 p=q['player'];ev=q['events'];m=q['mission'];px,py=p['x']/T,p['y']/T
 print(f"t={q['time']:.1f}s thief=({px:.1f},{py:.1f}) prize={'YES' if m['treasure'] else 'no'} phase={ev['phase']} alerts={ev['alerts']} lockdown={bool(ev.get('lockdown'))}"
       f"{' CAUGHT by '+str(ev.get('caughtBy')) if ev['caught'] else ''}{' COMPLETE' if m['complete'] else ''} {note}")
 for i,g in enumerate(q['guards']):
  d=math.hypot(g['x']-p['x'],g['y']-p['y'])/T
  print(f"  g{i+1} ({g['x']/T:.1f},{g['y']/T:.1f}) faces {arrow(g['facing'])} {math.degrees(g['facing'])%360:.0f}° dist {d:.1f}{' SEES' if g['canSee'] else ''}{' '+str(g.get('state','')) if g.get('state') else ''}")
 for i,c in enumerate(q['cameras']):
  d=math.hypot(c['x']-p['x'],c['y']-p['y'])/T
  print(f"  cam{i+1} ({c['x']/T:.1f},{c['y']/T:.1f}) faces {arrow(c['facing'])} {math.degrees(c['facing'])%360:.0f}° dist {d:.1f}{' SEES' if c['canSee'] else ''}")
def over():
 labels=[e.get('AXLabel') or '' for e in qa.ax()]
 if any('MISSION COMPLETE' in x or '미션 완료' in x or '챕터 완료' in x for x in labels):return 'COMPLETE'
 if any('CAUGHT' in x or '체포' in x or '붙잡' in x for x in labels):return 'CAUGHT'
 return None
def sample():
 for _ in range(12):
  q=qa.qa()
  if q:return q
  time.sleep(.15)
 return None
def pause():
 q=sample()
 if q and not q['paused']:qa.tap(368,84);time.sleep(.25);q=sample() or q
 return q
def resume():
 q=sample()
 if not q:return None
 if q['paused']:
  for e in qa.ax():
   label=e.get('AXLabel') or ''
   if label.upper().startswith('RESUME') or label.startswith('계속') or label.startswith('재개'):
    f=e['frame'];qa.tap(f['x']+f['width']/2,f['y']+f['height']/2);time.sleep(.2);break
  else:raise RuntimeError('resume button not found: '+', '.join((e.get('AXLabel') or '')[:14] for e in qa.ax() if 'Button' in e.get('traits',[])))
 return sample()
def aim(q,target):
 """Taps toward the target, as far along the line as the play area allows. The touch panel covers the bottom
 middle of the screen: a point under it cannot be tapped, a point beside it (left or right margin) can."""
 z=q['zoom'];cam=q['cam'];p=q['player'];px=(p['x']-cam['x'])*z;py=(p['y']-cam['y'])*z;dx=(target[0]-cam['x'])*z-px;dy=(target[1]-cam['y'])*z-py
 def reach(ymax):
  k=1.
  for a,b,lo,hi in[(px,dx,12,390),(py,dy,150,ymax)]:
   if b>0:k=min(k,(hi-a)/b)
   elif b<0:k=min(k,(lo-a)/b)
  k=max(.05,min(1,k));return px+dx*k,py+dy*k
 x,y=reach(860)
 if y>745 and 58<x<344:x,y=reach(745)
 qa.tap(max(12,min(390,x)),max(150,min(860,y)))
def finish(q,note,shot=None):
 if shot:
  OUT.mkdir(parents=True,exist_ok=True);qa.cmd('xcrun','simctl','io',qa.UDID,'screenshot',str(OUT/(shot+'.png')))
 done=None
 if not q or q['events']['caught'] or q['mission']['complete']:done=over()
 if q and not done:q=pause() or q
 if q:state(q,note)
 if done:print('RESULT',done)
def seen(q):return any(g['canSee'] for g in q['guards']) or any(c['canSee'] for c in q['cameras'])
if __name__=='__main__':
 cmd=sys.argv[1];args=[a for a in sys.argv[2:] if '=' not in a];opt=dict(a.split('=',1) for a in sys.argv[2:] if '=' in a)
 if cmd=='open':
  mid=args[0];q=p5.open_mission(mid);q=pause() or q;d=qa.DEFS[mid]
  print(mid,d['title'],'| objective',d['objective']['x'],d['objective']['y'],'| exit',d['exitPosition']['x'],d['exitPosition']['y'])
  for r in d['testRoutes']+d['escapeRoutes']:print(' ',r['name'][:14].ljust(14),' '.join(f"{p['x']:g},{p['y']:g}" for p in r['points']))
  state(q)
 elif cmd=='wait':
  q=resume();qa.tap('IDLE');end=time.time()+float(args[0]);note='waited'
  while time.time()<end:
   q=sample()
   if not q or q['events']['caught'] or q['mission']['complete']:break
   if seen(q) and opt.get('seen','stop')=='stop':note='SEEN while waiting';break
   time.sleep(.1)
  finish(q,note,opt.get('shot'))
 elif cmd=='go':
  pts=[tuple(float(v)*T for v in a.split(',')) for a in args];mode=opt.get('mode','WALK');limit=float(opt.get('max',14))
  q=resume();qa.tap(mode);start=time.time();i=0;last=0;anchor=(q['player']['x'],q['player']['y'],time.time());note='arrived'
  while True:
   q=sample()
   if not q or q['events']['caught'] or q['mission']['complete']:note='ended';break
   p=(q['player']['x'],q['player']['y'])
   while i<len(pts) and math.dist(p,pts[i])<.45*T:i+=1
   if i>=len(pts):break
   if seen(q) and opt.get('seen','stop')=='stop':note=f'SEEN on the way to point {i+1}';break
   if time.time()-start>limit:note=f'time limit before point {i+1}';break
   if math.dist(p,anchor[:2])>.25*T:anchor=(p[0],p[1],time.time())
   elif time.time()-anchor[2]>2.5:note=f'STUCK at ({p[0]/T:.1f},{p[1]/T:.1f}) going to point {i+1}';break
   if time.time()-last>.45:aim(q,pts[i]);last=time.time()
   time.sleep(.05)
  finish(q,note,opt.get('shot'))
