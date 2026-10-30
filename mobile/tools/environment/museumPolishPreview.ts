/** Actual game renderer, fixed state/cameras. Offline captures, never device claims.
 * TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/museumPolishPreview.ts <output-dir>
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {initSkiaNode} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode();
 require.extensions['.png']=module=>{module.exports=0;};
 Object.assign(globalThis,{__DEV__:false});
 const {Skia,TileMode}=require('../sprites/skiaNodeShim');
 const {ASSET_MANIFEST}=require('../../src/assets/manifest');
 const {buildGameAssets}=require('../../src/assets/buildSprites');
 const {ENVIRONMENT_ASSETS}=require('../../src/assets/environmentKit');
 const decode=(file:string)=>Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
 const images:Record<string,unknown>={...Object.fromEntries(ENVIRONMENT_ASSETS.filter((a:{chapter:string})=>a.chapter==='museum').map((a:{id:string;path:string})=>[a.id,decode(a.path)])),museumAtlas:decode('assets/museum/museum_atlas.png')};
 for(const who of ['player','guard'])for(const state of who==='player'?['idle','sneak','walk','run']:['idle','walk','run','whistle','search'])
  images[who+state[0].toUpperCase()+state.slice(1)]=decode(`assets/characters/${who}_${state}.png`);
 const manifest={...ASSET_MANIFEST,environment:{...ASSET_MANIFEST.environment,
  production:ASSET_MANIFEST.environment.production.filter((a:{chapter:string})=>a.chapter==='museum')}};
 const assets=buildGameAssets(manifest,images);
 const {compileStage}=require('../../src/game/world/compileStage');
 const defs=require('../../src/game/levels/stages/campaignStages.json');
 const missionId=process.argv[3]??'01-01';
 const stage=compileStage(defs.find((d:{id:string})=>d.id===missionId));
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
 const {createDoorArt}=require('../../src/rendering/environment/doorArt');
 const {renderPlaygroundFrame}=require('../../src/rendering/renderFrame');
 const {fill}=require('../../src/rendering/paints');
 const state=createPlaygroundState(stage);
 for(const g of state.guards)buildVisionFan(g,stage.visionBlockers);
 const art=buildStageArt(stage,assets.museum);
 const base={stage:art,doors:createDoorArt(),player:createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false)),
  guard:createCharacterVisual(assets.guard,createCharacterArt(GUARD_PALETTE,true)),cone:createConeArt(),icons:createIconArt(assets.indicators),fx:createLightFx(),
  diamond:assets.museum?.diamond,diamondPos:stage.objective,exit:Skia.XYWHRect(stage.exit.x,stage.exit.y,stage.exit.w,stage.exit.h),
  exitPosition:{x:stage.def.exitPosition.x*40,y:stage.def.exitPosition.y*40},guidanceInsets:{top:147,bottom:54,left:0,right:0},
  debug:createDebugArt(null),showObjective:true};
 const out=path.resolve(process.argv[2]??'Reports/MuseumPolish/after');fs.mkdirSync(out,{recursive:true});
 const captures=[];
 for(const [name,x,y] of [['entrance',stage.playerSpawn.x,stage.playerSpawn.y],['exhibition',400,400],['objective',stage.objective.x,stage.objective.y],['map',0,0]] as const){
  const full=name==='map',width=full?stage.width:400,height=full?stage.height+40:800,zoom=full?1:400/(9.4*40);
  const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(v,b));
  state.cam=full?{x:0,y:-40}:{x:clamp(x-width/zoom/2,0,stage.width-width/zoom),y:clamp(y-height/zoom*.52,-124,stage.height-height/zoom)};
  const vignette=fill('#000000',0);
  if(!full)vignette.setShader(Skia.Shader.MakeRadialGradient({x:width/2,y:height*.48},height*.72,
   ['rgba(0,0,0,0)','rgba(0,0,0,0.18)','rgba(0,0,0,0.72)'].map(Skia.Color),[.45,.7,1],TileMode.Clamp));
  const resources={...base,vignette,screen:Skia.XYWHRect(0,0,width,height),zoom};
  const surface=ck.MakeSurface(width,height)!;
  const render=()=>{const p=renderPlaygroundFrame(state,resources,false);surface.getCanvas().drawPicture(p.ref);surface.flush();p.dispose();};
  render();const snapshot=surface.makeImageSnapshot();fs.writeFileSync(path.join(out,`${name}.png`),snapshot.encodeToBytes()!);snapshot.delete();
  const rounds=[];
  if(process.env.SKIP_REPLAY!=='1'){
   for(let i=0;i<2;i++)render();
   for(let r=0;r<(full?0:5);r++){const start=performance.now();for(let f=0;f<3;f++)render();rounds.push((performance.now()-start)/3);}
  }
  captures.push({name,camera:{...state.cam},player:{x:state.player.x,y:state.player.y},width,height,zoom,softwareSkiaMsPerFrame:rounds});
  surface.delete();
 }
 fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify({missionId,method:'Offline actual renderPlaygroundFrame, debug OFF, t=0, unchanged spawn/guards; fixed camera focus. No native HUD. CanvasKit software replay timing excludes simulation/sensors and is NOT device GPU/energy evidence.',captures,
  pictures:{floor:art.floor.serialize()?.length,darkness:art.darkness.serialize()?.length,glow:art.glow.serialize()?.length,layers:art.layers.length}},null,2)+'\n');
 console.log(out);
}
void main();
