/**
 * Corridor and exposure audit (Phase 7). For every authored route of a mission (safe, risk, quick escape,
 * lockdown escape) it measures two things on the baked stage:
 *
 *  sightline  the longest stretch the thief walks in a near-straight line with clear sight from one end to the
 *             other, and whether anything along it lets him step out of that line (a pocket hidden from an end);
 *  exposed    the longest stretch walked in full view of one standing position (a point of a guard's round, or a
 *             camera in its sweep) with no spot within 2 tiles that position cannot see: a crossing on timing alone.
 *
 * Guard cones and timing are ignored on purpose: a place a guard can see from somewhere on his round counts as
 * watched. The numbers rank where to look; the fix is decided on the picture.
 * Usage: node --import tsx tools/campaign/v13Corridor.ts [<campaign.json>] [<mission or chapter prefix>…]   (CHAPTERS=1-6 by default)
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {clearSegment} from '../../src/game/world/navigation';
import {loadCampaign,pickMissions} from './v13QaLib';
type P={x:number;y:number};
const REACH=2,STEP=.25,VERBOSE=!!process.env.VERBOSE;
/** `extra` are opaque solid boxes (tiles, [x0,y0,x1,y1]) tried on top of the stage; `gapOnly` skips the two slower measures. */
export function corridorAudit(def:StageDefinition,extra:number[][]=[],gapOnly=false){
 const stage=compileStage(def),add=extra.flatMap(b=>b.map(v=>v*TILE)),vis=[...stage.visionBlockers,...add],mov=[...stage.movementBlockers,...add];
 const floor=(q:P)=>def.layout[Math.floor(q.y)]?.[Math.floor(q.x)]==='.',sees=(a:P,b:P)=>clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,vis);
 const stand=(q:P)=>floor(q)&&clearSegment(q.x*TILE,q.y*TILE,q.x*TILE,q.y*TILE,mov,.3*TILE),walk=(a:P,b:P)=>clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,mov,.25*TILE);
 // Where a guard can be on his round, and what each camera can sweep.
 const posts:{at:P;range:number;who:string}[]=[];
 stage.guards.forEach((g,i)=>{const r=g.route.length?g.route:[{x:g.x,y:g.y}],n=g.routeMode==='loop'?r.length:r.length-1;
  for(let k=0;k<Math.max(1,n);k++){const a=r[k],b=r[(k+1)%r.length]??a,len=Math.hypot(b.x-a.x,b.y-a.y)/TILE,m=Math.max(1,Math.ceil(len));
   for(let j=0;j<=m;j++)posts.push({at:{x:(a.x+(b.x-a.x)*j/m)/TILE,y:(a.y+(b.y-a.y)*j/m)/TILE},range:g.visionRange/TILE,who:`g${i+1}`});}});
 const cams=(stage.cameras??[]).map((c,i)=>({at:{x:c.x/TILE,y:c.y/TILE},range:c.range/TILE,facing:c.centerFacing,spread:c.sweepAngle+c.visionAngle/2,who:`cam${i+1}`}));
 const watcher=(q:P):string|null=>{
  for(const h of posts)if(Math.hypot(h.at.x-q.x,h.at.y-q.y)<=h.range&&sees(h.at,q))return h.who;
  for(const c of cams){const d=Math.hypot(q.x-c.at.x,q.y-c.at.y);if(d>c.range||d<.4)continue;const a=Math.abs((Math.atan2(q.y-c.at.y,q.x-c.at.x)-c.facing+Math.PI*3)%(Math.PI*2)-Math.PI);if(a<=c.spread&&sees(c.at,q))return c.who;}
  return null;};
 const near=(p:P)=>{const out:P[]=[];for(let dy=-REACH;dy<=REACH+1e-6;dy+=STEP)for(let dx=-REACH;dx<=REACH+1e-6;dx+=STEP){const q={x:p.x+dx,y:p.y+dy};if(Math.hypot(dx,dy)<=REACH&&(dx||dy)&&stand(q)&&walk(p,q))out.push(q);}return out;};
 const rows=[];
 for(const route of [...(def.testRoutes??[]),...(def.escapeRoutes??[])]){
  const s:{p:P;d:number}[]=[];let d=0;
  for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i],len=Math.hypot(b.x-a.x,b.y-a.y),m=Math.max(1,Math.ceil(len/STEP));for(let j=i===1?0:1;j<=m;j++)s.push({p:{x:a.x+(b.x-a.x)*j/m,y:a.y+(b.y-a.y)*j/m},d:d+len*j/m});d+=len;}
  const pockets=s.map(q=>near(q.p));
  // Longest straight sightline along the walk, and whether a pocket in its middle is hidden from one of its ends.
  let sight={len:0,from:s[0].p,to:s[0].p,brk:true};
  if(!gapOnly)for(let i=0;i<s.length;i++)for(let j=s.length-1;j>i;j--){const len=Math.hypot(s[j].p.x-s[i].p.x,s[j].p.y-s[i].p.y);if(len<=sight.len)continue;
   if(s[j].d-s[i].d>len*1.06+.2||!sees(s[i].p,s[j].p))continue;
   let brk=false;for(let k=i;k<=j&&!brk;k++){if(s[k].d-s[i].d<2||s[j].d-s[k].d<2)continue;brk=pockets[k].some(q=>!sees(s[i].p,q)||!sees(s[j].p,q));}
   sight={len,from:s[i].p,to:s[j].p,brk};break;}
  // Longest stretch walked in full view of ONE standing position (a point of a guard's round, or a camera) with no
  // spot in reach that this position cannot see: the walk a guard at the end of a corridor pins from start to end.
  let run={len:0,from:s[0].p,to:s[0].p,who:''};
  const pin=(seen:(q:P)=>boolean,name:string)=>{let start=-1;
   for(let i=0;i<=s.length;i++){const bare=i<s.length&&seen(s[i].p)&&!pockets[i].some(q=>!seen(q));
    if(bare){if(start<0)start=i;}else if(start>=0){const len=s[i-1].d-s[start].d;if(len>run.len)run={len,from:s[start].p,to:s[i-1].p,who:name};start=-1;}}};
  if(!gapOnly)for(const h of posts)pin(q=>Math.hypot(h.at.x-q.x,h.at.y-q.y)<=h.range&&sees(h.at,q),`${h.who}@${h.at.x.toFixed(0)},${h.at.y.toFixed(0)}`);
  if(!gapOnly)for(const c of cams)pin(q=>{const d=Math.hypot(q.x-c.at.x,q.y-c.at.y);if(d>c.range||d<.4)return false;const a=Math.abs((Math.atan2(q.y-c.at.y,q.x-c.at.x)-c.facing+Math.PI*3)%(Math.PI*2)-Math.PI);return a<=c.spread&&sees(c.at,q);},c.who);
  // Cover gap: the longest stretch on which no spot in reach (nor the path itself) is hidden from the point three
  // tiles further along the walk (approach: a guard ahead) or three tiles back (escape: a pursuer behind).
  const escape=route.name.startsWith('escape');let gap={len:0,from:s[0].p,to:s[0].p},open=-1;
  const at=(d:number)=>{let k=0;while(k<s.length-1&&s[k].d<d)k++;return s[Math.max(0,k)].p;};
  for(let i=0;i<=s.length;i++){let bare=false;
   if(i<s.length){const eye=at(Math.max(0,Math.min(s.at(-1)!.d,s[i].d+(escape?-3:3))));bare=Math.hypot(eye.x-s[i].p.x,eye.y-s[i].p.y)>1.5&&sees(eye,s[i].p)&&!pockets[i].some(q=>!sees(eye,q));}
   if(bare){if(open<0)open=i;}else if(open>=0){const len=s[i-1].d-s[open].d;if(len>gap.len)gap={len,from:s[open].p,to:s[i-1].p};open=-1;}}
  rows.push({route:route.name.split(':')[0].replace('escape','exit')+(route.name.includes('quick')?' quick':route.name.includes('indep')?' lockdown':''),sight,run,gap});
 }
 return rows;
}
const f=(p:P)=>`${p.x.toFixed(0)},${p.y.toFixed(0)}`;
if(process.argv[1]?.endsWith('v13Corridor.ts')){
 // Arguments are read only when this file is the tool being run, so importing corridorAudit has no side effect.
 const args=process.argv.slice(2),file=args.find(a=>a.endsWith('.json')),only=args.filter(a=>!a.endsWith('.json'));
 const all=loadCampaign(file),defs=only.length?pickMissions(all,only):all.filter(d=>d.chapter!<=6);
 console.log('mission  cover gap (route, from→to)            sightline (route, from→to)                  pinned by one post (route, from→to, post)');
 for(const def of defs){const rows=corridorAudit(def),top=<K extends 'sight'|'run'|'gap'>(k:K)=>[...rows].sort((x,y)=>y[k].len-x[k].len)[0],g=top('gap'),a=top('sight'),b=top('run');
  console.log(`${def.id}  ${g.gap.len.toFixed(1).padStart(5)} ${g.route.padEnd(13)} ${(f(g.gap.from)+'→'+f(g.gap.to)).padEnd(13)}`+`${a.sight.len.toFixed(1).padStart(5)} ${a.route.padEnd(13)} ${(f(a.sight.from)+'→'+f(a.sight.to)).padEnd(13)}${a.sight.brk?'':'NO BREAK'}`.padEnd(46)+`${b.run.len.toFixed(1).padStart(5)} ${b.route.padEnd(13)} ${(f(b.run.from)+'→'+f(b.run.to)).padEnd(13)} ${b.run.who}`);
  if(VERBOSE)for(const r of rows)console.log(`         ${r.route.padEnd(14)} gap ${r.gap.len.toFixed(1)} ${f(r.gap.from)}→${f(r.gap.to)} | sight ${r.sight.len.toFixed(1)} ${f(r.sight.from)}→${f(r.sight.to)} ${r.sight.brk?'':'NO BREAK'} | pinned ${r.run.len.toFixed(1)} ${f(r.run.from)}→${f(r.run.to)} ${r.run.who}`);
 }
}
