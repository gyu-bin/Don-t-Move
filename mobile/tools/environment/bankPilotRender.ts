/** Actual production Skia render path. Offline frames, not Simulator/native captures. */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BANK_PILOT} from './bankPilot';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode();require.extensions['.png']=module=>{module.exports=0;};Object.assign(globalThis,{__DEV__:false});
 const {Skia,TileMode}=require('../sprites/skiaNodeShim');
 const {ASSET_MANIFEST}=require('../../src/assets/manifest');
 const {buildGameAssets}=require('../../src/assets/buildSprites');
 const {decodeEnvironmentImages,ENVIRONMENT_ASSETS}=require('../../src/assets/environmentKit');
 const {campaignStages}=require('../../src/game/levels/campaignStages');
 const {compileStage,TILE}=require('../../src/game/world/compileStage');
 const {buildNavigation}=require('../../src/game/world/navigation');
 const {BODY}=require('../../src/game/guards/guardTuning');
 const {createPlaygroundState,stepPlayground}=require('../../src/game/playground/playgroundState');
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
 const root='Reports/BankKitV1';fs.mkdirSync(root,{recursive:true});
 const decode=(file:string)=>{const im=Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));if(!im)throw Error(`PNG decode failed:${file}`);return im;};
 const ch='assets/characters/';
 const assets=buildGameAssets(ASSET_MANIFEST,{...decodeEnvironmentImages(decode),museumAtlas:decode('assets/museum/museum_atlas.png'),playerIdle:decode(ch+'player_idle.png'),playerSneak:decode(ch+'player_sneak.png'),playerWalk:decode(ch+'player_walk.png'),playerRun:decode(ch+'player_run.png'),guardIdle:decode(ch+'guard_idle.png'),guardWalk:decode(ch+'guard_walk.png'),guardRun:decode(ch+'guard_run.png'),guardWhistle:decode(ch+'guard_whistle.png'),guardSearch:decode(ch+'guard_search.png')});
 const captures:unknown[]=[],bankVision=compileStage(BANK_PILOT).visionBlockers;
 const resource=(d:StageDefinition,w:number,h:number,zoom:number)=>{const stage=compileStage(d),vignette=Skia.Paint();vignette.setShader(Skia.Shader.MakeRadialGradient({x:w/2,y:h*.48},Math.max(w,h)*.72,[Skia.Color('rgba(0,0,0,0)'),Skia.Color('rgba(0,0,0,0.18)'),Skia.Color('rgba(0,0,0,0.72)')],[.45,.7,1],TileMode.Clamp));return {stage,resources:{stage:buildStageArt(stage,assets.museum),player:createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false)),guard:createCharacterVisual(assets.guard,createCharacterArt(GUARD_PALETTE,true)),cone:createConeArt(),icons:createIconArt(assets.indicators),fx:createLightFx(),diamond:assets.museum?.diamond??null,diamondPos:stage.objective,exit:Skia.XYWHRect(stage.exit.x,stage.exit.y,stage.exit.w,stage.exit.h),debug:createDebugArt(null),vignette:zoom===1?fill('#000000',0):vignette,screen:Skia.XYWHRect(0,0,w,h),zoom,showObjective:true,guidanceInsets:{top:147,bottom:54,left:0,right:0}}};};
 const save=(state:ReturnType<typeof createPlaygroundState>,resources:ReturnType<typeof resource>['resources'],w:number,h:number,file:string)=>{for(const g of state.guards)buildVisionFan(g,bankVision);const pic=renderPlaygroundFrame(state,resources,false),surface=ck.MakeSurface(w,h)!;surface.getCanvas().drawPicture(pic.ref);surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,file),shot.encodeToBytes()!);shot.delete();surface.delete();pic.dispose();};
 const defs:StageDefinition[]=[campaignStages.find((d:StageDefinition)=>d.id==='01-02'),campaignStages.find((d:StageDefinition)=>d.id==='02-03'),BANK_PILOT];
 for(const [i,d] of defs.entries()){
  const stage=compileStage(d),{resources}=resource(d,stage.width,stage.height+40,1),state=createPlaygroundState(stage,guardStrideContract(ASSET_MANIFEST.characters.guard));state.cam={x:0,y:-40};
  // Actual stage LOS, not the Bank fixture, determines every comparison cone.
  for(const g of state.guards)buildVisionFan(g,stage.visionBlockers);
  const pic=renderPlaygroundFrame(state,resources,false),surface=ck.MakeSurface(stage.width,stage.height+40)!;surface.getCanvas().drawPicture(pic.ref);surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,['Museum-Debug-OFF.png','Gallery-Debug-OFF.png','Bank-Pilot-Debug-OFF.png'][i]),shot.encodeToBytes()!);shot.delete();surface.delete();pic.dispose();
 }
 const w=400,h=800,zoom=w/(9.4*TILE),{stage,resources}=resource(BANK_PILOT,w,h,zoom),bounds={x:0,y:-124,w:stage.width,h:stage.height+124},clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
 for(const focus of [{name:'Lobby',x:9.5,y:18},{name:'Security-Gate',x:10,y:12},{name:'Vault',x:13,y:4.5}]){const state=createPlaygroundState(stage,guardStrideContract(ASSET_MANIFEST.characters.guard));state.cam.x=clamp(focus.x*TILE-w/zoom/2,0,stage.width-w/zoom);state.cam.y=clamp(focus.y*TILE-h/zoom*.52,-124,stage.height-h/zoom);save(state,resources,w,h,`Bank-Game-Scale-${focus.name}.png`);captures.push({file:`Bank-Game-Scale-${focus.name}.png`,method:'Static production renderer; unchanged spawn, landmark camera focus. Not player-follow playthrough.',focus,zoom});}
 const qa=JSON.parse(fs.readFileSync(path.join(root,'pilot-qa.json'),'utf8'));
 assert.equal(qa.sourceSha256,createHash('sha256').update(JSON.stringify(BANK_PILOT)).digest('hex'),'QA witness must use this exact fixture');
 const selected=qa.replays[0].witness as {route:number;escape:number;mode:number;delay:number;clear:boolean};
 assert(selected?.clear,'Main fullAI QA completion witness required');
 const state=createPlaygroundState(stage,guardStrideContract(ASSET_MANIFEST.characters.guard)),nav=buildNavigation(stage,BODY.guardRadius),entry=BANK_PILOT.testRoutes![selected.route].points,points=[...entry,...BANK_PILOT.escapeRoutes![selected.escape].points.slice(1)];let leg=1,next=0;
 const times=[0,selected.delay+5,selected.delay+10,selected.delay+20,selected.delay+30,selected.delay+35];
 for(let f=0;f<9000&&!state.events.caught&&!state.mission.complete;f++){
  const targetIssued=state.t>=selected.delay;
  if(targetIssued){state.playerMode=leg>=entry.length?3:selected.mode;state.player.tx=points[leg].x*TILE;state.player.ty=points[leg].y*TILE;state.player.hasTarget=true;}else{state.playerMode=0;state.player.hasTarget=false;}
  stepPlayground(state,1/60,TILE,w/zoom,h/zoom,bounds,stage.movementBlockers,stage.visionBlockers,nav);
  if(next<times.length&&state.t>=times[next]){const file=`Bank-Gameplay-${String(next+1).padStart(2,'0')}.png`;save(state,resources,w,h,file);captures.push({file,t:state.t,player:{x:state.player.x/TILE,y:state.player.y/TILE},camera:{...state.cam},method:'Continuous actual stepPlayground; fullAI/capture active; no teleports; authored Main Sneak, Run escape.',zoom});next++;}
  if(targetIssued&&Math.hypot(state.player.x-state.player.tx,state.player.y-state.player.ty)<2&&leg<points.length-1)leg++;
 }
 assert(state.mission.complete&&!state.events.caught,'Actual rendered continuous Main witness must really complete');
 save(state,resources,w,h,'Bank-Gameplay-Clear.png');
 const images=['Museum-Debug-OFF.png','Gallery-Debug-OFF.png','Bank-Pilot-Debug-OFF.png'].map(file=>({file,image:ck.MakeImageFromEncoded(fs.readFileSync(path.join(root,file)))!}));
 const bw=Math.max(...images.map(i=>i.image.width()))+24,bh=Math.max(...images.map(i=>i.image.height()))+90,font=loadLabelFont(ck,20)!;
 const ink=new ck.Paint();ink.setColor(ck.parseColorString('#dae7ef'));ink.setAntiAlias(true);
 const gray=ck.ColorFilter.MakeMatrix([.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,.2126,.7152,.0722,0,0,0,0,0,1,0]);
 for(const grayscale of [false,true]){const surface=ck.MakeSurface(bw*3,bh)!;const canvas=surface.getCanvas();canvas.clear(ck.parseColorString('#08131e'));canvas.drawText(`MUSEUM / GALLERY / BANK | 1 WORLD UNIT = 1 PIXEL${grayscale?' | GRAYSCALE':''}`,20,28,ink,font);const paint=new ck.Paint();if(grayscale)paint.setColorFilter(gray);images.forEach((im,i)=>{canvas.drawText(['Museum 01-02','Gallery 02-03','Bank separate pilot'][i],i*bw+12,60,ink,font);canvas.drawImage(im.image,i*bw+12,80,paint);});surface.flush();const shot=surface.makeImageSnapshot();fs.writeFileSync(path.join(root,`Museum-Gallery-Bank-${grayscale?'Grayscale':'Color'}.png`),shot.encodeToBytes()!);shot.delete();surface.delete();paint.delete();}
 fs.writeFileSync(path.join(root,'render-metadata.json'),JSON.stringify({method:'Actual production buildGameAssets/buildStageArt/renderPlaygroundFrame in offline CanvasKit. DebugOFF; existing final character atlases. Static camera probes separately labelled. No native/device/FPS claim.',worldUnitsPerPixel:1,gameplayZoom:zoom,captures,mainReplay:{input:selected,clear:state.mission.complete,caught:state.events.caught,time:state.t,finalLeg:leg,clearFrame:'Bank-Gameplay-Clear.png'},stages:defs.map(d=>({id:d.id,sha256:createHash('sha256').update(JSON.stringify(d)).digest('hex')})),assets:ENVIRONMENT_ASSETS.filter((a:{chapter:string})=>a.chapter==='bank').map((a:{id:string;path:string})=>({id:a.id,path:a.path,sha256:createHash('sha256').update(fs.readFileSync(a.path)).digest('hex')}))},null,2)+'\n');
 images.forEach(i=>i.image.delete());font.delete();ink.delete();gray.delete();console.log(root);
}
void main();
