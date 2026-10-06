/**
 * Full campaign audit (Phase 8): every baked mission against the checks a refactor must not disturb and a release
 * must not ship without. Read-only: it compiles the baked stages and reports, it writes nothing into the game.
 *
 *  generation   the bake reproduces the committed campaign file byte for byte
 *  topology     errors of the topology audit
 *  routes       an authored route segment the thief's body cannot walk
 *  sealed       floor drawn open that the thief can never stand on;  squeeze: reachable only through a sub-tile gap
 *  gap          longest stretch of an authored route with no cover in reach (limit 8 tiles)
 *  patrol       a guard step that touches collision during 120 s of the real patrol code
 *  waypoint     a patrol point the guard's body cannot stand on
 *  camera       mounted inside a solid piece; front blocked (sees under 25 % of its floor, or under 1 tile ahead)
 *  door         no room for the thief's body half a tile either side of the opening
 *  entry        spawn not standable;  reach: objective or exit outside the spawn's walkable component
 *
 * Exit code 1 on any finding outside KNOWN, or if the bake does not reproduce the file. `npm run campaign:audit`.
 * Usage: node --import tsx tools/campaign/v13FullAudit.ts [<out.json>]
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';
import {auditV124bTopology} from './v124bTopologyQA';
import {fakeGaps} from './v13QA';
import {corridorAudit} from './v13Corridor';
import {buildV13Campaign} from './v13Build';
import {loadCampaign,writeReport,walkPatrols,cameraView} from './v13QaLib';

const GAP_LIMIT=8;
/** Findings accepted as they are (Phase 8B decision, kept in the frozen baseline): reported, not counted as failures.
 *  05-05 (camera inside the exit planter) left this list in Phase 9: the planter was moved half a tile. */
export const KNOWN:Record<string,{issue:string;why:string}[]>={
 '05-02':[{issue:'patrol: 05-02-g4 touches collision',why:'tangent to the cashier cage corner, 3.3 px real clearance, no overlap'}],
};
const t=(v:number)=>(v/TILE).toFixed(2);
export function auditMission(def:StageDefinition){
 const stage=compileStage(def),mov=stage.movementBlockers,solid=mov.slice(stage.wallRects.length*4),issues:string[]=[],notes:string[]=[];
 const stand=(x:number,y:number,r:number)=>clearSegment(x,y,x,y,mov,r);
 // Topology and authored routes.
 for(const e of auditV124bTopology(def).errors)issues.push(`topology: ${e}`);
 for(const r of [...(def.testRoutes??[]),...(def.escapeRoutes??[])])for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i];
  if(!clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,mov,BODY.playerRadius))issues.push(`routes: ${r.name.split(':')[0]} blocked ${a.x},${a.y}→${b.x},${b.y}`);}
 const gaps=fakeGaps(def);
 for(const s of gaps.sealed)issues.push(`sealed: ${s.w}×${s.h} at ${s.x},${s.y}`);
 for(const s of gaps.squeezes)issues.push(`squeeze: ${s.w}×${s.h} at ${s.x},${s.y}`);
 const worst=corridorAudit(def,[],true).sort((a,b)=>b.gap.len-a.gap.len)[0];
 if(worst&&worst.gap.len>GAP_LIMIT)issues.push(`gap: ${worst.gap.len.toFixed(1)} on ${worst.route}`);
 // Guards: waypoints and 120 s of the real patrol.
 stage.guards.forEach((g,i)=>g.route.forEach(p=>{if(!stand(p.x,p.y,BODY.guardRadius))issues.push(`waypoint: g${i+1} ${t(p.x)},${t(p.y)} inside collision`);}));
 const hit=new Map<string,string>();
 walkPatrols(stage,(g,_i,seconds)=>{if(!hit.has(g.id))hit.set(g.id,`patrol: ${g.id} touches collision at ${t(g.x)},${t(g.y)} t=${seconds.toFixed(1)}s`);});
 issues.push(...hit.values());
 // Cameras.
 let minSeen=100,minAhead=Infinity;
 (stage.cameras??[]).forEach((c,i)=>{
  for(let k=0;k<solid.length;k+=4)if(c.x>solid[k]&&c.x<solid[k+2]&&c.y>solid[k+1]&&c.y<solid[k+3]){issues.push(`camera: cam${i+1} ${t(c.x)},${t(c.y)} inside a solid piece`);break;}
  const {share,ahead}=cameraView(stage,c);minSeen=Math.min(minSeen,share);minAhead=Math.min(minAhead,ahead/TILE);
  if(share<25||ahead<TILE)issues.push(`camera: cam${i+1} ${t(c.x)},${t(c.y)} front blocked (sees ${share}%, ${t(ahead)} tiles ahead)`);
 });
 // Doors: the thief's body fits half a tile either side of the opening and walks straight through.
 for(const d of stage.doors??[]){const dx=d.orientation==='horizontal'?0:TILE*.6,dy=d.orientation==='horizontal'?TILE*.6:0;
  if(!clearSegment(d.x-dx,d.y-dy,d.x+dx,d.y+dy,mov,BODY.playerRadius))issues.push(`door: ${d.id} ${t(d.x)},${t(d.y)} obstructed`);}
 // Entry, objective, exit.
 const s=stage.playerSpawn,pnav=buildNavigation(stage,BODY.playerRadius);
 if(!stand(s.x,s.y,BODY.playerRadius+2))issues.push(`entry: spawn ${t(s.x)},${t(s.y)} not clear`);
 const node=(x:number,y:number)=>{let best=-1,d=Infinity;for(let i=0;i<pnav.walkable.length;i++){if(!pnav.walkable[i])continue;const nx=(i%pnav.cols+.5)*pnav.cell,ny=(Math.floor(i/pnav.cols)+.5)*pnav.cell,q=(nx-x)**2+(ny-y)**2;if(q<d){d=q;best=i;}}return {comp:best<0?-1:pnav.components[best],dist:Math.sqrt(d)/TILE};};
 const home=node(s.x,s.y),goal=node(stage.objective.x,stage.objective.y),exit=node(stage.exit.x+stage.exit.w/2,stage.exit.y+stage.exit.h/2);
 if(goal.comp!==home.comp||goal.dist>1.5)issues.push(`reach: objective ${t(stage.objective.x)},${t(stage.objective.y)} not reachable (nearest floor ${goal.dist.toFixed(1)} tiles)`);
 if(exit.comp!==home.comp||exit.dist>1.5)issues.push(`reach: exit not reachable (nearest floor ${exit.dist.toFixed(1)} tiles)`);
 const known=issues.filter(i=>(KNOWN[def.id]??[]).some(k=>i.startsWith(k.issue)));
 notes.push(`gap ${worst?.gap.len.toFixed(1)??'-'}`,`guards ${stage.guards.length}`,`cams ${(stage.cameras??[]).length}${(stage.cameras??[]).length?` (min sees ${minSeen}%, ahead ${minAhead.toFixed(1)})`:''}`,`doors ${(stage.doors??[]).length}`,`props ${stage.props.length}`);
 return {id:def.id,issues:issues.filter(i=>!known.includes(i)),known,notes};
}
if(process.argv[1]?.endsWith('v13FullAudit.ts')){
 const defs=loadCampaign(),same=JSON.stringify(buildV13Campaign())===JSON.stringify(defs);
 console.log(`generation: ${defs.length} missions, bake ${same?'reproduces the campaign file':'DIFFERS from the campaign file'}`);
 const rows=defs.map(auditMission);
 for(const r of rows)console.log(`${r.id}  ${r.issues.length?'FAIL':'ok  '}  ${r.notes.join(' | ')}${r.issues.map(i=>'\n       - '+i).join('')}${r.known.map(i=>'\n       - known: '+i).join('')}`);
 const kinds=new Map<string,number>();for(const r of rows)for(const i of r.issues){const k=i.split(':')[0];kinds.set(k,(kinds.get(k)??0)+1);}
 const accepted=rows.reduce((n,r)=>n+r.known.length,0);
 console.log(`\n${rows.filter(r=>!r.issues.length).length} / ${rows.length} clean${kinds.size?' — '+[...kinds].map(([k,n])=>`${k} ${n}`).join(', '):''}${accepted?`; ${accepted} known existing finding${accepted>1?'s':''} kept as they are`:''}`);
 process.exitCode=same&&!kinds.size?0:1;
 const out=process.argv[2]??process.env.OUT;if(out)writeReport(out,{generation:same,missions:rows});
}
