/** Spatial room coverage uses actual temporal samples, not a single hit in a large zone. */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {buildCampaign} from './buildCampaign';
import {v3MuseumGalleryDesign} from './v3MuseumGallery';
import {BANK_V3_DESIGNS} from './bankProductionDesign';
import type {V3MissionDesign} from './v3DesignSchema';
type Coverage={id:string;sourceSha256:string;navigableTileKeys:string[];potentialCoveredTileKeys:string[];guardCoveredTileKeys:string[];cameraCoveredTileKeys:string[]};
const dir='Reports/LevelDesignV3';
const input=JSON.parse(fs.readFileSync(`${dir}/security-coverage.json`,'utf8')) as {reports:Coverage[]};
const defs=buildCampaign().slice(0,30);
const designs:V3MissionDesign[]=[...defs.slice(0,20).map(v3MuseumGalleryDesign),...BANK_V3_DESIGNS];
const reports=designs.map(d=>{
 const def=defs.find(s=>s.id===d.id)!,coverage=input.reports.find(c=>c.id===d.id)!;
 const sourceMatches=coverage.sourceSha256===createHash('sha256').update(JSON.stringify(def)).digest('hex');
 const covered=new Set(coverage.potentialCoveredTileKeys),guards=new Set(coverage.guardCoveredTileKeys),cameras=new Set(coverage.cameraCoveredTileKeys);
 const zones=d.zones.map(z=>{
  const b=z.bounds;
  const tiles=coverage.navigableTileKeys.filter(k=>{const [x,y]=k.split(',').map(Number);return x+.5>=b.x&&x+.5<b.x+b.w&&y+.5>=b.y&&y+.5<b.y+b.h;});
  const central=tiles.filter(k=>{const [x,y]=k.split(',').map(Number);return x+.5>=b.x+b.w*.22&&x+.5<b.x+b.w*.78&&y+.5>=b.y+b.h*.22&&y+.5<b.y+b.h*.78;});
  const seen=tiles.filter(k=>covered.has(k)).length,centralSeen=central.filter(k=>covered.has(k)).length;
  const safe=z.intentionalSafeBounds;
  const outsideSafe=tiles.filter(k=>{const [x,y]=k.split(',').map(Number);return !safe||x+.5<safe.x||x+.5>=safe.x+safe.w||y+.5<safe.y||y+.5>=safe.y+safe.h;});
  return {id:z.id,name:z.name,purpose:z.purpose,navigableTiles:tiles.length,guardTiles:tiles.filter(k=>guards.has(k)).length,cameraTiles:tiles.filter(k=>cameras.has(k)).length,combinedTiles:seen,combinedFraction:seen/Math.max(1,tiles.length),centralNavigableTiles:central.length,centralCoveredTiles:centralSeen,centralFraction:centralSeen/Math.max(1,central.length),intentionalSafeReason:z.intentionalSafeReason??null,intentionalSafeBounds:safe??null,tilesOutsideSafeBounds:outsideSafe.length,reviewRequired:tiles.length>40&&seen===0&&(!z.intentionalSafeReason||outsideSafe.length>0)};
 });
 return {id:d.id,sourceMatches,zones};
});
fs.writeFileSync(`${dir}/zone-coverage.json`,JSON.stringify({method:'Actual120s Guard/CCTV VisionFan+LOS potential union, applied to authored room rectangles and central56% bounds. Nonzero room coverage does not certify room quality; intentional refuge and open traversal require visual review.',native:false,reports},null,2)+'\n');
console.log(JSON.stringify({stale:reports.filter(r=>!r.sourceMatches).map(r=>r.id),unjustifiedUncovered:reports.flatMap(r=>r.zones.filter(z=>z.reviewRequired).map(z=>({mission:r.id,...z})))},null,2));
if(reports.some(r=>!r.sourceMatches||r.zones.some(z=>z.reviewRequired)))process.exitCode=1;
