import { Awareness, GuardAction } from '../../game/core/types';
import { GAIT_STRIDE, facingToDir } from '../../game/core/locomotion';
import { Anim, DIR_NAMES } from '../sprites/spriteTypes';
import type { CharacterManifest } from '../../assets/manifest';
import { LOCO_CHARACTERS } from '../../game/core/locomotionAtlas';

export interface GuardPose { x:number; y:number; facing?:number; speed:number; awareness:number; action:number; whistleT:number }
export interface GuardPlayback { x:number; y:number; phase:number; animation:number; time:number; motionSpeed:number; strides:number[][] }
/** Approved artwork supplies measured world-unit cycles in registry clips. */
export function guardStrideContract(manifest?:CharacterManifest|null):number[][] {
  return ['walk','run'].map(name=>DIR_NAMES.map(dir=>{
    const value=manifest?.clips[name as 'walk'|'run']?.[dir]?.strideLength;
    return value && value>0 ? value : GAIT_STRIDE[name==='run'?3:2];
  }));
}
export function guardAnimation(p: GuardPose, actualSpeed = p.speed): number {
  'worklet';
  if (p.action === GuardAction.Whistle) return Anim.Whistle;
  if (p.awareness === Awareness.Alert) return Anim.Idle;
  if (actualSpeed <= 0.5) return p.awareness === Awareness.Search ? Anim.Search : Anim.Idle;
  if (p.awareness === Awareness.Chase) return Anim.Run;
  return Anim.Walk;
}
export function createGuardPlayback(p: GuardPose,strides=guardStrideContract()): GuardPlayback {
  return {x:p.x,y:p.y,phase:0,animation:guardAnimation(p),time:0,motionSpeed:0,strides};
}
/** Presentation only. Actual displacement, never AI intent, advances planted feet. */
export function stepGuardPlayback(a: GuardPlayback, p: GuardPose, dt:number): void {
  'worklet';
  const distance=Math.hypot(p.x-a.x,p.y-a.y);
  a.motionSpeed=dt>0 ? distance/dt : 0;
  const next=guardAnimation(p,a.motionSpeed);
  const stride=a.strides[next===Anim.Run?1:0][facingToDir(p.facing??0)];
  if(next === Anim.Run || next === Anim.Walk) a.phase=(a.phase+distance/stride)%1;
  if(next === Anim.Run && a.animation !== next && typeof __DEV__ !== 'undefined' && __DEV__){
    const dir=facingToDir(p.facing??0),row=[0,3,2,1][dir];
    const count=LOCO_CHARACTERS.guard.gaits.run!.frames;
    console.log('[ANIM] guard_run row='+row+' frame='+Math.floor(a.phase*count)+' count='+count);
  }
  a.time=next === Anim.Whistle ? p.whistleT : next === a.animation ? a.time+dt : 0;
  a.animation=next; a.x=p.x; a.y=p.y;
}
