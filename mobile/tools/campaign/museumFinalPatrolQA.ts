import {writeFileSync} from 'node:fs';
import {campaignStages} from '../../src/game/levels/campaignStages';
import {compileStage} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {createPlaygroundState} from '../../src/game/playground/playgroundState';
import {stepGuards} from '../../src/game/guards/guardSystem';

const missions=campaignStages.filter(d=>d.chapter===1).map(def=>{
 const stage=compileStage(def),nav=buildNavigation(stage,BODY.guardRadius),s=createPlaygroundState(stage);
 const metrics=s.guards.map(g=>({id:g.id,finite:true,collisionFrames:0,recoveries:0,distance:0,longestStationary:0,stationary:0,visited:new Set<number>()}));
 for(let frame=0;frame<120*60;frame++){
  const previous=s.guards.map(g=>({x:g.x,y:g.y}));
  stepGuards(s.guards,{x:-1000,y:-1000,gait:0},stage.visionBlockers,nav,1/60,s.events,frame/60,true,1,s.theft);
  s.guards.forEach((g,i)=>{const m=metrics[i],d=Math.hypot(g.x-previous[i].x,g.y-previous[i].y);m.distance+=d;m.finite&&=[g.x,g.y,g.facing,g.speed].every(Number.isFinite);
   if(!clearSegment(g.x,g.y,g.x,g.y,nav.blockers,BODY.guardRadius))m.collisionFrames++;
   m.stationary=d<.001?m.stationary+1/60:0;m.longestStationary=Math.max(m.longestStationary,m.stationary);m.recoveries=g.patrolRecoveries;
   g.route.forEach((p,j)=>{if(Math.hypot(g.x-p.x,g.y-p.y)<10)m.visited.add(j);});
  });
 }
 return {id:def.id,guards:metrics.map((m,i)=>({id:m.id,finite:m.finite,collisionFrames:m.collisionFrames,recoveries:m.recoveries,distanceTiles:+(m.distance/40).toFixed(2),longestStationarySeconds:+m.longestStationary.toFixed(2),visitedAnchors:m.visited.size,totalAnchors:s.guards[i].route.length,allAnchorsVisited:m.visited.size===s.guards[i].route.length}))};
});
const report={method:'120s real guard patrol at60Hz, player hidden off-map. Stationary includes authored waits/turns. Anchor visitation+recovery counts expose patrol blockage; no human or native play assertion.',missions};
writeFileSync('Reports/MuseumFinalDesignV2/patrol-qa.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(missions,null,2));
if(missions.some(m=>m.guards.some(g=>!g.finite||g.collisionFrames||!g.allAnchorsVisited)))process.exitCode=1;
