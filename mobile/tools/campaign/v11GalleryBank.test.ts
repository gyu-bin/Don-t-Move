import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment,buildNavigation,findPath} from '../../src/game/world/navigation';
import {applyV11GalleryBank,V11_GALLERY_BANK_IDS} from './v11GalleryBank';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';
import {pointVisible} from '../../src/game/guards/guardVision';
import {auditV3MuseumGallery} from './v3MuseumGalleryQA';
import {auditV5Geometry} from './v5Geometry';
const source=JSON.parse(fs.readFileSync('docs/design/v12/phase3/SOURCE_STAGES.json','utf8')) as StageDefinition[];
const selected=source.filter(d=>(V11_GALLERY_BANK_IDS as readonly string[]).includes(d.id));
const after=selected.map(applyV11GalleryBank);
const get=(id:string)=>after.find(d=>d.id===id)!;
test('V11 Gallery/Bank pure overlay leaves KEEP maps and later chapters untouched',()=>{
 assert.equal(selected.length,11);
 for(const d of source){const original=JSON.stringify(d),out=applyV11GalleryBank(d);assert.equal(JSON.stringify(d),original,'input mutation '+d.id);
  if(!(V11_GALLERY_BANK_IDS as readonly string[]).includes(d.id))assert.equal(out,d,'KEEP reference '+d.id);
  assert.deepEqual(applyV11GalleryBank(out),out,'idempotence '+d.id);
 }
 assert.equal(applyV11GalleryBank(source.find(d=>d.id==='03-10')!),source.find(d=>d.id==='03-10'));
});
test('Every edited mission retains Guard/CCTV counts, velocity and sensing contracts',()=>{
 for(const d of after){const old=source.find(s=>s.id===d.id)!;
  assert.equal(d.guards.length,old.guards.length,d.id);assert.equal(d.cameras?.length,old.cameras?.length,d.id);
  for(const g of d.guards){const before=old.guards.find(s=>s.id===g.id)!;
   for(const key of ['pace','visionRange','visionHalfAngle'] as const)assert.equal(g[key],before[key],d.id+' '+key);
  }
  assert.deepEqual(d.objective,old.objective,d.id+' objective');assert.deepEqual(d.playerSpawn,old.playerSpawn,d.id+' spawn');
  for(const c of d.cameras??[]){const before=old.cameras!.find(s=>s.id===c.id)!;
   for(const key of ['suspicionRate','range','visionAngle'] as const)assert.equal(c[key],before[key],d.id+' '+key);
  }
  if(!['02-10','03-01'].includes(d.id)){assert.deepEqual(d.layout,old.layout,d.id+' TUNE topology');assert.deepEqual(d.props,old.props,d.id+' TUNE assets');assert.deepEqual(d.exit,old.exit,d.id+' TUNE exit');}
 }
});
test('All eleven compiled player radius18 legs and real Guard search anchors are navigable',()=>{
 for(const d of after)assert.deepEqual(auditV5Geometry(d).issues,[],d.id);
});
test('02-02 effective semantic patrol mirrors the intended spine observation',()=>{
 const d=get('02-02'),g=compileStage(d).guards.find(g=>g.id==='02-02-g1')!;
 assert.equal(g.semanticPatrol,true);assert.equal(g.route[0].look,-Math.PI/2);assert.equal(g.route[0].wait,1.2);
 assert.equal(d.patrolPlan!.anchors.find(a=>a.id==='02-02-g1-0')!.look,g.route[0].look);
});
test('02-10 first escape shoulder uses approved opaque art screen, preserving high-security pickup alarm',()=>{
 const d=get('02-10'),s=compileStage(d),wall=d.props.find(p=>p.kind==='partition'&&p.x===23.2&&p.y===6.7)!;
 assert(wall);assert.equal(wall.visualAssetId,'gallery_white_wall');assert.equal(wall.scale,wall.collisionScale);
 assert.equal(d.objective!.highSecurity,true);
 const breakPoint={x:13.4*TILE,y:6.5*TILE};
 assert(clearSegment(breakPoint.x,breakPoint.y,breakPoint.x,breakPoint.y,s.movementBlockers,18));
 assert(!clearSegment(23.2*TILE,5*TILE,breakPoint.x,breakPoint.y,s.visionBlockers),'opaque screen transmits no LOS');
 for(const c of d.cameras!)assert(!clearSegment(c.x*TILE,c.y*TILE,breakPoint.x,breakPoint.y,s.visionBlockers),c.id);
 assert(d.escapeRoutes![0].points.some(p=>Math.hypot(p.x-13.4,p.y-6.5)<.01));
 assert(!d.escapeRoutes![0].points.some(p=>Math.hypot(p.x-23.2,p.y-7.8)<.01),'safe escape does not backtrack toward custodian');
 assert(d.guards.every(g=>(g.theftSearchSectors?.[0].anchors.length??0)<=3),'local search sectors do not sweep every room');
});
test('03-01 cannot leave directly from teller; staff verification is a physical articulation',()=>{
 const d=get('03-01'),s=compileStage(d),goal=d.objective!,exit=d.exitPosition!;
 assert(Math.hypot(goal.x-exit.x,goal.y-exit.y)>8,'independent dispatch not old 3.16tile free exit');
 const block=[16*TILE,9*TILE,20*TILE,10*TILE];
 const closed={...s,movementBlockers:[...s.movementBlockers,...block]};
 const path=findPath(buildNavigation(closed,18),goal.x*TILE,goal.y*TILE,exit.x*TILE,exit.y*TILE);
 assert(path.length===0||Math.hypot(path.at(-2)!-exit.x*TILE,path.at(-1)!-exit.y*TILE)>.1);
 assert(d.escapeRoutes![0].points.some(p=>p.y>9&&p.y<12));
 const g=s.guards.find(g=>g.id==='03-01-g2')!;assert(g.route.some(p=>p.y>10*TILE),'same custodian visibly inspects staff verification');
});
test('02-06 glass remains BLOCK for movement and PASS for vision',()=>{
 const s=compileStage(get('02-06')),a={x:14*TILE,y:16*TILE},b={x:16*TILE,y:16*TILE};
 assert.equal(clearSegment(a.x,a.y,b.x,b.y,s.movementBlockers,9),false);
 assert.equal(clearSegment(a.x,a.y,b.x,b.y,s.visionBlockers),true);
});

test('02-10 live patrol naturally inspects empty case and also leaves blind windows within45seconds',()=>{
 const d=get('02-10'),stage=compileStage(d),nav=buildNavigation(stage,9),state=createPlaygroundState(stage);
 assert.deepEqual(auditV3MuseumGallery(d).issues,[]);
 let sees=false,blind=false;
 for(let f=0;f<60*45;f++){
  stepGuards(state.guards,{x:-1000,y:-1000,gait:0},stage.visionBlockers,nav,1/60,state.events,f/60,true,1,state.theft);
  const visible=state.guards.some(g=>pointVisible(g,stage.objective.x,stage.objective.y,stage.visionBlockers));
  sees ||=visible;blind ||=!visible;
 }
 assert(sees,'screen must not remove real case inspection');assert(blind,'case must not be permanently watched');
});
