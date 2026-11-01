/**
 * Gameplay Improvement v4 — chase & recovery lab (production 60 Hz simulation, deterministic).
 *
 * Scenarios: the thief is put in front of a guard (2.5 / 3.5 / 4.5 tiles ahead of its starting post) or a camera
 * (2.5 / 3.5 tiles down its centre line) and walks back and forth across its view until it is SPOTTED (whistle or
 * camera alert). That spotted state is cloned and every flight strategy plays from the same state:
 *   A straight   run straight away from the spotter
 *   B corner     run to the nearest spot no guard/camera can see, then walk on to another hidden spot away from the LKP
 *   C obstacle   run to the nearest hidden spot beside an opaque prop, then stand still
 *   D away       run to the hidden spot farthest from every guard (within 10 tiles), then stand still
 *   E room       run to the nearest hidden spot in ANOTHER zone than the LKP, ≥ 5 tiles away, then stand still
 *   F runSneak   E's target, but switch to Sneak as soon as nobody sees the thief
 *   G hide       run to the nearest hidden spot and stand still until the alert ends
 *   H exit       run along the alternate escape route towards the exit
 * Every target is re-picked every 0.5 s while the thief is still seen (a person adapts); a path that runs past a
 * guard (within 1.5 tiles) or whose first tile closes on the nearest alerted guard is not taken.
 *
 * Separate outcomes (never merged): caught (and how), LOS broken, survived 60 s, alert ended (all guards back on
 * patrol = calm), and — for calm runs — re-infiltration: the expert planner, from that calm state, reaches the prize
 * and the exit (budget 300).
 *   node --import tsx tools/gameplay-improvement/v4/chaseLab.ts <out.json> <ids,…> [strategies] [--reinfiltrate n]
 * Candidate guard logic is selected by the loader in ./candidateLoader.mjs (CHASE_CANDIDATE=A|B|C|D); A = production.
 */
import fs from 'node:fs';
import campaign from '../../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../../src/game/world/compileStage';
import type {CompiledStage} from '../../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment} from '../../../src/game/world/navigation';
import type {Navigation} from '../../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../../src/game/playground/playgroundState';
import type {PlaygroundState} from '../../../src/game/playground/playgroundState';
import {BODY} from '../../../src/game/guards/guardTuning';
import {Awareness} from '../../../src/game/core/types';
import {PROP_KIT} from '../../../src/game/world/propKit';
import {polyline,toWorld,spotSignature,exitCenterTile,objectiveTile} from '../../gameplay-audit/routeGeometry';
import type {Pt} from '../../gameplay-audit/routeGeometry';
import {search,split} from '../../gameplay-audit/expertPlanner';
import type {Ctx} from '../../gameplay-audit/expertPlanner';

export const STRATEGIES=['A','B','C','D','E','F','G','H'] as const;
export type Strategy=typeof STRATEGIES[number];
export const STRATEGY_NAME:Record<Strategy,string>={A:'straight',B:'corner',C:'obstacle',D:'away',E:'room',F:'runSneak',G:'hide',H:'exit'};
const CAP=Number(process.env.LAB_CAP??60), ALERTED=new Set<number>([Awareness.Alert,Awareness.Chase,Awareness.Search,Awareness.Investigate]);
export const CANDIDATE=(process.env.CHASE_CANDIDATE??'A')+(process.env.CHASE_TRAVEL_FIX==='1'?'+T':'');

export interface Scenario {mission:string;kind:'guard'|'camera';source:string;distance:number;at:Pt;across:Pt;
  /** Seconds of normal patrol (thief parked at the spawn) before the scenario starts; the spot is taken from that pose. */
  warmup:number}
export interface World {def:StageDefinition;stage:CompiledStage;nav:Navigation;pnav:Navigation;cells:Pt[];zoneOf:(q:Pt)=>string|undefined;propCells:Set<number>}

export function world(def:StageDefinition):World {
  const stage=compileStage(def), nav=buildNavigation(stage,BODY.guardRadius), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const cells:Pt[]=[]; for (let y=0;y<stage.rows;y++) for (let x=0;x<stage.cols;x++) if (stage.grid[y*stage.cols+x]===1) cells.push({x:(x+0.5)*TILE,y:(y+0.5)*TILE});
  const rooms=def.topologyPlan?.rooms??[];
  const zoneOf=(q:Pt)=>rooms.find(r=>q.x/TILE>=r.x&&q.x/TILE<r.x+r.w&&q.y/TILE>=r.y&&q.y/TILE<r.y+r.h)?.id;
  // floor cells within 1 tile of an opaque prop's footprint
  const propCells=new Set<number>();
  for (const pr of def.props??[]) { const k=PROP_KIT[pr.kind as keyof typeof PROP_KIT]; if (!k?.blocksVision||!k.footprint.w) continue;
    const w=k.footprint.w*(pr.collisionScale??pr.scale??1), h=k.footprint.h*(pr.collisionScale??pr.scale??1), x0=pr.x-w/2, x1=pr.x+w/2, y1=pr.y, y0=pr.y-h;
    cells.forEach((c,i)=>{ const cx=c.x/TILE, cy=c.y/TILE, dx=Math.max(x0-cx,0,cx-x1), dy=Math.max(y0-cy,0,cy-y1); if (Math.hypot(dx,dy)<=1) propCells.add(i); }); }
  return {def,stage,nav,pnav,cells,zoneOf,propCells};
}

function step(w:World, s:PlaygroundState) {
  stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:w.stage.width,h:w.stage.height},w.stage.movementBlockers,w.stage.visionBlockers,w.nav);
}

/** Controlled spots: in front of each guard's starting post, and down each camera's centre line. */
export function scenarios(def:StageDefinition):Scenario[] {
  const w=world(def), st=w.stage, out:Scenario[]=[];
  const floor=(q:Pt)=>{const x=Math.floor(q.x/TILE),y=Math.floor(q.y/TILE);return x>=0&&y>=0&&x<st.cols&&y<st.rows&&st.grid[y*st.cols+x]===1;};
  const add=(kind:Scenario['kind'],source:string,x:number,y:number,facing:number,dist:number,warmup=0)=>{
    const at={x:x+Math.cos(facing)*dist*TILE,y:y+Math.sin(facing)*dist*TILE};
    const across=[1,-1].map(k=>({x:at.x+Math.cos(facing+k*Math.PI/2)*2*TILE,y:at.y+Math.sin(facing+k*Math.PI/2)*2*TILE})).find(q=>floor(q)&&clearSegment(at.x,at.y,q.x,q.y,st.movementBlockers,BODY.playerRadius+1));
    if (floor(at)&&across&&clearSegment(x,y,at.x,at.y,st.visionBlockers)&&clearSegment(at.x,at.y,at.x,at.y,st.movementBlockers,BODY.playerRadius+1)) out.push({mission:def.id,kind,source,distance:dist,at,across,warmup});
  };
  for (const g of st.guards) for (const d of [2.5,3.5,4.5]) add('guard',g.id,g.x,g.y,g.facing,d);
  // a second pose per guard: after 4 s of patrol (guards that start facing a wall still get scenarios)
  const s4=createPlaygroundState(st); s4.playerMode=0; for (let f=0;f<240;f++) step(w,s4);
  for (const g of s4.guards) if (!s4.events.globalAlert) for (const d of [2.5,3.5,4.5]) add('guard',g.id,g.x,g.y,g.facing,d,4);
  for (const c of st.cameras??[]) for (const d of [2.5,3.5]) add('camera',c.id,c.x,c.y,c.centerFacing,d);
  return out;
}

export interface Spotted {s:PlaygroundState;t:number;spotDistance:number;speed:number;guardsNear:number;coverNear:boolean;openShare:number;sourceState:string;by:string}

const seenNow=(s:PlaygroundState)=>s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
/** Seen from where guards are HEADING: an alerted guard's target, a patrolling guard's next anchor (a person on screen
 *  sees guards walk; a hiding spot on their way is not a hiding spot). */
function exposedAhead(w:World, s:PlaygroundState, q:Pt) {
  const v=s.effectiveVisionBlockers??w.stage.visionBlockers;
  return s.guards.some(g=>{ const nxt=ALERTED.has(g.awareness)?{x:g.targetX,y:g.targetY}:g.route[g.routeIdx]??{x:g.x,y:g.y};
    return Math.hypot(nxt.x-q.x,nxt.y-q.y)<g.visionRange&&clearSegment(nxt.x,nxt.y,q.x,q.y,v); });
}
function seenFrom(w:World, s:PlaygroundState, q:Pt) {
  const v=s.effectiveVisionBlockers??w.stage.visionBlockers;
  return s.guards.some(g=>Math.hypot(g.x-q.x,g.y-q.y)<g.visionRange+TILE&&clearSegment(g.x,g.y,q.x,q.y,v))||
    s.securityCameras.some(c=>Math.hypot(c.x-q.x,c.y-q.y)<c.visionRange&&clearSegment(c.x,c.y,q.x,q.y,v));
}

/** Walk the thief across the source's view until spotted; null if caught first or never spotted (60 s). */
export function provoke(w:World, sc:Scenario):Spotted|null {
  const s=createPlaygroundState(w.stage); s.playerMode=0;
  for (let f=0; f<Math.round(sc.warmup*60); f++) step(w,s);
  if (s.events.globalAlert||s.guards.some(g=>g.suspicion>0)) return null;
  s.playerMode=2; s.player.x=sc.at.x; s.player.y=sc.at.y;
  const sig0=spotSignature(s); let leg=1;
  for (let f=0; f<60*60; f++) {
    if (s.events.caught) return null;
    if (spotSignature(s)!==sig0) break;
    const tgt=leg%2===1?sc.across:sc.at; s.playerMode=2; s.player.tx=tgt.x; s.player.ty=tgt.y; s.player.hasTarget=true;
    if (Math.hypot(s.player.x-tgt.x,s.player.y-tgt.y)<4) leg++;
    step(w,s);
  }
  if (spotSignature(s)===sig0||s.events.caught) return null;
  const p=s.player, src=s.guards.find(g=>g.id===sc.source)??s.securityCameras.find(c=>c.id===sc.source)!;
  const near=s.guards.filter(g=>Math.hypot(g.x-p.x,g.y-p.y)<8*TILE).length;
  const hiddenNear=w.cells.filter(c=>Math.hypot(c.x-p.x,c.y-p.y)<=2.5*TILE&&!seenFrom(w,s,c)).length;
  const inRange=w.cells.filter(c=>Math.hypot(c.x-p.x,c.y-p.y)<=3*TILE), open=inRange.filter(c=>seenFrom(w,s,c)).length/Math.max(1,inRange.length);
  const sg=s.guards.find(g=>g.id===sc.source);
  return {s,t:s.t,spotDistance:+(Math.hypot(src.x-p.x,src.y-p.y)/TILE).toFixed(2),speed:+(p.speed/TILE).toFixed(2),guardsNear:near,coverNear:hiddenNear>0,openShare:+open.toFixed(2),
    sourceState:sg?String(sg.awareness):'camera',by:s.events.spottedSource||sc.source};
}

/** Pick a flight target for a strategy from the current state; null = nothing suitable. */
function pick(w:World, s:PlaygroundState, st:Strategy, lkp:Pt, srcPos:Pt):{q:Pt;path:number[]}|null {
  const p=s.player, x0=p.x, y0=p.y;
  const threat=s.guards.filter(g=>ALERTED.has(g.awareness)).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0))[0];
  const ok=(pp:number[])=>{ if (pp.length<2) return false;
    if (threat) { let k=0; while(k+2<pp.length&&Math.hypot(pp[k]-x0,pp[k+1]-y0)<TILE)k+=2; if (Math.hypot(pp[k]-threat.x,pp[k+1]-threat.y)<Math.hypot(x0-threat.x,y0-threat.y)-4) return false; }
    for (let k=0;k<pp.length;k+=2){ if (Math.hypot(pp[k]-x0,pp[k+1]-y0)<1.5*TILE) continue; for (const g of s.guards) if (Math.hypot(g.x-pp[k],g.y-pp[k+1])<1.5*TILE) return false; }
    return true; };
  const len=(pp:number[])=>{let d=0,x=x0,y=y0;for(let k=0;k<pp.length;k+=2){d+=Math.hypot(pp[k]-x,pp[k+1]-y);x=pp[k];y=pp[k+1];}return d;};
  const within=(r:number)=>w.cells.map((q,i)=>({q,i,d:Math.hypot(q.x-x0,q.y-y0)})).filter(c=>c.d>=1.5*TILE&&c.d<=r*TILE);
  let pool:{q:Pt;i:number;d:number}[]=[], order:(a:{q:Pt;pl:number},b:{q:Pt;pl:number})=>number=(a,b)=>a.pl-b.pl;
  if (st==='A') {
    const ax=x0-srcPos.x, ay=y0-srcPos.y, al=Math.hypot(ax,ay)||1;
    pool=within(12).filter(c=>((c.q.x-x0)*ax+(c.q.y-y0)*ay)/(c.d*al)>Math.cos(Math.PI/5));
    order=(a,b)=>((b.q.x-x0)*ax+(b.q.y-y0)*ay)-((a.q.x-x0)*ax+(a.q.y-y0)*ay);
  } else if (st==='H') {
    return null; // handled by the route follower
  } else {
    pool=within(st==='D'?10:st==='E'||st==='F'?14:8).filter(c=>!seenFrom(w,s,c.q));
    // prefer spots that also stay hidden from where the guards are heading; fall back to merely hidden ones
    const ahead=pool.filter(c=>!exposedAhead(w,s,c.q)); if (ahead.length) pool=ahead;
    if (st==='C') pool=pool.filter(c=>w.propCells.has(c.i));
    if (st==='E'||st==='F') { const z=w.zoneOf(lkp); pool=pool.filter(c=>w.zoneOf(c.q)!==z&&Math.hypot(c.q.x-lkp.x,c.q.y-lkp.y)>=5*TILE); }
    if (st==='D') order=(a,b)=>Math.min(...s.guards.map(g=>Math.hypot(g.x-b.q.x,g.y-b.q.y)))-Math.min(...s.guards.map(g=>Math.hypot(g.x-a.q.x,g.y-a.q.y)));
  }
  // cheap pre-sort by straight distance, then path-check the first 40
  const cand=pool.sort((a,b)=>a.d-b.d).slice(0,st==='A'||st==='D'?120:40).map(c=>{const path=findPath(w.pnav,x0,y0,c.q.x,c.q.y);return {q:c.q,path,pl:len(path)};}).filter(c=>c.path.length>=2&&ok(c.path));
  cand.sort(order);
  return cand[0]?{q:cand[0].q,path:cand[0].path}:null;
}

export interface RunResult {scenario:number;strategy:Strategy;candidate:string;caught:boolean;caughtAt:number|null;caughtBy:string|null;caughtState:string|null;
  losBreakAt:number|null;respotted:number;lkpRevisions:number;searchAt:number|null;alertEndAt:number|null;survived:number;calm:boolean;
  stateChanges:number;stackFrames:number;maxStack:number;reinfiltrated:boolean|null;finalX:number;finalY:number;
  /** Who saw the thief again after the line of sight was broken: the seeing guard's state just before ('inv' heading to the LKP, 'search', 'return', 'patrol' = back on its beat but the alert still on), or 'camera'. */
  respotBy:string[]}

export function flee(w:World, sp:Spotted, sc:Scenario, st:Strategy, index:number, reinfiltrate=false, onFrame?:(s:PlaygroundState)=>void, onPlan?:(end:PlaygroundState)=>void):RunResult {
  const s=structuredClone(sp.s), t0=s.t;
  const src=s.guards.find(g=>g.id===sc.source)??s.securityCameras.find(c=>c.id===sc.source)!, srcPos={x:src.x,y:src.y};
  let target:{q:Pt;path:number[]}|null=null, k=0, replanAt=0, phase2=false, losAt:number|null=null, prevSeen=true, respotted=0, searchAt:number|null=null, endAt:number|null=null;
  let changes=0, stackFrames=0, maxStack=0; const prevAw=s.guards.map(g=>g.awareness); const rev0=s.events.globalRevision; const respotBy:string[]=[];
  const NAME:Record<number,string>={0:'patrol',1:'suspicious',2:'alert',3:'search',4:'chase',5:'inv',6:'return'};
  let awBefore=s.guards.map(g=>g.awareness); let sawBefore=s.guards.map(g=>g.hasLkp); const lastLkp={x:s.events.globalX,y:s.events.globalY};
  const route=st==='H'?polyline(w.pnav,(w.def.escapeRoutes![1]??w.def.escapeRoutes![0]).points.map(toWorld).concat([toWorld(exitCenterTile(w.def))])):[];
  if (st==='H') { let best=0,bd=Infinity; route.forEach((q,i)=>{const d=Math.hypot(q.x-s.player.x,q.y-s.player.y);if(d<bd){bd=d;best=i;}}); k=best; }
  let frames=0;
  while (s.t-t0<CAP && !s.events.caught && !s.mission.complete && frames++<Math.ceil(CAP*60)+1) {
    const seen=seenNow(s), lkp={x:s.events.globalX,y:s.events.globalY};
    if (prevSeen&&!seen&&losAt===null) losAt=s.t-t0;
    if (!prevSeen&&seen&&losAt!==null) { respotted++; const who=s.guards.map((g,i)=>g.canSee?NAME[awBefore[i]]+(sawBefore[i]?'-witness':'-support'):'').filter(Boolean);
      respotBy.push(...(who.length?who:['camera']).map(x=>`${x}@${(s.t-t0-losAt!).toFixed(1)}s/${(Math.hypot(s.player.x-lastLkp.x,s.player.y-lastLkp.y)/TILE).toFixed(1)}t`)); }
    if (!seen) { lastLkp.x=s.events.globalX; lastLkp.y=s.events.globalY; }
    prevSeen=seen;
    if (st==='H') {
      while (k<route.length-1&&Math.hypot(route[k].x-s.player.x,route[k].y-s.player.y)<0.4*TILE) k++;
      s.playerMode=3; s.player.tx=route[k].x; s.player.ty=route[k].y; s.player.hasTarget=true;
    } else {
      if (s.t>=replanAt&&(target===null||seen||seenFrom(w,s,target.q)||exposedAhead(w,s,target.q))&&!(phase2&&!seen)) {
        const nt=pick(w,s,st,lkp,srcPos); if (nt) { target=nt; k=0; } replanAt=s.t+(seen?0.5:1);
      }
      if (target) {
        while (k+2<target.path.length&&Math.hypot(target.path[k]-s.player.x,target.path[k+1]-s.player.y)<6) k+=2;
        const arrived=Math.hypot(s.player.x-target.q.x,s.player.y-target.q.y)<6;
        if (arrived) {
          s.playerMode=0; s.player.hasTarget=false;
          if (st==='B'&&!phase2&&!seen) { // walk on, away from the LKP, to a second hidden spot
            const away=w.cells.filter(c=>!seenFrom(w,s,c)&&Math.hypot(c.x-lkp.x,c.y-lkp.y)>Math.hypot(s.player.x-lkp.x,s.player.y-lkp.y)+3*TILE&&Math.hypot(c.x-s.player.x,c.y-s.player.y)<8*TILE)
              .sort((a,b)=>Math.hypot(a.x-s.player.x,a.y-s.player.y)-Math.hypot(b.x-s.player.x,b.y-s.player.y)).slice(0,20)
              .map(q=>({q,path:findPath(w.pnav,s.player.x,s.player.y,q.x,q.y)})).find(c=>c.path.length>=2&&!c.path.some((v,i)=>i%2===0&&s.guards.some(g=>Math.hypot(g.x-v,g.y-c.path[i+1])<2*TILE)));
            if (away) { target=away; k=0; } phase2=true;
          }
        } else {
          const sneak=st==='F'&&losAt!==null&&!seen, walk=st==='B'&&phase2&&!seen;
          s.playerMode=sneak?1:walk?2:3; s.player.tx=target.path[k]; s.player.ty=target.path[k+1]; s.player.hasTarget=true;
        }
      } else { s.playerMode=0; s.player.hasTarget=false; }
    }
    awBefore=s.guards.map(g=>g.awareness); sawBefore=s.guards.map(g=>g.hasLkp); step(w,s); onFrame?.(s);
    s.guards.forEach((g,i)=>{ if (g.awareness!==prevAw[i]) { changes++; prevAw[i]=g.awareness; } });
    if (searchAt===null&&s.guards.some(g=>g.awareness===Awareness.Search)) searchAt=s.t-t0;
    // stacking: alerted guards within half a tile of each other
    let stack=0; for (let i=0;i<s.guards.length;i++) for (let j=i+1;j<s.guards.length;j++) if (ALERTED.has(s.guards[i].awareness)&&ALERTED.has(s.guards[j].awareness)&&Math.hypot(s.guards[i].x-s.guards[j].x,s.guards[i].y-s.guards[j].y)<0.5*TILE) stack++;
    if (stack) stackFrames++; maxStack=Math.max(maxStack,stack);
    if (endAt===null&&!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol)) { endAt=s.t-t0; break; }
  }
  const caught=s.events.caught, by=s.events.caughtBy||null, cg=s.guards.find(g=>g.id===by);
  let reinf:boolean|null=null;
  if (reinfiltrate&&endAt!==null&&!caught) {
    const ctx:Ctx={stage:w.stage,nav:w.nav,gait:'mixed'};
    const segs=[...split(polyline(w.pnav,[{x:s.player.x,y:s.player.y},toWorld(objectiveTile(w.def))])),toWorld(objectiveTile(w.def))];
    const esc=split(polyline(w.pnav,[toWorld(objectiveTile(w.def)),...w.def.escapeRoutes![0].points.map(toWorld).slice(1)])); esc.push(toWorld(exitCenterTile(w.def)));
    const r=search(s,ctx,[...segs,...esc],true,{n:0,limit:300},{furthest:-1,cause:''});
    reinf=!!r&&r.end.mission.complete; if (r) onPlan?.(r.end);
  }
  return {scenario:index,strategy:st,candidate:CANDIDATE,caught,caughtAt:caught?+(s.t-t0).toFixed(2):null,caughtBy:by,caughtState:cg?String(cg.awareness):null,
    losBreakAt:losAt===null?null:+losAt.toFixed(2),respotted,lkpRevisions:s.events.globalRevision-rev0,searchAt:searchAt===null?null:+searchAt.toFixed(2),
    alertEndAt:endAt===null?null:+endAt.toFixed(2),survived:+Math.min(CAP,s.t-t0).toFixed(2),calm:endAt!==null&&!caught,stateChanges:changes,stackFrames,maxStack,
    reinfiltrated:reinf,finalX:+(s.player.x/TILE).toFixed(1),finalY:+(s.player.y/TILE).toFixed(1),respotBy};
}

/** Broad oracle from the same spotted state: up to 24 floor spots 2–10 tiles away (hidden ones first, every third),
 *  run there by the nav path and stand still. Answers "does ANY simple flight work", independent of a strategy's rule. */
export function oracle(w:World, sp:Spotted):{options:number;calm:number;survived:number;caughtMedian:number|null} {
  const s0=sp.s, p0={x:s0.player.x,y:s0.player.y};
  const cells=w.cells.map(q=>({q,d:Math.hypot(q.x-p0.x,q.y-p0.y),hidden:!seenFrom(w,s0,q)})).filter(c=>c.d>=2*TILE&&c.d<=10*TILE).sort((a,b)=>Number(b.hidden)-Number(a.hidden)||a.d-b.d);
  const picks=[...cells.filter(c=>c.hidden).filter((_,i)=>i%3===0).slice(0,16),...cells.filter(c=>!c.hidden).slice(0,8)];
  let options=0,calm=0,survived=0; const times:number[]=[];
  for (const c of picks) {
    const pp=findPath(w.pnav,p0.x,p0.y,c.q.x,c.q.y); if (pp.length<2) continue; options++;
    const s=structuredClone(s0), t0=s.t; let k=0, ended=false;
    let frames=0;
    while (s.t-t0<CAP&&!s.events.caught&&!s.mission.complete&&frames++<Math.ceil(CAP*60)+1) {
      while (k+2<pp.length&&Math.hypot(s.player.x-pp[k],s.player.y-pp[k+1])<6) k+=2;
      if (Math.hypot(s.player.x-c.q.x,s.player.y-c.q.y)<6) { s.playerMode=0; s.player.hasTarget=false; } else { s.playerMode=3; s.player.tx=pp[k]; s.player.ty=pp[k+1]; s.player.hasTarget=true; }
      step(w,s);
      if (!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol)) { ended=true; break; }
    }
    if (s.events.caught) times.push(s.t-t0); else { survived++; if (ended) calm++; }
  }
  times.sort((a,b)=>a-b);
  return {options,calm,survived,caughtMedian:times.length?+times[times.length>>1].toFixed(2):null};
}

if (process.argv[1]?.endsWith('chaseLab.ts')) {
  const args=process.argv.slice(2), ri=args.indexOf('--reinfiltrate'), reinfN=ri>=0?Number(args.splice(ri,2)[1]):0, oi=args.indexOf('--oracle'), withOracle=oi>=0&&!!args.splice(oi,1);
  const [out,ids,stArg]=args, strategies=(stArg?stArg.split(','):[...STRATEGIES]) as Strategy[];
  const all=campaign as unknown as StageDefinition[], t=Date.now();
  const res:{candidate:string;generated:string;scenarios:(Scenario&Partial<Omit<Spotted,'s'>>&{spotted:boolean;oracle?:ReturnType<typeof oracle>})[];runs:RunResult[]}={candidate:CANDIDATE,generated:new Date().toISOString(),scenarios:[],runs:[]};
  for (const id of ids.split(',')) {
    const def=all.find(d=>d.id===id)!, w=world(def); let calmTried=0;
    for (const sc of scenarios(def)) {
      const sp=provoke(w,sc), idx=res.scenarios.length;
      if (!sp) { res.scenarios.push({...sc,spotted:false}); continue; }
      const {s:_s,...meta}=sp; res.scenarios.push({...sc,...meta,spotted:true,...(withOracle?{oracle:oracle(w,sp)}:{})});
      for (const st of strategies) { const r=flee(w,sp,sc,st,idx,calmTried<reinfN); if (r.reinfiltrated!==null) calmTried++; res.runs.push(r); }
    }
    const rr=res.runs.filter(r=>res.scenarios[r.scenario].mission===id);
    process.stderr.write(`${CANDIDATE} ${id}: scenarios ${res.scenarios.filter(s=>s.mission===id).length} spotted ${res.scenarios.filter(s=>s.mission===id&&s.spotted).length} runs ${rr.length} caught ${rr.filter(r=>r.caught).length} calm ${rr.filter(r=>r.calm).length} (${((Date.now()-t)/1000).toFixed(0)} s)\n`);
  }
  fs.writeFileSync(out,JSON.stringify(res,null,1)+'\n');
}
