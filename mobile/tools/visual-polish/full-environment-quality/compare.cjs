/** Paired output/metrics validation; PNG heatmaps use the same threshold as renderDiff.cjs. */
const fs=require('fs'),path=require('path'),{PNG}=require('pngjs');
const root=process.argv[2]||'Reports/FullEnvironmentQualityPass',out=process.argv[3]||'docs/reports/full-environment-quality-pass/data';
const before=JSON.parse(fs.readFileSync(path.join(root,'before/metrics.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(root,'after/metrics.json'),'utf8'));
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(root,'diff'),{recursive:true});
const median=v=>{const a=[...v].sort((a,b)=>a-b),m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;};
if(before.missions.length!==45||after.missions.length!==45)throw Error('Require all45 missions inboth cohorts');
const rows=[];
for(const a of before.missions){
 const b=after.missions.find(x=>x.id===a.id);if(!b)throw Error(a.id);
 if(JSON.stringify(a.player)!==JSON.stringify(b.player)||a.stateTime!==b.stateTime)throw Error('Game state changed:'+a.id);
 for(const av of a.views){
  const bv=b.views.find(x=>x.name===av.name);if(!bv)throw Error('view');
  for(const key of ['width','height','scale','zoom','cam'])if(JSON.stringify(av[key])!==JSON.stringify(bv[key]))throw Error('Camera changed:'+a.id+':'+key);
  const A=PNG.sync.read(fs.readFileSync(path.join(root,'before',av.file))),B=PNG.sync.read(fs.readFileSync(path.join(root,'after',bv.file)));
  if(A.width!==B.width||A.height!==B.height)throw Error('Image dimensions differ');
  let changed=0,absolute=0,lumaA=0,lumaB=0,max=0;
  const heat=av.name==='full'?new PNG({width:A.width,height:A.height}):null;
  for(let i=0;i<A.width*A.height;i++){
   let d=0;for(let c=0;c<4;c++){const dd=Math.abs(A.data[i*4+c]-B.data[i*4+c]);d=Math.max(d,dd);absolute+=dd;}
   if(d>12)changed++;max=Math.max(max,d);lumaA+=A.data[i*4]*.2126+A.data[i*4+1]*.7152+A.data[i*4+2]*.0722;lumaB+=B.data[i*4]*.2126+B.data[i*4+1]*.7152+B.data[i*4+2]*.0722;
   if(heat){const g=Math.round((B.data[i*4]+B.data[i*4+1]+B.data[i*4+2])/3*.3),s=Math.min(1,d/80);heat.data[i*4]=d>12?g+(255-g)*s:g;heat.data[i*4+1]=d>12?g*(1-s):g;heat.data[i*4+2]=d>12?g+(255-g)*s:g;heat.data[i*4+3]=255;}
  }
  if(heat)fs.writeFileSync(path.join(root,'diff',`${a.id}-full.png`),PNG.sync.write(heat));
  const pixels=A.width*A.height;
  rows.push({id:a.id,chapter:a.chapter,theme:a.theme,view:av.name,width:A.width,height:A.height,changedPixels:changed,changedFraction:changed/pixels,maxChannelDifference:max,meanAbsoluteChannelDifference:absolute/(pixels*4),luminanceBefore:lumaA/pixels,luminanceAfter:lumaB/pixels,luminanceChangePercent:(lumaB/lumaA-1)*100,staticOpsBefore:a.staticOps,staticOpsAfter:b.staticOps,frameOpsBefore:av.frameOps,frameOpsAfter:bv.frameOps,recordBeforeMs:av.recordMedianMs,recordAfterMs:bv.recordMedianMs,rasterBeforeMs:av.rasterMedianMs,rasterAfterMs:bv.rasterMedianMs,totalBeforeMs:av.totalMedianMs,totalAfterMs:bv.totalMedianMs,elapsedChangePercent:(bv.totalMedianMs/av.totalMedianMs-1)*100});
 }
}
const chapters=[];
for(let chapter=1;chapter<=9;chapter++){
 const full=rows.filter(r=>r.chapter===chapter&&r.view==='full'),phone=rows.filter(r=>r.chapter===chapter&&r.view==='spawn');
 chapters.push({chapter,missions:full.length,changedMissions:full.filter(r=>r.changedPixels>0).length,allPixelIdentical:full.every(r=>r.maxChannelDifference===0),staticOpsBefore:full.reduce((n,r)=>n+r.staticOpsBefore,0),staticOpsAfter:full.reduce((n,r)=>n+r.staticOpsAfter,0),frameOpsBefore:median(full.map(r=>r.frameOpsBefore)),frameOpsAfter:median(full.map(r=>r.frameOpsAfter)),fullRasterBeforeMs:median(full.map(r=>r.rasterBeforeMs)),fullRasterAfterMs:median(full.map(r=>r.rasterAfterMs)),phoneRasterBeforeMs:median(phone.map(r=>r.rasterBeforeMs)),phoneRasterAfterMs:median(phone.map(r=>r.rasterAfterMs)),pairedFullRatioMedian:median(full.map(r=>r.totalAfterMs/r.totalBeforeMs)),pairedPhoneRatioMedian:median(phone.map(r=>r.totalAfterMs/r.totalBeforeMs)),meanLuminanceChangePercent:full.reduce((n,r)=>n+r.luminanceChangePercent,0)/full.length});
}
const result={method:'Paired same t=0 player/guards and camera validation, CPU CanvasKit warm3 sample medians perview. Not native device FPS/GPU; no95% confidence claim from3 samples.',before:{textureCount:before.textureCount,rgbaBytes:before.rgbaBytes,gpuRgbaEstimateBytes:before.gpuRgbaEstimateBytes,decodeMs:before.decodeMs},after:{textureCount:after.textureCount,rgbaBytes:after.rgbaBytes,gpuRgbaEstimateBytes:after.gpuRgbaEstimateBytes,decodeMs:after.decodeMs},decodedAssetPathsUnchanged:before.decoded.map(x=>x.path).join('|')===after.decoded.map(x=>x.path).join('|'),decodedAssetHashesUnchanged:before.decoded.map(x=>x.sha256).join('|')===after.decoded.map(x=>x.sha256).join('|'),chapters,rows};
fs.writeFileSync(path.join(out,'paired-render-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({chapters,before:result.before,after:result.after,decodedAssetHashesUnchanged:result.decodedAssetHashesUnchanged},null,2));
