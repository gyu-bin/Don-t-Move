/** Actual game renderer, fixed state/cameras. Offline captures, never device claims.
 * TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/museumPolishPreview.ts <output-dir>
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {initSkiaNode} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode();
 require.extensions['.png']=module=>{module.exports=0;};
 // Load ONLY historical static art, keeping today's map, simulation, assets and camera.
 if(process.env.BASELINE_ART_REF){
  const ts=require('typescript'),previous=require.extensions['.ts'];
  if(!previous)throw Error('Run this capture with node --import tsx');
  const files=new Set(['venueArt.ts','buildStageArt.ts'].map(f=>path.resolve('src/rendering/environment',f)));
  require.extensions['.ts']=(module,file)=>{
   if(!files.has(file)){previous(module,file);return;}
   const source=execFileSync('git',['show',`${process.env.BASELINE_ART_REF}:mobile/${path.relative(process.cwd(),file)}`],{encoding:'utf8'});
   const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
   (module as NodeJS.Module & {_compile:(code:string,filename:string)=>void})._compile(js,file);
  };
 }
 Object.assign(globalThis,{__DEV__:false});
 const {Skia,TileMode}=require('../sprites/skiaNodeShim');
 const {ASSET_MANIFEST}=require('../../src/assets/manifest');
 const {buildGameAssets}=require('../../src/assets/buildSprites');
 const {ENVIRONMENT_ASSETS,environmentAssetForProp}=require('../../src/assets/environmentKit');
 const {compileStage}=require('../../src/game/world/compileStage');
 const defs=JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON??'src/game/levels/stages/campaignStages.json','utf8'));
 const missionId=process.argv[3]??'01-01';
 const stage=compileStage(defs.find((d:{id:string})=>d.id===missionId));
 const needed=new Set(stage.props.map((p:unknown)=>environmentAssetForProp(stage.def,p)));
 const production=ENVIRONMENT_ASSETS.filter((a:{id:string})=>needed.has(a.id));
 const decode=(file:string)=>Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
 const images:Record<string,unknown>={...Object.fromEntries(production.map((a:{id:string;path:string})=>[a.id,decode(a.path)])),museumAtlas:decode('assets/museum/museum_atlas.png')};
 for(const who of ['player','guard'])for(const state of who==='player'?['idle','sneak','walk','run']:['idle','walk','run','whistle','search'])
  images[who+state[0].toUpperCase()+state.slice(1)]=decode(`assets/characters/${who}_${state}.png`);
 const manifest={...ASSET_MANIFEST,environment:{...ASSET_MANIFEST.environment,production}};
 const assets=buildGameAssets(manifest,images);
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
 const {createCctvArt}=require('../../src/rendering/effects/cctvArt');
 const {VALUABLES}=require('../../src/game/levels/stagePresentation');
 const {renderPlaygroundFrame}=require('../../src/rendering/renderFrame');
 const {fill}=require('../../src/rendering/paints');
 const state=createPlaygroundState(stage);
 for(const g of state.guards)buildVisionFan(g,stage.visionBlockers);
 const art=buildStageArt(stage,assets.museum);
 const labCase=stage.def.chapter===4&&stage.def.visualRevision==='v12-4c'&&stage.def.props.some((p:{kind:string;visualAssetId:string})=>p.kind==='objectiveCase'&&p.visualAssetId==='lab_sample_case');
 const base={stage:art,doors:createDoorArt(),cctv:createCctvArt(assets.museum?.cctv??null),player:createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false)),
  guard:createCharacterVisual(assets.guard,createCharacterArt(GUARD_PALETTE,true)),cone:createConeArt(),icons:createIconArt(assets.indicators),fx:createLightFx(),
  diamond:labCase?null:assets.museum?.[VALUABLES[stage.def.objective?.kind??'diamond'].sprite]??null,objectiveGlowHeight:labCase?20:undefined,
  diamondPos:stage.objective,exit:Skia.XYWHRect(stage.exit.x,stage.exit.y,stage.exit.w,stage.exit.h),
  exitPosition:{x:stage.def.exitPosition.x*40,y:stage.def.exitPosition.y*40},guidanceInsets:{top:147,bottom:54,left:0,right:0},
  debug:createDebugArt(null),showObjective:true};
 const out=path.resolve(process.argv[2]??'Reports/MuseumPolish/after');fs.mkdirSync(out,{recursive:true});
 const captures=[];
 for(const [name,x,y] of [['entrance',stage.playerSpawn.x,stage.playerSpawn.y],['exhibition',400,400],['objective',stage.objective.x,stage.objective.y],['map',0,0]] as const){
  if(process.env.MAP_ONLY==='1'&&name!=='map')continue;
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
 fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify({missionId,staticArtRef:process.env.BASELINE_ART_REF??'working-tree',simulationDigest:createHash('sha256').update(JSON.stringify({...state,cam:undefined})).digest('hex'),method:'Offline actual renderPlaygroundFrame, debug OFF, t=0, unchanged spawn/guards; fixed camera focus. No native HUD. CanvasKit software replay timing excludes simulation/sensors and is NOT device GPU/energy evidence.',captures,
  pictures:{floor:art.floor.serialize()?.length,darkness:art.darkness.serialize()?.length,glow:art.glow.serialize()?.length,layers:art.layers.length}},null,2)+'\n');
 console.log(out);
}
void main();
