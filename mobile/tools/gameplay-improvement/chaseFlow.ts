/**
 * Chase & escape flow with the production 60 Hz simulation: the thief walks the authored safe route until a guard or
 * camera spots it, then flees to the nearest reachable floor spot no alerted guard can see (real LOS, re-planned every
 * 0.5 s), waits there until every guard is back to patrol, and resumes: approach, pickup, escape (quick route; the
 * alternate after lockdown). Logs each phase with its time: suspicion → spotted → chase → LOS break → search →
 * give-up / re-spot → pickup → escape / caught.
 *   node --import tsx tools/gameplay-improvement/chaseFlow.ts <out.json> [ids|all] [--trace id]
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,findPath,clearSegment} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import type {PlaygroundState} from '../../src/game/playground/playgroundState';
import {BODY} from '../../src/game/guards/guardTuning';
import {Awareness} from '../../src/game/core/types';
import {polyline,toWorld,spotSignature,exitCenterTile,objectiveTile} from '../gameplay-audit/routeGeometry';
import type {Pt} from '../gameplay-audit/routeGeometry';

type Phase='approach'|'flee'|'hide'|'resume'|'escape';
export interface FlowEvent {t:number;event:string;detail?:string}
export interface FlowResult {id:string;delay:number;outcome:string;seconds:number;events:FlowEvent[];spotted:boolean;losBreak:boolean;gaveUp:boolean;respotted:number;
  spottedToLosBreak:number|null;losBreakToGiveUp:number|null;spottedToCaught:number|null;hideTiles:number|null;caughtBy:string|null}

const ALERTED=new Set<number>([Awareness.Alert,Awareness.Chase,Awareness.Search,Awareness.Investigate]);

/** start: optional controlled scenario — the thief starts at `at` and walks back and forth across `across` (a guard's
 *  view) until spotted, then flees. Without it the thief plays the mission from the spawn along the safe route. */
export function chaseFlow(def:StageDefinition, delay:number, onStep?:(s:PlaygroundState,phase:Phase)=>void, start?:{at:Pt;across:Pt}):FlowResult {
  const stage=compileStage(def), nav=buildNavigation(stage,BODY.guardRadius), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const s=createPlaygroundState(stage); s.playerMode=0;
  if (start) { s.player.x=start.at.x; s.player.y=start.at.y; }
  const approach=polyline(pnav,def.testRoutes![0].points.map(toWorld)); approach.push(toWorld(objectiveTile(def)));
  const quick=polyline(pnav,[toWorld(objectiveTile(def)),...def.escapeRoutes![0].points.map(toWorld).slice(1),toWorld(exitCenterTile(def))]);
  const alt=polyline(pnav,[toWorld(objectiveTile(def)),...(def.escapeRoutes![1]??def.escapeRoutes![0]).points.map(toWorld).slice(1),toWorld(exitCenterTile(def))]);
  // candidate hiding cells: floor cell centres
  const cells:Pt[]=[]; for (let y=0;y<stage.rows;y++) for (let x=0;x<stage.cols;x++) if (stage.grid[y*stage.cols+x]===1) cells.push({x:(x+0.5)*TILE,y:(y+0.5)*TILE});
  const events:FlowEvent[]=[]; const log=(event:string,detail?:string)=>{ if (events[events.length-1]?.event!==event) events.push({t:+s.t.toFixed(2),event,detail}); };
  let phase:Phase='approach', path=approach, leg=1, hide:Pt|null=null, replanAt=0, calmSince=-1, sig=spotSignature(s), firstSusp=false;
  let spottedAt:number|null=null, losAt:number|null=null, gaveUpAt:number|null=null, respotted=0, hideTiles:number|null=null, prevChase=false, prevSeen=false, prevSearch=false, switched=false;
  const vision=()=>s.effectiveVisionBlockers??stage.visionBlockers;
  // a spot is "seen" if any guard or camera has a clear line to it within its range (+1 tile): conservative, ignores cones
  const seenFrom=(q:Pt)=>s.guards.some(g=>Math.hypot(g.x-q.x,g.y-q.y)<g.visionRange+TILE&&clearSegment(g.x,g.y,q.x,q.y,vision()))||
    s.securityCameras.some(c=>Math.hypot(c.x-q.x,c.y-q.y)<c.visionRange&&clearSegment(c.x,c.y,q.x,q.y,vision()));
  // a flight path must not pass within 1.5 tiles of a guard once it is 2 tiles from where the thief stands
  // ...and its first tile must take the thief away from the nearest alerted guard
  const pathNearGuard=(pp:number[])=>{const x0=s.player.x,y0=s.player.y;
    const threat=s.guards.filter(g=>ALERTED.has(g.awareness)).sort((a,b)=>Math.hypot(a.x-x0,a.y-y0)-Math.hypot(b.x-x0,b.y-y0))[0];
    if (threat) { let k=0; while(k+2<pp.length&&Math.hypot(pp[k]-x0,pp[k+1]-y0)<TILE)k+=2; if (Math.hypot(pp[k]-threat.x,pp[k+1]-threat.y)<=Math.hypot(x0-threat.x,y0-threat.y)) return true; }
    for(let k=0;k<pp.length;k+=2){if(Math.hypot(pp[k]-x0,pp[k+1]-y0)<2*TILE)continue;for(const g of s.guards)if(Math.hypot(g.x-pp[k],g.y-pp[k+1])<1.5*TILE)return true;}return false;};
  for (let f=0; f<120*60 && !s.events.caught && !s.mission.complete; f++) {
    const p=s.player;
    if (!firstSusp&&s.guards.some(g=>g.suspicion>=0.25)) { firstSusp=true; log('suspicion'); }
    if (spotSignature(s)>sig) { sig=spotSignature(s); if (spottedAt===null) { spottedAt=s.t; log('spotted'); } else { respotted++; log('re-spotted'); }
      if (phase!=='escape') { phase='flee'; hide=null; replanAt=0; } }
    const chase=s.guards.some(g=>g.awareness===Awareness.Chase), seen=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee), search=s.guards.some(g=>g.awareness===Awareness.Search);
    if (chase&&!prevChase) log('chase');
    if (prevSeen&&!seen&&(chase||phase==='flee')&&losAt===null) { losAt=s.t; log('los-break'); }
    if (search&&!prevSearch) log('search');
    prevChase=chase; prevSeen=seen; prevSearch=search;
    const calm=s.guards.every(g=>g.awareness===Awareness.Patrol||g.awareness===Awareness.Return)&&!s.events.globalAlert;
    if (phase==='flee'||phase==='hide') {
      if (calm) { if (calmSince<0) calmSince=s.t; } else calmSince=-1;
      if (calm&&s.t-calmSince>1) { if (gaveUpAt===null&&spottedAt!==null) { gaveUpAt=s.t; log('give-up'); } phase=s.mission.treasure?'escape':'resume';
        path=polyline(pnav,[{x:p.x,y:p.y},...(s.mission.treasure?quick:approach).slice(1)]); leg=1; }
    }
    if (phase==='flee'&&s.t>=replanAt&&!(hide&&!seenFrom(hide))) {
      replanAt=s.t+0.5;
      const options=cells.map(q=>({q,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(o=>o.d>=3*TILE&&o.d<=9*TILE&&!seenFrom(o.q)).sort((a,b)=>a.d-b.d).slice(0,16);
      let best:{q:Pt;len:number}|null=null;
      for (const o of options) { const pp=findPath(pnav,p.x,p.y,o.q.x,o.q.y); if (!pp.length||pathNearGuard(pp)) continue;
        let len=0; for (let k=2;k<pp.length;k+=2) len+=Math.hypot(pp[k]-pp[k-2],pp[k+1]-pp[k-1]); if (!best||len<best.len) best={q:o.q,len}; }
      if (!best) { // nowhere hidden in reach: run to the reachable spot farthest from the alerted guards
        const far=(q:Pt)=>Math.min(...s.guards.map(g=>Math.hypot(g.x-q.x,g.y-q.y)));
        for (const o of cells.map(q=>({q,d:Math.hypot(q.x-p.x,q.y-p.y)})).filter(o=>o.d>=3*TILE&&o.d<=9*TILE).sort((a,b)=>far(b.q)-far(a.q)).slice(0,10)) {
          const pp=findPath(pnav,p.x,p.y,o.q.x,o.q.y); if (!pp.length||pathNearGuard(pp)) continue; let len=0; for (let k=2;k<pp.length;k+=2) len+=Math.hypot(pp[k]-pp[k-2],pp[k+1]-pp[k-1]); best={q:o.q,len}; break; }
        if (best) log('flee-open','no hidden spot in reach');
      }
      if (best&&(!hide||best.q.x!==hide.x||best.q.y!==hide.y)) { hide=best.q; hideTiles=+(best.len/TILE).toFixed(2); }
    }
    if (phase==='flee'&&hide&&Math.hypot(p.x-hide.x,p.y-hide.y)<6) { phase='hide'; log('hidden'); }
    if (phase==='hide'&&(seenFrom({x:p.x,y:p.y})||s.guards.some(g=>ALERTED.has(g.awareness)&&Math.hypot(g.x-p.x,g.y-p.y)<2.5*TILE))) { phase='flee'; replanAt=0; }
    if (start&&phase==='approach') {
      // provoke: walk across the guard's view (between `at` and `across`) until spotted
      const tgt=leg%2===1?start.across:start.at; s.playerMode=2; p.tx=tgt.x; p.ty=tgt.y; p.hasTarget=true;
      if (Math.hypot(p.x-tgt.x,p.y-tgt.y)<4) leg++;
    } else if (phase==='approach'||phase==='resume'||phase==='escape') {
      if (s.mission.treasure&&phase!=='escape') { phase='escape'; log('pickup'); path=polyline(pnav,[{x:p.x,y:p.y},...quick.slice(1)]); leg=1; }
      if (phase==='escape'&&!switched&&s.events.lockdownActive) { switched=true; log('lockdown','switch to alternate escape'); path=polyline(pnav,[{x:p.x,y:p.y},...alt.slice(1)]); leg=1; }
      const target=path[Math.min(leg,path.length-1)];
      s.playerMode=phase==='escape'?3:2; p.tx=target.x; p.ty=target.y; p.hasTarget=true;
      if (Math.hypot(p.x-target.x,p.y-target.y)<4&&leg<path.length-1) leg++;
    } else if (phase==='flee'&&hide) { s.playerMode=3; p.tx=hide.x; p.ty=hide.y; p.hasTarget=true; }
    else { s.playerMode=0; p.hasTarget=false; }
    if (s.t<delay) { s.playerMode=0; p.hasTarget=false; }
    stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
    onStep?.(s,phase);
  }
  const outcome=s.mission.complete?(spottedAt!==null?'clear-after-spotted':'clear-unseen'):s.events.caught?(spottedAt!==null?'caught-after-spotted':'caught-unalerted'):'timeout';
  log(outcome,s.events.caughtBy||undefined);
  return {id:def.id,delay,outcome,seconds:+s.t.toFixed(2),events,spotted:spottedAt!==null,losBreak:losAt!==null,gaveUp:gaveUpAt!==null,respotted,
    spottedToLosBreak:spottedAt!==null&&losAt!==null?+(losAt-spottedAt).toFixed(2):null,losBreakToGiveUp:losAt!==null&&gaveUpAt!==null?+(gaveUpAt-losAt).toFixed(2):null,
    spottedToCaught:spottedAt!==null&&s.events.caught?+(s.t-spottedAt).toFixed(2):null,hideTiles,caughtBy:s.events.caughtBy||null};
}

if (process.argv[1]?.endsWith('chaseFlow.ts')&&process.argv[2]==='escape') {
  // escape-oracle sweep by spotting distance: node … chaseFlow.ts escape <out.json> [ids|all]
  const [,out,list]=process.argv.slice(2);
  const defs=(campaign as StageDefinition[]).filter(d=>!list||list==='all'||list.split(',').includes(d.id));
  const rows=defs.flatMap(d=>[2.5,3.5,4.5].flatMap(dist=>provokeScenarios(d,[dist]).map(sc=>({id:d.id,guard:sc.guard,distance:dist,...escapeOptions(d,sc)}))));
  fs.writeFileSync(out,JSON.stringify(rows,null,1)+'\n');
  for (const dist of [2.5,3.5,4.5]) { const r=rows.filter(x=>x.distance===dist&&x.spotted);
    console.log(`distance ${dist}: scenarios ${rows.filter(x=>x.distance===dist).length}, spotted ${r.length}, calm-escape exists ${r.filter(x=>x.successes>0).length}, survive-45s exists ${r.filter(x=>x.survived>0).length}, options calm ${(r.reduce((n,x)=>n+(x.options?x.successes/x.options:0),0)/Math.max(1,r.length)).toFixed(2)}, options survive ${(r.reduce((n,x)=>n+(x.options?x.survived/x.options:0),0)/Math.max(1,r.length)).toFixed(2)}, median catch ${JSON.stringify(r.map(x=>x.medianCatchSeconds).filter(v=>v!==null).sort((a,b)=>(a as number)-(b as number))[Math.floor(r.length/2)])}`); }
} else if (process.argv[1]?.endsWith('chaseFlow.ts')) {
  const [out,list]=process.argv.slice(2);
  const defs=(campaign as StageDefinition[]).filter(d=>!list||list==='all'||list.split(',').includes(d.id));
  const rows=[...defs.flatMap(d=>[0,2,4].map(dl=>({kind:'mission',...chaseFlow(d,dl)}))),
    ...defs.flatMap(d=>provokeScenarios(d).map(sc=>({kind:'provoked',guard:sc.guard,...chaseFlow(d,0,undefined,sc),escape:escapeOptions(d,sc)})))];
  fs.writeFileSync(out,JSON.stringify(rows,null,1)+'\n');
  for (const kind of ['mission','provoked']) { const rs=rows.filter(r=>r.kind===kind), sp=rs.filter(r=>r.spotted);
  console.log(`${kind}: runs ${rs.length}, spotted ${sp.length}, LOS break ${sp.filter(r=>r.losBreak).length}, gave up ${sp.filter(r=>r.gaveUp).length}, clear after spotted ${sp.filter(r=>r.outcome==='clear-after-spotted').length}, caught after spotted ${sp.filter(r=>r.outcome==='caught-after-spotted').length}, timeouts ${rs.filter(r=>r.outcome==='timeout').length}`); }
  const pv=rows.filter(r=>r.kind==='provoked') as unknown as {escape:{spotted:boolean;successes:number;options:number;caughtBeforeSpotted:boolean}}[];
  const sp=pv.filter(r=>r.escape.spotted);
  console.log(`escape oracle: provoked ${pv.length}, spotted ${sp.length}, caught before spotted ${pv.filter(r=>r.escape.caughtBeforeSpotted).length}, escape exists ${sp.filter(r=>r.escape.successes>0).length}, mean share of options that work ${(sp.reduce((n,r)=>n+(r.escape.options?r.escape.successes/r.escape.options:0),0)/Math.max(1,sp.length)).toFixed(2)}`);
}

/** Controlled chase scenarios on a real map: for each guard, a floor spot ~3.5 tiles ahead of its starting post with a
 *  clear line, and a second spot 2 tiles to the side to walk back and forth across its view. */
export function provokeScenarios(def:StageDefinition, distances=[3.5,3,2.5]):{guard:string;at:Pt;across:Pt;distance:number}[] {
  const stage=compileStage(def), out:{guard:string;at:Pt;across:Pt;distance:number}[]=[];
  const floor=(q:Pt)=>{const x=Math.floor(q.x/TILE),y=Math.floor(q.y/TILE);return x>=0&&y>=0&&x<stage.cols&&y<stage.rows&&stage.grid[y*stage.cols+x]===1;};
  for (const g of stage.guards) for (const dist of distances) {
    const at={x:g.x+Math.cos(g.facing)*dist*TILE,y:g.y+Math.sin(g.facing)*dist*TILE};
    const side=[1,-1].map(k=>({x:at.x+Math.cos(g.facing+k*Math.PI/2)*2*TILE,y:at.y+Math.sin(g.facing+k*Math.PI/2)*2*TILE})).find(q=>floor(q)&&clearSegment(at.x,at.y,q.x,q.y,stage.movementBlockers,BODY.playerRadius+1));
    if (floor(at)&&side&&clearSegment(g.x,g.y,at.x,at.y,stage.visionBlockers)) { out.push({guard:g.id,at,across:side,distance:dist}); break; }
  }
  return out;
}

/**
 * Escape options from the moment the thief is spotted (cloned production state): for up to 24 floor spots 2–10 tiles
 * away (unseen spots first, then nearest), run there along the navigation path and stand still. An option succeeds when
 * every guard is back to patrol/return with no global alert for 1 s, without a capture (45 s cap). Answers "is there a
 * real chance to escape from here", independent of any one flight heuristic.
 */
export function escapeOptions(def:StageDefinition, start:{at:Pt;across:Pt}, onOption?:(target:Pt,s:PlaygroundState,ok:boolean)=>void, record?:(s:PlaygroundState)=>void) {
  const stage=compileStage(def), nav=buildNavigation(stage,BODY.guardRadius), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const s0=createPlaygroundState(stage); s0.playerMode=0; s0.player.x=start.at.x; s0.player.y=start.at.y;
  const step=(s:PlaygroundState)=>stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const sig0=spotSignature(s0); let leg=1;
  for (let f=0; f<60*60 && spotSignature(s0)===sig0 && !s0.events.caught; f++) {
    const tgt=leg%2===1?start.across:start.at; s0.playerMode=2; s0.player.tx=tgt.x; s0.player.ty=tgt.y; s0.player.hasTarget=true;
    if (Math.hypot(s0.player.x-tgt.x,s0.player.y-tgt.y)<4) leg++; step(s0);
  }
  if (s0.events.caught) return {spotted:false,caughtBeforeSpotted:true,options:0,successes:0,survived:0,catchers:{} as Record<string,number>,medianCatchSeconds:null as number|null,bestCalm:null as number|null,firstLosBreak:null as number|null,tSpotted:+s0.t.toFixed(2)};
  if (spotSignature(s0)===sig0) return {spotted:false,caughtBeforeSpotted:false,options:0,successes:0,survived:0,catchers:{} as Record<string,number>,medianCatchSeconds:null,bestCalm:null,firstLosBreak:null,tSpotted:null};
  const tSpot=s0.t, p0={x:s0.player.x,y:s0.player.y}, blockers=s0.effectiveVisionBlockers??stage.visionBlockers;
  const seen=(q:Pt)=>s0.guards.some(g=>Math.hypot(g.x-q.x,g.y-q.y)<g.visionRange+TILE&&clearSegment(g.x,g.y,q.x,q.y,blockers));
  const cells:{q:Pt;d:number;hidden:boolean}[]=[];
  for (let y=0;y<stage.rows;y++) for (let x=0;x<stage.cols;x++) if (stage.grid[y*stage.cols+x]===1) { const q={x:(x+0.5)*TILE,y:(y+0.5)*TILE}, d=Math.hypot(q.x-p0.x,q.y-p0.y); if (d>=2*TILE&&d<=10*TILE) cells.push({q,d,hidden:!seen(q)}); }
  cells.sort((a,b)=>Number(b.hidden)-Number(a.hidden)||a.d-b.d);
  let successes=0, survived=0, tried=0, bestCalm:number|null=null, firstLos:number|null=null; const catchers:Record<string,number>={}; const catchTimes:number[]=[];
  const picks=[...cells.filter(c=>c.hidden).filter((_,i)=>i%3===0).slice(0,16),...cells.filter(c=>!c.hidden).slice(0,8)];
  for (const c of picks) {
    const pp=findPath(pnav,p0.x,p0.y,c.q.x,c.q.y); if (!pp.length) continue; tried++;
    const s=structuredClone(s0); let k=0, calmSince=-1, los:number|null=null; record?.(s);
    while (s.t-tSpot<45 && !s.events.caught) {
      while (k+2<pp.length&&Math.hypot(s.player.x-pp[k],s.player.y-pp[k+1])<6) k+=2;
      const arrived=Math.hypot(s.player.x-c.q.x,s.player.y-c.q.y)<6;
      if (!arrived) { s.playerMode=3; s.player.tx=pp[k]; s.player.ty=pp[k+1]; s.player.hasTarget=true; } else { s.playerMode=0; s.player.hasTarget=false; }
      step(s); record?.(s);
      if (los===null&&!s.guards.some(g=>g.canSee)&&!s.securityCameras.some(cm=>cm.canSee)) los=s.t-tSpot;
      const calm=s.guards.every(g=>g.awareness===Awareness.Patrol||g.awareness===Awareness.Return)&&!s.events.globalAlert;
      if (calm) { if (calmSince<0) calmSince=s.t; if (s.t-calmSince>=1) break; } else calmSince=-1;
    }
    onOption?.(c.q,s,!s.events.caught&&calmSince>=0&&s.t-calmSince>=1);
    if (!s.events.caught) survived++; else { const role=s.guards.find(g=>g.id===s.events.caughtBy); const k=role&&Math.hypot(role.x-p0.x,role.y-p0.y)<6*TILE?'nearby guard':'converging guard'; catchers[k]=(catchers[k]??0)+1; catchTimes.push(+(s.t-tSpot).toFixed(2)); }
    if (!s.events.caught&&calmSince>=0&&s.t-calmSince>=1) { successes++; const tc=+(calmSince-tSpot).toFixed(2); if (bestCalm===null||tc<bestCalm) bestCalm=tc; if (los!==null&&(firstLos===null||los<firstLos)) firstLos=+los.toFixed(2); }
  }
  catchTimes.sort((a,b)=>a-b);
  return {spotted:true,caughtBeforeSpotted:false,options:tried,successes,survived,catchers,medianCatchSeconds:catchTimes.length?catchTimes[catchTimes.length>>1]:null,bestCalm,firstLosBreak:firstLos,tSpotted:+tSpot.toFixed(2)};
}
