/**
 * Gameplay similarity of the mirrored map pairs (walkable grid identical under a mirror). Structure alone is not
 * repetition: this compares, after the mirror transform, spawn/objective/exit, authored approach/escape routes, guard
 * patrol paths and cycle timing, CCTV placement/facing/sweep, and the bot outcomes (expert plans, reactive strategies).
 *   node --import tsx tools/gameplay-audit/reuseSimilarity.ts <expert.json,…> <reactive.json> <out.json>
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';
import {objectiveTile,exitCenterTile} from './routeGeometry';
import type {Pt} from './routeGeometry';

type Plan={id:string;candidate:string;gait:string;route:number;clear:boolean;unseen:boolean;seconds:number|null};
type Run={id:string;candidate:string;strategy:string;clear:boolean};
type Route={id:string;mode:string;points:(Pt&{waitDuration?:number;wait?:number})[]};
const defs=campaign as StageDefinition[], byId=new Map(defs.map(d=>[d.id,d]));
const r2=(v:number)=>+v.toFixed(2);

function transformFor(a:StageDefinition,b:StageDefinition) {
  const A=compileStage(a), B=compileStage(b); let best={fx:0,fy:0,iou:0};
  for (const [fx,fy] of [[0,0],[1,0],[0,1],[1,1]]) { let n=0,u=0;
    for (let y=0;y<A.rows;y++) for (let x=0;x<A.cols;x++) { const p=A.grid[y*A.cols+x]===1, q=B.grid[(fy?A.rows-1-y:y)*A.cols+(fx?A.cols-1-x:x)]===1; if(p&&q)n++; if(p||q)u++; }
    if (u&&n/u>best.iou) best={fx,fy,iou:n/u}; }
  const cols=A.cols, rows=A.rows;
  const pt=(p:Pt):Pt=>({x:best.fx?cols-p.x:p.x,y:best.fy?rows-p.y:p.y});
  const ang=(t:number)=>{let r=best.fx?Math.PI-t:t; if(best.fy)r=-r; return Math.atan2(Math.sin(r),Math.cos(r));};
  return {...best,pt,ang};
}
const dist=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
function resample(pts:Pt[],loop=false):Pt[] {
  const P=loop&&pts.length>2?[...pts,pts[0]]:pts, out:Pt[]=[];
  for (let i=1;i<P.length;i++){const a=P[i-1],b=P[i],n=Math.max(1,Math.ceil(dist(a,b)/0.5));for(let k=0;k<n;k++)out.push({x:a.x+(b.x-a.x)*k/n,y:a.y+(b.y-a.y)*k/n});}
  out.push(P[P.length-1]); return out;
}
/** Symmetric mean nearest-point distance between two resampled polylines (tiles). */
function pathDistance(a:Pt[],b:Pt[]):number {
  const one=(p:Pt[],q:Pt[])=>p.reduce((s,x)=>s+Math.min(...q.map(y=>dist(x,y))),0)/p.length;
  return (one(a,b)+one(b,a))/2;
}
function cycleSeconds(r:Route,pace:number):number {
  const pts=r.points, loop=r.mode==='loop'&&pts.length>2;
  let len=0; for (let i=1;i<pts.length;i++) len+=dist(pts[i-1],pts[i]); len+=loop?dist(pts[pts.length-1],pts[0]):len;
  const waits=pts.reduce((s,p)=>s+(p.waitDuration??p.wait??0),0)*(loop?1:2);
  return len/(52*pace/40)+waits;
}

const [expertFiles,reactivePath,out]=process.argv.slice(2);
if (!out) throw Error('usage: reuseSimilarity.ts <expert.json,…> <reactive.json> <out.json>');
const plans=expertFiles.split(',').flatMap(f=>JSON.parse(fs.readFileSync(f,'utf8')).plans as Plan[]).filter(p=>p.candidate==='A');
const runs=(JSON.parse(fs.readFileSync(reactivePath,'utf8')).runs as Run[]).filter(r=>r.candidate==='A');
const pairs:[string,string][]=[];
for (let i=0;i<defs.length;i++) for (let j=i+1;j<defs.length;j++) { const a=defs[i],b=defs[j];
  if (a.layout.length!==b.layout.length||a.layout[0].length!==b.layout[0].length) continue;
  if (transformFor(a,b).iou===1) pairs.push([a.id,b.id]); }

const rows=pairs.map(([ia,ib])=>{
  const a=byId.get(ia)!, b=byId.get(ib)!, T=transformFor(a,b);
  const routesA=new Map((a.patrolRoutes as Route[]).map(r=>[r.id,r])), routesB=new Map((b.patrolRoutes as Route[]).map(r=>[r.id,r]));
  const ga=a.guards.map(g=>({g,r:routesA.get(g.routeId??'')!})), gb=b.guards.map(g=>({g,r:routesB.get(g.routeId??'')!}));
  // greedy guard matching on transformed patrol paths
  const cand:{i:number;j:number;d:number}[]=[];
  ga.forEach((x,i)=>gb.forEach((y,j)=>cand.push({i,j,d:pathDistance(resample(x.r.points.map(T.pt),x.r.mode==='loop'),resample(y.r.points,y.r.mode==='loop'))})));
  cand.sort((p,q)=>p.d-q.d); const usedA=new Set<number>(), usedB=new Set<number>(), matches:{a:string;b:string;pathTiles:number;cycleA:number;cycleB:number;delayA:number;delayB:number}[]=[];
  for (const c of cand) { if (usedA.has(c.i)||usedB.has(c.j)||c.d>1.5) continue; usedA.add(c.i); usedB.add(c.j);
    const x=ga[c.i], y=gb[c.j]; matches.push({a:x.g.id,b:y.g.id,pathTiles:r2(c.d),cycleA:r2(cycleSeconds(x.r,x.g.pace??1)),cycleB:r2(cycleSeconds(y.r,y.g.pace??1)),delayA:x.g.startDelay??0,delayB:y.g.startDelay??0}); }
  const timingSame=matches.filter(m=>Math.abs(m.cycleA-m.cycleB)<=0.5&&m.delayA===m.delayB).length;
  const ca=(a.cameras??[]), cb=(b.cameras??[]);
  const camMatched=cb.filter(y=>ca.some(x=>dist(T.pt(x),y)<=1.5&&Math.abs(Math.atan2(Math.sin(T.ang(x.centerFacing)-y.centerFacing),Math.cos(T.ang(x.centerFacing)-y.centerFacing)))<0.35)).length;
  const routeD=(k:'testRoutes'|'escapeRoutes',i:number)=>r2(pathDistance(resample(a[k]![i].points.map(T.pt)),resample(b[k]![i].points)));
  const vec=(id:string)=>['sneak','walk','run','mixed'].flatMap(g=>[0,1].map(r=>{const p=plans.find(q=>q.id===id&&q.gait===g&&q.route===r);return p?(p.clear?(p.unseen?2:1):0):-1;}));
  const va=vec(ia), vb=vec(ib), planAgree=va.filter((v,i)=>v===vb[i]).length/va.length;
  const strat=(id:string)=>[...new Set(runs.map(r=>r.strategy))].map(s=>{const x=runs.filter(r=>r.id===id&&r.strategy===s);return x.filter(r=>r.clear).length/x.length;});
  const sa=strat(ia), sb=strat(ib), stratDiff=sa.reduce((s,v,i)=>s+Math.abs(v-sb[i]),0)/sa.length;
  const fastest=(id:string)=>{const c=plans.filter(p=>p.id===id&&p.clear).sort((p,q)=>(p.seconds??0)-(q.seconds??0))[0];return c?c.gait:'none';};
  const spawnD=r2(dist(T.pt(a.playerSpawn),b.playerSpawn)), objD=r2(dist(T.pt(objectiveTile(a)),objectiveTile(b))), exitD=r2(dist(T.pt(exitCenterTile(a)),exitCenterTile(b)));
  const safeD=routeD('testRoutes',0), riskD=routeD('testRoutes',1), escD=routeD('escapeRoutes',0), altD=routeD('escapeRoutes',1);
  const sameSolution=spawnD<=2&&objD<=2&&exitD<=2&&safeD<=1.5&&riskD<=1.5;
  const keptThreats=matches.length/Math.max(1,b.guards.length);
  // classification (published in MISSION_DIFFICULTY §3-3b)
  const level=sameSolution&&keptThreats>=0.5&&planAgree>=0.75?'HIGH':sameSolution&&(keptThreats>=0.5||planAgree>=0.75)?'MEDIUM':'LOW';
  return {a:ia,b:ib,transform:`${T.fx?'x':''}${T.fy?'y':''}`||'none',spawnTiles:spawnD,objectiveTiles:objD,exitTiles:exitD,
    safeRouteTiles:safeD,riskRouteTiles:riskD,quickEscapeTiles:escD,altEscapeTiles:altD,
    guardsA:a.guards.length,guardsB:b.guards.length,guardsMatched:matches.length,guardTimingSame:timingSame,matches,
    camerasA:ca.length,camerasB:cb.length,camerasMatched:camMatched,
    visionA:r2(a.guards[0].visionRange??0),visionB:r2(b.guards[0].visionRange??0),
    planAgreement:r2(planAgree),planA:va.join(''),planB:vb.join(''),fastestA:fastest(ia),fastestB:fastest(ib),strategyRateDiff:r2(stratDiff),
    sameSolution,monotonyRisk:level};
});
fs.writeFileSync(out,JSON.stringify(rows,null,1)+'\n');
for (const r of rows) console.log(`${r.a}→${r.b} ${r.monotonyRisk.padEnd(6)} spawn ${r.spawnTiles} obj ${r.objectiveTiles} exit ${r.exitTiles} routes ${r.safeRouteTiles}/${r.riskRouteTiles} esc ${r.quickEscapeTiles}/${r.altEscapeTiles} guards ${r.guardsMatched}/${r.guardsA}→${r.guardsB} timing ${r.guardTimingSame} cams ${r.camerasMatched}/${r.camerasA}→${r.camerasB} vision ${r.visionA}→${r.visionB} plans ${r.planA}/${r.planB} agree ${r.planAgreement} fastest ${r.fastestA}/${r.fastestB} stratΔ ${r.strategyRateDiff}`);
