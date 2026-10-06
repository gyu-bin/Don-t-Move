"""Phase4A actual iPhone17Pro HID attempts. Read-only observer; no state mutation."""
import pathlib,json,sys,hashlib,os
import v12Phase3QA as qa
qa.OUT=pathlib.Path(__file__).resolve().parents[2]/'Reports/V12Phase4A'
qa.OUT.mkdir(parents=True,exist_ok=True)
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
 results.append(result)
 (qa.OUT/('native-results-'+sys.argv[1]+'.json')).write_text(json.dumps(results,indent=2))
