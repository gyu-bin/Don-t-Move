/** Actual production Skia render path. Offline frames, not Simulator/native captures. */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode();require.extensions['.png']=module=>{module.exports=0;};Object.assign(globalThis,{__DEV__:false});
 const {Skia,TileMode}=require('../sprites/skiaNodeShim');
 const {createCctvArt}=require('../../src/rendering/effects/cctvArt');
 const {ASSET_MANIFEST}=require('../../src/assets/manifest');
 const {VALUABLES}=require('../../src/game/levels/stagePresentation');
 const {buildGameAssets}=require('../../src/assets/buildSprites');
 const {decodeEnvironmentImages,ENVIRONMENT_ASSETS}=require('../../src/assets/environmentKit');
 const {campaignStages}=require('../../src/game/levels/campaignStages');
 const {compileStage,TILE}=require('../../src/game/world/compileStage');
 const {buildNavigation}=require('../../src/game/world/navigation');
 const {BODY}=require('../../src/game/guards/guardTuning');
 const {stepPlayground}=require('../../src/game/playground/playgroundState');
 const {createPlaygroundState}=require('../../src/game/playground/playgroundState');
 const {buildVisionFan}=require('../../src/game/guards/guardVision');
 const {buildStageArt}=require('../../src/rendering/environment/buildStageArt');
 const {createCharacterVisual}=require('../../src/rendering/characters/characterVisual');
 const {createCharacterArt}=require('../../src/rendering/fallback/proceduralCharacter');
 const {PLAYER_PALETTE,GUARD_PALETTE}=require('../../src/rendering/fallback/characterPalettes');
 const {createConeArt}=require('../../src/rendering/effects/visionCone');
 const {createIconArt}=require('../../src/rendering/effects/alertIcons');
 const {createLightFx}=require('../../src/rendering/effects/lightFx');
 const {createDebugArt}=require('../../src/rendering/debug/guardDebug');
 const {renderPlaygroundFrame}=require('../../src/rendering/renderFrame');
 const {guardStrideContract}=require('../../src/rendering/characters/guardAnimation');
 const {fill}=require('../../src/rendering/paints');
 const root=process.env.OUT_DIR??'Reports/SecurityBankV1';fs.mkdirSync(root,{recursive:true});
 const decode=(file:string)=>{const im=Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));if(!im)throw Error(`PNG decode failed:${file}`);return im;};
 const ch='assets/characters/';
 const assets=buildGameAssets(ASSET_MANIFEST,{...decodeEnvironmentImages(decode),museumAtlas:decode('assets/museum/museum_atlas.png'),playerIdle:decode(ch+'player_idle.png'),playerSneak:decode(ch+'player_sneak.png'),playerWalk:decode(ch+'player_walk.png'),playerRun:decode(ch+'player_run.png'),guardIdle:decode(ch+'guard_idle.png'),guardWalk:decode(ch+'guard_walk.png'),guardRun:decode(ch+'guard_run.png'),guardWhistle:decode(ch+'guard_whistle.png'),guardSearch:decode(ch+'guard_search.png')});
 const captures:unknown[]=[];
 const resource=(d:StageDefinition,w:number,h:number,zoom:number)=>{const stage=compileStage(d),vignette=Skia.Paint();vignette.setShader(Skia.Shader.MakeRadialGradient({x:w/2,y:h*.48},Math.max(w,h)*.72,[Skia.Color('rgba(0,0,0,0)'),Skia.Color('rgba(0,0,0,0.18)'),Skia.Color('rgba(0,0,0,0.72)')],[.45,.7,1],TileMode.Clamp));return {stage,resources:{stage:buildStageArt(stage,assets.museum),player:createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false)),guard:createCharacterVisual(assets.guard,createCharacterArt(GUARD_PALETTE,true)),cone:createConeArt(),cctv:createCctvArt(assets.museum?.cctv??null),icons:createIconArt(assets.indicators),fx:createLightFx(),diamond:assets.museum?.[VALUABLES[d.objective?.kind??'diamond'].sprite]??null,diamondPos:stage.objective,exitPosition:d.exitPosition?{x:d.exitPosition.x*TILE,y:d.exitPosition.y*TILE}:undefined,exit:Skia.XYWHRect(stage.exit.x,stage.exit.y,stage.exit.w,stage.exit.h),debug:createDebugArt(null),vignette:zoom===1?fill('#000000',0):vignette,screen:Skia.XYWHRect(0,0,w,h),zoom,showObjective:true,guidanceInsets:{top:147,bottom:54,left:0,right:0}}};};
 const source:StageDefinition[]=process.env.CAMPAIGN_JSON?JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON,'utf8')):campaignStages;
 const ids=(process.env.MISSIONS??'01-08,01-10,02-08,02-10,03-01,03-02,03-03,03-04,03-05,03-06,03-07,03-08,03-09,03-10').split(',');
 const defs:StageDefinition[]=ids.map(id=>{const d=source.find(d=>d.id===id);if(!d)throw Error(`Missing mission:${id}`);return d;});
 const encode=(state:ReturnType<typeof createPlaygroundState>,resources:ReturnType<typeof resource>['resources'],stage:ReturnType<typeof compileStage>,w:number,h:number,file:string,rebuild=true)=>{
  if(rebuild)for(const g of state.guards)buildVisionFan(g,stage.visionBlockers);
  if(rebuild)for(const camera of state.securityCameras)buildVisionFan(camera,stage.visionBlockers);
  const pic=renderPlaygroundFrame(state,resources,false),surface=ck.MakeSurface(w,h)!;
  surface.getCanvas().drawPicture(pic.ref);surface.flush();const shot=surface.makeImageSnapshot();
  fs.writeFileSync(path.join(root,file),shot.encodeToBytes()!);shot.delete();surface.delete();pic.dispose();
 };
 for(const d of defs){
  const topPadding=Number(process.env.TOP_PADDING??40);
  const stage=compileStage(d),{resources}=resource(d,stage.width,stage.height+topPadding,1),state=createPlaygroundState(stage,guardStrideContract(ASSET_MANIFEST.characters.guard));state.cam={x:0,y:-topPadding};
  encode(state,resources,stage,stage.width,stage.height+topPadding,`${d.id}-Debug-OFF.png`);
  const w=400,h=800,zoom=w/(9.4*TILE),probe=resource(d,w,h,zoom);
  const focus=state.securityCameras[0]??stage.objective;
  state.cam={x:Math.max(0,Math.min(stage.width-w/zoom,focus.x-w/zoom/2)),y:Math.max(-90,Math.min(stage.height-h/zoom,focus.y-h/zoom*.4))};
  encode(state,probe.resources,stage,w,h,`${d.id}-Game-Scale-Security.png`);
  if(state.securityCameras.length){
   // Render-only probes: no claim that these authored states are gameplay witnesses.
   state.securityCameras[0].suspicion=.6;
   encode(state,probe.resources,stage,w,h,`${d.id}-Camera-Suspicion-Render-Probe.png`);
   state.securityCameras[0].suspicion=1;state.securityCameras[0].alerted=true;
   encode(state,probe.resources,stage,w,h,`${d.id}-Camera-Alert-Render-Probe.png`);
  }
  captures.push({mission:d.id,guards:state.guards.length,cameras:state.securityCameras.length,cameraConfigs:d.cameras??[],zoom,method:'Actual production render, static camera focus. Suspicion/alert frames explicitly render-only probes, not replay evidence.'});
 }
 const replayRecords:unknown[]=[];
 if(process.env.SECURITY_REPLAY){
  const input=JSON.parse(process.env.SECURITY_REPLAY) as {mission?:string;route:number;escape:number;mode:number;delay:number;objectiveHold?:number};
  const d=defs.find(d=>d.id===(input.mission??'03-10'));if(!d)throw Error('Replay mission missing');
  const w=400,h=800,zoom=w/(9.4*TILE),{stage,resources}=resource(d,w,h,zoom),state=createPlaygroundState(stage,guardStrideContract(ASSET_MANIFEST.characters.guard));
  const nav=buildNavigation(stage,BODY.guardRadius),bounds={x:0,y:0,w:stage.width,h:stage.height};
  const approach=d.testRoutes![input.route].points,points=[...approach,...d.escapeRoutes![input.escape].points.slice(1)];let leg=1,pickupAt:number|null=null;
  state.playerMode=0;
  const captured=new Set<string>();
  for(let f=0;f<9000&&!state.events.caught&&!state.mission.complete;f++){
   const holding=pickupAt!==null&&state.t<pickupAt+(input.objectiveHold??0);
   const targetIssued=state.t>=input.delay&&!holding;
   if(holding){state.playerMode=0;state.player.hasTarget=false;}
   if(targetIssued){state.playerMode=leg>=approach.length?3:input.mode;state.player.tx=points[leg].x*TILE;state.player.ty=points[leg].y*TILE;state.player.hasTarget=true;}
   // Exact bankProductionReplay input and simulation bounds; only output zoom differs.
   stepPlayground(state,1/60,TILE,400,800,bounds,stage.movementBlockers,stage.visionBlockers,nav);
   if(state.mission.treasure&&pickupAt===null)pickupAt=state.t;
   const flags=[['Pickup',state.mission.treasure],['Theft',state.events.theftAlert],['Spotted',state.events.spottedWhistleRevision>0],['CameraAlert',(state.events.cameraAlertRevision??0)>0],['Search',state.events.phase==='SEARCH'],['Caught',state.events.caught],['Complete',state.mission.complete]] as const;
   for(const [name,active]of flags)if(active&&!captured.has(name)){
    captured.add(name);const file=`${d.id}-Actual-Gameplay-${name}.png`;encode(state,resources,stage,w,h,file,false);
    captures.push({file,t:state.t,input,player:{x:state.player.x,y:state.player.y},camera:{...state.cam},method:'Continuous actual stepPlayground; authored spawn and target route; fullAI/capture active; no teleports.'});
   }
   if(targetIssued&&Math.hypot(state.player.x-state.player.tx,state.player.y-state.player.ty)<2&&leg<points.length-1)leg++;
  }
  replayRecords.push({input,time:state.t,clear:state.mission.complete,caught:state.events.caught,events:[...captured],sourceSha256:createHash('sha256').update(JSON.stringify(d)).digest('hex')});
 }
 const preferred=['01-10','02-10','03-10'].filter(id=>ids.includes(id));
 const compareIds=preferred.length?preferred:ids.slice(0,3);
 const images=compareIds.map(id=>`${id}-Debug-OFF.png`).map(file=>({file,image:ck.MakeImageFromEncoded(fs.readFileSync(path.join(root,file)))!}));
 const bw=Math.max(...images.map(i=>i.image.width()))+24,bh=Math.max(...images.map(i=>i.image.height()))+90,font=loadLabelFont(ck,20)!;
 const ink=new ck.Paint();ink.setColor(ck.parseColorString('#dae7ef'));ink.setAntiAlias(true);
 const gray=ck.ColorFilter.MakeMatrix([.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,0,0,0,1,0]);
 for(const grayscale of [false,true]){const surface=ck.MakeSurface(bw*images.length,bh)!;const canvas=surface.getCanvas();canvas.clear(ck.parseColorString('#08131e'));canvas.drawText(`MUSEUM / GALLERY / BANK | 1 WORLD UNIT = 1 PIXEL${grayscale?' | GRAYSCALE':''}`,20,28,ink,font);const paint=new ck.Paint();if(grayscale)paint.setColorFilter(gray);images.forEach((im,i)=>{canvas.drawText(compareIds[i],i*bw+12,60,ink,font);canvas.drawImage(im.image,i*bw+12,80,paint);});surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,`Museum-Gallery-Bank-${grayscale?'Grayscale':'Color'}.png`),shot.encodeToBytes()!);shot.delete();surface.delete();paint.delete();}
 fs.writeFileSync(path.join(root,'render-metadata.json'),JSON.stringify({method:'Actual production buildGameAssets/buildStageArt/renderPlaygroundFrame in offline CanvasKit. DebugOFF; existing final character atlases. Static camera probes separately labelled. No native/device/FPS claim.',securityArt:{cameraSource:'existing museum_atlas:cctv + vector mount/active light',cameraAtlasSha256:createHash('sha256').update(fs.readFileSync('assets/museum/museum_atlas.png')).digest('hex'),guardCone:'red',cameraCone:'amber'},worldUnitsPerPixel:1,gameplayZoom:400/(9.4*TILE),captures,replayRecords,stages:defs.map(d=>({id:d.id,sha256:createHash('sha256').update(JSON.stringify(d)).digest('hex')})),assets:ENVIRONMENT_ASSETS.filter((a:{chapter:string})=>['museum','gallery','bank'].includes(a.chapter)).map((a:{id:string;path:string})=>({id:a.id,path:a.path,sha256:createHash('sha256').update(fs.readFileSync(a.path)).digest('hex')}))},null,2)+'\n');
 const bankImages=ids.filter(id=>id.startsWith('03-')).map(id=>({id,image:ck.MakeImageFromEncoded(fs.readFileSync(path.join(root,`${id}-Debug-OFF.png`)))!}));
 if(bankImages.length){const cw=Math.max(...bankImages.map(v=>v.image.width()))+24,ch=Math.max(...bankImages.map(v=>v.image.height()))+44,surface=ck.MakeSurface(cw*5,ch*2)!;
  surface.getCanvas().clear(ck.parseColorString('#08131e'));bankImages.forEach((v,i)=>{const x=(i%5)*cw,y=Math.floor(i/5)*ch;surface.getCanvas().drawText(v.id,x+12,y+25,ink,font);surface.getCanvas().drawImage(v.image,x+12,y+38);});surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,bankImages.length===10?'Bank-All10-DebugOFF-SameScale.png':'Bank-Selected-DebugOFF-SameScale.png'),shot.encodeToBytes()!);shot.delete();surface.delete();bankImages.forEach(v=>v.image.delete());}
 // Separate engineering overview: actual pixels are unchanged below explicitly labelled overlays.
 // Coordinates come from the same frozen StageDefinitions used for the DebugOFF frames.
 const annotationLegend:unknown[]=[];
 const annotated=bankImages.map(v=>{
  const d=defs.find(d=>d.id===v.id)!;
  const image=ck.MakeImageFromEncoded(fs.readFileSync(path.join(root,`${v.id}-Debug-OFF.png`)))!;
  const surface=ck.MakeSurface(image.width(),image.height()+52)!;const canvas=surface.getCanvas();
  canvas.clear(ck.parseColorString('#08131e'));canvas.drawImage(image,0,0);
  const pen=new ck.Paint();pen.setAntiAlias(true);pen.setStrokeWidth(2);
  const labelFont=loadLabelFont(ck,15)!;
  const dot=(x:number,y:number,label:string,color:string)=>{pen.setColor(ck.parseColorString(color));canvas.drawCircle(x*TILE,y*TILE+40,5,pen);canvas.drawText(label,x*TILE+7,y*TILE+35,pen,labelFont);};
  const route=(points:{x:number;y:number}[],color:string)=>{pen.setColor(ck.parseColorString(color));pen.setStrokeWidth(2);for(let i=1;i<points.length;i++)canvas.drawLine(points[i-1].x*TILE,points[i-1].y*TILE+40,points[i].x*TILE,points[i].y*TILE+40,pen);};
  const routes=(d.testRoutes??[]).map((r,i)=>{const name=r.name.toLowerCase();const color=name.includes('safe')?'#66e7a1':name.includes('risk')?'#ffab55':'#65dfff';route(r.points,color);return {label:`R${i+1}`,name:r.name,color,points:r.points};});
  const escapes=(d.escapeRoutes??[]).map((r,i)=>{route(r.points,'#d59bff');return {label:`E${i+1}`,name:r.name,color:'#d59bff',points:r.points};});
  dot(d.playerSpawn.x,d.playerSpawn.y,'ENTRY','#66e7a1');
  if(d.objective)dot(d.objective.x,d.objective.y,'OBJECTIVE','#65dfff');
  const ex=d.exitPosition??(d.exit?{x:d.exit.x+d.exit.w/2,y:d.exit.y+d.exit.h/2}:null);if(ex)dot(ex.x,ex.y,'EXIT','#d59bff');
  const zones=(d.securityZones??[]).map((z,i)=>{dot(z.x,z.y,`Z${i+1}`,'#ffffff');return {label:`Z${i+1}`,...z};});
  const guards=d.guards.map((g,i)=>{dot(g.x,g.y,`G${i+1}`,'#ff6974');return {label:`G${i+1}`,id:g.id};});
  const cameras=(d.cameras??[]).map((c,i)=>{dot(c.x,c.y,`C${i+1}`,'#ffce71');return {label:`C${i+1}`,id:c.id};});
  // Major/landmark marks describe authored cover, not the tiny dressing count.
  const major=d.props.filter(p=>/^bank(MainVault|VaultDoor|DepositBoxWall|Teller|Cash|SecurityCheckpoint|SecurityGate|OfficeDesk|FilingCabinet|SmallSafe|VaultCorridorWall)/.test(p.kind)).map((p,i)=>{dot(p.x,p.y,`M${i+1}`,'#ddd4aa');return {label:`M${i+1}`,kind:p.kind,x:p.x,y:p.y};});
  if(d.landmark)dot(d.landmark.x,d.landmark.y,'LANDMARK','#ddd4aa');
  pen.setColor(ck.parseColorString('#dae7ef'));canvas.drawText('ANNOTATED OFFLINE RENDER — not game UI',8,image.height()+22,pen,labelFont);
  canvas.drawText('Main cyan / Safe green / Risk orange / Escape purple',8,image.height()+43,pen,labelFont);
  surface.flush();const shot=surface.makeImageSnapshot();const file=`${v.id}-Annotated-Overview.png`;fs.writeFileSync(path.join(root,file),shot.encodeToBytes()!);
  annotationLegend.push({mission:d.id,structurePlan:d.structurePlan,zones,guards,cameras,major,landmark:d.landmark,routes,escapes});
  shot.delete();surface.delete();image.delete();pen.delete();labelFont.delete();return {id:v.id,image:ck.MakeImageFromEncoded(fs.readFileSync(path.join(root,file)))!};
 });
 if(annotated.length){const cw=Math.max(...annotated.map(v=>v.image.width()))+24,ch=Math.max(...annotated.map(v=>v.image.height()))+44,surface=ck.MakeSurface(cw*5,ch*2)!;const canvas=surface.getCanvas();canvas.clear(ck.parseColorString('#08131e'));annotated.forEach((v,i)=>{const x=i%5*cw,y=Math.floor(i/5)*ch;canvas.drawText(v.id,x+12,y+25,ink,font);canvas.drawImage(v.image,x+12,y+38);});surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,annotated.length===10?'Bank-All10-Annotated-SameScale.png':'Bank-Selected-Annotated-SameScale.png'),shot.encodeToBytes()!);shot.delete();surface.delete();annotated.forEach(v=>v.image.delete());}
 fs.writeFileSync(path.join(root,'Bank-Overview-Legend.json'),JSON.stringify({method:'Engineering overlays on actual offline production frames; every map retains 1 world unit per pixel. Labels use frozen authored spawn, objective, exit, securityZones, guard/camera IDs, major cover, and named approach/escape routes.',missions:annotationLegend},null,2)+'\n');
 images.forEach(i=>i.image.delete());font.delete();ink.delete();gray.delete();console.log(root);
}
void main();
