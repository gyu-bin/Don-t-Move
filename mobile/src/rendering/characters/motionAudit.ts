import {facingToDir} from '../../game/core/locomotion';
import {ANIM_NAMES,DIR_NAMES} from '../sprites/spriteTypes';
import type {CharacterSpriteSet} from '../sprites/spriteTypes';
import {pickFrame,resolveClip} from '../sprites/spriteAnimation';

/** Reads the same resolved clip and frame as the renderer, including fallbacks. */
export function motionAudit(set:CharacterSpriteSet|null,animation:number,facing:number,phase:number,time:number,dist:number){
 const dir=facingToDir(facing),clip=set?resolveClip(set,animation,dir):null;
 if(!clip)return {requested:ANIM_NAMES[animation],direction:DIR_NAMES[dir],source:'procedural fallback',frame:0,count:0,phase,stride:0,resolved:'fallback'};
 const frame=pickFrame(clip,phase,time,dist,true);
 const resolved=set!.clips.findIndex(row=>row[dir]===clip);
 return {requested:ANIM_NAMES[animation],direction:DIR_NAMES[dir],source:clip.source??'unknown',
  frame:clip.frames.indexOf(frame)+1,count:clip.frames.length,phase,stride:clip.strideLength,resolved:ANIM_NAMES[resolved]};
}
