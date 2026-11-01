/**
 * v4 Phase 7 — does a given map opening help a spotted thief? From every spotted state of a mission (chaseLab
 * scenarios), fly a FIXED line (waypoints in tiles, then stand at the last one) and record caught / LOS / calm.
 * Compares maps (e.g. 07-01 before and after the v3 rework) and candidates (loader) on identical flight lines.
 *   node --import tsx [--import ./tools/gameplay-improvement/v4/candidateLoader.mjs] tools/gameplay-improvement/v4/routeEscape.ts <out.json> <campaign.json> <id> <name=x,y;x,y…>…
 */
import fs from 'node:fs';
import type {StageDefinition} from '../../../src/game/levels/StageDefinition';
import {TILE} from '../../../src/game/world/compileStage';
import {findPath} from '../../../src/game/world/navigation';
import {stepPlayground} from '../../../src/game/playground/playgroundState';
import {Awareness} from '../../../src/game/core/types';
import {world,scenarios,provoke,CANDIDATE} from './chaseLab';

const [out,campaignFile,id,...lines]=process.argv.slice(2);
const def=(JSON.parse(fs.readFileSync(campaignFile,'utf8')) as StageDefinition[]).find(d=>d.id===id)!, w=world(def);
const flights=lines.map(l=>{const [name,pts]=l.split('=');return {name,pts:pts.split(';').map(p=>{const [x,y]=p.split(',').map(Number);return {x:x*TILE,y:y*TILE};})};});
const rows:Record<string,unknown>[]=[];
for (const sc of scenarios(def)) {
  const sp=provoke(w,sc); if (!sp) continue;
  for (const f of flights) {
    const s=structuredClone(sp.s), t0=s.t; let leg=0, path:number[]=[], k=0, los:number|null=null, calm=false;
    const plan=()=>{path=findPath(w.pnav,s.player.x,s.player.y,f.pts[leg].x,f.pts[leg].y);k=0;};
    plan();
    while (s.t-t0<60&&!s.events.caught) {
      while (k+2<path.length&&Math.hypot(path[k]-s.player.x,path[k+1]-s.player.y)<6) k+=2;
      const tgt=f.pts[leg];
      if (Math.hypot(s.player.x-tgt.x,s.player.y-tgt.y)<8) { if (leg<f.pts.length-1) { leg++; plan(); } else { s.playerMode=0; s.player.hasTarget=false; } }
      else if (path.length>=2) { s.playerMode=3; s.player.tx=path[k]; s.player.ty=path[k+1]; s.player.hasTarget=true; }
      stepPlayground(s,1/60,TILE,400,800,{x:0,y:0,w:w.stage.width,h:w.stage.height},w.stage.movementBlockers,w.stage.visionBlockers,w.nav);
      const seen=s.guards.some(g=>g.canSee)||s.securityCameras.some(c=>c.canSee);
      if (!seen&&los===null) los=s.t-t0;
      if (!s.events.globalAlert&&s.guards.every(g=>g.awareness===Awareness.Patrol)) { calm=true; break; }
    }
    rows.push({candidate:CANDIDATE,scenario:`${sc.kind}:${sc.source}@${sc.distance}${sc.warmup?'+4s':''}`,spotAt:[+(sp.s.player.x/TILE).toFixed(1),+(sp.s.player.y/TILE).toFixed(1)],
      flight:f.name,caught:s.events.caught,caughtAt:s.events.caught?+(s.t-t0).toFixed(2):null,caughtBy:s.events.caughtBy||null,los:los===null?null:+los.toFixed(2),calm});
  }
}
fs.writeFileSync(out,JSON.stringify(rows,null,1)+'\n');
for (const f of flights) { const r=rows.filter(x=>x.flight===f.name); console.log(`${CANDIDATE} ${id} ${f.name}: n ${r.length} caught ${r.filter(x=>x.caught).length} los ${r.filter(x=>x.los!==null).length} calm ${r.filter(x=>x.calm).length}`); }
