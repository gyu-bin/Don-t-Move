import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {StageDefinition} from '../../levels/StageDefinition';
import {createPlaygroundState,stepPlayground} from '../../playground/playgroundState';
import {compileStage,TILE} from '../../world/compileStage';
import {buildNavigation,clearSegment,findPath} from '../../world/navigation';
import {BODY} from '../../guards/guardTuning';
import {navigationWithDoors} from '../doorNavigation';
import {createDoor,doorBlockers} from '../doorSystem';
import {ESCAPE_TIMER_SECONDS} from '../../guards/guardPhase';

const def:StageDefinition={
 id:'door-fixture',number:1,title:'Door fixture',theme:'museum',chapter:1,
 layout:['############','#..........#','#..........#','#..........#','#..........#','#..........#','#..........#','############'],
 props:[],lights:[],guards:[],patrolRoutes:[],playerSpawn:{x:2,y:4,facing:0},
 doors:[{id:'quick',type:'solid',x:6,y:4,width:3,thickness:.2,orientation:'vertical',closeDuration:.6,lockdownBehavior:'close'},
 {id:'service',type:'glass',x:9,y:4,width:1,thickness:.2,orientation:'vertical',lockdownBehavior:'stayOpen'}],
 lockdownDoors:['quick'],
};
function setup(definition=def){
 const stage=compileStage(definition),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);s.playerMode=0;
 const tick=(dt:number)=>stepPlayground(s,dt,TILE,300,500,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
 return {stage,nav,s,tick};
}

test('compile converts tile door transforms to world pixels and rejects invalid lockdown IDs',()=>{
 const stage=compileStage(def),door=stage.doors![0];
 assert.equal(door.x,240);assert.equal(door.width,120);assert.equal(door.thickness,8);
 assert.throws(()=>compileStage({...def,lockdownDoors:['absent']}),/invalid lockdown door/);
 assert.throws(()=>compileStage({...def,lockdownDoors:['service']}),/invalid lockdown door/);
 assert.throws(()=>compileStage({...def,doors:[def.doors![0],def.doors![0]]}),/duplicate door/);
});

test('confirmed theft starts the escape-timer closure; phase changes do not reset and only designated door closes',()=>{
 const {s,tick}=setup();
 tick(30);assert.equal(s.doors![0].state,'OPEN');assert.equal(s.events.lockdownActive,false);
 s.events.theftAlert=true;s.events.theftActivatedAt=s.t;
 tick(ESCAPE_TIMER_SECONDS-.1);assert.equal(s.doors![0].state,'OPEN');
 const activatedAt=s.events.theftActivatedAt;
 s.events.phase='PLAYER_SPOTTED';tick(.11);
 assert.equal(s.events.theftActivatedAt,activatedAt);assert.equal(s.doors![0].state,'CLOSING');
 tick(.6);assert.equal(s.doors![0].state,'CLOSED');assert.equal(s.doors![1].state,'OPEN');
 assert.equal(s.events.lockdownActive,true);assert.equal(s.events.caught,false);assert.equal(s.mission.complete,false);
 assert.equal(clearSegment(200,160,280,160,s.effectiveVisionBlockers!),false);
 const nav=s.effectiveNavigation,revision=s.doorGeometryRevision;tick(.1);
 assert.equal(s.effectiveNavigation,nav);assert.equal(s.doorGeometryRevision,revision);
});

test('post-player-movement occupancy pauses closure and retry restores all doors',()=>{
 const {s,tick,stage}=setup();s.events.theftAlert=true;s.events.theftActivatedAt=0;s.t=ESCAPE_TIMER_SECONDS;
 s.player.x=240;s.player.y=160;tick(.2);
 assert.equal(s.doors![0].state,'CLOSING');assert.equal(s.doors![0].progress,0);
 assert.equal(s.doors![0].pausedForOccupancy,true);assert.equal(s.player.x,240);
 assert.equal(clearSegment(200,160,280,160,s.effectiveMovementBlockers!),true);
 s.player.x=200;tick(.6);assert.equal(s.doors![0].state,'CLOSED');
 const retry=createPlaygroundState(stage);assert.equal(retry.doors![0].state,'OPEN');
 assert.equal(retry.doors![0].progress,0);assert.equal(retry.events.theftAlert,false);
 assert.equal(retry.effectiveNavigation,undefined);
});

test('closed quick door forces reachable alternate route and leaves static graph unchanged',()=>{
 const {nav,stage}=setup();const before=JSON.stringify(nav);
 const door=createDoor({...stage.doors![0],initialState:'CLOSED'});
 const effective=navigationWithDoors(nav,doorBlockers([door]).movementBlockers);
 const sx=200,sy=160,tx=280,ty=160;
 assert.equal(clearSegment(sx,sy,tx,ty,effective.blockers,BODY.guardRadius),false);
 const path=findPath(effective,sx,sy,tx,ty);
 assert.ok(path.length>2);assert.deepEqual(path.slice(-2),[tx,ty]);
 let x=sx,y=sy;
 for(let i=0;i<path.length;i+=2){assert.ok(clearSegment(x,y,path[i],path[i+1],effective.blockers,BODY.guardRadius));x=path[i];y=path[i+1];}
 assert.equal(JSON.stringify(nav),before);
});

test('initially CLOSED glass door has effective movement collision before first player step but passes LOS',()=>{
 const {s,tick}=setup({...def,doors:[{...def.doors![1],id:'glass',x:3,y:4,width:3,initialState:'CLOSED'}],lockdownDoors:[]});
 s.playerMode=3;s.player.hasTarget=true;s.player.tx=200;s.player.ty=160;
 tick(.1);
 assert.equal(clearSegment(80,160,160,160,s.effectiveMovementBlockers!,BODY.playerRadius),false);
 assert.equal(clearSegment(80,160,160,160,s.effectiveVisionBlockers!),true);
 assert.ok(s.player.x<120-BODY.playerRadius);
});

test('door-free missions keep the original static fast path',()=>{
 const {s,tick}=setup({...def,doors:undefined,lockdownDoors:undefined});tick(.1);
 assert.equal(s.doors,undefined);assert.equal(s.effectiveMovementBlockers,undefined);
 assert.equal(s.effectiveNavigation,undefined);
});
