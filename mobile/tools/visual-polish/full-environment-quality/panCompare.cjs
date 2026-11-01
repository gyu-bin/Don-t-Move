/** Horizontal subpixel camera-pan proxy. Reproject shifted frames before measuring AA residual. */
const fs=require('fs'),path=require('path'),{PNG}=require('pngjs');
const root=process.argv[2]||'Reports/FullEnvironmentQualityPass',out=process.argv[3]||'docs/reports/full-environment-quality-pass/data/pan-comparison.json';
const rows=[];
for(const id of ['02-03','06-03','08-03'])for(const cohort of ['before','after']){
 const folder=path.join(root,'pan-'+cohort),base=PNG.sync.read(fs.readFileSync(path.join(folder,`${id}-pan-0.png`)));
 for(const dx of [.25,.5,1]){
  const moved=PNG.sync.read(fs.readFileSync(path.join(folder,`${id}-pan-${dx}.png`))),shift=dx*(402/(9.4*40))*3,integer=Math.floor(shift),frac=shift-integer;
  if(base.width!==moved.width||base.height!==moved.height)throw Error('dimensions');
  let n=0,sum=0,above12=0,max=0;const histogram=new Uint32Array(256);
  for(let y=2;y<base.height-2;y++)for(let x=2;x<base.width-Math.ceil(shift)-2;x++){
   const a=(y*base.width+x+integer)*4,b=(y*base.width+x)*4;let d=0;
   for(let c=0;c<3;c++){const expected=base.data[a+c]*(1-frac)+base.data[a+4+c]*frac;d=Math.max(d,Math.abs(expected-moved.data[b+c]));}
   n++;sum+=d;if(d>12)above12++;max=Math.max(max,d);histogram[Math.min(255,Math.round(d))]++;
  }
  let p95=255,total=0;for(let i=0;i<256;i++){total+=histogram[i];if(total>=n*.95){p95=i;break;}}
  rows.push({id,cohort,cameraOffsetWorld:dx,screenShiftPixels:shift,pixels:n,meanMaxChannelResidual:sum/n,p95MaxChannelResidual:p95,fractionResidualAbove12:above12/n,maxResidual:max});
 }
}
const result={method:'Offline static t=0 actual9.4tilephonecamera xpan; shifts0,.25,.5,1world. Shifted image comparedto bilinear resamplingof0offset image, excluding2px screenborder. Residual includesallart/AA, notfloor-only. Notnative displaymotion/FPS or human shimmercertification.',rows};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
