/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
async function main(){
 const ck=await initSkiaNode();require.extensions['.png']=module=>{module.exports=0;};
 const {Skia}=require('../sprites/skiaNodeShim');
 const {ASSET_MANIFEST}=require('../../src/assets/manifest');
 const {buildGameAssets}=require('../../src/assets/buildSprites');
 const {decodeEnvironmentImages,environmentAssetForProp}=require('../../src/assets/environmentKit');
 const {PROP_KIT}=require('../../src/game/world/propKit');
 const {createDoorArt,drawPhysicalDoor}=require('../../src/rendering/environment/doorArt');
 const {createCharacterVisual,drawCharacterVisual}=require('../../src/rendering/characters/characterVisual');
 const {createCharacterArt}=require('../../src/rendering/fallback/proceduralCharacter');
 const {PLAYER_PALETTE}=require('../../src/rendering/fallback/characterPalettes');
 const {fill}=require('../../src/rendering/paints');
 const decode=(file:string)=>Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(file)));
 const dir='assets/characters/';
 const images={...decodeEnvironmentImages(decode),museumAtlas:decode('assets/museum/museum_atlas.png'),
  playerIdle:decode(dir+'player_idle.png'),playerSneak:decode(dir+'player_sneak.png'),playerWalk:decode(dir+'player_walk.png'),playerRun:decode(dir+'player_run.png'),
  guardIdle:decode(dir+'guard_idle.png'),guardWalk:decode(dir+'guard_walk.png'),guardRun:decode(dir+'guard_run.png'),guardWhistle:decode(dir+'guard_whistle.png'),guardSearch:decode(dir+'guard_search.png')};
 const assets=buildGameAssets(ASSET_MANIFEST,images),player=createCharacterVisual(assets.player,createCharacterArt(PLAYER_PALETTE,false)),doors=createDoorArt();
 const source:StageDefinition[]=JSON.parse(fs.readFileSync(process.env.CAMPAIGN_JSON??'src/game/levels/stages/campaignStages.json','utf8'));
 const chapters=[1,2,3,4];
 const mediumKinds=[['table','bench'],['bench','table'],['bankOfficeDesk','bankCashProcessingTable'],['labWorkstation','labLargeTable']];
 const largeKinds=[['counter','displayCase'],['partition','statue'],['bankTellerCounter','bankSecurityCheckpoint'],['labLargeTable','labObservationConsole']];
 const landmarkKinds=[['statue'],['statue','statuePedestal'],['bankMainVault'],['labCryoUnit','labPrototypeMachine','labCryoChamber','labCentralExperiment']];
 const width=1400,height=1220,rec=Skia.PictureRecorder(),c=rec.beginRecording(Skia.XYWHRect(0,0,width,height)),white=fill('#FFFFFF');
 const labels:{x:number;y:number;text:string}[]=[];
 for(const chapter of chapters){
  const defs=source.filter(d=>d.chapter===chapter&&d.visualRevision==='v12-4c');if(!defs.length)throw Error('No Phase4C definitions for chapter '+chapter);
  const row=chapter-1,y=275+row*290;
  drawCharacterVisual(c,player,90,y,Math.PI/2,0,0,0,0,0,0,true,-1,0);
  labels.push({x:24,y:y+27,text:['Museum','Gallery','Bank','Lab'][row]+' / player'});
  const door=defs.flatMap(d=>d.doors??[]).find(d=>d.orientation==='horizontal'&&(chapter!==3||d.style==='bankVault4c'))??defs[0].doors![0];
  drawPhysicalDoor(c,{...door,x:310,y,width:door.width*40,thickness:door.thickness*40,orientation:'horizontal',state:'CLOSED',progress:1,pausedForOccupancy:false,collisionRevision:0},doors,0);
  labels.push({x:215,y:y+27,text:door.style??'door'});
  for(let j=0;j<3;j++){
   const kinds=[mediumKinds,largeKinds,landmarkKinds][j][row];
   const candidates=defs.flatMap(d=>d.props.filter(p=>kinds.includes(p.kind)&&!!environmentAssetForProp(d,p)).map(p=>({d,p})));
   // Preferred authored asset role, then its largest example; no synthetic scales.
   candidates.sort((a,b)=>kinds.indexOf(a.p.kind)-kinds.indexOf(b.p.kind)||PROP_KIT[b.p.kind].drawWidth*(b.p.scale??1)-PROP_KIT[a.p.kind].drawWidth*(a.p.scale??1));
   const item=candidates[0];if(!item){labels.push({x:510+j*285,y:y+27,text:j===2&&chapter===3?'Vault shown as door':'No authored role'});continue;}
   const {d,p}=item,id=environmentAssetForProp(d,p),f=assets.museum[id],spec=PROP_KIT[p.kind],w=spec.drawWidth*40*(p.scale??1),s=w/f.sw,x=605+j*285;
   c.save();if(p.flip){c.translate(x,0);c.scale(-1,1);c.translate(-x,0);}
   c.drawImageRect(f.image,Skia.XYWHRect(f.sx,f.sy,f.sw,f.sh),Skia.XYWHRect(x-f.ax*s,y-spec.mountHeight-f.ay*s,f.sw*s,f.sh*s),white);c.restore();
   labels.push({x:510+j*285,y:y+27,text:id.replace(/^(museum|gallery|bank|lab)_/,'')});
   labels.push({x:510+j*285,y:y+47,text:`${d.id} / ${Math.round(w)} world px`});
  }
 }
 const pic=rec.finishRecordingAsPicture(),surface=ck.MakeSurface(width,height)!,canvas=surface.getCanvas(),paint=new ck.Paint(),font=loadLabelFont(ck,16)!;
 canvas.clear(ck.parseColorString('#283941'));canvas.drawPicture(pic.ref);paint.setColor(ck.parseColorString('#E9F3F6'));
 canvas.drawText('Phase4C | Actual atlas + runtime player/door renderer | 1 image pixel = 1 world pixel | authored scales',20,27,paint,font);
 for(const label of labels)canvas.drawText(label.text,label.x,label.y,paint,font);
 surface.flush();const image=surface.makeImageSnapshot();fs.mkdirSync('Reports/V12Phase4C/visual',{recursive:true});fs.writeFileSync('Reports/V12Phase4C/visual/player-relative-scale.png',image.encodeToBytes()!);
 fs.writeFileSync('Reports/V12Phase4C/visual/player-relative-scale.json',JSON.stringify(labels,null,2)+'\n');image.delete();surface.delete();pic.dispose();paint.delete();font.delete();
}
void main();
