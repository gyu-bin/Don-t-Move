import type {MissionRecord} from './campaignProgress';

/** Geometry revisions invalidate comparable times, not earned progress or badges. */
const REVISED_BENCHMARKS:Readonly<Record<string,number>>={'01-06':2,'01-07':2,'01-08':2};
export interface PreviousMissionBenchmark {revision:number;bestTime?:number;alerts?:number;}
export const missionBenchmarkRevision=(id:string):number|undefined=>Object.hasOwn(REVISED_BENCHMARKS,id)?REVISED_BENCHMARKS[id]:undefined;

const validRevision=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>0;
function previousBenchmark(value:unknown):PreviousMissionBenchmark|undefined {
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;
 const row=value as Record<string,unknown>;if(!validRevision(row.revision))return undefined;
 const result:PreviousMissionBenchmark={revision:row.revision};
 if(typeof row.bestTime==='number'&&Number.isFinite(row.bestTime)&&row.bestTime>0)result.bestTime=row.bestTime;
 if(typeof row.alerts==='number'&&Number.isInteger(row.alerts)&&row.alerts>=0)result.alerts=row.alerts;
 return result.bestTime!==undefined||result.alerts!==undefined?result:undefined;
}

/** Unversioned records belong to the first layout. Archive their numbers once;
 * clear entitlement and explicitly earned mastery remain on the current record. */
export function normalizeMissionBenchmark(id:string,record:MissionRecord,raw:Record<string,unknown>=record as unknown as Record<string,unknown>):MissionRecord {
 const revision=missionBenchmarkRevision(id);if(revision===undefined)return record;
 const archived=previousBenchmark(raw.previousBenchmark);
 const sourceRevision=validRevision(raw.benchmarkRevision)?raw.benchmarkRevision:1;
 const result:MissionRecord={...record,benchmarkRevision:revision};
 delete result.previousBenchmark;
 if(archived)result.previousBenchmark=archived;
 if(sourceRevision!==revision){
  // Keep an existing recovery archive even if malformed/future metadata supplies
  // another number. Unknown revisions are never treated as current benchmarks.
  const old=previousBenchmark({revision:sourceRevision,bestTime:record.bestTime,alerts:record.alerts});
  if(!archived&&old)result.previousBenchmark=old;
  delete result.bestTime;delete result.alerts;
 }
 return result;
}

export function isCurrentMissionBenchmark(id:string,record:MissionRecord|undefined):boolean {
 if(!record||record.legacy)return false;
 const revision=missionBenchmarkRevision(id);
 return revision===undefined||record.benchmarkRevision===revision;
}
