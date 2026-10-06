/** Reconcile stale authoring JSON with the measured runtime manifest.
 * This does not change runtime pixels, draw size, collision, or placement. */
import fs from 'node:fs';
import type {EnvironmentManifest} from './contract';

const manifest:EnvironmentManifest=JSON.parse(fs.readFileSync('assets/environment/environment-assets.json','utf8'));
const allowed=new Set(['museum','gallery','bank','lab','casino']);
let updated=0;
for(const asset of manifest.assets){
 if(!allowed.has(asset.chapter))throw new Error(`Out-of-scope chapter: ${asset.chapter}`);
 const metadataPath=asset.path.replace(/\.png$/,'.metadata.json');
 const metadata=fs.existsSync(metadataPath)
  ?JSON.parse(fs.readFileSync(metadataPath,'utf8'))
  :{path:asset.path,source:asset.source};
 const next={...metadata,resolution:asset.resolution,objectBounds:asset.objectBounds,pivot:asset.pivot};
 if(JSON.stringify(next)!==JSON.stringify(metadata)){
  fs.writeFileSync(metadataPath,JSON.stringify(next,null,2)+'\n');
  updated++;
 }
}
console.log(JSON.stringify({assets:manifest.assets.length,updated,chapters:[...allowed]}));
