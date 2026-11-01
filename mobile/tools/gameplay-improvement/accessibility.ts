/**
 * Accessibility of a mission's routes without any optimisation: a thief walks an authored route at one gait with NO
 * waiting, from 41 start times (0–20 s, every 0.5 s; guards patrol the whole time, so this samples every patrol phase).
 * The share of start times that clear unseen is the "timing window" a player has to find by watching; 0 % means the
 * route needs mid-route waiting or another plan, ~100 % means no observation is needed. Also records who spotted or
 * caught the thief. Same production simulation and segment player as the expert planner.
 *   node --import tsx tools/gameplay-improvement/accessibility.ts <out.json> <label=stage.json[#id]>…
 */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation} from '../../src/game/world/navigation';
import {createPlaygroundState,stepPlayground} from '../../src/game/playground/playgroundState';
import {BODY} from '../../src/game/guards/guardTuning';
import {playSegment,split} from '../gameplay-audit/expertPlanner';
import type {Ctx,GaitPolicy} from '../gameplay-audit/expertPlanner';
import {polyline,toWorld,objectiveTile,exitCenterTile} from '../gameplay-audit/routeGeometry';

export const DELAYS=Array.from({length:41},(_,i)=>i*0.5);
/** Screening uses every second start time (21 of 41) when ACCESS_STEP=1. */
const STARTS=process.env.ACCESS_STEP==='1'?DELAYS.filter((_,i)=>i%2===0):DELAYS;

export function blindRun(def:StageDefinition, route:number, gait:GaitPolicy, delay:number): {
  outcome:string;cause:string|null;spotted:boolean;spotter:string|null;
  spotAt:{x:number;y:number}|null;caughtBy:string|null;
} {
  const stage=compileStage(def), nav=buildNavigation(stage,BODY.guardRadius), pnav=buildNavigation(stage,BODY.playerRadius+1);
  const ctx={stage,nav,gait} as Ctx;
  let s=createPlaygroundState(stage); s.playerMode=0;
  for (let f=0; f<Math.round(delay*60); f++) stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:stage.width,h:stage.height},stage.movementBlockers,stage.visionBlockers,nav);
  const approach=split(polyline(pnav,def.testRoutes![route].points.map(toWorld))); approach.push(toWorld(objectiveTile(def)));
  let spotted=false, spotter:string|null=null, spotAt:{x:number;y:number}|null=null;
  const run=(segs:{x:number;y:number}[],last:boolean)=>{ for (let i=0;i<segs.length;i++) { const o=playSegment(s,ctx,segs[i],0,last&&i===segs.length-1);
    if (o.rank===1&&!spotted) { spotted=true; spotter=o.state.events.spottedSource||'?'; spotAt={x:+(o.state.player.x/TILE).toFixed(1),y:+(o.state.player.y/TILE).toFixed(1)}; } s=o.state; if (o.rank===2) return o.cause; if (s.mission.complete) return 'complete'; } return 'ok'; };
  const a=run(approach,false);
  if (a!=='ok'&&a!=='complete') return {outcome:'fail-approach',cause:a,spotted,spotter,spotAt,caughtBy:s.events.caughtBy||null};
  const pick=s; let result='fail-escape', caughtBy:string|null=null;
  for (const er of [def.escapeRoutes![0],def.escapeRoutes![1]??def.escapeRoutes![0]]) {
    s=structuredClone(pick);
    const esc=split(polyline(pnav,[toWorld(objectiveTile(def)),...er.points.map(toWorld).slice(1)])); esc.push(toWorld(exitCenterTile(def)));
    const e=run(esc,true); if (e==='complete'||s.mission.complete) { result='clear'; break; } caughtBy=s.events.caughtBy||caughtBy;
  }
  return {outcome:result,cause:result==='clear'?null:'escape',spotted,spotter,spotAt,caughtBy};
}

export function accessibility(def:StageDefinition) {
  const out:Record<string,unknown>={};
  for (const route of def.testRoutes!.map((_,i)=>i)) for (const gait of ['sneak','walk','run'] as GaitPolicy[]) {
    const rows=STARTS.map(d=>({delay:d,...blindRun(def,route,gait,d)}));
    const unseen=rows.filter(r=>r.outcome==='clear'&&!r.spotted).length, clear=rows.filter(r=>r.outcome==='clear').length;
    const who:Record<string,number>={}, where:Record<string,number>={}; for (const r of rows) { const k=r.spotter??r.caughtBy; if (k&&!(r.outcome==='clear'&&!r.spotted)) who[k]=(who[k]??0)+1;
      if (r.spotAt) { const w=`${r.spotter}@${Math.round(r.spotAt.x)},${Math.round(r.spotAt.y)}`; where[w]=(where[w]??0)+1; } }
    out[`r${route}/${gait}`]={unseenShare:+(unseen/rows.length).toFixed(3),clearShare:+(clear/rows.length).toFixed(3),spottedOrCaughtBy:who,spottedWhere:where};
  }
  return out;
}

if (process.argv[1]?.endsWith('accessibility.ts')) {
  const [out,...specs]=process.argv.slice(2); const res:Record<string,unknown>={};
  for (const spec of specs) { const [label,rest]=spec.split('='), [file,id]=rest.split('#');
    const defs=JSON.parse(fs.readFileSync(file,'utf8')) as StageDefinition[], def=id?defs.find(d=>d.id===id)!:defs[0];
    res[label]=accessibility(def);
    console.log(label,JSON.stringify(Object.fromEntries(Object.entries(res[label] as Record<string,{unseenShare:number;spottedOrCaughtBy:Record<string,number>}>).map(([k,v])=>[k,`${Math.round(v.unseenShare*100)}% ${JSON.stringify(v.spottedOrCaughtBy)}`])))); }
  fs.writeFileSync(out,JSON.stringify(res,null,1)+'\n');
}
