/** Phase4C offline actual-game-renderer inspection. Not a Simulator or device screenshot.
 * Run: TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/campaign/renderMuseumQA.ts
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {initSkiaNode} from '../sprites/skiaNode';

async function main() {
  const ck = await initSkiaNode();
  require.extensions['.png'] = module => { module.exports = 0; };
  // Freeze old artwork selection for historical snapshots without creating fake
  // PNGs for assets that did not exist before this pass.
  if(process.env.BEFORE_RUNTIME==='1'){
    const filename=require.resolve('../../src/assets/environmentKit');
    const Module=require('node:module');
    const stub=new Module(filename);stub.filename=filename;stub.loaded=true;
    stub.exports={ENVIRONMENT_IMAGE_SOURCES:{},ENVIRONMENT_ASSETS:[],decodeEnvironmentImages:()=>({}),environmentAssetForProp:()=>undefined};
    require.cache[filename]=stub;
  }
  Object.assign(globalThis, {__DEV__: false});
  const {Skia} = require('../sprites/skiaNodeShim');
  const {ASSET_MANIFEST} = require('../../src/assets/manifest');
  const {buildGameAssets} = require('../../src/assets/buildSprites');
  const {campaignStages} = require('../../src/game/levels/campaignStages');
  const {VALUABLES} = require('../../src/game/levels/stagePresentation');
  const {compileStage} = require('../../src/game/world/compileStage');
  const {createPlaygroundState} = require('../../src/game/playground/playgroundState');
  const {buildVisionFan} = require('../../src/game/guards/guardVision');
  const {buildStageArt} = require('../../src/rendering/environment/buildStageArt');
  const {createCharacterVisual} = require('../../src/rendering/characters/characterVisual');
  const {createCharacterArt} = require('../../src/rendering/fallback/proceduralCharacter');
  const {PLAYER_PALETTE, GUARD_PALETTE} = require('../../src/rendering/fallback/characterPalettes');
  const {createConeArt} = require('../../src/rendering/effects/visionCone');
  const {createIconArt} = require('../../src/rendering/effects/alertIcons');
  const {createLightFx} = require('../../src/rendering/effects/lightFx');
  const {createDebugArt} = require('../../src/rendering/debug/guardDebug');
  const {renderPlaygroundFrame} = require('../../src/rendering/renderFrame');
  const {fill} = require('../../src/rendering/paints');
  const decode = (file: string) => Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
  const {decodeEnvironmentImages}=require('../../src/assets/environmentKit');
  const c = 'assets/characters/';
  const assets = buildGameAssets(ASSET_MANIFEST, {
    ...decodeEnvironmentImages(decode),
    museumAtlas: decode('assets/museum/museum_atlas.png'),
    playerIdle: decode(c + 'player_idle.png'), playerSneak: decode(c + 'player_sneak.png'), playerWalk: decode(c + 'player_walk.png'), playerRun: decode(c + 'player_run.png'),
    guardIdle: decode(c + 'guard_idle.png'), guardWalk: decode(c + 'guard_walk.png'), guardRun: decode(c + 'guard_run.png'),
    guardWhistle: decode(c + 'guard_whistle.png'), guardSearch: decode(c + 'guard_search.png'),
  });
  const {createDoorArt}=require('../../src/rendering/environment/doorArt');
  const {stepDoor,doorBlockers}=require('../../src/game/doors/doorSystem');
  const out=process.env.QA_OUT??'Reports/V12Phase4C/after';fs.mkdirSync(out,{recursive:true});
  const source:StageDefinition[]=process.env.CAMPAIGN_JSON?JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON,'utf8')):campaignStages;
  const defs=source.filter((d:StageDefinition)=>(d.chapter??0)<=Number(process.env.QA_MAX_CHAPTER??4)&&(!process.env.QA_CHAPTER||d.chapter===Number(process.env.QA_CHAPTER)));
  for(const d of defs){
    const stage=compileStage(d),state=createPlaygroundState(stage);
    state.cam={x:-16,y:-55};
    const width=stage.width+32,height=stage.height+71;
    const resources={stage:buildStageArt(stage,assets.museum),doors:createDoorArt(),
      player:createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false)),
      guard:createCharacterVisual(assets.guard,createCharacterArt(GUARD_PALETTE,true)),
      cone:createConeArt(),icons:createIconArt(assets.indicators),fx:createLightFx(),
      diamond:assets.museum?.[VALUABLES[d.objective?.kind??'diamond'].sprite]??null,diamondPos:stage.objective,
      exit:Skia.XYWHRect(stage.exit.x,stage.exit.y,stage.exit.w,stage.exit.h),debug:createDebugArt(null),
      vignette:fill('#000000',0),screen:Skia.XYWHRect(0,0,width,height),zoom:1};
    for(const phase of ['OPEN','CLOSED']){
      if(phase==='CLOSED')for(const door of state.doors??[])if(d.lockdownDoors?.includes(door.id))stepDoor(door,1,true,[]);
      for(const guard of state.guards)buildVisionFan(guard,doorBlockers(state.doors??[],stage.movementBlockers,stage.visionBlockers).visionBlockers);
      const pic=renderPlaygroundFrame(state,resources,false),surface=ck.MakeSurface(width,height)!;
      surface.getCanvas().drawPicture(pic.ref);surface.flush();const image=surface.makeImageSnapshot();
      fs.writeFileSync(`${out}/${d.id}-${phase}-DebugOFF.png`,image.encodeToBytes()!);
      image.delete();surface.delete();pic.dispose();
    }
    console.log(d.id,d.title,`${stage.width}x${stage.height}`);
  }
  console.log('Offline production Skia inspection only. CLOSED panels set for art review, not live lockdown evidence.');
}
void main();
