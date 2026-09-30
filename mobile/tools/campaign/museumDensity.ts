/**
 * Museum structure-density QA (not a design target). Flags missions whose floor is
 * dominated by open space, so later, larger missions cannot drift into "more walking".
 *   node --import tsx tools/campaign/museumDensity.ts
 */
import type {StageDefinition} from '../../src/game/levels/StageDefinition';
import {compileStage,TILE} from '../../src/game/world/compileStage';
import {PROP_KIT} from '../../src/game/world/propKit';

/** Gameplay structures: block movement and are big enough to shape routes. */
const MAJOR_MIN_AREA=0.35; // tiles², after collisionScale
const OPEN_CLEARANCE=1.5;   // tiles from the nearest blocker = "open floor"

export interface MuseumDensity{
 id:string;floorTiles:number;majorStructures:number;majorStructureArea:number;losBlockers:number;
 interiorWallTiles:number;openFloorRatio:number;maxClearanceTiles:number;structuresPer100Tiles:number;
}

function interiorWalls(def:StageDefinition){
 // Wall tiles with floor on two opposite sides are interior dividers, not the perimeter.
 const L=def.layout;let n=0;
 for(let y=0;y<L.length;y++)for(let x=0;x<L[y].length;x++){
  if(L[y][x]!=='#')continue;
  const f=(dx:number,dy:number)=>L[y+dy]?.[x+dx]==='.';
  if((f(-1,0)&&f(1,0))||(f(0,-1)&&f(0,1)))n++;
 }
 return n;
}

export function museumDensity(def:StageDefinition):MuseumDensity{
 const stage=compileStage(def);
 const floorTiles=def.layout.reduce((a,row)=>a+[...row].filter(c=>c==='.').length,0);
 const majors=def.props.filter(p=>{
  const k=PROP_KIT[p.kind],s=p.collisionScale??1;
  return k.blocksMovement&&p.kind!=='objectiveCase'&&k.footprint.w*k.footprint.h*s*s>=MAJOR_MIN_AREA;
 });
 const majorStructureArea=majors.reduce((a,p)=>{const k=PROP_KIT[p.kind],s=p.collisionScale??1;return a+k.footprint.w*k.footprint.h*s*s;},0);
 const walls=interiorWalls(def);
 const losBlockers=def.props.filter(p=>PROP_KIT[p.kind].blocksVision&&PROP_KIT[p.kind].footprint.w>0).length+walls;
 const B=stage.movementBlockers;
 let samples=0,open=0,maxClear=0;
 for(let y=0;y<def.layout.length;y++)for(let x=0;x<def.layout[y].length;x++){
  if(def.layout[y][x]!=='.')continue;
  for(const oy of [.25,.75])for(const ox of [.25,.75]){
   const px=(x+ox)*TILE,py=(y+oy)*TILE;let d=Infinity;
   for(let i=0;i<B.length;i+=4){
    const dx=Math.max(B[i]-px,0,px-B[i+2]),dy=Math.max(B[i+1]-py,0,py-B[i+3]);d=Math.min(d,Math.hypot(dx,dy));
   }
   samples++;if(d<=0)continue;
   const t=d/TILE;if(t>=OPEN_CLEARANCE)open++;maxClear=Math.max(maxClear,t);
  }
 }
 return {id:def.id,floorTiles,majorStructures:majors.length,majorStructureArea:+majorStructureArea.toFixed(2),losBlockers,
  interiorWallTiles:walls,openFloorRatio:+(open/samples).toFixed(3),maxClearanceTiles:+maxClear.toFixed(2),
  structuresPer100Tiles:+(majors.length/floorTiles*100).toFixed(2)};
}

if(process.argv[1]?.endsWith('museumDensity.ts')){
 void import('../../src/game/levels/campaignStages').then(({campaignStages})=>{
  console.table(campaignStages.filter(d=>d.chapter===1).map(museumDensity));
 });
}
