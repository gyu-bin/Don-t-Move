import fs from 'node:fs';
import {initSkiaNode} from '../sprites/skiaNode';
import {
  metadataErrors,
  pixelContractErrors,
  pixelDiagnostics,
  type EnvironmentManifest,
} from './contract';

const manifestPath='assets/environment/environment-assets.json';
const manifest:EnvironmentManifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));

async function main(){
 const ck=await initSkiaNode();
 const failures:{id:string;errors:string[]}[]=[];
 for(const asset of manifest.assets){
  const errors=metadataErrors(asset);
  const metadataPath=asset.path.replace(/\.png$/,'.metadata.json');
  if(!fs.existsSync(metadataPath))errors.push('Missing per-asset metadata');
  else {
   const metadata=JSON.parse(fs.readFileSync(metadataPath,'utf8'));
   if(JSON.stringify(metadata.resolution)!==JSON.stringify(asset.resolution))errors.push('Metadata resolution mismatch');
   if(JSON.stringify(metadata.objectBounds)!==JSON.stringify(asset.objectBounds))errors.push('Metadata object bounds mismatch');
   if(JSON.stringify(metadata.pivot)!==JSON.stringify(asset.pivot))errors.push('Metadata pivot mismatch');
  }
  if(!fs.existsSync(asset.path))errors.push('Missing runtime PNG');
  else {
   const image=ck.MakeImageFromEncoded(fs.readFileSync(asset.path));
   if(!image)errors.push('PNG decode failed');
   else {
    const width=image.width(),height=image.height();
    const pixels=image.readPixels(0,0,{width,height,colorType:ck.ColorType.RGBA_8888,alphaType:ck.AlphaType.Unpremul,colorSpace:ck.ColorSpace.SRGB}) as Uint8Array|null;
    if(!pixels)errors.push('Pixel readback failed');
    else {
     errors.push(...pixelContractErrors(pixels,width,height));
     const measured=pixelDiagnostics(pixels,width,height).bounds;
     if(JSON.stringify(measured)!==JSON.stringify(asset.objectBounds))errors.push('Measured object bounds mismatch');
    }
    image.delete();
   }
  }
  if(errors.length)failures.push({id:asset.id,errors});
 }
 console.log(JSON.stringify({assets:manifest.assets.length,failures},null,2));
 if(failures.length)process.exitCode=1;
}

void main();
