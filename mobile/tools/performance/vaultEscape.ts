/** Review the single CCTV aim change against identical complete heist inputs. */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import stages from '../../src/game/levels/stages/campaignStages.json';
import {exitCameraWindows} from '../campaign/v13ExitWatchQA';
import {auditDifficulty} from '../campaign/chapterDifficultyAudit';
import {auditMission} from '../campaign/v13FullAudit';
import {coverWindows} from '../campaign/v13CoverWindows';
import {exposureRun} from '../campaign/cameraExposure';
import {heistRun} from '../campaign/v12Phase5Bot';
import {writeReport} from '../campaign/v13QaLib';

const baseline=JSON.parse(fs.readFileSync(process.argv[2],'utf8')) as StageDefinition[];
const comparisons=[];
for(const [name,defs] of [['before',baseline],['after',stages as StageDefinition[]]] as const){
 const def=defs.find(d=>d.id==='09-05')!,runs=[],observers=[];
 for(const approach of [0,1])for(const escape of [0,1])for(const mode of [2,3])for(const delay of [0,4,8,12])
  runs.push({approach,escape,mode,delay,...exposureRun(def,approach,escape,mode,delay)});
 for(const approach of [0,1])for(const delay of [0,4])for(const patience of [3,6])
  observers.push({approach,delay,patience,...heistRun(def,approach,delay,patience)});
 const timedWitnesses=[8.5,9].map(delay=>({approach:1,escape:1,mode:1,delay,...exposureRun(def,1,1,1,delay)}));
 comparisons.push({name,audit:auditMission(def),difficulty:auditDifficulty(def),cameraWindows:exitCameraWindows(def),
  coverWindows:coverWindows(def),fixedClears:runs.filter(r=>r.clear).length,observerClears:observers.filter(r=>r.clear).length,
  timedWitnesses,runs,observers});
 console.log(name,comparisons.at(-1)!.fixedClears,comparisons.at(-1)!.observerClears);
}
writeReport('docs/reports/performance/vault-escape.json',{
 method:'09-05 at baseline26c5024 vs single lower-stair CCTV aim change; same runtime, 60Hz continuous heists. 32 fixed +8 cone-aware runs each; two extra risk/Sneak/alternate-escape witnesses excluded from those counts. Separate 60s stationary camera-only samples are NOT full-heist wins, guaranteed safe crossings, or human times. Existing cover windows use all guards/CCTV for180s.',
 humanPlaytestVerified:false,scope:'09-05 cam2 centre facing only; no geometry, guard patrol/speed, camera gain/range, runtime AI or new render work',comparisons,
});
