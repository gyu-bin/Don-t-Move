import type { StageDefinition, PatrolPoint } from '../StageDefinition';
import { compileStage, TILE } from '../../world/compileStage';
import { buildNavigation, nodeX, nodeY, clearSegment, findPath } from '../../world/navigation';
import { BODY } from '../../guards/guardTuning';

/** Authoring-time role/zone assignment; no geometry or guard-count changes. */
export function deployGuards(source:StageDefinition):StageDefinition {
 const s={...source,guards:source.guards.map(g=>({...g})),patrolRoutes:source.patrolRoutes.map(r=>({...r,points:r.points.map(p=>({...p}))}))};
 const stage=compileStage(s),nav=buildNavigation(stage,BODY.guardRadius);
 const objective=stage.objective,spawn=stage.playerSpawn;
 const used=s.guards.filter(g=>g.id===s.objectiveZone?.guardId).map(g=>({x:g.x*TILE,y:g.y*TILE}));
 const nodes=nav.walkable.map((v,i)=>v?i:-1).filter(i=>i>=0);
 for(let i=0;i<s.guards.length;i++){
  const g=s.guards[i];
  if(g.id===s.objectiveZone?.guardId){g.role='objective';continue;}
  const old=s.patrolRoutes.find(r=>r.id===g.routeId)!;
  g.role=old.mode==='roaming'?'roaming':i%2?'corridor':'room';
  if(s.number>=7 && i===s.guards.length-2)g.role='exit';
  let best=-1,bestScore=-Infinity;
  for(const node of nodes){
   const x=nodeX(nav,node),y=nodeY(nav,node);
   if(Math.hypot(x-objective.x,y-objective.y)<5*TILE || Math.hypot(x-spawn.x,y-spawn.y)<4*TILE)continue;
   const separation=Math.min(...used.map(p=>Math.hypot(x-p.x,y-p.y)),10*TILE);
   if(separation<3*TILE)continue;
   const exitDistance=Math.hypot(x-(stage.exit.x+stage.exit.w/2),y-(stage.exit.y+stage.exit.h/2));
   const score=separation-(g.role==='exit'?exitDistance*0.8:Math.hypot(x-g.x*TILE,y-g.y*TILE)*0.12);
   if(score<=bestScore)continue;
   const path=findPath(nav,spawn.x,spawn.y,x,y);
   if(path.at(-2)!==x || path.at(-1)!==y)continue;
   best=node;bestScore=score;
  }
  if(best<0)throw new Error(`Stage ${s.number}: no distributed guard post`);
  const start={x:nodeX(nav,best),y:nodeY(nav,best)};
  const points:PatrolPoint[]=[{x:start.x/TILE,y:start.y/TILE,waitDuration:2,turnDuration:1}];
  for(const node of nodes){
   const x=nodeX(nav,node),y=nodeY(nav,node),d=Math.hypot(x-start.x,y-start.y);
   if(d<1.5*TILE || d>4*TILE || Math.hypot(x-objective.x,y-objective.y)<4*TILE || Math.hypot(x-spawn.x,y-spawn.y)<3*TILE)continue;
   if(points.some(p=>Math.hypot(x-p.x*TILE,y-p.y*TILE)<1.5*TILE))continue;
   if(!points.every(p=>clearSegment(p.x*TILE,p.y*TILE,x,y,nav.blockers,BODY.guardRadius)))continue;
   points.push({x:x/TILE,y:y/TILE,waitDuration:1+i%3,turnDuration:1});
   if(points.length===3)break;
  }
  if(points.length<2)throw new Error(`Stage ${s.number}: guard zone has no patrol`);
  g.x=points[0].x;g.y=points[0].y;
  g.facing=Math.atan2(points[1].y-g.y,points[1].x-g.x);
  g.routeId=`zone-${g.id}`;g.startDelay=i*0.4;g.escapePatrol=undefined;
  s.patrolRoutes=s.patrolRoutes.filter(r=>r.id!==old.id);
  s.patrolRoutes.push({id:g.routeId,mode:old.mode==='roaming'?'roaming':'pingpong',points});
  used.push(start);
 }
 return s;
}
