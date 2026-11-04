import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {extraDetectionsForMastery} from '../../src/game/progress/chapterOneMastery';
import {composeV13} from './v13Builder';
import {V13_MUSEUM} from './v13Museum';
import {V13_MUSEUM_EXPANSION,MUSEUM_EXPANSION_ARCHETYPES} from './v13MuseumExpansion';
import {auditV124bTopology} from './v124bTopologyQA';
import {emptiness,fakeGaps,placement} from './v13QA';
import {exposureRun} from './cameraExposure';
import {authorCoverCheckpoints} from './v13CoverCheckpoints';
import {polishPatrol} from './v13PatrolPolish';
import {watchExit} from './v13ExitWatch';
import {auditMission} from './v13FullAudit';
import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';

const source=raw as unknown as StageDefinition[];
const archetypes=[...source,...V13_MUSEUM_EXPANSION.map(m=>({
 ...structuredClone(source.find(d=>d.id===MUSEUM_EXPANSION_ARCHETYPES[m.id])!),
 id:m.id,chapter:1,mission:Number(m.id.slice(3)),
}))];
const defs=V13_MUSEUM_EXPANSION.map(m=>composeV13(m,archetypes));
const witnesses=[{closed:8,clean:0},{closed:10,clean:10},{closed:20,clean:4},{closed:5,clean:5},{closed:9,clean:0}];

test('Museum expansion adds five authored IDs and does not clone or mirror an existing Museum map',()=>{
 assert.deepEqual(defs.map(d=>d.id),['01-06','01-07','01-08','01-09','01-10']);
 const maps=V13_MUSEUM_EXPANSION.map(m=>m.map.join('\n'));
 assert.equal(new Set(maps).size,5);
 for(const m of V13_MUSEUM_EXPANSION)for(const old of V13_MUSEUM){
  assert.notEqual(m.map.join('\n'),old.map.join('\n'),`${m.id} duplicates ${old.id}`);
  assert.notEqual(m.map.join('\n'),old.map.map(row=>[...row].reverse().join('')).join('\n'),`${m.id} mirrors ${old.id}`);
 }
});

test('Museum expansion passes physical topology, body-clear lanes and readable placement',()=>{
 for(const [i,d] of defs.entries()){
  assert.deepEqual(auditV124bTopology(d).errors,[],d.id);
  assert.deepEqual(fakeGaps(d),{sealed:[],squeezes:[]},d.id);
  assert(emptiness(d).worst.clearance<=2.8,`${d.id} empty plaza`);
  assert.deepEqual([placement(d,d.playerSpawn),placement(d,d.objective!),placement(d,d.exitPosition!)],V13_MUSEUM_EXPANSION[i].placement,d.id);
  assert(d.guards.length>=2&&d.guards.length<=3,d.id);
  assert((d.cameras?.length??0)<=1,d.id);
  assert.equal(d.guards.filter(g=>g.role==='objective').length,1,d.id);
  assert.equal(d.escapeRoutes?.length,2,d.id);
 }
});

test('Museum expansion differentiates risk thresholds, sculpture cover and final security responsibilities',()=>{
 const floor=(i:number,x:number,y:number)=>V13_MUSEUM_EXPANSION[i].map[y][x]!=='#';
 // Sculpture Court: two three-tile doorways separated by a solid jamb, not a painted choice label.
 assert(floor(1,2,9)&&floor(1,6,9));assert(!floor(1,4,9));
 assert(V13_MUSEUM_EXPANSION[1].structures.some(s=>s.name==='Public Exhibit Island'&&s.kind==='statue'));
 // Final heist: a short left entrance and longer desk-side entrance are physically separate.
 assert(floor(4,2,18)&&floor(4,6,18));assert(!floor(4,4,18));
 assert.equal(defs[4].guards.length,3);assert.equal(defs[4].cameras?.length,1);
});

for(const [i,d] of defs.entries()){
 test(`${d.id}: a real-AI approach and long service escape can complete`,()=>{
  const run=exposureRun(d,0,1,2,witnesses[i].closed);
  assert(run.clear,`${d.id}: ${JSON.stringify(run)}`);
 });
 test(`${d.id}: the clean-escape badge has a reachable real-AI witness`,()=>{
  let evidence:number|undefined;
  const run=exposureRun(d,0,0,2,witnesses[i].clean,s=>{evidence=extraDetectionsForMastery(s.events);});
  assert(run.clear,`${d.id}: ${JSON.stringify(run)}`);
  assert.equal(evidence,0,`${d.id}: scripted witness was additionally detected`);
 });
}

test('Museum camera crossing has a real detection consequence on a different departure',()=>{
 const run=exposureRun(defs[3],1,0,1,9);
 assert(run.cameraAlertAt!==null,'CCTV must actually see and detect a live route');
 assert.equal(run.spottedBy,'01-09-cam1');
 assert(run.caught);
});

test('Actual cover-wrapped Museum expansion patrols naturally discover every empty prize stand',()=>{
 for(const mission of V13_MUSEUM_EXPANSION){
  const def=composeV13(watchExit(polishPatrol(authorCoverCheckpoints(mission))),archetypes);
  const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),state=createPlaygroundState(stage);
  const hidden={x:-10000,y:-20000,gait:0};let t=0;
  const tick=()=>{t+=1/60;stepGuards(state.guards,hidden,stage.visionBlockers,nav,1/60,state.events,t,true,1,state.theft);};
  for(let frame=0;frame<120;frame++)tick();
  assert.equal(state.events.theftWhistleRevision,0,`${def.id}: full prize must not trigger theft`);
  state.theft.empty=true;
  for(let frame=0;frame<60*120&&!state.events.theftAlert;frame++)tick();
  assert(state.events.theftAlert,`${def.id}: no natural empty-case inspection`);
  assert.equal(state.events.theftWhistleRevision,1,def.id);
  assert.equal(state.events.spottedWhistleRevision,0,def.id);
 }
});

for(const id of ['01-07','01-08'])test(`${id}: reviewed waiting-cover additions remove all release-audit findings`,()=>{
 const mission=V13_MUSEUM_EXPANSION.find(m=>m.id===id)!;
 const def=composeV13(watchExit(polishPatrol(authorCoverCheckpoints(mission))),archetypes);
 assert.deepEqual(auditMission(def).issues,[]);
});
