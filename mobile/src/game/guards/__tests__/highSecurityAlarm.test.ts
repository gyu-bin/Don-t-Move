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

function setup(id:string){
 const def=(stages as unknown as StageDefinition[]).find(s=>s.id===id)!,stage=compileStage(def);
 return {def,stage,nav:buildNavigation(stage,BODY.guardRadius),s:createPlaygroundState(stage)};
}
// The thief is somewhere no guard or camera can see.
const hidden={x:-1000,y:-1000,gait:0};
test('high-security pickup trips Theft Alert after the delay with no witness', () => {
 for(const id of ['02-10','03-10']){
  const {def,stage,nav,s}=setup(id);assert.equal(def.objective?.highSecurity,true,id);
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
 const {def,stage,nav,s}=setup('02-08');assert(!def.objective?.highSecurity);
 // Park every guard far from the case, facing away, with patrol off.
 s.theft.empty=true;
 for(let f=0;f<60*3;f++)stepGuards(s.guards,hidden,stage.visionBlockers,nav,1/60,s.events,f/60,false,1,s.theft);
 assert.equal(s.theft.alarmDelay,undefined);
});
