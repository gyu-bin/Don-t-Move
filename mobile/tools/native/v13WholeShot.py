"""Whole-map Simulator captures, cropped to the map.

Metro on 8081 must run with the whole-map camera and a fresh cache (the value is inlined at transform time):
  EXPO_PUBLIC_DM_QA_VIEW_TILES=30 npx expo start --dev-client --port 8081 --clear
Restart it without the variable (and with --clear) afterwards. A second Metro on another port did not work:
the dev client kept loading from 8081.
Usage: python3 tools/native/v13WholeShot.py <out dir> <mission> [<mission> ...]   (add RELAUNCH=1 after a Metro restart)
"""
import os,pathlib,subprocess,sys,time
import v12Phase3QA as qa
import v12Phase5QA as p5
def opened(mid,tries=70):
 for _ in range(tries):
  try:return p5.open_mission(mid)
  except Exception:time.sleep(5)
 raise RuntimeError('could not open '+mid)
if __name__=='__main__':
 out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
 # The display must be awake or the Simulator has no surface to capture ("Timeout waiting for screen surfaces").
 subprocess.Popen(['caffeinate','-u','-d','-t','600'],stdin=subprocess.DEVNULL,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,start_new_session=True)
 if os.environ.get('RELAUNCH'):
  subprocess.run(['xcrun','simctl','terminate',qa.UDID,'com.dontmove.prototype'])
  subprocess.run(['xcrun','simctl','openurl',qa.UDID,'com.dontmove.prototype://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'])
 for mid in sys.argv[2:]:
  opened(mid);time.sleep(2);raw=out/f'sim-{mid}-raw.png'
  qa.cmd('xcrun','simctl','io',qa.UDID,'screenshot',str(raw))
  subprocess.run(['sips','-c','1150','1206','--cropOffset','800','0',str(raw),'--out',str(out/f'sim-{mid}-whole.png')],capture_output=True);raw.unlink()
  subprocess.run(['sips','-Z','900',str(out/f'sim-{mid}-whole.png'),'--out',str(out/f'view-{mid}.png')],capture_output=True)
  print(mid,'captured')
