/**
 * In-memory mission variants (the campaign JSON is never written): deep-copies a mission, applies a small data edit and
 * runs the expert planner on it, to test minimal-change proposals before anyone edits the campaign tools.
 *   node --import tsx tools/gameplay-audit/missionVariants.ts <out.json> <variantName,…|all>
 */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {planMission,GAITS} from './expertPlanner';

type Def = StageDefinition & {patrolRoutes:{id:string;points:{x:number;y:number;waitDuration?:number}[]}[]};
const base=(id:string)=>structuredClone((campaign as StageDefinition[]).find(d=>d.id===id)!) as Def;
const setRouteY=(d:Def,route:number,fromY:number,toY:number)=>{ for (const p of d.testRoutes![route].points) if (Math.abs(p.y-fromY)<0.01) p.y=toY; return d; };
export const VARIANTS:Record<string,{mission:string;routes:number[];note:string;make:()=>Def}> = {
  '03-04:original':{mission:'03-04',routes:[1],note:'authored risk route on g1 lane (y 14.9)',make:()=>base('03-04')},
  '03-04:path-y16':{mission:'03-04',routes:[1],note:'audit path only: risk leg moved to y 16.0 (map unchanged)',make:()=>setRouteY(base('03-04'),1,14.9,16.0)},
  '03-04:path-y17':{mission:'03-04',routes:[1],note:'audit path only: risk leg moved to y 17.0 (map unchanged)',make:()=>setRouteY(base('03-04'),1,14.9,17.0)},
  '03-04:g1-east-wait6':{mission:'03-04',routes:[1],note:'data: g1 east stop wait 3 → 6 s',make:()=>{const d=base('03-04');d.patrolRoutes.find(r=>r.id==='03-04-g1')!.points[1].waitDuration=6;return d;}},
  '05-03:path-y16':{mission:'05-03',routes:[1],note:'mirror of 03-04: audit path risk leg moved off the g1 lane',make:()=>{const d=base('05-03');const pts=d.testRoutes![1].points;const lane=pts.find((p,i)=>i>0&&Math.abs(p.y-14.9)<0.01);if(lane)setRouteY(d,1,14.9,16.0);return d;}},
};
const [out,list]=process.argv.slice(2);
if (!out) throw Error('usage: missionVariants.ts <out.json> <names|all>');
const names=!list||list==='all'?Object.keys(VARIANTS):list.split(',');
const rows:Record<string,unknown>[]=[];
for (const name of names) { const v=VARIANTS[name], def=v.make();
  for (const route of v.routes) for (const g of GAITS) { const t=Date.now(); const p=planMission(def,route,g);
    rows.push({variant:name,note:v.note,route,gait:g,clear:p.clear,unseen:p.unseen,seconds:p.seconds,waitSeconds:p.waitSeconds,windowMin:p.windowMin,budgetExhausted:p.budgetExhausted,failCause:p.failCause});
    process.stderr.write(`${name} r${route} ${g}: ${p.clear?(p.unseen?'unseen':'spotted'):'fail'} ${p.seconds??''} (${((Date.now()-t)/1000).toFixed(0)} s)\n`); } }
if (JSON.stringify(campaign).length===0) throw Error('unreachable');
fs.writeFileSync(out,JSON.stringify(rows,null,1)+'\n');
