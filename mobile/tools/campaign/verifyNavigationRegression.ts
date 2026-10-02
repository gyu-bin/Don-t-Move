/** Offline algorithm regression, not a gameplay bot or level-design approval. */
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {compileStage} from '../../src/game/world/compileStage';
import type {CompiledStage} from '../../src/game/world/compileStage';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {buildNavigation,clearSegment} from '../../src/game/world/navigation';
import type {Navigation} from '../../src/game/world/navigation';
import {BODY} from '../../src/game/guards/guardTuning';

/** Full-blocker oracle: never uses optimized bucket output or its blocker array. */
export function bruteNavigation(stage:CompiledStage,radius:number):Navigation{
 const cell=20,cols=Math.ceil(stage.width/cell),rows=Math.ceil(stage.height/cell);
 const blockers=stage.movementBlockers.slice(),tile=stage.width/stage.cols;
 for(let i=0;i<stage.grid.length;i++)if(stage.grid[i]===0){const x=i%stage.cols*tile,y=Math.floor(i/stage.cols)*tile;blockers.push(x,y,x+tile,y+tile);}
 blockers.push(-cell,-cell,0,stage.height+cell,stage.width,-cell,stage.width+cell,stage.height+cell,0,-cell,stage.width,0,0,stage.height,stage.width,stage.height+cell);
 const n:Navigation={cols,rows,cell,radius,blockers,walkable:[],neighbors:[],components:[]};
 const x=(i:number)=>(i%cols+.5)*cell,y=(i:number)=>(Math.floor(i/cols)+.5)*cell;
 for(let i=0;i<cols*rows;i++){n.walkable.push(clearSegment(x(i),y(i),x(i),y(i),blockers,radius));n.neighbors.push([]);n.components.push(-1);}
 for(let i=0;i<cols*rows;i++)if(n.walkable[i])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
  const cx=i%cols+dx,cy=Math.floor(i/cols)+dy,j=cy*cols+cx;
  if((dx===0&&dy===0)||cx<0||cy<0||cx>=cols||cy>=rows||!n.walkable[j])continue;
  if(clearSegment(x(i),y(i),x(j),y(j),blockers,radius))n.neighbors[i].push(j);
 }
 let component=0;
 for(let i=0;i<cols*rows;i++)if(n.walkable[i]&&n.components[i]===-1){const queue=[i];n.components[i]=component;for(let at=0;at<queue.length;at++)for(const j of n.neighbors[queue[at]])if(n.components[j]===-1){n.components[j]=component;queue.push(j);}component++;}
 return n;
}
export function compareNavigation(actual:Navigation,expected:Navigation){
 const walkable=actual.walkable.reduce((n,value,i)=>n+Number(value!==expected.walkable[i]),Math.abs(actual.walkable.length-expected.walkable.length));
 const neighbors=actual.neighbors.reduce((n,value,i)=>n+Number(JSON.stringify(value)!==JSON.stringify(expected.neighbors[i])),Math.abs(actual.neighbors.length-expected.neighbors.length));
 const components=actual.components.reduce((n,value,i)=>n+Number(value!==expected.components[i]),Math.abs(actual.components.length-expected.components.length));
 const metadata=Number(JSON.stringify([actual.cols,actual.rows,actual.cell,actual.radius,actual.blockers])!==JSON.stringify([expected.cols,expected.rows,expected.cell,expected.radius,expected.blockers]));
 return {walkable,neighbors,components,metadata};
}
export function verifyNavigation(stages:StageDefinition[]){
 return stages.flatMap(def=>{const stage=compileStage(def);return [{label:'guard',radius:BODY.guardRadius},{label:'player',radius:BODY.playerRadius}].map(({label,radius})=>{
  const start=performance.now(),actual=buildNavigation(stage,radius),optimizedMs=performance.now()-start;
  const referenceStart=performance.now(),expected=bruteNavigation(stage,radius),referenceMs=performance.now()-referenceStart;
  return {id:def.id,radius,label,nodes:actual.walkable.length,walkableNodes:actual.walkable.filter(Boolean).length,optimizedMs,referenceMs,mismatches:compareNavigation(actual,expected)};
 });});
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('tools/campaign/verifyNavigationRegression.ts')){
 const baseline=process.argv[2]??'src/game/levels/stages/campaignStages.json',destination=process.argv[3];
 const sourceFiles=['src/game/world/navigation.ts','src/game/world/collision.ts','src/game/world/compileStage.ts'];
 const hashes=()=>Object.fromEntries(sourceFiles.map(file=>[file,createHash('sha256').update(readFileSync(file)).digest('hex')]));
 const before=hashes(),data=readFileSync(baseline),stages=JSON.parse(data.toString()) as StageDefinition[],measurements=verifyNavigation(stages),after=hashes();
 const mismatchCount=measurements.reduce((sum,row)=>sum+Object.values(row.mismatches).reduce((a,b)=>a+b,0),0);
 const report={scope:'Offline navigation algorithm regression only; no actual Simulator/FPS/gameplay claim',baseline,baselineSha256:createHash('sha256').update(data).digest('hex'),missions:stages.length,radiusCases:measurements.length,mismatchCount,optimizedTotalMs:measurements.reduce((s,q)=>s+q.optimizedMs,0),referenceTotalMs:measurements.reduce((s,q)=>s+q.referenceMs,0),sourceUnchanged:JSON.stringify(before)===JSON.stringify(after),sourceHashes:after,measurements};
 if(destination)writeFileSync(destination,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,measurements:undefined},null,2));
 if(mismatchCount||!report.sourceUnchanged)process.exitCode=1;
}
