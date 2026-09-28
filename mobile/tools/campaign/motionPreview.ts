/** Offline, exact runtime sprite selection; not generated art or an approval. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {initSkiaNode} from '../sprites/skiaNode';

async function main(){
 const ck=await initSkiaNode();
 const paths:Record<string,string>={};let sourceId=0;
 require.extensions['.png']=(m,filename)=>{const id=String(++sourceId);paths[id]=filename;m.exports=id;};
 Object.assign(globalThis,{__DEV__:true});
 const {Skia}=require('../sprites/skiaNodeShim');
 const {PLAYTEST_MANIFEST,IMAGE_SOURCES}=require('../../src/assets/manifest');
 const {buildCharacterSet}=require('../../src/assets/buildSprites');
 const {resolveClip,pickFrame,drawSpriteFrame}=require('../../src/rendering/sprites/spriteAnimation');
 const {ANIM_NAMES,DIR_NAMES}=require('../../src/rendering/sprites/spriteTypes');
 const {motionAudit}=require('../../src/rendering/characters/motionAudit');
 const {PLAYER_SPRITE_STRIDE,GAIT_SPEED}=require('../../src/game/core/locomotion');
 const {RIGHT_WALK_TRIAL_STRIDE}=require('../../src/game/core/rightWalkTrial');
 const images=Object.fromEntries(Object.entries(IMAGE_SOURCES).map(([key,id])=>[key,Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync(paths[String(id)])))]));
 const font=Skia.Font(Skia.Typeface.MakeFreeTypeFaceFromData(Skia.Data.fromBytes(fs.readFileSync('/System/Library/Fonts/Supplemental/Arial.ttf'))),12);
 const white=Skia.Paint();white.setColor(Skia.Color('#e0f3ff'));
 const floor=Skia.Paint();floor.setColor(Skia.Color('#30404e'));floor.setStrokeWidth(1);
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dontmove-motion-'));
 const faces=[Math.PI/2,-Math.PI/2,0,Math.PI];
 for(const who of ['player','guard']){
  const set=buildCharacterSet(PLAYTEST_MANIFEST.characters[who],images);
  const states=who==='player'?[0,1,2,3]:[0,2,3,4,5];
  const w=800,h=states.length*180;
  const dir=path.join(root,who);fs.mkdirSync(dir);
  for(let f=0;f<180;f++){
   const t=f/30,rec=Skia.PictureRecorder(),c=rec.beginRecording(Skia.XYWHRect(0,0,w,h));
   c.clear(Skia.Color('#08121e'));
   for(let row=0;row<states.length;row++)for(let d=0;d<4;d++){
    const anim=states[row],clip=resolveClip(set,anim,d);
    const speed=who==='player'?GAIT_SPEED[anim]:anim===2?41.6:anim===3?116:0;
    const stride=who==='player'?(anim===2&&d===2?RIGHT_WALK_TRIAL_STRIDE:PLAYER_SPRITE_STRIDE[ANIM_NAMES[anim]]??1):anim===3?52:40;
    const phase=(speed*t/stride)%1,ox=d*200,oy=row*180;
    c.save();c.clipRect(Skia.XYWHRect(ox,oy,200,180),1,false);
    // Scrolling ground is presentation only; sprite pixels are untouched.
    for(let k=-2;k<8;k++){
     const dx=Math.cos(faces[d])*speed*t*2,dy=Math.sin(faces[d])*speed*t*2;
     c.drawLine(ox+k*40-dx%40,oy+30,ox+k*40-dx%40,oy+180,floor);
     c.drawLine(ox,oy+k*40-dy%40,ox+200,oy+k*40-dy%40,floor);
    }
    drawSpriteFrame(c,pickFrame(clip,phase,t,speed*t,true),ox+100,oy+150,set.scale*2,false,white);
    c.drawText(`${who} ${ANIM_NAMES[anim]} ${DIR_NAMES[d]}`,ox+6,oy+15,white,font);
    c.drawText(`${clip.source} (${clip.frames.length}f)`,ox+6,oy+29,white,font);
    c.restore();
    if(f===0)console.log(JSON.stringify({who,animation:ANIM_NAMES[anim],...motionAudit(set,anim,faces[d],phase,t,speed*t),speed,stride,cycles:speed/stride,steps:2*speed/stride,frameMs:speed?1000*stride/(speed*clip.frames.length):null}));
   }
   const picture=rec.finishRecordingAsPicture(),surface=ck.MakeSurface(w,h)!;
   surface.getCanvas().drawPicture(picture.ref);surface.flush();
   fs.writeFileSync(path.join(dir,`${String(f).padStart(4,'0')}.png`),surface.makeImageSnapshot().encodeToBytes()!);
   surface.delete();picture.dispose();
  }
  const out=path.resolve(`Reports/V61-${who}-Motion.mp4`);
  const ff=spawnSync('ffmpeg',['-y','-loglevel','error','-framerate','30','-i',path.join(dir,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',out]);
  if(ff.status!==0)throw Error(ff.stderr.toString());console.log(out);
 }
 console.log('Source frames preserved in '+root);
}
void main();
