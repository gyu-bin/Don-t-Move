/** Packaging metadata only. Never changes chapter 1–3 records, footprints, or gameplay roles. */
import fs from 'node:fs';
const manifestPath='assets/environment/environment-assets.json';
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const chapterIndex=process.argv.indexOf('--chapter');
const chapter=chapterIndex<0?undefined:process.argv[chapterIndex+1];
if(chapter!==undefined&&!['lab','casino'].includes(chapter))throw new Error('Usage: refreshLabCasinoMetadata.ts [--chapter lab|casino]');
let ready=0;
for(const a of manifest.assets){
 if(!['lab','casino'].includes(a.chapter)||(chapter&&a.chapter!==chapter))continue;
 const metadataPath=a.path.replace(/\.png$/,'.metadata.json');
 if(!fs.existsSync(metadataPath))throw new Error(`Missing measured PNG metadata: ${a.id}`);
 const m=JSON.parse(fs.readFileSync(metadataPath,'utf8'));
 if(!m.objectBounds||m.diagnostics.edgePixels||m.diagnostics.cornerAlpha.some((alpha:number)=>alpha>16))throw new Error(`Clipped/background contaminated asset: ${a.id}`);
 a.resolution=m.resolution;a.objectBounds=m.objectBounds;
 a.pivot={x:.5,y:1,units:'normalized'};
 a.drawHeight=a.drawWidth*m.objectBounds.h/m.objectBounds.w;
 a.status='READY_FOR_USER_REVIEW';ready++;
}
const expected=chapter?26:52;
if(ready!==expected)throw new Error(`Expected ${expected} Lab/Casino assets; got ${ready}`);
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({chapter:chapter??'lab+casino',ready,method:'Measured alpha bounds, aspect-preserving draw size, ground pivot; no semantic art approval'}));
