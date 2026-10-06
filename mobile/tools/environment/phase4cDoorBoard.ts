/* eslint-disable @typescript-eslint/no-require-imports */
import fs from 'node:fs';
import {initSkiaNode,loadLabelFont} from '../sprites/skiaNode';
import type {DoorStyle,DoorRuntime} from '../../src/game/doors/doorTypes';
async function main(){
 const ck=await initSkiaNode();
 const {Skia}=require('../sprites/skiaNodeShim');
 const {createDoorArt,drawPhysicalDoor}=require('../../src/rendering/environment/doorArt');
 const styles:DoorStyle[]=['museumExhibition4c','museumRestrictedCollection4c','museumSecurity4c','galleryMinimal4c','galleryGlassSliding4c','galleryPrivateCollection4c','bankStaff4c','bankSecurity4c','bankSecurityPortal4c','bankVault4c','labSliding4c','labRestrictedGlass4c','labPrototypeSecurity4c'];
 const width=1320,height=styles.length*156+55,art=createDoorArt();
 const rec=Skia.PictureRecorder(),canvas=rec.beginRecording(Skia.XYWHRect(0,0,width,height));
 for(let i=0;i<styles.length;i++)for(let j=0;j<3;j++){
  const d:DoorRuntime={id:'board',type:'solid',style:styles[i],x:450+j*280,y:i*156+160,width:132,thickness:8,orientation:'horizontal',state:j===0?'OPEN':j===1?'CLOSING':'CLOSED',progress:j/2,pausedForOccupancy:false,collisionRevision:0};
  drawPhysicalDoor(canvas,d,art,0.2);
 }
 const pic=rec.finishRecordingAsPicture(),surface=ck.MakeSurface(width,height)!,c=surface.getCanvas(),paint=new ck.Paint(),font=loadLabelFont(ck,17)!;
 c.clear(ck.parseColorString('#263640'));c.drawPicture(pic.ref);paint.setColor(ck.parseColorString('#E7F1F4'));
 c.drawText('Phase4C actual runtime vector doors • 132px openings • OPEN / CLOSING / CLOSED • offline Skia',20,28,paint,font);
 for(let i=0;i<styles.length;i++)c.drawText(styles[i],18,i*156+120,paint,font);
 surface.flush();const image=surface.makeImageSnapshot();fs.mkdirSync('Reports/V12Phase4C/visual',{recursive:true});fs.writeFileSync('Reports/V12Phase4C/visual/doors-13-profiles.png',image.encodeToBytes()!);
 image.delete();surface.delete();paint.delete();font.delete();pic.dispose();
}
void main();
