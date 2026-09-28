export type Edge='top'|'bottom'|'left'|'right';
export const oppositeEdge:Record<Edge,Edge>={top:'bottom',bottom:'top',left:'right',right:'left'};
// An authored walk through each building, not a random rotation of exits.
export const CHAPTER_EXITS:Edge[][]=[
 ['right','bottom','right','top','right'],
 ['top','right','bottom','right','top'],
 ['left','top','right','bottom','right'],
 ['right','top','left','top','right'],
 ['bottom','right','top','left','bottom'],
 ['right','bottom','left','top','right'],
 ['left','top','right','bottom','left'],
 ['top','right','bottom','left','top'],
 ['right','top','left','bottom','right'],
];
export function missionEdges(index:number){
 const chapter=Math.floor(index/5),mission=index%5;
 const exit=CHAPTER_EXITS[chapter][mission];
 const entry=mission?oppositeEdge[CHAPTER_EXITS[chapter][mission-1]]:oppositeEdge[exit];
 return {entry,exit};
}
export const inwardFacing:Record<Edge,number>={left:0,right:Math.PI,top:Math.PI/2,bottom:-Math.PI/2};
