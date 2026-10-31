import type {V13Mission} from './v13Types';

/** Aim the existing lower-stair CCTV at its actual doorway, keeping the upper
 * patrol in place. Applied after chapter derivation; no runtime tracking target. */
export const EXIT_CAMERA_WATCH:Record<string,{camera:number;target:{x:number;y:number};why:string}>={
 '09-05':{camera:1,target:{x:25.5,y:21.5},
  why:'Sweep across the east-stair doorway and its exit-lobby approach while the stair guard keeps the vault opening covered.'},
};
export function watchExit(m:V13Mission):V13Mission {
 const edit=EXIT_CAMERA_WATCH[m.id];if(!edit)return m;
 return {...m,cameras:m.cameras.map((c,i)=>i===edit.camera?{
  ...c,facing:Math.atan2(edit.target.y-c.at.y,edit.target.x-c.at.x),watches:edit.why,
 }:c)};
}
