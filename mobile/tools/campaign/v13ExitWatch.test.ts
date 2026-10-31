import {test} from 'node:test';
import assert from 'node:assert/strict';
import stages from '../../src/game/levels/stages/campaignStages.json';
import raw from '../../docs/design/v12/phase4d/SOURCE_STAGES.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createSecurityCamera} from '../../src/game/security/cctv';
import {buildVisionFan,pointVisible} from '../../src/game/guards/guardVision';
import {createDoor,doorBlockers} from '../../src/game/doors/doorSystem';
import {V13_MISSIONS} from './v13Build';
import {V13_VAULT_CH9} from './v13Vault';
import {authorCoverCheckpoints} from './v13CoverCheckpoints';
import {composeV13} from './v13Builder';
import {watchExit} from './v13ExitWatch';
import {exitCameraWindows,VAULT_EXIT_PROBES} from './v13ExitWatchQA';
import {auditDifficulty} from './chapterDifficultyAudit';
import {exposureRun} from './cameraExposure';

const live=(stages as StageDefinition[]).find(d=>d.id==='09-05')!;
const original=authorCoverCheckpoints(V13_VAULT_CH9.find(d=>d.id===live.id)!);
const before=JSON.parse(JSON.stringify(composeV13(original,raw as StageDefinition[]))) as StageDefinition;

test('Vault exit watch changes only the authored camera direction, immutably and repeatably',()=>{
 const saved=structuredClone(original),next=watchExit(original);
 assert.deepEqual(original,saved);assert.deepEqual(watchExit(next),next);
 for(const m of V13_MISSIONS.filter(m=>m.id!==live.id))assert.equal(watchExit(m),m);
 const expected=structuredClone(before),camera=expected.cameras![1];
 const door=expected.doors!.find(d=>d.id==='09-05-door-5')!;
 const facing=Math.atan2(door.y-camera.y,door.x-camera.x);
 camera.centerFacing=facing;
 expected.topologyPlan!.cameras![1].facing=facing;
 assert.deepEqual(live,expected,'no guard, route, collider, prop, sensor range or speed change');
});

test('Vault exit approach is periodically watched but its real wall remains usable cover',()=>{
 const old=exitCameraWindows(before),now=exitCameraWindows(live);
 assert.equal(old[2].visibleFraction,0);
 assert(now[2].visibleFraction>.4&&now[2].visibleFraction<.65);
 assert(now[1].visibleFraction>old[1].visibleFraction);
 assert(now[1].longestUnwatchedSeconds>=1.5,'doorway sweep retains an observation window');
 assert(now[2].longestUnwatchedSeconds>=3,'landing sweep is not permanently watching');
 assert(now[2].stationaryAlertSeconds!==null&&now[2].hasPlayerLocation);
 assert.equal(now[0].visibleFraction,0);assert.equal(now[0].stationaryAlertSeconds,null);
 assert.equal(now[0].hasPlayerLocation,false,'hidden player position never shared by this camera');
 assert.equal(now[3].visibleFraction,0,'final tile alone is not an escape-pressure measurement');
});

test('Exit cover is physical LOS occlusion and a closed solid stair door still blocks CCTV',()=>{
 const s=compileStage(live),camera=createSecurityCamera(s.cameras![1]);
 const closed=doorBlockers(s.doors!.map(d=>createDoor({...d,initialState:d.id==='09-05-door-5'?'CLOSED':'OPEN'})),s.movementBlockers,s.visionBlockers);
 for(const [i,visible] of [[0,false],[2,true]] as const){
  const p=VAULT_EXIT_PROBES[i],x=p.x*TILE,y=p.y*TILE;
  assert(clearSegment(x,y,x,y,s.movementBlockers,BODY.playerRadius),'body fits the actual waiting/peek point');
  camera.facing=Math.atan2(y-camera.y,x-camera.x);
  buildVisionFan(camera,s.visionBlockers);assert.equal(pointVisible(camera,x,y,s.visionBlockers),visible);
  buildVisionFan(camera,[]);assert(pointVisible(camera,x,y,[]),'hidden point is behind a wall, not outside range/cone');
  buildVisionFan(camera,closed.visionBlockers);assert(!pointVisible(camera,x,y,closed.visionBlockers));
 }
 const a=VAULT_EXIT_PROBES[0],b=VAULT_EXIT_PROBES[2];
 assert(clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,s.movementBlockers,BODY.playerRadius),'cover connects to exposed approach without crossing a collider');
});

test('Final Vault keeps its timed full heist while immediate running still fails',()=>{
 for(const delay of [8.5,9]){
  const result=exposureRun(live,1,1,1,delay);
  assert(result.clear&&!result.caught,`risk/Sneak + alternate escape at ${delay}s`);
 }
 const rush=exposureRun(live,1,1,3,0);assert(!rush.clear&&rush.caught);
});

test('Difficulty audit distinguishes exit-centre safety from pressure on both escape routes',()=>{
 const a=auditDifficulty(before),b=auditDifficulty(live);
 assert.equal(a.escapePressure,0);assert.equal(b.escapePressure,0);
 assert(b.escapeRouteExposure>a.escapeRouteExposure);
 assert(b.escapeRouteReadings.every(r=>r.sampleCount>0&&r.exposure!==null&&r.exposure>0&&r.exposure<1));
 assert.equal(b.escapeRouteReadings.length,live.escapeRoutes!.length);
 const weighted=b.escapeRouteReadings.reduce((sum,r)=>sum+r.sampleCount*r.exposure!,0)/b.escapeRouteSampleCount;
 assert(Math.abs(weighted-b.escapeRouteExposure)<.0001);
 const absent=auditDifficulty({...live,escapeRoutes:[]});
 assert(!absent.evidenceComplete&&absent.escapeRouteSampleCount===0);
 const empty=auditDifficulty({...live,escapeRoutes:[{...live.escapeRoutes![0],points:[live.exitPosition!,live.exitPosition!]}]});
 assert(!empty.evidenceComplete&&empty.escapeRouteReadings[0].exposure===null,'zero-length route is missing evidence');
});
