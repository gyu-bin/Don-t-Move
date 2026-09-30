import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import type {ClipDef, CharacterManifest} from '../../../assets/manifest';
import {buildCharacterSet} from '../../../assets/buildSprites';
import {pickFrame,resolveClip} from '../../../rendering/sprites/spriteAnimation';
import {LOCO_CHARACTERS} from '../../core/locomotionAtlas';

test('every shipped player/guard state stays inside its own atlas across transitions',()=>{
 const previous=require.extensions['.png'];require.extensions['.png']=()=>{};
 try{
  // PNG modules are mocked only for this runtime-manifest validation.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {ASSET_MANIFEST}=require('../../../assets/manifest');
  const metadata=JSON.parse(readFileSync('assets/characters/locomotion-manifest.json','utf8'));
  for(const who of ['player','guard'] as const){
   const manifest=ASSET_MANIFEST.characters[who] as CharacterManifest;
   const images:Record<string,never>={};
   for(const directions of Object.values(manifest.clips) as Record<string,ClipDef>[])for(const clip of Object.values(directions) as ClipDef[])images[clip.image]={} as never;
   const set=buildCharacterSet(manifest,images);
   for(let state=0;state<6;state++)for(let dir=0;dir<4;dir++){
    const clip=resolveClip(set,state,dir);assert(clip);
    const name=clip.source!.replace(who,'').toLowerCase();
    const atlas=metadata.characters[who].atlases[name] ?? {...metadata.characters[who].atlases.idle,file:who+'_'+name+'.png'};
    const png=readFileSync('assets/characters/'+atlas.file);
    assert.equal(png.readUInt32BE(16),atlas.width);assert.equal(png.readUInt32BE(20),atlas.height);
    assert.equal(clip.frames.length,atlas.columns);
    for(const phase of [0,.1,.5,.99999,1,14/12,-.1,NaN,Infinity]){
     const frame=pickFrame(clip,phase,phase,phase*100,true);assert(frame);
     const index=clip.frames.indexOf(frame);assert(index>=0&&index<atlas.columns);
     assert(frame.sx+frame.sw<=atlas.width&&frame.sy+frame.sh<=atlas.height);
    }
   }
  }
  assert.deepEqual([LOCO_CHARACTERS.player.idle.frames,...Object.values(LOCO_CHARACTERS.player.gaits).map(g=>g.frames)],[6,8,14,12]);
  assert.deepEqual([LOCO_CHARACTERS.guard.idle.frames,...Object.values(LOCO_CHARACTERS.guard.gaits).map(g=>g.frames)],[6,12,12]);
 }finally{if(previous)require.extensions['.png']=previous;else delete require.extensions['.png'];}
});
test('missing and empty clips fall back safely; invalid clocks use a valid frame',()=>{
 const frame={image:{} as never,sx:0,sy:0,sw:128,sh:128,ax:64,ay:112};
 const idle={frames:[frame],mode:'time' as const,fps:5,loop:true,mirror:false,strideLength:0};
 const set={strict:true,clips:[[idle]],scale:1,shadow:false};
 assert.equal(resolveClip(set,3,0),idle);
 assert.equal(resolveClip(set,NaN,NaN),idle);
 assert.equal(pickFrame({...idle,frames:[]},0,0,0),null);
});
