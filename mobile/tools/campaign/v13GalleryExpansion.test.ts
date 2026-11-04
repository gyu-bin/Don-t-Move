import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {V13_GALLERY_EXPANSION,GALLERY_EXPANSION_ARCHETYPES} from './v13GalleryExpansion';
import {V13_GALLERY} from './v13Gallery';
import {composeV13} from './v13Builder';
import {auditV124bTopology} from './v124bTopologyQA';
import {auditMission} from './v13FullAudit';
import {emptiness,fakeGaps} from './v13QA';
import {exposureRun} from './cameraExposure';
import {authorCoverCheckpoints} from './v13CoverCheckpoints';
import {polishPatrol} from './v13PatrolPolish';
import {watchExit} from './v13ExitWatch';
import {extraDetectionsForMastery} from '../../src/game/progress/chapterOneMastery';
import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';

const source=[...raw,...V13_GALLERY_EXPANSION.map((m,i)=>({...structuredClone(raw.find(d=>d.id===GALLERY_EXPANSION_ARCHETYPES[m.id])!),id:m.id,number:51+i,chapter:2,mission:Number(m.id.slice(3))}))] as StageDefinition[];
const plans=V13_GALLERY_EXPANSION.map(m=>watchExit(polishPatrol(authorCoverCheckpoints(m))));
const defs=plans.map(m=>composeV13(m,source));
const delays=[[4,4],[9,9],[4,12],[1,9],[4,5]] as const;

test('Gallery extension adds five distinct authored floor plans, without copying or mirroring an existing Gallery',()=>{
 assert.deepEqual(plans.map(m=>m.id),['02-06','02-07','02-08','02-09','02-10']);
 assert.equal(new Set(plans.map(m=>m.map.join('\n'))).size,5);
 for(const m of plans)for(const old of V13_GALLERY){assert.notEqual(m.map.join('\n'),old.map.join('\n'));assert.notEqual(m.map.join('\n'),old.map.map(r=>[...r].reverse().join('')).join('\n'));}
});

test('Gallery features change physical choices: sculpture island, transparent archive screen, offset alcove and final handling connection',()=>{
 const core=plans[1],archive=defs[2],finale=defs[4];
 assert(core.map.some(r=>/rrr##rrr/.test(r)),'07 has a real central opaque core');
 const glass=archive.props.find(p=>p.kind==='galleryGlassPanelVertical');assert.ok(glass);
 const only=compileStage({...archive,props:[glass]});
 const x=glass.x*40,y=(glass.y-.7*glass.scale!)*40;
 assert(!clearSegment(x-25,y,x+25,y,only.movementBlockers,0),'glass blocks physical crossing');
 assert(clearSegment(x-25,y,x+25,y,only.visionBlockers,0),'glass does not invent opaque hiding');
 assert(!plans[3].map[1].startsWith('#'.repeat(plans[3].map[1].length)),'09 has its offset private alcove');
 assert.deepEqual(finale.topologyPlan!.alternateEscape,['private','quick','handling','loading','exit']);
 assert.equal(plans[4].highSecurity,false,'Gallery theft requires the actual custodian inspection');
});

for(const [i,def] of defs.entries()){
 test(`${def.id}: physical routes, genuine floor gaps, readable density and full release audit`,()=>{
  assert.deepEqual(auditV124bTopology(def).errors,[]);
  assert.deepEqual(fakeGaps(def),{sealed:[],squeezes:[]});
  assert(emptiness(def).worst.clearance<=2.8);
  assert.deepEqual(auditMission(def).issues,[]);
  assert(def.guards.length>=2&&def.guards.length<=3);assert((def.cameras?.length??0)<=1);
 });
 for(const escape of [0,1])test(`${def.id}: clean real-AI ${escape?'alternate':'quick'} full-heist witness`,()=>{
  let evidence:number|undefined;
  const run=exposureRun(def,0,escape,2,delays[i][escape],state=>evidence=extraDetectionsForMastery(state.events));
  assert(run.clear&&!run.caught,JSON.stringify(run));assert.equal(evidence,0);
 });
 test(`${def.id}: full case stays quiet, real empty-case inspection triggers without an automatic alarm`,()=>{
  assert(!def.objective?.highSecurity);
  const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),state=createPlaygroundState(stage);
  assert.equal(state.theft.alarmDelay,undefined);
  const hidden={x:-10000,y:-20000,gait:0};let t=0;
  const tick=()=>{t+=1/60;stepGuards(state.guards,hidden,stage.visionBlockers,nav,1/60,state.events,t,true,1,state.theft);};
  for(let f=0;f<120;f++)tick();assert.equal(state.events.theftWhistleRevision,0);
  state.theft.empty=true;
  for(let f=0;f<60*120&&!state.events.theftAlert;f++)tick();
  assert(state.events.theftAlert,`${def.id}: no natural prize inspection`);
  assert.equal(state.events.theftWhistleRevision,1);assert.equal(state.events.spottedWhistleRevision,0);
 });
}
