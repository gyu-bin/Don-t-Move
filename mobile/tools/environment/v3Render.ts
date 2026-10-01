/** V3 independent visual audit: production pixels plus separate static geometry overlays. */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import type {VisionFan} from '../../src/game/guards/guardVision';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';

async function main(){
 const campaign=process.env.CAMPAIGN_JSON??'src/game/levels/stages/campaignStages.json';
 const out=process.env.OUT_DIR??'Reports/LevelDesignV3/after/render';
 const defs=(JSON.parse(fs.readFileSync(campaign,'utf8')) as StageDefinition[]).filter(d=>(d.chapter??0)>=1&&(d.chapter??0)<=3);
 if(defs.length!==30)throw Error(`Expected30 missions, got${defs.length}`);
 fs.mkdirSync(out,{recursive:true});
 if(process.env.SKIP_BASE_RENDER!=='1')execFileSync(process.execPath,['--import','tsx','tools/environment/securityBankRender.ts'],{stdio:'inherit',env:{...process.env,CAMPAIGN_JSON:campaign,OUT_DIR:out,MISSIONS:defs.map(d=>d.id).join(','),SECURITY_REPLAY:''}});
 const ck=await initSkiaNode();Object.assign(globalThis,{__DEV__:false});
 const {compileStage,TILE}=require('../../src/game/world/compileStage');
 const {createPlaygroundState}=require('../../src/game/playground/playgroundState');
 const {buildNavigation,clearSegment}=require('../../src/game/world/navigation');
 const {BODY}=require('../../src/game/guards/guardTuning');
 const {buildVisionFan,pointVisible,createFanBuffers}=require('../../src/game/guards/guardVision');
 const font=loadLabelFont(ck,16)!;const ink=new ck.Paint();ink.setAntiAlias(true);ink.setColor(ck.parseColorString('#f1e9d7'));
 const records:unknown[]=[];
 const save=(surface:ReturnType<typeof ck.MakeSurface>,file:string)=>{if(!surface)throw Error('Surface allocation failed');surface.flush();const image=surface.makeImageSnapshot();fs.writeFileSync(path.join(out,file),image.encodeToBytes()!);image.delete();surface.delete();};
 for(const d of defs){
  const stage=compileStage(d),state=createPlaygroundState(stage),nav=buildNavigation(stage,BODY.playerRadius);
  const poses:VisionFan[]=[],cameraPoses:VisionFan[]=[];
  // Authored route sweep envelope, not a claim about time occupancy or search AI.
  for(const g of state.guards){
   const route=g.route.length?g.route:[{x:g.x,y:g.y,look:g.facing}];
   for(let i=0;i<route.length;i++){
    const a=route[i],b=route[(i+1)%route.length];
    const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/TILE));
    for(let j=0;j<=steps;j++)for(const facing of [Math.atan2(b.y-a.y,b.x-a.x),a.look??g.facing]){
     const p={...g,...createFanBuffers(),x:a.x+(b.x-a.x)*j/steps,y:a.y+(b.y-a.y)*j/steps,facing};buildVisionFan(p,stage.visionBlockers);poses.push(p);
    }
   }
  }
  for(const camera of state.securityCameras)for(let i=0;i<9;i++){
   const p={...camera,...createFanBuffers(),facing:camera.centerFacing-camera.sweepAngle+camera.sweepAngle*2*i/8};buildVisionFan(p,stage.visionBlockers);cameraPoses.push(p);
  }
  const image=ck.MakeImageFromEncoded(fs.readFileSync(path.join(out,`${d.id}-Debug-OFF.png`)))!;
  const surface=ck.MakeSurface(image.width(),image.height()+60)!;const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));c.drawImage(image,0,0);
  const paint=new ck.Paint();paint.setAntiAlias(false);
  const cells:{x:number;y:number;guard:boolean;cctv:boolean;hideCandidate:boolean}[]=[];
  for(let y=TILE/2;y<stage.height;y+=TILE)for(let x=TILE/2;x<stage.width;x+=TILE){
   if(!clearSegment(x,y,x,y,nav.blockers,BODY.playerRadius))continue;
   const guard=poses.some(p=>pointVisible(p,x,y,stage.visionBlockers));
   const cctv=cameraPoses.some(p=>pointVisible(p,x,y,stage.visionBlockers));
   const nearBlock=stage.visionBlockers.some((_:number,i:number)=>i%4===0&&Math.hypot(Math.max(stage.visionBlockers[i]-x,0,x-stage.visionBlockers[i+2]),Math.max(stage.visionBlockers[i+1]-y,0,y-stage.visionBlockers[i+3]))<TILE*1.2);
   const hideCandidate=nearBlock&&poses.some(p=>Math.hypot(p.x-x,p.y-y)<p.visionRange&&[[0,0],[BODY.playerRadius,0],[-BODY.playerRadius,0],[0,BODY.playerRadius],[0,-BODY.playerRadius]].every(([dx,dy])=>!clearSegment(p.x,p.y,x+dx,y+dy,stage.visionBlockers)));
   cells.push({x:x/TILE,y:y/TILE,guard,cctv,hideCandidate});
   paint.setColor(ck.parseColorString(guard?'rgba(255,75,91,.19)':cctv?'rgba(255,185,56,.24)':'rgba(152,87,226,.3)'));
   c.drawRect(ck.XYWHRect(x-TILE/2,y-TILE/2+40,TILE,TILE),paint);
   if(hideCandidate){paint.setColor(ck.parseColorString('rgba(61,214,202,.8)'));c.drawCircle(x,y+40,3,paint);}
  }
  paint.setAntiAlias(true);paint.setStrokeWidth(2);
  for(const g of state.guards){paint.setColor(ck.parseColorString('#ff6974'));for(let i=1;i<g.route.length;i++)c.drawLine(g.route[i-1].x,g.route[i-1].y+40,g.route[i].x,g.route[i].y+40,paint);}
  for(const route of d.escapeRoutes??[]){paint.setColor(ck.parseColorString('#aef07d'));for(let i=1;i<route.points.length;i++)c.drawLine(route.points[i-1].x*TILE,route.points[i-1].y*TILE+40,route.points[i].x*TILE,route.points[i].y*TILE+40,paint);}
  const mark=(x:number,y:number,label:string,color:string)=>{paint.setColor(ck.parseColorString(color));c.drawCircle(x*TILE,y*TILE+40,5,paint);c.drawText(label,x*TILE+7,y*TILE+35,paint,font);};
  mark(d.playerSpawn.x,d.playerSpawn.y,'ENTRY','#b5f38b');if(d.objective)mark(d.objective.x,d.objective.y,'OBJECTIVE','#67dfff');
  if(d.exit)mark(d.exit.x+d.exit.w/2,d.exit.y+d.exit.h/2,'EXIT','#d6c2ff');
  state.securityCameras.forEach((p:{x:number;y:number},i:number)=>mark(p.x/TILE,p.y/TILE,`C${i+1}`,'#ffc876'));
  c.drawText('STATIC QA: guard red / CCTV amber / uncovered purple',8,image.height()+23,ink,font);
  c.drawText('cyan dot: local body-occlusion candidate; green: escape',8,image.height()+46,ink,font);
  save(surface,`${d.id}-Security-Coverage.png`);
  const traversal=ck.MakeSurface(image.width(),image.height()+60)!;const tc=traversal.getCanvas();tc.clear(ck.parseColorString('#08131e'));tc.drawImage(image,0,0);
  const stroke=new ck.Paint();stroke.setAntiAlias(true);stroke.setStyle(ck.PaintStyle.Stroke);stroke.setStrokeWidth(1);stroke.setColor(ck.parseColorString('rgba(100,240,225,.8)'));
  for(let i=0;i<stage.movementBlockers.length;i+=4)tc.drawRect(ck.XYWHRect(stage.movementBlockers[i],stage.movementBlockers[i+1]+40,stage.movementBlockers[i+2]-stage.movementBlockers[i],stage.movementBlockers[i+3]-stage.movementBlockers[i+1]),stroke);
  const marginal:{x:number;y:number}[]=[];
  paint.setColor(ck.parseColorString('rgba(255,165,62,.5)'));
  for(let y=10;y<stage.height;y+=20)for(let x=10;x<stage.width;x+=20)if(clearSegment(x,y,x,y,nav.blockers,BODY.playerRadius)&&!clearSegment(x,y,x,y,nav.blockers,18)){
   tc.drawCircle(x,y+40,2.5,paint);marginal.push({x:x/TILE,y:y/TILE});
  }
  const routeChecks=(d.testRoutes??[]).concat(d.escapeRoutes??[]).map(r=>{
   const segments=r.points.slice(1).map((b,i)=>{const a=r.points[i],body=clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,nav.blockers,BODY.playerRadius),tilt=clearSegment(a.x*TILE,a.y*TILE,b.x*TILE,b.y*TILE,nav.blockers,18);stroke.setColor(ck.parseColorString(tilt?'rgba(154,239,98,.7)':body?'rgba(255,165,62,.8)':'rgba(255,88,88,.8)'));stroke.setStrokeWidth(1.5);tc.drawLine(a.x*TILE,a.y*TILE+40,b.x*TILE,b.y*TILE+40,stroke);return {from:a,to:b,bodyClear:body,radius18Clear:tilt};});return {name:r.name,segments};
  });
  tc.drawText('TRAVERSAL QA: cyan physical bounds / orange margin bands',8,image.height()+23,ink,font);
  tc.drawText('route: green radius18 / orange body only / red blocked',8,image.height()+46,ink,font);
  save(traversal,`${d.id}-Traversal-Clearance.png`);stroke.delete();image.delete();paint.delete();
  records.push({mission:d.id,sourceSha256:createHash('sha256').update(JSON.stringify(d)).digest('hex'),sampledGuardPoses:poses.length,sampledCameraPoses:cameraPoses.length,cells,traversal:{playerRadius:BODY.playerRadius,tiltRadius:18,marginalCells:marginal,routeChecks}});
 }
 for(const chapter of [1,2,3])for(const layer of ['Debug-OFF','Security-Coverage']){
  const group=defs.filter(d=>d.chapter===chapter);const ims=group.map(d=>({id:d.id,image:ck.MakeImageFromEncoded(fs.readFileSync(path.join(out,`${d.id}-${layer}.png`)))!}));
  const cw=Math.max(...ims.map(v=>v.image.width()))+24,ch=Math.max(...ims.map(v=>v.image.height()))+40;
  const surface=ck.MakeSurface(cw*5,ch*2)!;const c=surface.getCanvas();c.clear(ck.parseColorString('#08131e'));
  ims.forEach((v,i)=>{const x=i%5*cw,y=Math.floor(i/5)*ch;c.drawText(v.id,x+12,y+25,ink,font);c.drawImage(v.image,x+12,y+38);});
  save(surface,`Chapter-${String(chapter).padStart(2,'0')}-All10-${layer}-SameScale.png`);ims.forEach(v=>v.image.delete());
 }
 fs.writeFileSync(path.join(out,'static-coverage-metadata.json'),JSON.stringify({method:'Actual production images under separate offline geometry overlays. One world unit per pixel. Authored patrol segments sampled each tile at travel and look headings; CCTV nine sweep angles; exact runtime fan+LOS geometry. Guard sweeps are potential envelopes, not time-weighted surveillance. Uncovered is not automatically a design failure; intentional safe-zone context requires independent review. Cyan dots are local five-body-ray occlusion candidates from one sampled guard pose, not safety from all threats or a confirmed cover chain.',campaignSnapshot:campaign,missions:records},null,2)+'\n');
 font.delete();ink.delete();console.log(out);
}
void main();
