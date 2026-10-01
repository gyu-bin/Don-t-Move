import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {StageDefinition} from '../../levels/StageDefinition';
import {compileStage} from '../../world/compileStage';
import {buildNavigation,clearSegment} from '../../world/navigation';
import {BODY} from '../../guards/guardTuning';
import {createPlaygroundState} from '../../playground/playgroundState';
import {stepGuards} from '../../guards/guardSystem';
import {theftSearchPosts,SECURITY_CORE_REACTION_SECONDS} from '../../guards/theftAlert';
function fixture(){const def:StageDefinition={id:'global-security-search',number:0,title:'Theft sectors',theme:'bank',lights:[],props:[],
 layout:Array.from({length:18},(_,y)=>Array.from({length:24},(_,x)=>x===0||x===23||y===0||y===17?'#':'.').join('')),
 playerSpawn:{x:3,y:15,facing:0},guards:[
 {id:'objective',x:8,y:8,facing:0,theftRole:'objective',routeId:'a',theftSearchSectors:[{id:'objective-sector',anchors:[{x:8,y:8},{x:11,y:8}]},{id:'junction-sector',anchors:[{x:11,y:5},{x:8,y:5}]}]},
 {id:'exit',x:16,y:13,facing:0,theftRole:'exit',routeId:'b',theftSearchSectors:[{id:'exit-sector',anchors:[{x:16,y:13},{x:19,y:13}]},{id:'staff-sector',anchors:[{x:19,y:9},{x:16,y:9}]}]}],
 patrolRoutes:[{id:'a',mode:'loop',points:[{x:8,y:8},{x:9,y:8}]},{id:'b',mode:'loop',points:[{x:16,y:13},{x:17,y:13}]}],objective:{x:11,y:8,kind:'vaultGem'},exit:{x:3,y:15,w:1,h:1}};
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),state=createPlaygroundState(stage);
 state.theft.empty=true;state.events.theftAlert=true;state.events.theftActivatedAt=0;
 return{def,stage,nav,state};}
test('Theft search advances all distinct semantic sectors and cycles without returning to original patrol',()=>{
 const f=fixture(),visited=f.state.guards.map(()=>new Set<string>());
 for(let frame=0;frame<120*60;frame++){
  stepGuards(f.state.guards,{x:-1000,y:-1000,gait:0},f.stage.visionBlockers,f.nav,1/60,f.state.events,frame/60,true,1,f.state.theft);
  f.state.guards.forEach((guard,i)=>{
   assert(clearSegment(guard.x,guard.y,guard.x,guard.y,f.stage.movementBlockers,BODY.guardRadius));
   for(const sector of f.state.theft.sectors![i])for(const anchor of sector.anchors)if(Math.hypot(guard.x-anchor.x,guard.y-anchor.y)<10)visited[i].add(sector.id);
  });
 }
 assert.deepEqual(visited.map(v=>v.size),[2,2]);assert(f.state.guards.every(g=>g.searchIndex>8));
 assert.equal(f.state.events.globalAlert,false);assert.equal(f.state.events.globalRevision,0);assert(f.state.guards.every(g=>!g.hasLkp));
 assert.notDeepEqual(theftSearchPosts(f.state.theft,0,[]),theftSearchPosts(f.state.theft,1,[]));
});
test('Hidden-player coordinates cannot affect theft routing, reassignment, target, or global LKP',()=>{
 const a=fixture(),b=fixture();
 for(let frame=0;frame<30*60;frame++){
  for(const [f,p] of [[a,{x:-1000,y:-1000,gait:0}],[b,{x:20000,y:20000,gait:3}]] as const)stepGuards(f.state.guards,p,f.stage.visionBlockers,f.nav,1/60,f.state.events,frame/60,true,1,f.state.theft);
 }
 assert.deepEqual(a.state.guards.map(g=>[g.x,g.y,g.targetX,g.targetY,g.searchIndex]),b.state.guards.map(g=>[g.x,g.y,g.targetX,g.targetY,g.searchIndex]));
 assert.equal(a.state.events.globalRevision,0);assert.equal(b.state.events.globalRevision,0);
});
test('Security Core retains its 0.85-second authored-role reaction even with search sectors',()=>{
 const f=fixture();f.state.theft.missionId='01-08';f.state.events.theftActivatedAt=0;const start=f.state.guards.map(g=>[g.x,g.y]);
 stepGuards(f.state.guards,{x:-1000,y:-1000,gait:0},f.stage.visionBlockers,f.nav,.1,f.state.events,SECURITY_CORE_REACTION_SECONDS-.1,true,1,f.state.theft);
 assert.deepEqual(f.state.guards.map(g=>[g.x,g.y]),start);assert.deepEqual(f.state.theft.roles,['objective','exit']);
});
