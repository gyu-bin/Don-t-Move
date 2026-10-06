import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import stages from '../../levels/stages/campaignStages.json';
import type {StageDefinition} from '../../levels/StageDefinition';
import {compileStage} from '../../world/compileStage';
import {buildNavigation} from '../../world/navigation';
import {createPlaygroundState} from '../../playground/playgroundState';
import {stepGuards} from '../guardSystem';
import {HIGH_SECURITY_ALARM_SECONDS} from '../theftAlert';
import {BODY} from '../guardTuning';
import {Awareness} from '../../core/types';

function setup(id:string,highSecurity?:boolean){
 const live=(stages as unknown as StageDefinition[]).find(s=>s.id===id)!;
 const def=highSecurity===undefined?live:{...live,objective:{...live.objective!,highSecurity}},stage=compileStage(def);
 return {def,stage,nav:buildNavigation(stage,BODY.guardRadius),s:createPlaygroundState(stage)};
}
// The thief is somewhere no guard or camera can see.
const hidden={x:-1000,y:-1000,gait:0};
test('high-security pickup trips Theft Alert after the delay with no witness', () => {
 // No V13 mission (Chapter 1–4) uses the timed alarm any more: every alarm there needs a guard or camera to see
 // the empty stand. The rule itself stays in the engine and is exercised here on a copy of 03-05.
 for(const id of ['02-05','03-05'])assert(!setup(id).def.objective?.highSecurity,id);
 for(const id of ['03-05']){
  const {def,stage,nav,s}=setup(id,true);assert.equal(def.objective?.highSecurity,true,id);
  // Isolate the timed alarm from the separate natural empty-case witness path.
  // New V12 custodians may legitimately inspect before the 1.5s alarm.
  for(const guard of s.guards)guard.visionRange=0;
  s.theft.empty=true;let alertAt=-1;
  for(let f=0;f<60*4;f++){
   stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,f/60,true,1,s.theft);
   if(alertAt<0&&s.events.theftAlert)alertAt=(f+1)/60;
  }
  assert(Math.abs(alertAt-HIGH_SECURITY_ALARM_SECONDS)<0.05,`${id}: alert at ${alertAt}`);
  // Alarm is not a sighting: no global last-known position, no chase.
  assert.equal(s.events.globalAlert,false,id);assert.equal(s.events.sawPlayer,false,id);
  assert(s.guards.every(g=>!g.hasLkp&&!g.canSee),id);
  assert(s.guards.some(g=>g.speed>0),`${id}: guards start their search circuits`);
 }
});
test('standard objectives still need a guard to see the empty case', () => {
 const {def,stage,nav,s}=setup('02-03');assert(!def.objective?.highSecurity);
 // Park every guard far from the case, facing away, with patrol off.
 s.theft.empty=true;
 for(let f=0;f<60*3;f++)stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,f/60,false,1,s.theft);
 assert.equal(s.theft.alarmDelay,undefined);
});

test('renumbered Masterpiece retains its historical four-second Search, ordinary Gallery remains nine',()=>{
 for(const [id,expected] of [['02-05',Awareness.Return],['02-10',Awareness.Return],['02-03',Awareness.Search]] as const){
  const {stage,nav,s}=setup('02-05');s.theft.missionId=id;
  const guard=s.guards[0];guard.awareness=Awareness.Search;guard.stateT=3.95;
  s.events.globalAlert=true;guard.knownRevision=s.events.globalRevision;
  stepGuards(s.guards,hidden,stage.visionBlockers,nav,.1,s.events,4,false,1,s.theft);
  assert.equal(guard.awareness,expected,id);
 }
});
