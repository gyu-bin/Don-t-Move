import fs from 'node:fs';
import path from 'node:path';
import {initSkiaNode} from '../sprites/skiaNode';
import {metadataErrors,pixelDiagnostics,PILOT_COUNTS,BANK_COUNTS,LAB_CASINO_COUNTS,type EnvironmentManifest} from './contract';

async function main(){
  const manifestFile=process.argv[2]??'assets/environment/environment-assets.json';
  const out=process.argv[3]??'Reports/EnvironmentKitV1/asset-qa.json';
  const manifest:EnvironmentManifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
  if(manifest.schemaVersion!==1||manifest.units.tileWorldUnits!==40||manifest.units.footprint!=='tiles')throw Error('Unexpected environment coordinate contract');
  const ck=await initSkiaNode();
  const expectedChapters={museum:10,gallery:10,bank:20,lab:26,casino:26};
  if(manifest.assets.length!==92||manifest.assets.some(a=>!Object.hasOwn(expectedChapters,a.chapter))||Object.entries(expectedChapters).some(([chapter,count])=>manifest.assets.filter(a=>a.chapter===chapter).length!==count))throw Error('Environment scope must be Museum10/Gallery10/Bank20/Lab26/Casino26 assets');
  const ids=new Set<string>();
  const assets=manifest.assets.map(a=>{
    const errors=metadataErrors(a),warnings:string[]=[];
    if(ids.has(a.id))errors.push('Duplicate asset ID');ids.add(a.id);
    if(!fs.existsSync(a.path))return {id:a.id,chapter:a.chapter,status:'MISSING',errors,warnings};
    const bytes=fs.readFileSync(a.path);
    if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))errors.push('Not a PNG signature');
    const image=ck.MakeImageFromEncoded(bytes);
    if(!image)return {id:a.id,chapter:a.chapter,status:'INVALID',errors:[...errors,'Skia decoding failed'],warnings};
    const w=image.width(),h=image.height();
    if(w!==a.resolution.width||h!==a.resolution.height)errors.push('Manifest and PNG canvas dimensions differ');
    const pixels=image.readPixels(0,0,{width:w,height:h,colorType:ck.ColorType.RGBA_8888,alphaType:ck.AlphaType.Unpremul,colorSpace:ck.ColorSpace.SRGB}) as Uint8Array|null;
    const diagnostics=pixels?pixelDiagnostics(pixels,w,h):null;
    if(!diagnostics)errors.push('Pixel readback failed');
    else {
      if(!diagnostics.opaquePixels)errors.push('Empty PNG');
      if(diagnostics.transparentFraction<.01)errors.push('No meaningful transparent background; opaque/checkerboard board is not a runtime cutout');
      if(diagnostics.cornerAlpha.some(alpha=>alpha>16))warnings.push('Visible canvas corner: inspect baked background/checkerboard');
      if(diagnostics.edgePixels>0)warnings.push('Visible pixels touch canvas boundary: inspect clipping or intentional wall tiling');
      if(a.collision&&diagnostics.bounds&&a.footprint.w>a.drawWidth*a.defaultScale)warnings.push('Declared collision width exceeds rendered canvas width');
    }
    image.delete();
    return {id:a.id,chapter:a.chapter,status:errors.length?'INVALID':'NEEDS_VISUAL_REVIEW',resolution:{width:w,height:h},errors,warnings,diagnostics};
  });
  const chapters=[...new Set(manifest.assets.map(a=>a.chapter))].map(chapter=>({chapter,categories:Object.fromEntries(Object.entries(chapter==='bank'?BANK_COUNTS:chapter==='lab'||chapter==='casino'?LAB_CASINO_COUNTS:PILOT_COUNTS).map(([category,expected])=>[category,{expected,declared:manifest.assets.filter(a=>a.chapter===chapter&&a.category===category).length,available:assets.filter(a=>a.chapter===chapter&&a.status==='NEEDS_VISUAL_REVIEW'&&manifest.assets.find(m=>m.id===a.id)?.category===category).length}]))}));
  const report={method:'Independent PNG Skia decoding and alpha/bounds contract; no semantic/style/collision-shape approval. No device or FPS verification.',productionReady:false,missing:assets.filter(a=>a.status==='MISSING').length,invalid:assets.filter(a=>a.status==='INVALID'||a.errors.length).length,chapters,assets};
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({out,missing:report.missing,invalid:report.invalid}));
  if(report.invalid||report.missing)process.exitCode=1;
}
void main();
