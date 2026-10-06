"""V13 Phase 1 simulator map review: open a mission on the iPhone 17 Pro Simulator and save a screenshot.

Run Metro with EXPO_PUBLIC_DM_QA_VIEW_TILES=<n> for a whole-map camera. Visual/telemetry review only.
Usage: python3 tools/native/v13MapShot.py <tag> <mission> [<mission> ...]
"""
import pathlib,sys,time
import v12Phase3QA as qa
import v12Phase5QA as p5
OUT=pathlib.Path(__file__).resolve().parents[2]/'Reports/V13Phase1/sim'
OUT.mkdir(parents=True,exist_ok=True)
if __name__=='__main__':
 tag=sys.argv[1]
 for mid in sys.argv[2:]:
  q=p5.open_mission(mid);time.sleep(1.2)
  path=OUT/f'{mid}-{tag}.png';qa.cmd('xcrun','simctl','io',qa.UDID,'screenshot',str(path))
  print(mid,path,'guards',len(q.get('guards',[])),'player',q.get('player'))
