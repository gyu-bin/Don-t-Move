/** Layout reuse between missions: walkable-grid overlap (IoU) and patrol skeleton match. Read-only.
 *   node --import tsx tools/gameplay-audit/layoutReuse.ts [out.json] */
import fs from 'node:fs';
import campaign from '../../src/game/levels/stages/campaignStages.json';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage} from '../../src/game/world/compileStage';
const defs=campaign as StageDefinition[], st=defs.map(compileStage);
/** Best walkable-grid IoU over identity and the three mirror transforms (same dimensions only). */
const iou=(i:number,j:number)=>{const a=st[i],b=st[j];if(a.cols!==b.cols||a.rows!==b.rows)return 0;let best=0;
  for(const [fx,fy] of [[0,0],[1,0],[0,1],[1,1]]){let n=0,u=0;
    for(let y=0;y<a.rows;y++)for(let x=0;x<a.cols;x++){const xa=a.grid[y*a.cols+x]===1,bx=fx?a.cols-1-x:x,by=fy?a.rows-1-y:y,xb=b.grid[by*b.cols+bx]===1;if(xa&&xb)n++;if(xa||xb)u++;}
    best=Math.max(best,u?n/u:0);}return best;};
const routeSig=(d:StageDefinition)=>(d.patrolRoutes??[]).map(r=>(r as {points:{x:number;y:number}[]}).points.map(p=>`${p.x},${p.y}`).join(';'));
const pairs:{a:string;b:string;gridIoU:number;sharedPatrols:number;objectiveSame:boolean;exitSame:boolean}[]=[];
for(let i=0;i<defs.length;i++)for(let j=i+1;j<defs.length;j++){const g=iou(i,j);if(g<0.7)continue;
  const ra=new Set(routeSig(defs[i])),shared=routeSig(defs[j]).filter(x=>ra.has(x)).length;
  pairs.push({a:defs[i].id,b:defs[j].id,gridIoU:+g.toFixed(3),sharedPatrols:shared,
    objectiveSame:JSON.stringify(defs[i].objective)===JSON.stringify(defs[j].objective),
    exitSame:JSON.stringify(defs[i].exit)===JSON.stringify(defs[j].exit)});}
const out=process.argv[2];
if(out)fs.writeFileSync(out,JSON.stringify(pairs,null,1)+'\n');
for(const p of pairs)console.log(p.a,p.b,p.gridIoU,'sharedPatrols',p.sharedPatrols,'obj',p.objectiveSame,'exit',p.exitSame);
console.log(pairs.length,'pairs with walkable-grid IoU ≥ 0.70 (mirror-aware)');
