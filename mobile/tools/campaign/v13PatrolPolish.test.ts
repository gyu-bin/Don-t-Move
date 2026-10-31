import {test} from 'node:test';
import assert from 'node:assert/strict';
import stages from '../../src/game/levels/stages/campaignStages.json';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createGuardState,createGuardEvents} from '../../src/game/guards/guardBrain';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {V13_CASINO} from './v13Casino';
import {V13_MANSION} from './v13Late';
import {V13_MISSIONS} from './v13Build';
import {authorCoverCheckpoints} from './v13CoverCheckpoints';
import {polishPatrol,PATROL_POLISH} from './v13PatrolPolish';
import {composeV13} from './v13Builder';
import {exposureRun} from './cameraExposure';
import {KNOWN} from './v13FullAudit';

test('Patrol polish is local, immutable and repeatable; geometry, perception and speed are preserved',()=>{
 assert.deepEqual(Object.keys(PATROL_POLISH),['05-02','06-01']);
 for(const original of [...V13_CASINO,...V13_MANSION]){
  const base=authorCoverCheckpoints(original),copy=structuredClone(base),after=polishPatrol(base);
  assert.deepEqual(base,copy);
  assert.deepEqual(polishPatrol(after),after);
  if(!PATROL_POLISH[base.id]){assert.equal(after,base);continue;}
  const before=JSON.parse(JSON.stringify(composeV13(base,raw as StageDefinition[]))) as StageDefinition,live=(stages as StageDefinition[]).find(s=>s.id===base.id)!;
  for(const key of Object.keys(before) as (keyof StageDefinition)[])if(!['guards','patrolRoutes','topologyPlan'].includes(key))assert.deepEqual(live[key],before[key],`${base.id}/${key}`);
  for(const key of Object.keys(before.topologyPlan!))if(!['patrols','objectiveStops'].includes(key))assert.deepEqual((live.topologyPlan as unknown as Record<string,unknown>)[key],(before.topologyPlan as unknown as Record<string,unknown>)[key],key);
  assert.equal(live.guards.length,before.guards.length);
  live.guards.forEach((g,i)=>{for(const key of ['x','y','pace','visionRange','visionHalfAngle','role','theftRole'] as const)assert.equal(g[key],before.guards[i][key],`${base.id}/g${i}/${key}`);});
 }
 for(const m of V13_MISSIONS.filter(m=>!PATROL_POLISH[m.id]))assert.equal(polishPatrol(m),m);
});

for(const fps of [30,60,120])test(`Casino repaired patrol keeps full body clearance for 5 minutes at ${fps}Hz`,()=>{
 const def=(stages as StageDefinition[]).find(s=>s.id==='05-02')!,s=compileStage(def),nav=buildNavigation(s,BODY.guardRadius);
 const guards=s.guards.map(createGuardState),events=createGuardEvents();
 const reached=new Set<number>();
 for(let f=0;f<fps*300;f++){
  const previous=guards.map(g=>({x:g.x,y:g.y}));
  stepGuards(guards,{x:-10000,y:-10000,gait:0},s.visionBlockers,nav,1/fps,events,f/fps,true);
  guards.forEach((g,i)=>assert(clearSegment(previous[i].x,previous[i].y,g.x,g.y,nav.blockers,BODY.guardRadius),`${g.id} at ${f/fps}s`));
  const g=guards[3];g.route.forEach((p,i)=>{if(p.wait>0&&Math.hypot(g.x-p.x,g.y-p.y)<2)reached.add(i);});
 }
 assert.equal(reached.size,guards[3].route.filter(p=>p.wait>0).length,'not merely collision-free because the guard stopped');
 assert.deepEqual(KNOWN,{},'no accepted corner collision exception');
});

test('Mansion north inspection interrupts blind sprint but preserves walking and timed running heists',()=>{
 const def=(stages as StageDefinition[]).find(s=>s.id==='06-01')!;
 let caughtBy='';
 const careless=exposureRun(def,0,0,3,0,s=>{caughtBy=s.events.caughtBy;});
 assert(careless.caught&&!careless.clear&&caughtBy==='06-01-g1','actual contact on the north crossing');
 for(const [mode,delay] of [[2,0],[3,4]]){
  const timed=exposureRun(def,0,0,mode,delay);assert(timed.clear&&!timed.caught);
 }
});
