/**
 * V13 Phase 2B — Lab art consistency pass. Pixel-level corrections only; nothing is repainted.
 *   deskew : vertical shear that levels the ground line of a sprite drawn with camera yaw, so front edges are
 *            horizontal like the reference set (lab_wall, lab_observation_console, lab_workstation, lab_large_table, lab_cryo_unit).
 *   gamma  : lifts sprites that are far darker than the Lab palette.
 *   pane   : makes glass panes translucent (frame stays opaque) and removes anything painted behind the glass.
 * Sources are never overwritten: new art is read from _source/raw/, old runtime art is backed up to _pretune/ first.
 * Uses pngjs from node_modules (a transitive dependency). Run from mobile/:  node tools/environment/labTune.cjs
 */
const fs=require('fs'),path=require('path'),{PNG}=require('pngjs');
const read=p=>PNG.sync.read(fs.readFileSync(p));
function bounds(im,t=40){let x0=im.width,x1=-1,y0=im.height,y1=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]>t){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
function crop(im,b){const o=new PNG({width:b.w,height:b.h});for(let y=0;y<b.h;y++)for(let x=0;x<b.w;x++){const i=((b.y+y)*im.width+b.x+x)*4,j=(y*b.w+x)*4;for(let k=0;k<4;k++)o.data[j+k]=im.data[i+k];}return o;}
/** Ground-line slope in px per px, measured on the lowest solid pixels of the left and right quarters. */
function slope(im){const b=bounds(im),low=(a,c)=>{let m=-1;for(let x=Math.round(b.x+b.w*a);x<=Math.round(b.x+b.w*c);x++)for(let y=b.y+b.h-1;y>=b.y;y--)if(im.data[(y*im.width+x)*4+3]>120){m=Math.max(m,y);break;}return m;};return(low(.78,.97)-low(.03,.22))/(.75*b.w);}
function deskew(im,k=slope(im)){const b=bounds(im),src=crop(im,b),W=src.width,pad=Math.ceil(Math.abs(k)*W/2)+2,H=src.height+pad*2,o=new PNG({width:W,height:H});
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const fy=y-pad+k*(x-W/2),y0=Math.floor(fy),t=fy-y0,j=(y*W+x)*4;let r=0,g=0,bl=0,a=0;
  for(const [yy,wt] of [[y0,1-t],[y0+1,t]]){if(yy<0||yy>=src.height)continue;const i=(yy*W+x)*4,al=src.data[i+3]/255*wt;r+=src.data[i]*al;g+=src.data[i+1]*al;bl+=src.data[i+2]*al;a+=al;}
  if(a>0){o.data[j]=Math.round(r/a);o.data[j+1]=Math.round(g/a);o.data[j+2]=Math.round(bl/a);o.data[j+3]=Math.round(a*255);}}
 return crop(o,bounds(o,8));}
function gamma(im,g){for(let i=0;i<im.data.length;i+=4)for(let k=0;k<3;k++)im.data[i+k]=Math.round(255*Math.pow(im.data[i+k]/255,g));return im;}
function hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){s=(mx-mn)/(1-Math.abs(2*l-1)+1e-6);h=mx===r?((g-b)/(mx-mn))%6:mx===g?(b-r)/(mx-mn)+2:(r-g)/(mx-mn)+4;h=(h*60+360)%360;}return[h,Math.min(1,s),l];}
/** Glass: pixels in the pane's hue band become one flat tint at the given opacity; the frame is untouched. */
function pane(im,{hue,minSat,minLum,tint,alpha}){for(let i=0;i<im.data.length;i+=4){if(im.data[i+3]<200)continue;const [h,s,l]=hsl(im.data[i],im.data[i+1],im.data[i+2]);if(h>=hue[0]&&h<=hue[1]&&s>=minSat&&l>=minLum){if(tint){im.data[i]=tint[0];im.data[i+1]=tint[1];im.data[i+2]=tint[2];}im.data[i+3]=alpha;}}return im;}
/** The glass redraw's frame is the same blue-grey as its panes, so `pane` takes it too. The frame is put back as
 *  plain opaque bars on the measured outline: top and bottom rails, end posts and two mullions. */
function frame(im,{rail=[203,211,212],post=[150,164,170]}={}){let x0=im.width,x1=-1,y0=im.height,y1=-1;
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const a=im.data[(y*im.width+x)*4+3];if(a>100&&a<200){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
 const w=x1-x0+1,h=y1-y0+1,bar=(ax,ay,bw,bh,c)=>{for(let y=Math.round(ay);y<Math.round(ay+bh);y++)for(let x=Math.round(ax);x<Math.round(ax+bw);x++){const i=(y*im.width+x)*4;im.data[i]=c[0];im.data[i+1]=c[1];im.data[i+2]=c[2];im.data[i+3]=255;}};
 bar(x0,y0,w,h*.065,rail);bar(x0,y1-h*.05,w,h*.05,post);bar(x0,y0,w*.028,h,post);bar(x1-w*.028,y0,w*.028,h,post);
 for(const f of [1/3,2/3])bar(x0+w*f-w*.008,y0,w*.016,h,post);return im;}
/** Removes the name label a contact sheet prints under a piece when the cut-out kept it: the pill is one flat
 *  colour, so rows are cleared from the bottom up while they are mostly that colour (at most 46 rows). */
function stripLabel(im){const W=im.width,H=im.height,d=im.data;let bottom=-1;for(let y=H-1;y>=0&&bottom<0;y--)for(let x=0;x<W;x++)if(d[(y*W+x)*4+3]>200){bottom=y;break;}
 if(bottom<0)return im;const probe=bottom-6,cols=[];for(let x=0;x<W;x++){const i=(probe*W+x)*4;if(d[i+3]>200)cols.push([d[i],d[i+1],d[i+2]]);}
 if(cols.length<60)return im;cols.sort((a,b)=>a[0]+a[1]+a[2]-b[0]-b[1]-b[2]);const c=cols[Math.floor(cols.length*.3)];
 const pill=y=>{let n=0;for(let x=0;x<W;x++){const i=(y*W+x)*4;if(d[i+3]>200&&Math.abs(d[i]-c[0])<16&&Math.abs(d[i+1]-c[1])<16&&Math.abs(d[i+2]-c[2])<16)n++;}return n;};
 let top=bottom;while(top>bottom-46&&top>0&&pill(top-1)>=40)top--;if(bottom-top<14)return im;
 for(let y=Math.max(0,top-3);y<H;y++)for(let x=0;x<W;x++)d[(y*W+x)*4+3]=0;return crop(im,bounds(im,8));}
/** Removes the soft shadow painted under a piece: dark, part-transparent pixels in the lower half that are not the
 *  one-pixel edge of the object itself (no solid pixel within 2 px). Returns how many pixels were cleared. */
function dropShadow(im){const W=im.width,H=im.height,d=im.data,b=bounds(im,8),from=b.y+b.h*.5,kill=[];
 for(let y=Math.floor(from);y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,a=d[i+3];if(a===0||a>=200||Math.max(d[i],d[i+1],d[i+2])>=120)continue;
  let solid=false;for(let dy=-2;dy<=2&&!solid;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&d[(yy*W+xx)*4+3]>=250){solid=true;break;}}
  if(!solid)kill.push(i);}
 for(const i of kill)d[i+3]=0;return kill.length;}
/** A piece that fills its whole cut-out (a flat wall of boxes) gets a clear margin, which the packager requires. */
function pad(im,n=8){const o=new PNG({width:im.width+n*2,height:im.height+n*2});for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4,j=((y+n)*o.width+x+n)*4;for(let k=0;k<4;k++)o.data[j+k]=im.data[i+k];}return o;}
const SEE_THROUGH=/fence|glass|brass_screen|mesh/;
const LAB='assets/environment/lab',BANK='assets/environment/bank',CASINO='assets/environment/casino';
const WAREHOUSE='assets/environment/warehouse';
// New art: raw cut-out → corrected source (addV13Art.ts then packages it).
const NEW=[
 [`${LAB}/_source`,'lab_fume_hood',im=>deskew(im)],
 [`${LAB}/_source`,'lab_sample_fridge_front',im=>gamma(deskew(im),.88)],
 [`${LAB}/_source`,'lab_server_rack_front',im=>gamma(deskew(im),.62)],
 [`${LAB}/_source`,'lab_centrifuge_bench',im=>gamma(deskew(im),.88)],
 [`${LAB}/_source`,'lab_mobile_screen',im=>deskew(im)],
 [`${LAB}/_source`,'lab_gas_rack',im=>gamma(deskew(im),.8)],
 [`${LAB}/_source`,'lab_specimen_tank_low',im=>deskew(im)],
 // Front-facing redraws supplied by the user on 2026-10-05 (second sheet).
 [`${LAB}/_source`,'lab_glass_partition_front',im=>frame(pane(im,{hue:[150,225],minSat:.07,minLum:0,tint:[128,186,194],alpha:150}))],
 [`${LAB}/_source`,'lab_decon_arch',im=>im],
 // Redraws of the five pieces that could not be corrected (third sheet, 2026-10-05).
 [`${LAB}/_source`,'lab_robot_cell',im=>im],
 [`${LAB}/_source`,'lab_stool',im=>gamma(im,.8)],
 [`${LAB}/_source`,'lab_cart',im=>deskew(im)],
 [`${LAB}/_source`,'lab_monitor_station',im=>deskew(im)],
 [`${LAB}/_source`,'lab_small_machine',im=>deskew(im)],
 // Phase 3 (Bank): the first-sheet pieces drawn with camera yaw are levelled like the Lab ones.
 [`${BANK}/_source`,'bank_atm_bank',im=>deskew(im)],
 [`${BANK}/_source`,'bank_waiting_bench',im=>deskew(im)],
 [`${BANK}/_source`,'bank_deposit_island',im=>deskew(im)],
 [`${BANK}/_source`,'bank_cage_trolley',im=>deskew(im)],
 [`${BANK}/_source`,'bank_security_desk',im=>deskew(im)],
 [`${BANK}/_source`,'bank_counting_machine',im=>deskew(im)],
 [`${CASINO}/_source`,'casino_column',im=>stripLabel(im)],
 [`${CASINO}/_source`,'casino_planter',im=>stripLabel(im)],
 [`${CASINO}/_source`,'casino_sofa',im=>deskew(stripLabel(im))],
 [`${CASINO}/_source`,'casino_card_table',im=>stripLabel(im)],
 [`${CASINO}/_source`,'casino_rope_stanchion',im=>stripLabel(im)],
 // Warehouse kit (2026-10-06 sheet): labels stripped; the pieces drawn with one-sided yaw are levelled.
 [`${WAREHOUSE}/_source`,'warehouse_rack',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_pallet_stack',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_crate_stack',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_drum_stack',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_forklift',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_conveyor',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_workbench',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_tarp_cargo',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_fence',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_container',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_barrier',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_storage_cage',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_control_panel',im=>stripLabel(im)],
 [`${WAREHOUSE}/_source`,'warehouse_liquid_tank',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_hand_trolley',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_pipe_stack',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_plank_stack',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_tool_cart',im=>deskew(stripLabel(im))],
 [`${WAREHOUSE}/_source`,'warehouse_cones',im=>deskew(stripLabel(im))],
 [`assets/environment/vault/_source`,'vault_door',im=>im,true],
 [`assets/environment/vault/_source`,'vault_deposit_wall',im=>im,true],
 [`assets/environment/vault/_source`,'vault_blast_screen',im=>im,true],
 [`assets/environment/vault/_source`,'vault_lockers',im=>im,true],
 [`assets/environment/vault/_source`,'vault_cash_table',im=>im,true],
 [`assets/environment/vault/_source`,'vault_inspection_table',im=>im,true],
 [`assets/environment/vault/_source`,'vault_cash_desk',im=>im,true],
 [`assets/environment/vault/_source`,'vault_gold_pallet',im=>im,true],
 [`assets/environment/vault/_source`,'vault_cash_cage',im=>im,true],
 [`assets/environment/vault/_source`,'vault_case_stack',im=>im,true],
 [`assets/environment/vault/_source`,'vault_armored_crate',im=>im,true],
 [`assets/environment/vault/_source`,'vault_gold_strapped',im=>im,true],
 [`assets/environment/vault/_source`,'vault_black_cases',im=>im,true],
 [`assets/environment/vault/_source`,'vault_camera_pillar',im=>im,true],
 [`assets/environment/vault/_source`,'vault_gold_rack',im=>im,true],
 [`assets/environment/vault/_source`,'vault_cash_trolley',im=>im,true],
 // Mansion and Security HQ kits (2026-10-06, cut from the user's two sheets; the server row is two racks of the four drawn).
 [`assets/environment/mansion/_source`,'mansion_bookshelf',im=>im,true],
 [`assets/environment/mansion/_source`,'mansion_room_divider',im=>im,true],
 [`assets/environment/mansion/_source`,'mansion_armor_display',im=>im,true],
 [`assets/environment/mansion/_source`,'mansion_cabinet',im=>im,true],
 [`assets/environment/mansion/_source`,'mansion_dining_table',im=>im,true],
 [`assets/environment/mansion/_source`,'mansion_writing_desk',im=>im,true],
 [`assets/environment/mansion/_source`,'mansion_sofa',im=>im,true],
 [`assets/environment/mansion/_source`,'mansion_grand_piano',im=>im,true],
 [`assets/environment/hq/_source`,'hq_command_console',im=>im,true],
 [`assets/environment/hq/_source`,'hq_security_desk',im=>im,true],
 // Phase 6: the darkest HQ piece sat too close to the floor's tone at the normal camera; lifted a little, nothing else.
 [`assets/environment/hq/_source`,'hq_server_row',im=>gamma(im,.82),true],
 [`assets/environment/hq/_source`,'hq_video_wall',im=>im,true],
 [`assets/environment/hq/_source`,'hq_security_locker',im=>im,true],
 [`assets/environment/hq/_source`,'hq_duty_desk',im=>im,true],
 [`assets/environment/hq/_source`,'hq_checkpoint',im=>im,true],
 [`assets/environment/hq/_source`,'hq_wall_sign',im=>im,true],
 [`assets/environment/hq/_source`,'hq_response_table',im=>im,true],
 [`${BANK}/_source`,'bank_brass_screen',im=>pane(im,{hue:[165,215],minSat:.05,minLum:.38,alpha:160})],
];
// TUNE_ONLY=<id prefix>[,<prefix>] processes only those new pieces and leaves every other sprite as it is.
const ONLY=process.env.TUNE_ONLY?.split(',');
for(const [dir,id,fn,padded] of NEW){if(ONLY&&!ONLY.some(q=>id.startsWith(q)))continue;const raw=`${dir}/raw/${id}.png`;if(!fs.existsSync(raw)){fs.mkdirSync(`${dir}/raw`,{recursive:true});fs.copyFileSync(`${dir}/${id}.png`,raw);}
 let out=fn(read(raw));if(!SEE_THROUGH.test(id)&&dropShadow(out))out=crop(out,bounds(out,8));if(padded)out=pad(out);fs.writeFileSync(`${dir}/${id}.png`,PNG.sync.write(out));console.log('source',id,out.width+'x'+out.height);}
if(ONLY)process.exit(0);
// Old runtime art: corrected in place on the same canvas, sidecar and catalog bounds updated.
const OLD=[[LAB,'decoration','lab_wall_screen',im=>deskew(im)],
 // Casino pieces drawn with camera yaw (2026-10-06): levelled like the Lab and Bank ones.
 ['assets/environment/museum','architecture','museum_partition',im=>deskew(im)],
 [CASINO,'major','casino_slot_bank',im=>deskew(im)],[CASINO,'soft','casino_slot_machine',im=>deskew(im)],[CASINO,'major','casino_cashier_cage',im=>deskew(im)],
 [CASINO,'major','casino_security_station',im=>deskew(im)],[CASINO,'major','casino_bar_island',im=>deskew(im)],[CASINO,'soft','casino_chip_cart',im=>deskew(im)]];
const catalogPath='assets/environment/environment-assets.json',catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
for(const [dir,cat,id,fn] of OLD){const file=`${dir}/${cat}/${id}.png`,keep=`${dir}/_pretune/${id}.png`;if(!fs.existsSync(keep)){fs.mkdirSync(path.dirname(keep),{recursive:true});fs.copyFileSync(file,keep);}
 const before=read(keep),b0=bounds(before);let fixed=fn(before);if(dropShadow(fixed))fixed=crop(fixed,bounds(fixed,8));const canvas=new PNG({width:before.width,height:before.height});
 const s=Math.min(1,b0.w/fixed.width),w=Math.round(fixed.width*s),h=Math.round(fixed.height*s),ox=Math.round(b0.x+b0.w/2-w/2),oy=b0.y+b0.h-h;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const sx=Math.min(fixed.width-1,Math.round(x/s)),sy=Math.min(fixed.height-1,Math.round(y/s)),i=(sy*fixed.width+sx)*4,j=((oy+y)*canvas.width+ox+x)*4;if(oy+y<0||ox+x<0)continue;for(let k=0;k<4;k++)canvas.data[j+k]=fixed.data[i+k];}
 fs.writeFileSync(file,PNG.sync.write(canvas));const nb=bounds(canvas),side=file.replace(/\.png$/,'.metadata.json');
 if(fs.existsSync(side)){const m=JSON.parse(fs.readFileSync(side,'utf8'));m.objectBounds=nb;if(m.diagnostics?.bounds)m.diagnostics.bounds=nb;fs.writeFileSync(side,JSON.stringify(m,null,2)+'\n');}
 const a=catalog.assets.find(a=>a.id===id);a.objectBounds=nb;a.drawHeight=a.drawWidth*nb.h/nb.w;console.log('runtime',id,JSON.stringify(nb));}
const handled=new Set([...NEW.map(n=>n[1]),...OLD.map(o=>o[2])]),FLOOR=/carpet|floor_marker|cable/;
for(const a of catalog.assets){if(handled.has(a.id)||FLOOR.test(a.id)||SEE_THROUGH.test(a.id)||!fs.existsSync(a.path))continue;
 const im=read(a.path),n=dropShadow(im);if(n<150)continue;
 const keep=path.join(path.dirname(path.dirname(a.path)),'_pretune',a.id+'.png');if(!fs.existsSync(keep)){fs.mkdirSync(path.dirname(keep),{recursive:true});fs.copyFileSync(a.path,keep);}
 fs.writeFileSync(a.path,PNG.sync.write(im));const nb=bounds(im),side=a.path.replace(/\.png$/,'.metadata.json');
 if(fs.existsSync(side)){const m=JSON.parse(fs.readFileSync(side,'utf8'));m.objectBounds=nb;if(m.diagnostics?.bounds)m.diagnostics.bounds=nb;fs.writeFileSync(side,JSON.stringify(m,null,2)+'\n');}
 a.objectBounds=nb;a.drawHeight=a.drawWidth*nb.h/nb.w;console.log('shadow',a.id,n);}
fs.writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n');
