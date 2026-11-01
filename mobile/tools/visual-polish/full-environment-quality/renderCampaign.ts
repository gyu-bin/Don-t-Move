/** Offline actual game renderer. Fixed t=0 states; whole map and 9.4-tile phone cameras. */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {initSkiaNode} from '../../sprites/skiaNode';
const median=(v:number[])=>[...v].sort((a,b)=>a-b)[v.length>>1];
async function main(){
 const [outDir,...wanted]=process.argv.slice(2);if(!outDir)throw Error('output directory required');
 const ck=await initSkiaNode();require.extensions['.png']=m=>{m.exports=0;};Object.assign(globalThis,{__DEV__:false});
 const {Skia}=require('../../sprites/skiaNodeShim');
 const baselineDir=process.env.BASELINE_CODE_DIR;
 if(baselineDir){
  const Module=require('node:module'),ts=require('typescript'),load=Module._extensions['.ts'];
  Module._extensions['.ts']=(m:{_compile:(code:string,file:string)=>void},file:string)=>{
   const name=path.basename(file),backup=path.join(baselineDir,name+'.txt');
   if(file.includes('/src/rendering/environment/')&&['buildStageArt.ts','venueArt.ts','venueFloorFinish.ts'].includes(name)&&fs.existsSync(backup)){
    const code=ts.transpileModule(fs.readFileSync(backup,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    return m._compile(code,file);
   }
   return load(m,file);
  };
 }
 let ops=0;let pathCount=0,pathPoints=0,pathVerbs=0;const make=Skia.PictureRecorder.bind(Skia);
 Skia.PictureRecorder=()=>{const rec=make(),begin=rec.beginRecording.bind(rec);rec.beginRecording=(b:unknown)=>new Proxy(begin(b),{get(t,k){const v=t[k];if(typeof v!=='function')return v;return String(k).startsWith('draw')?(...a:unknown[])=>{ops++;if(process.env.RECORD_ONLY==='1'&&String(k)==='drawPath'){const p=a[0]as {countPoints?:()=>number;toCmds?:()=>unknown[]};pathCount++;pathPoints+=p.countPoints?.()??0;pathVerbs+=p.toCmds?.().length??0;}return v.apply(t,a);}:v.bind(t);}});return rec;};
 const {ASSET_MANIFEST}=require('../../../src/assets/manifest');
 const {buildGameAssets}=require('../../../src/assets/buildSprites');
 const {decodeEnvironmentImages}=require('../../../src/assets/environmentKit');
 const {campaignStages}=require('../../../src/game/levels/campaignStages');
 const {VALUABLES}=require('../../../src/game/levels/stagePresentation');
 const {compileStage,TILE,WALL_HEIGHT}=require('../../../src/game/world/compileStage');
 const {createPlaygroundState}=require('../../../src/game/playground/playgroundState');
 const {buildVisionFan}=require('../../../src/game/guards/guardVision');
 const {doorBlockers}=require('../../../src/game/doors/doorSystem');
 const {buildStageArt}=require('../../../src/rendering/environment/buildStageArt');
 const {createDoorArt}=require('../../../src/rendering/environment/doorArt');
 const {createCharacterVisual}=require('../../../src/rendering/characters/characterVisual');
 const {createCharacterArt}=require('../../../src/rendering/fallback/proceduralCharacter');
 const {PLAYER_PALETTE,GUARD_PALETTE}=require('../../../src/rendering/fallback/characterPalettes');
 const {createConeArt}=require('../../../src/rendering/effects/visionCone');
 const {createCctvArt}=require('../../../src/rendering/effects/cctvArt');
 const {createIconArt}=require('../../../src/rendering/effects/alertIcons');
 const {createLightFx}=require('../../../src/rendering/effects/lightFx');
 const {createDebugArt}=require('../../../src/rendering/debug/guardDebug');
 const {renderPlaygroundFrame}=require('../../../src/rendering/renderFrame');
 const {fill}=require('../../../src/rendering/paints');
 const decoded:{path:string;width:number;height:number;bytes:number;sha256:string}[]=[];
 const tDecode=performance.now();
 const decode=(file:string)=>{const bytes=fs.readFileSync(file),im=Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(bytes));if(!im)throw Error(file);decoded.push({path:file,width:im.width(),height:im.height(),bytes:im.width()*im.height()*4,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});return im;};
 const c='assets/characters/';
 const assets=buildGameAssets(ASSET_MANIFEST,{...decodeEnvironmentImages(decode),museumAtlas:decode('assets/museum/museum_atlas.png'),
 playerIdle:decode(c+'player_idle.png'),playerSneak:decode(c+'player_sneak.png'),playerWalk:decode(c+'player_walk.png'),playerRun:decode(c+'player_run.png'),
 guardIdle:decode(c+'guard_idle.png'),guardWalk:decode(c+'guard_walk.png'),guardRun:decode(c+'guard_run.png'),guardWhistle:decode(c+'guard_whistle.png'),guardSearch:decode(c+'guard_search.png'),
 ...Object.fromEntries(Object.entries({labFloorA:'a',labFloorB:'b',labFloorC:'c',labFloorD:'d',labFloorInlay:'inlay',labFloorRestrictedA:'restricted_a',labFloorRestrictedB:'restricted_b'}).map(([key,n])=>[key,decode(`assets/environment/lab/floor/lab_floor_tile_${n}.png`)]))});
 const decodeMs=performance.now()-tDecode;
 fs.mkdirSync(outDir,{recursive:true});
 fs.writeFileSync(path.join(outDir,'SOURCE_LOADED.json'),JSON.stringify({at:new Date().toISOString(),source:'production modules imported and assets decoded before any render',decodedImages:decoded.length})+'\n');
 console.log('SOURCE_LOADED: source and assets frozen in this process');
 const rendererSources=Object.fromEntries(['buildStageArt.ts','venueArt.ts','venueFloorFinish.ts'].map(name=>{const file=baselineDir?path.join(baselineDir,name+'.txt'):path.join('src/rendering/environment',name);return [name,fs.existsSync(file)?crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'):null];}));
 const report={rendererSources,generated:new Date().toISOString(),baselineCodeOverride:baselineDir??null,method:'CanvasKit CPU offline production renderer; t=0; cameras only move; no simulation/teleport. HUD and vignette absent. CCTV present.',phone:{width:402,height:874,scale:3,tilesWide:9.4},full:{scale:1.25,cam:{x:-16,y:-55}},decodeMs,decoded,rgbaBytes:decoded.reduce((n,x)=>n+x.bytes,0),textureCount:decoded.length,gpuRgbaEstimateBytes:decoded.reduce((n,x)=>n+x.bytes,0),missions:[]as unknown[]};
 const ids=wanted.length?wanted:campaignStages.map((s:{id:string})=>s.id);
 const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
 for(const id of ids){
  const def=campaignStages.find((s:{id:string})=>s.id===id);if(!def)throw Error(id);
  const st=compileStage(def),s=createPlaygroundState(st),blockers=doorBlockers(s.doors??[],st.movementBlockers,st.visionBlockers).visionBlockers;
  for(const g of [...s.guards,...s.securityCameras])buildVisionFan(g,blockers);
  ops=0;pathCount=pathPoints=pathVerbs=0;const start=performance.now(),art=buildStageArt(st,assets.museum),artMs=performance.now()-start,staticOps=ops;
  const staticPictures=[art.floor,art.darkness,art.glow,art.exitActive,art.exitActiveTop,...art.layers.map((l:{picture:unknown})=>l.picture)].filter(Boolean);
  const pictureApproxBytes=staticPictures.reduce((n:number,p:{ref:{approximateBytesUsed?:()=>number}})=>n+(p.ref.approximateBytesUsed?.()??0),0);
  const floorPictureApproxBytes=art.floor.ref.approximateBytesUsed?.()??null;
  if(process.env.RECORD_ONLY==='1'){
   report.missions.push({id,chapter:def.chapter,theme:def.theme,stateTime:s.t,player:{x:s.player.x,y:s.player.y},staticOps,artMs,layers:art.layers.length,pictureApproxBytes,floorPictureApproxBytes,pathCount,pathPoints,pathVerbs,pathControlPointAndVerbLowerBoundBytes:pathPoints*8+pathVerbs,views:[]});
   for(const p of staticPictures)p.dispose();
   fs.writeFileSync(path.join(outDir,'metrics.json'),JSON.stringify(report,null,2)+'\n');console.log(`${id}: staticrecordonly, ${pictureApproxBytes} approximatepicturebytes`);continue;
  }
  const authoredLabCase=def.chapter===4&&def.visualRevision==='v12-4c'&&def.props.some((p:{kind:string;visualAssetId:string})=>p.kind==='objectiveCase'&&p.visualAssetId==='lab_sample_case');
  const r={stage:art,doors:createDoorArt(),player:createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false),true),guard:createCharacterVisual(assets.guard,createCharacterArt(GUARD_PALETTE,true),true),cone:createConeArt(),cctv:createCctvArt(assets.museum?.cctv??null),icons:createIconArt(assets.indicators),fx:createLightFx(),diamond:authoredLabCase?null:assets.museum?.[VALUABLES[def.objective?.kind??'diamond'].sprite]??null,objectiveGlowHeight:authoredLabCase?20:undefined,diamondPos:st.objective,exit:Skia.XYWHRect(st.exit.x,st.exit.y,st.exit.w,st.exit.h),debug:createDebugArt(null),vignette:fill('#000000',0),screen:Skia.XYWHRect(0,0,1,1),zoom:1};
  const views:{name:string;width:number;height:number;scale:number;zoom:number;cam:{x:number;y:number}}[]=[{name:'full',width:st.width+32,height:st.height+71,scale:1.25,zoom:1,cam:{x:-16,y:-55}}];
  const zoom=402/(9.4*TILE),vw=402/zoom,vh=874/zoom,b={x:0,y:-WALL_HEIGHT-90,w:st.width,h:st.height+WALL_HEIGHT+90};
  for(const [name,p]of [['spawn',st.playerSpawn],['guard',s.guards[0]??st.playerSpawn],['objective',st.objective],['exit',{x:st.exit.x+st.exit.w/2,y:st.exit.y+st.exit.h/2}]]as const){
   const cam={x:b.w<=vw?b.x+(b.w-vw)/2:clamp(p.x-vw/2,b.x,b.x+b.w-vw),y:b.h<=vh?b.y+(b.h-vh)/2:clamp(p.y-vh*.52,b.y,b.y+b.h-vh)};
   views.push({name,width:402,height:874,scale:3,zoom,cam});
  }
  if(process.env.ONLY_VIEWS){const selected=process.env.ONLY_VIEWS.split(',');for(let i=views.length-1;i>=0;i--)if(!selected.includes(views[i].name))views.splice(i,1);}
  if(process.env.PANS_ONLY==='1'){
   const spawn=views.find(v=>v.name==='spawn')!;views.length=0;
   for(const dx of [0,.25,.5,1])views.push({...spawn,name:`pan-${dx}`,cam:{x:spawn.cam.x+dx,y:spawn.cam.y}});
  }
  const metrics=[];
  for(const view of views){
   s.cam={...view.cam};r.zoom=view.zoom;r.screen=Skia.XYWHRect(0,0,view.width,view.height);
   const surface=ck.MakeSurface(Math.round(view.width*view.scale),Math.round(view.height*view.scale));if(!surface)throw Error('surface');
   const cv=surface.getCanvas();cv.scale(view.scale,view.scale);
   const samples=[];let frameOps=0;
   for(let repeat=0;repeat<Number(process.env.PERF_REPEATS??4);repeat++){
    ops=0;const t=performance.now(),pic=renderPlaygroundFrame(s,r,false),recordMs=performance.now()-t;frameOps=ops;
    const tRaster=performance.now();cv.clear(ck.TRANSPARENT);cv.drawPicture(pic.ref);surface.flush();const rasterMs=performance.now()-tRaster;
    if(repeat>0)samples.push({recordMs,rasterMs,totalMs:recordMs+rasterMs});pic.dispose();
   }
   const file=`${id}-${view.name}.png`;if(process.env.SKIP_PNG!=='1'){const image=surface.makeImageSnapshot(),encoded=image.encodeToBytes();if(!encoded)throw Error('PNG encode failed');fs.writeFileSync(path.join(outDir,file),encoded);image.delete();}surface.delete();
   metrics.push({...view,file,frameOps,samples,recordMedianMs:median(samples.map(x=>x.recordMs)),rasterMedianMs:median(samples.map(x=>x.rasterMs)),totalMedianMs:median(samples.map(x=>x.totalMs))});
  }
  report.missions.push({id,chapter:def.chapter,theme:def.theme,stateTime:s.t,player:{x:s.player.x,y:s.player.y},staticOps,artMs,layers:art.layers.length,pictureApproxBytes,floorPictureApproxBytes,views:metrics});
  for(const pic of [art.floor,art.darkness,art.glow,art.exitActive,art.exitActiveTop,...art.layers.map((l:{picture:{dispose:()=>void}})=>l.picture)])pic?.dispose();
  fs.writeFileSync(path.join(outDir,'metrics.json'),JSON.stringify(report,null,2)+'\n');console.log(`${id}: ${staticOps} static ops, ${views.length} views complete`);
 }
}
void main();
