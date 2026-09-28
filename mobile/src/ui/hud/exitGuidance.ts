export function exitGuidance(
  active: boolean, exit: {x:number;y:number}, camera: {x:number;y:number}, zoom: number,
  viewport: {width:number;height:number;top:number;bottom:number;left?:number;right?:number},
) {
  'worklet';
  if (!active) return null;
  const x=(exit.x-camera.x)*zoom, y=(exit.y-camera.y)*zoom;
  const left=(viewport.left??0)+32,right=viewport.width-(viewport.right??0)-32;
  const top=viewport.top+22,bottom=viewport.height-viewport.bottom-22;
  const cx=(left+right)/2,cy=(top+bottom)/2,dx=x-cx,dy=y-cy;
  const inside=x>=left&&x<=right&&y>=top&&y<=bottom;
  if(inside)return {x,y,angle:0,edge:false};
  const scale=Math.min((right-left)/2/Math.max(Math.abs(dx),0.001),(bottom-top)/2/Math.max(Math.abs(dy),0.001));
  return {x:cx+dx*scale,y:cy+dy*scale,angle:Math.atan2(dy,dx),edge:true};
}
