/**
 * Representative-mission deep dive from the expert plans: where the tight timing segments are (window ≤ 25 %) and
 * which guard/camera covers that ground during a 60 s idle cycle.
 *   node --import tsx tools/gameplay-audit/deepDive.ts <expert.json,…> <out.json> <id,id,…>
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {pointVisible} from '../../src/game/guards/guardVision';
import {BODY} from '../../src/game/guards/guardTuning';
import {polyline,toWorld,objectiveTile,exitCenterTile} from './routeGeometry';
import type {Pt} from './routeGeometry';
import {split} from './expertPlanner';
import type {PlanResult} from './expertPlanner';

const [files,out,idList]=process.argv.slice(2);
const plans=files.split(',').flatMap(f=>(JSON.parse(fs.readFileSync(f,'utf8')).plans as (PlanResult&{candidate:string})[])).filter(p=>p.candidate==='A');
const ids=idList.split(',');
const result:Record<string,unknown>[]=[];
for (const id of ids) {
  const def=(campaign as StageDefinition[]).find(d=>d.id===id)!, stage=compileStage(def);
  const nav=buildNavigation(stage,BODY.guardRadius), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const exitC=toWorld(exitCenterTile(def));
  const tight:{plan:string;segment:number;phase:string;x:number;y:number;window:number}[]=[];
  for (const p of plans.filter(q=>q.id===id&&q.clear)) {
    const approach=split(polyline(pnav,def.testRoutes![p.route].points.map(toWorld))); approach.push(toWorld(objectiveTile(def)));
    const er=p.escape==='alt'?(def.escapeRoutes![1]??def.escapeRoutes![0]):def.escapeRoutes![0];
    const escape=split(polyline(pnav,[toWorld(objectiveTile(def)),...er.points.map(toWorld).slice(1)])); escape.push(exitC);
    const segs:Pt[]=[...approach,...escape];
    p.windows.forEach((w,i)=>{ if (w<=0.25&&segs[i]) tight.push({plan:`${p.gait}/r${p.route}`,segment:i,phase:i<approach.length?'approach':'escape',
      x:+(segs[i].x/TILE).toFixed(1),y:+(segs[i].y/TILE).toFixed(1),window:w}); });
  }
  // observer coverage of each tight point over a 60 s idle cycle
  const s=createPlaygroundState(stage); s.playerMode=0;
  const counts=tight.map(()=>new Map<string,number>()); let ticks=0;
  for (let f=0;f<3600;f++) { stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
    if (f%15) continue; ticks++; const b=s.effectiveVisionBlockers??stage.visionBlockers;
    tight.forEach((t,i)=>{ for (const o of [...s.guards,...s.securityCameras]) if (pointVisible(o,t.x*TILE,t.y*TILE,b)) counts[i].set(o.id,(counts[i].get(o.id)??0)+1); }); }
  const ps=plans.filter(q=>q.id===id);
  result.push({id,title:def.title,theme:def.theme,
    plans:ps.map(p=>({gait:p.gait,route:p.route,clear:p.clear,unseen:p.unseen,seconds:p.seconds,waitSeconds:p.waitSeconds,escape:p.escape,startDelay:p.startDelay,windowMin:p.windowMin,tightSegments:p.tightSegments,failCause:p.failCause})),
    tight:tight.map((t,i)=>({...t,watchedBy:Object.fromEntries([...counts[i]].map(([k,v])=>[k,+(v/ticks).toFixed(2)]))}))});
}
fs.writeFileSync(out,JSON.stringify(result,null,1)+'\n');
console.log('wrote',out,result.length,'missions');
