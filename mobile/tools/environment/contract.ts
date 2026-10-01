/** Data-only pilot handoff. No production asset registration or gameplay mutation. */
export interface EnvironmentAsset {
  id:string; chapter:string; category:'ARCHITECTURE'|'MAJOR'|'SOFT'|'DECORATION'|'LANDMARK';
  path:string; resolution:{width:number;height:number};
  pivot:{x:number;y:number;units:'normalized'};
  footprint:{w:number;h:number}; collision:boolean;
  losBehavior:'BLOCK'|'BREAKER'|'PASS';
  defaultScale:number;drawWidth:number;drawHeight:number;status:string;
  objectBounds?:{x:number;y:number;w:number;h:number};
}
export interface EnvironmentManifest {
  schemaVersion:number;units:{footprint:string;tileWorldUnits:number};assets:EnvironmentAsset[];
}
export const LAB_CASINO_COUNTS = {ARCHITECTURE:5,MAJOR:6,SOFT:5,DECORATION:6,LANDMARK:4};
export const BANK_COUNTS = {ARCHITECTURE:4,MAJOR:5,SOFT:5,DECORATION:5,LANDMARK:1};
export const PILOT_COUNTS = {ARCHITECTURE:2,MAJOR:3,SOFT:2,DECORATION:2,LANDMARK:1};
export function metadataErrors(a:EnvironmentAsset):string[] {
  const errors:string[]=[];
  if(!a.id || !a.chapter || !Object.hasOwn(PILOT_COUNTS,a.category)) errors.push('Invalid identity/category');
  if(!a.path.endsWith('.png') || a.path.startsWith('/') || a.path.split('/').includes('..')) errors.push('PNG path must remain inside mobile');
  for(const [name,value] of Object.entries({width:a.resolution.width,height:a.resolution.height,scale:a.defaultScale,drawWidth:a.drawWidth,drawHeight:a.drawHeight}))
    if(!Number.isFinite(value)||value<=0)errors.push(`Invalid positive ${name}`);
  if(a.pivot.units!=='normalized'||![a.pivot.x,a.pivot.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1))errors.push('Invalid normalized pivot');
  if(![a.footprint.w,a.footprint.h].every(n=>Number.isFinite(n)&&n>=0))errors.push('Invalid footprint');
  if(a.collision&&(!a.footprint.w||!a.footprint.h))errors.push('Collision asset needs nonzero floor footprint');
  if(a.category==='DECORATION'&&a.collision&&a.id!=='museum_rope_barrier'&&a.id!=='bank_plant')errors.push('Decoration cannot silently introduce collision');
  if(!['BLOCK','BREAKER','PASS'].includes(a.losBehavior))errors.push('Invalid LOS role');
  if(a.objectBounds){const b=a.objectBounds;if(![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.x<0||b.y<0||b.w<=0||b.h<=0||b.x+b.w>a.resolution.width||b.y+b.h>a.resolution.height)errors.push('Invalid sprite object bounds');}
  return errors;
}
/** Pixel-only diagnostics. Text, style, angle and footprint agreement need human review. */
export function pixelDiagnostics(data:Uint8Array,w:number,h:number) {
  let count=0,transparent=0,edge=0,left=w,top=h,right=-1,bottom=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const alpha=data[(y*w+x)*4+3];
    if(alpha===0)transparent++;
    if(alpha>16){count++;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
      if(x===0||y===0||x===w-1||y===h-1)edge++;}
  }
  const corners=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]].map(([x,y])=>data[(y*w+x)*4+3]);
  return {opaquePixels:count,transparentFraction:transparent/(w*h),edgePixels:edge,cornerAlpha:corners,
    bounds:count?{x:left,y:top,w:right-left+1,h:bottom-top+1}:null};
}
