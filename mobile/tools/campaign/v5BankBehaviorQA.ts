/** Continuous input-only probes, never force an alert or teleport a player. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {BANK_PRODUCTION} from './bankProductionDesign';
import {runV5BankMission} from './v5BankReplay';
export function bankV5BehaviorQA(){return BANK_PRODUCTION.map(def=>{
 const attempts:ReturnType<typeof runV5BankMission>[]=[],errors:string[]=[];
 let spottedLos:ReturnType<typeof runV5BankMission>|null=null,theftEscape:ReturnType<typeof runV5BankMission>|null=null;
 outer:for(const mode of[3,2,1])for(const route of[0,1,2])for(const delay of[0,4,9,16,24])for(const objectiveHold of[0,2]){
 const r=runV5BankMission(def,{route,escape:0,mode,delay,objectiveHold});attempts.push(r);
 if(r.spottedAt!==null&&r.losBreak&&!spottedLos)spottedLos=r;
 if(r.clear&&r.theftAt!==null&&!theftEscape)theftEscape=r;
 if(spottedLos&&theftEscape)break outer;
 }
 if(!theftEscape&&def.mission===10){outer:for(const mode of[1,2,3])for(const route of[0,1,2])for(const delay of[0,2,4,6,9,12,16,20,24])for(const seconds of[2,4,8,12,16,24,32]){const r=runV5BankMission(def,{route,escape:0,mode,delay,zoneWait:{zone:'East Cash Service',seconds}});attempts.push(r);if(r.clear&&r.theftAt!==null){theftEscape=r;break outer;}}}
 if(!spottedLos&&def.mission!<=2){const loop=def.mission===1?[{x:11.5,y:6},{x:11.5,y:9.3},{x:6.5,y:9.3},{x:6.5,y:6},{x:11.5,y:6}]:[{x:20,y:8.5},{x:20,y:4.5},{x:10,y:4.5},{x:10,y:8.5}];outer:for(const mode of[1,2,3])for(const route of[0,1,2])for(const delay of[0,2,4,6,9,12,16,20,24]){try{const r=runV5BankMission(def,{route,mode,delay,escape:0,inputDetour:loop});attempts.push(r);if(r.spottedAt!==null&&r.losBreak){spottedLos=r;break outer;}}catch(e){errors.push(String(e));break outer;}}}
 if(!spottedLos)outer:for(let cameraIndex=0;cameraIndex<(def.cameras?.length??0);cameraIndex++)for(const route of[0,1,2])for(const delay of[0,9,24]){try{const r=runV5BankMission(def,{route,escape:0,mode:2,delay,cameraDetour:{cameraIndex,cycles:80}});attempts.push(r);if(r.spottedAt!==null&&r.losBreak){spottedLos=r;break outer;}}catch(e){errors.push(String(e));}}
 return{id:def.id,sourceSha256:createHash('sha256').update(JSON.stringify(def)).digest('hex'),native:false,spottedLos,theftEscape,attempts,errors};
 });}
if(process.argv[1]?.endsWith('v5BankBehaviorQA.ts')){const out=bankV5BehaviorQA();fs.writeFileSync('Reports/LevelDesignV5/bank-behavior-qa.json',JSON.stringify(out,null,2));console.log(out.map(r=>({id:r.id,spottedLos:!!r.spottedLos,spottedClear:r.spottedLos?.clear,theftEscape:!!r.theftEscape,attempts:r.attempts.length})));}
