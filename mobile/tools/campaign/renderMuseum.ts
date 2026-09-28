/** Offline inspection of the actual stage renderer and existing atlas, not new artwork. */
import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode();
 // Metro static asset handles aren't used by this offline render.
 require.extensions['.png']=(module)=>{module.exports=0;};
 Object.assign(globalThis,{__DEV__:false});
 const {Skia}=require('../sprites/skiaNodeShim');
 const {ASSET_MANIFEST}=require('../../src/assets/manifest');
 const {buildAtlas}=require('../../src/assets/buildSprites');
 const {compileStage}=require('../../src/game/world/compileStage');
 const {museumProduction}=require('./museumProduction');
 const {campaignStages}=require('../../src/game/levels/campaignStages');
 const {buildStageArt}=require('../../src/rendering/environment/buildStageArt');
 const {drawSpriteFrame}=require('../../src/rendering/sprites/spriteAnimation');
 const {fill}=require('../../src/rendering/paints');
 const image=Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync('assets/museum/museum_atlas.png')));
 const atlas=buildAtlas(ASSET_MANIFEST.environment.museum,{museumAtlas:image});
 const missionArg=process.argv.find((v:string)=>v.startsWith('--mission='))?.split('=')[1]??'01-01';
 const def=missionArg==='01-01'?museumProduction():campaignStages.find((v:{id:string})=>v.id===missionArg);
 if(!def)throw Error(`Unknown mission ${missionArg}`);
 const stage=compileStage(def),art=buildStageArt(stage,atlas);
 const rec=Skia.PictureRecorder(),canvas=rec.beginRecording(Skia.XYWHRect(0,0,stage.width,stage.height+80));
 canvas.translate(0,50);canvas.drawPicture(art.floor);
 for(const layer of art.layers)canvas.drawPicture(layer.picture);
 canvas.drawPicture(art.darkness);canvas.drawPicture(art.glow);
 drawSpriteFrame(canvas,atlas.diamond,stage.objective.x,stage.objective.y-28,24/atlas.diamond.sw,false,fill('#ffffff'));
 if(process.argv.includes('--debug')){
  const {buildNavigation,findPath}=require('../../src/game/world/navigation');
  const {BODY}=require('../../src/game/guards/guardTuning');
  const nav=buildNavigation(stage,BODY.guardRadius);
  const line=(points:number[][],color:string,width=3)=>{
   const p=Skia.PathBuilder.Make();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));
   const paint=Skia.Paint();paint.setColor(Skia.Color(color));paint.setStyle(1);paint.setStrokeWidth(width);canvas.drawPath(p.detach(),paint);
  };
  const routes=process.argv.includes('--patrol-only')?[]:[...(def.testRoutes??[]),...(def.escapeRoutes??[])];
  routes.forEach((route:{name:string;points:{x:number;y:number}[]},i:number)=>
   line(route.points.map(p=>[p.x*40,p.y*40]),['#50EFC0','#FFC65B','#FFFFFF88','#59CFFF'][i]??'#59CFFF',3));
  if(!process.argv.includes('--routes-only'))for(const [i,g] of stage.guards.entries()){
   const points:number[][]=[];
   for(let k=0;k<g.route.length;k++){
    const a=g.route[k],b=g.route[(k+1)%g.route.length];
    const path=findPath(nav,a.x,a.y,b.x,b.y);
    points.push([a.x,a.y]);for(let j=0;j<path.length;j+=2)points.push([path[j],path[j+1]]);
    canvas.drawCircle(a.x,a.y,6,fill(i?'#DF9CFF':'#FFA07D'));
   }
   line(points,i?'#DF9CFF':'#FFA07D',2);
  }
  if(!process.argv.includes('--routes-only')){
   const {createGuardState,createGuardEvents}=require('../../src/game/guards/guardBrain');
   const {stepGuards}=require('../../src/game/guards/guardSystem');
   const {buildVisionFan}=require('../../src/game/guards/guardVision');
   const guards=stage.guards.map((g:unknown)=>createGuardState(g)),events=createGuardEvents();
   const seconds=Number(process.argv.find((v:string)=>v.startsWith('--time='))?.split('=')[1]??0);
   for(let f=0;f<seconds*60;f++)stepGuards(guards,{x:-1000,y:-1000,gait:0},stage.visionBlockers,nav,1/60,events,f/60,true);
   for(const g of guards){
    buildVisionFan(g,stage.visionBlockers);
    const p=Skia.PathBuilder.Make();p.moveTo(g.x,g.y);
    for(let k=0;k<g.fanCount;k++)p.lineTo(g.fan[k*2],g.fan[k*2+1]);p.close();
    canvas.drawPath(p.detach(),fill('#FF70554D'));canvas.drawCircle(g.x,g.y,8,fill('#FFFFFF'));
   }
  }
  for(let i=0;i<stage.visionBlockers.length;i+=4){
   const b=stage.visionBlockers;
   const p=Skia.Paint();p.setColor(Skia.Color('#5DFFE155'));p.setStyle(1);p.setStrokeWidth(1);
   canvas.drawRect(Skia.XYWHRect(b[i],b[i+1],b[i+2]-b[i],b[i+3]-b[i+1]),p);
  }
 }
 const picture=rec.finishRecordingAsPicture();
 const surface=ck.MakeSurface(stage.width,stage.height+80)!;
 surface.getCanvas().drawPicture(picture.ref);surface.flush();
 const prefixArg=process.argv.find((v:string)=>v.startsWith('--prefix='))?.split('=')[1];
 const prefix=prefixArg??(process.argv.includes('--v61')?'V61':'V6');
 const output=path.resolve(prefixArg
  ?`Reports/${prefix}${process.argv.includes('--debug')?'-Debug':''}.png`
  :`Reports/${prefix}-Museum-${process.argv.includes('--debug')?'Debug':'After'}.png`);
 fs.writeFileSync(output,surface.makeImageSnapshot().encodeToBytes()!);
 console.log(output);surface.delete();picture.dispose();
}
void main();
