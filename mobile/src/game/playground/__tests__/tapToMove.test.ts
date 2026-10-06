import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import stages from '../../levels/stages/campaignStages.json';
import type {StageDefinition} from '../../levels/StageDefinition';
import {compileStage,TILE} from '../../world/compileStage';
import {buildNavigation} from '../../world/navigation';
import {createPlaygroundState,stepPlayground} from '../playgroundState';
import {BODY} from '../../guards/guardTuning';

/** Tap-to-move (touch fallback) on a live mission with the guards taken out. */
function walk(id:string,from:{x:number;y:number},to:{x:number;y:number},seconds:number){
 const def=(stages as unknown as StageDefinition[]).find(s=>s.id===id)!,stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 s.guards=[];s.guardPlayback=[];s.mission.enabled=false;s.playerMode=3;
 Object.assign(s.player,{x:from.x*TILE,y:from.y*TILE,tx:to.x*TILE,ty:to.y*TILE,hasTarget:true});
 let slowest=Infinity,moving=0;
 for(let f=0;f<60*seconds&&s.player.hasTarget;f++){
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  if(f>45&&s.player.hasTarget){slowest=Math.min(slowest,s.player.speed);moving++;}
 }
 return {gap:Math.hypot(s.player.x-to.x*TILE,s.player.y-to.y*TILE)/TILE,slowest,moving,arrived:!s.player.hasTarget};
}
test('tap-to-move walks round a structure that stands between the thief and the tapped point',()=>{
 // 03-03 Processing Aisle: from the south lane to the north lane, straight through the processing table.
 const r=walk('03-03',{x:11,y:17},{x:11,y:13.8},6);
 assert(r.arrived&&r.gap<.1,JSON.stringify(r));
});
test('tap-to-move keeps its pace past a corner instead of grinding along the wall',()=>{
 // 03-01 hall to the teller floor: the tapped point is round the corner of the staff gate.
 const r=walk('03-01',{x:17,y:15},{x:13.5,y:9},6);
 assert(r.arrived&&r.gap<.1,JSON.stringify(r));
 assert(r.slowest>100,`never slower than a brisk walk once under way: ${r.slowest.toFixed(0)}`);
});
