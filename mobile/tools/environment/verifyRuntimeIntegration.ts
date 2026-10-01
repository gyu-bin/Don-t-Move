/** Real production PNG decode and static renderer draw-path verification. Not native FPS QA.
 * TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/environment/verifyRuntimeIntegration.ts
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {initSkiaNode} from '../sprites/skiaNode';

async function main(){
 await initSkiaNode();
 require.extensions['.png']=module=>{module.exports=0;};
 const {Skia}=require('../sprites/skiaNodeShim');
 const {ASSET_MANIFEST}=require('../../src/assets/manifest');
 const {ENVIRONMENT_ASSETS,decodeEnvironmentImages}=require('../../src/assets/environmentKit');
 const {buildGameAssets,referencedImages}=require('../../src/assets/buildSprites');
 const {compileStage}=require('../../src/game/world/compileStage');
 const {campaignStages}=require('../../src/game/levels/campaignStages');
 const {buildStageArt}=require('../../src/rendering/environment/buildStageArt');
 const decode=(file:string)=>{const image=Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));assert(image,`decode failed: ${file}`);return image;};
 const images=decodeEnvironmentImages(decode);
 assert.equal(Object.keys(images).length,20);
 const assets=buildGameAssets(ASSET_MANIFEST,{...images,museumAtlas:decode('assets/museum/museum_atlas.png')});
 const identities=new Map(Object.entries(images).map(([id,image])=>[image,id]));
 let current:Record<string,number>={};
 const original=Skia.PictureRecorder;
 // Observe the real helper's image draws, including dressing and composite attachments.
 Skia.PictureRecorder=()=>{
  const recorder=original(),begin=recorder.beginRecording.bind(recorder);
  recorder.beginRecording=(bounds:unknown)=>{
   const c=begin(bounds),draw=c.drawImageRect.bind(c);
   c.drawImageRect=(image:unknown,...args:unknown[])=>{
    const id=identities.get(image);if(id)current[id]=(current[id]??0)+1;
    return draw(image,...args);
   };
   return c;
  };
  return recorder;
 };
 const missions=[];
 try{
  for(const def of campaignStages.filter((d:{chapter:number})=>d.chapter===1||d.chapter===2)){
   current={};const stage=compileStage(def),art=buildStageArt(stage,assets.museum);
   assert(Object.keys(current).length>0,`${def.id}: no production image actually drawn`);
   const prefix=def.chapter===1?'museum_':'gallery_';
   assert(Object.keys(current).every(id=>id.startsWith(prefix)),`${def.id}: wrong chapter asset draw`);
   missions.push({id:def.id,actualImageDraws:{...current},staticLayers:art.layers.length});
  }
 }finally{Skia.PictureRecorder=original;}
 assert.equal(missions.length,20);
 const drawn=new Set(missions.flatMap(m=>Object.keys(m.actualImageDraws)));
 assert.equal(drawn.size,20,'all twenty approved PNGs must be reached by actual production renderer calls');
 const specs=ENVIRONMENT_ASSETS.map((s:{id:string;path:string})=>({id:s.id,path:s.path,decoded:true,preloadReferenced:referencedImages(ASSET_MANIFEST).includes(s.id),actualRuntimeDraw:drawn.has(s.id)}));
 assert(specs.every((s:{preloadReferenced:boolean;actualRuntimeDraw:boolean})=>s.preloadReferenced&&s.actualRuntimeDraw));
 const out=path.resolve(process.env.OUT_JSON??'Reports/ApprovedEnvironmentIntegrationV1/runtime-draw-verification.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({scope:'CanvasKit execution of real production buildGameAssets/buildStageArt; not Simulator/device',decodedAssets:20,drawnAssetIds:20,missions:missions.length,assets:specs,missionDraws:missions},null,2)+'\n');
 console.log(`PASS: 20 decoded assets, 20 actual drawn IDs, 20 missions; ${out}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
