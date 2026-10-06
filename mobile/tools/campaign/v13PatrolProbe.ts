/** Authoring aid: walks every Chapter 1–2 patrol for 120 s on the real guard code and reports any step that touches collision. */
import cur from '../../src/game/levels/stages/campaignStages.json';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createGuardState,createGuardEvents} from '../../src/game/guards/guardBrain';
import {stepGuards} from '../../src/game/guards/guardSystem';
for(const def of (cur as any[]).filter(d=>d.chapter<=4)){
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),guards=stage.guards.map((g:any)=>createGuardState(g)),ev=createGuardEvents();
 const hidden={x:-1000,y:-1000,gait:0} as any;const bad=new Set<string>();
 for(let f=0;f<7200;f++){const prev=guards.map((g:any)=>({x:g.x,y:g.y}));stepGuards(guards,hidden,stage.visionBlockers,nav,1/60,ev,f/60,true);
  guards.forEach((g:any,i:number)=>{if(!clearSegment(prev[i].x,prev[i].y,g.x,g.y,nav.blockers,BODY.guardRadius)){const k=`${def.id} ${g.id} at ${(g.x/TILE).toFixed(2)},${(g.y/TILE).toFixed(2)} t=${(f/60).toFixed(1)}`;if(bad.size<2)bad.add(k);}});}
 console.log(def.id,bad.size?[...bad].join(' | '):'ok');
}
