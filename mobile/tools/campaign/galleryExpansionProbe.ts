/** Read-only Gallery difficulty evidence: real shared-runtime routes, no immunity, teleports or altered perception. */
import fs from 'node:fs';
import {V13_MISSIONS,V13_SECURITY_SOURCE} from './v13Build';
import {composeV13} from './v13Builder';
import {exposureRun} from './cameraExposure';
import {extraDetectionsForMastery} from '../../src/game/progress/chapterOneMastery';
import {auditMission} from './v13FullAudit';
import {emptiness,fakeGaps} from './v13QA';

const reference:Record<string,[number,number]>={'02-06':[4,4],'02-07':[9,9],'02-08':[4,12],'02-09':[1,9],'02-10':[4,5]};
const rows=V13_MISSIONS.filter(m=>m.id in reference).map(m=>{
 const def=composeV13(m,V13_SECURITY_SOURCE);
 const run=(approach:number,escape:number,mode:number,delay:number)=>{
  let evidence:number|undefined,lockdownObserved=false,theftObserved=false;
  const result=exposureRun(def,approach,escape,mode,delay,state=>{
   evidence=extraDetectionsForMastery(state.events);lockdownObserved ||= state.events.lockdownActive;theftObserved ||= state.events.theftAlert;
  });
  return {approach,escape,mode,delay,...result,extraDetectionEvidence:evidence,lockdownObserved,theftObserved};
 };
 const windows=[0,1].map(escape=>{
  const middle=reference[m.id][escape];
  return {escape,reference:middle,samples:[-1,-.5,-.25,-.1,0,.1,.25,.5,1,1.5,2].filter(d=>middle+d>=0).map(d=>run(0,escape,2,middle+d))};
 });
 const careless=[0,1].flatMap(approach=>[0,1,2,3].map(delay=>run(approach,0,3,delay)));
 const row={id:m.id,method:'Offline production shared 60Hz runtime. Fixed authored input, actual guard/CCTV/capture, no immunity or teleport. Does not certify human difficulty or device FPS.',audit:auditMission(def),emptiness:emptiness(def),gaps:fakeGaps(def),windows,careless};
 console.log(m.id,'clean delay samples',windows.map(w=>({escape:w.escape,delays:w.samples.filter(s=>s.clear&&!s.caught&&s.extraDetectionEvidence===0).map(s=>s.delay)})),'careless caught',careless.filter(r=>r.caught).length,'of',careless.length);
 return row;
});
const target=process.env.GALLERY_QA_OUTPUT??'/private/tmp/dm-gallery-difficulty-evidence.json';
fs.writeFileSync(target,JSON.stringify(rows,null,2)+'\n');
console.log(target);
