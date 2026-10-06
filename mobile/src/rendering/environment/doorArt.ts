import type {SkCanvas,SkPaint} from '@shopify/react-native-skia';
import type {DoorRuntime,DoorStyle} from '../../game/doors/doorTypes';
import {fill,stroke} from '../paints';
import {fillRect,fillRRect,fillOval} from '../skiaScratch';

/** Chapter-specific native vector door styles. Paints are prepared once;
 * leaves are rendered from the same progress that drives physical closure. */
export interface DoorArt {frame:SkPaint;edge:SkPaint;leaf:SkPaint;inset:SkPaint;trim:SkPaint;shine:SkPaint;glass:boolean;reinforced:boolean;}
export interface DoorArtSet {styles:Record<DoorStyle,DoorArt>;shadow:SkPaint;green:SkPaint;red:SkPaint;amber:SkPaint;}
export function createDoorArt():DoorArtSet {
  const make=(frame:string,leaf:string,inset:string,trim:string,glass=false,reinforced=false):DoorArt=>({
    frame:fill(frame),edge:stroke(trim,1.3),leaf:fill(leaf,glass?.55:1),inset:fill(inset,glass?.32:1),trim:fill(trim),shine:stroke(glass?'#C3EDF1':'#8B8172',.8,glass?.65:.22),glass,reinforced,
  });
  return {styles:{
    museumExhibition4c:make('#51402C','#765031','#39291F','#C3A671'),
    museumRestrictedCollection4c:make('#554931','#625139','#2F302A','#D0B780'),
    museumSecurity4c:make('#3A454A','#647278','#263039','#AEBCC1',false,true),
    galleryMinimal4c:make('#EEECE1','#E5E3D9','#C5C9C5','#707E80'),
    galleryGlassSliding4c:make('#A1B7BC','#9AD2D8','#609AA5','#DCF0EF',true),
    galleryPrivateCollection4c:make('#414A4B','#84908D','#28383B','#E6E9DC',false,true),
    bankStaff4c:make('#6B5940','#806746','#3E392E','#C4B087'),
    bankSecurity4c:make('#505F69','#7A8D99','#2C414C','#C9D5D7',false,true),
    bankSecurityPortal4c:make('#4D6069','#6B8390','#253E4A','#BCD1D5',true),
    bankVault4c:make('#3A454E','#7B8C94','#455560','#E0C28A',false,true),
    labSliding4c:make('#CADADB','#A6D1D7','#578997','#EAF8F8',true),
    labRestrictedGlass4c:make('#829CA4','#CFDFDF','#375969','#A1EBED',false,true),
    labPrototypeSecurity4c:make('#263E4B','#728C99','#172E3B','#B2E5E8',false,true),
    museumExhibition:make('#40352B','#473328','#2B211C','#B39461'),
    museumRestrictedCollection:make('#282A29','#322720','#201A18','#9F8757'),
    museumSecurity:make('#313940','#293039','#1D242D','#86929A',false,true),
    galleryMinimal:make('#E2DDD2','#CCCBC3','#AFB1AD','#7C8789'),
    galleryGlassSliding:make('#808F95','#77B1BE','#467D8B','#B6CBD0',true),
    galleryPrivateCollection:make('#9BABA9','#536269','#34454F','#C0CFCC',false,true),
    bankStaff:make('#626665','#45433A','#292C2C','#B1A078'),
    bankSecurity:make('#626D75','#434E59','#293641','#B1BCC1',false,true),
    bankVault:make('#78848A','#5A656D','#343E48','#D1BA83',false,true),
    labSliding:make('#B3C2C5','#779198','#45626E','#C5E1E3',false,true),
    labRestrictedGlass:make('#9AAEB7','#70AFBD','#3C7183','#C3E4E9',true),
    casinoVip4d:make('#593B28','#772D45','#371F30','#E4BD70'),
    casinoSecurity4d:make('#393B3E','#8B795B','#25272F','#D3B47B',false,true),
    casinoVip:make('#76582C','#663630','#3C1D25','#D7AF62'),
    casinoStaff:make('#544A40','#454139','#252B30','#A59772',false,true),
    mansionWood:make('#62452E','#674631','#3B2922','#BFA378'),
    mansionLibrary:make('#453B2D','#4F3B2C','#2D2420','#AC9260'),
    warehouseIndustrial:make('#646E73','#475259','#303940','#D1AD5B',false,true),
    hqSteel:make('#5B7588','#324E64','#203141','#78AAC3',false,true),
    vaultReinforced:make('#7D8790','#4C5865','#293642','#BAA778',false,true),
  },shadow:fill('#000000',.25),green:fill('#66CDB0'),red:fill('#EA5147'),amber:fill('#ECC377')};
}

function leaf(c:SkCanvas,a:DoorArt,x:number,y:number,w:number,h:number):void {
  'worklet';
  fillRect(c,x,y,w,h,a.leaf);
  if(w>8&&h>8){
    fillRect(c,x+3,y+4,w-6,h-8,a.inset);
    c.drawLine(x+3,y+4,x+w-3,y+4,a.edge);
    c.drawLine(x+3,y+h-4,x+w-3,y+h-4,a.edge);
    c.drawLine(x+w-3,y+4,x+w-3,y+h-4,a.edge);
    if(a.glass){c.drawLine(x+4,y+h-7,x+w-4,y+7,a.shine);c.drawLine(x+4,y+h-15,x+w-4,y+4,a.shine);}
    else if(a.reinforced){fillRect(c,x+2,y+h*.45,w-4,4,a.trim);}
    else {c.drawLine(x+w*.5,y+7,x+w*.5,y+h-7,a.shine);}
  }
}

/** Thirteen separate architectural profiles. Existing styles keep their original
 * rendering path. Geometry is paint-only; runtime aperture/progress is unchanged. */
function drawIntegratedDoor(c:SkCanvas,d:DoorRuntime,set:DoorArtSet,t:number,style:DoorStyle):void {
  'worklet';
  const a=set.styles[style],h=d.width/2,p=Math.max(0,Math.min(1,d.progress));
  const light=d.state==='CLOSED'?set.red:d.state==='CLOSING'?(Math.sin(t*10)>0?set.amber:set.red):set.green;
  c.save();c.translate(d.x,d.y);
  if(style==='bankVault4c'&&d.orientation==='vertical'){
    // A side-facing vault cannot reuse the front disk rotated in screen space:
    // that turns the upright leaf into an apparently floating oval. Show its
    // thick edge, attached to a north hinge tower, opening into the chamber.
    fillRRect(c,-17,-h-5,34,d.width+12,3,set.shadow);
    fillRect(c,-17,-h-39,34,44,a.frame);fillRect(c,-17,h-31,34,36,a.frame);
    fillRect(c,-20,-h-42,40,7,a.trim);fillRect(c,-20,h-34,40,7,a.trim);
    const leafWidth=12+48*(1-p),leafHeight=38+(d.width-38)*p;
    const top=-h-37*(1-p);
    fillRRect(c,-6,top,leafWidth,leafHeight,3,a.frame);
    fillRect(c,-3,top+3,leafWidth-6,leafHeight-6,a.leaf);
    fillRect(c,-6,top,leafWidth,2,a.trim);fillRect(c,-6,top+leafHeight-2,leafWidth,2,a.trim);
    // Swung open, the leaf shows its steel face: a hand wheel and the locking bolts on its free edge,
    // so it reads as an open vault door and not as a loose slab on the floor.
    if(p<.5&&leafWidth>40){
      const cx=-6+leafWidth*.48,cy=top+leafHeight/2;
      fillOval(c,cx-9,cy-9,18,18,a.frame);fillOval(c,cx-7,cy-7,14,14,a.trim);fillOval(c,cx-4,cy-4,8,8,a.inset);
      fillRect(c,cx-10,cy-1,20,2,a.frame);fillRect(c,cx-1,cy-10,2,20,a.frame);
      for(let k=0;k<3;k++)fillRect(c,leafWidth-13,top+6+k*((leafHeight-16)/2),5,4,a.inset);
    }
    // Two visible hinge straps physically connect the leaf to its tower.
    fillRect(c,-12,-h-23,17,6,a.trim);fillRect(c,-12,-h-8,17,6,a.trim);
    fillRect(c,-14,-h-33,7,6,light);
    if(p>.75){for(let y=-h+15;y<h-4;y+=20)fillRect(c,-4,y,9,4,a.trim);}
    c.restore();return;
  }
  // A side-on threshold uses the same architectural cross-section, foreshortened
  // in depth. Its span remains exactly aligned with the physical door opening.
  if(d.orientation==='vertical'){c.rotate(90,0,0);c.scale(1,.44);}
  fillRRect(c,-h-12,-5,d.width+24,10,3,set.shadow);
  if(style==='museumExhibition4c'){
    // Fluted classical columns, tiered pediment, single hinged oak panel.
    for(const x of [-h-11,h]){fillRect(c,x,-58,11,61,a.frame);fillRect(c,x-3,-6,17,8,a.trim);fillRect(c,x+3,-53,2,45,a.trim);}
    fillRect(c,-h-15,-64,d.width+30,7,a.trim);fillRect(c,-h-9,-70,d.width+18,6,a.frame);
    const w=5+(d.width-5)*p;leaf(c,a,-h,-57,w,58);
    if(w>18){fillRect(c,-h+w-9,-29,3,11,a.trim);fillRect(c,-h+5,-48,w-13,16,a.inset);}
  }else if(style==='museumRestrictedCollection4c'){
    // Broad bronze shoulders, heavy lattice gate and central collection seal.
    fillRect(c,-h-16,-64,16,68,a.frame);fillRect(c,h,-64,16,68,a.frame);
    fillRect(c,-h-16,-66,d.width+32,12,a.trim);
    const w=5+(h-5)*p;leaf(c,a,-h,-54,w,57);leaf(c,a,h-w,-54,w,57);
    for(let x=8;x<w-3;x+=9){fillRect(c,-h+x,-49,3,43,a.trim);fillRect(c,h-x-3,-49,3,43,a.trim);}
    fillOval(c,-10,-72,20,20,a.frame);fillOval(c,-5,-67,10,10,a.trim);
  }else if(style==='museumSecurity4c'){
    // Roller shutter: cylindrical drum and a vertically descending slatted leaf.
    fillRect(c,-h-9,-55,9,58,a.frame);fillRect(c,h,-55,9,58,a.frame);
    fillRRect(c,-h-13,-66,d.width+26,16,7,a.frame);
    const height=3+53*p;fillRect(c,-h,-53,d.width,height,a.leaf);
    for(let y=-50;y<-53+height;y+=7)fillRect(c,-h,y,d.width,2,a.inset);
    fillRect(c,-h,-55+height,d.width,3,a.trim);fillRect(c,-10,-62,20,4,light);
  }else if(style==='galleryMinimal4c'){
    // Frameless white plane with just a thin top reveal and offset pull.
    fillRect(c,-h-3,-60,3,63,a.frame);fillRect(c,h,-60,3,63,a.frame);fillRect(c,-h-3,-63,d.width+6,3,a.frame);
    const w=3+(d.width-3)*p;fillRect(c,-h,-60,w,60,a.leaf);
    if(w>14)fillRect(c,-h+w-8,-39,2,25,a.trim);
  }else if(style==='galleryGlassSliding4c'){
    // Exposed rail extends beyond narrow steel stiles; overlapping glass panes.
    fillRect(c,-h-20,-56,d.width+40,4,a.trim);
    fillRect(c,-h-4,-53,4,56,a.frame);fillRect(c,h,-53,4,56,a.frame);
    const w=4+(h-4)*p;leaf(c,a,-h,-52,w,54);leaf(c,a,h-w,-52,w,54);
    fillRect(c,-h+w-3,-53,3,56,a.trim);fillRect(c,h-w,-53,3,56,a.trim);
    fillRect(c,-h-15,-60,9,4,a.frame);fillRect(c,h+6,-60,9,4,a.frame);
  }else if(style==='galleryPrivateCollection4c'){
    // Asymmetric dark monolithic jamb and inset secure white slab.
    fillRect(c,-h-6,-66,6,69,a.frame);fillRect(c,h,-66,22,69,a.frame);fillRect(c,-h-6,-66,d.width+28,5,a.frame);
    const w=4+(d.width-4)*p;fillRect(c,-h,-61,w,63,a.leaf);fillRect(c,-h,-61,3,63,a.trim);
    fillRect(c,h+6,-40,10,20,a.inset);fillRect(c,h+8,-36,6,4,light);
  }else if(style==='bankStaff4c'){
    // Ordinary staff door with a glazed transom, kick plate and lever handle.
    fillRect(c,-h-7,-66,7,69,a.frame);fillRect(c,h,-66,7,69,a.frame);fillRect(c,-h-7,-67,d.width+14,5,a.trim);
    fillRect(c,-h,-61,d.width,10,a.inset);fillRect(c,-h,-50,d.width,3,a.trim);
    const w=4+(d.width-4)*p;leaf(c,a,-h,-46,w,49);fillRect(c,-h,-6,w,7,a.trim);
    if(w>20)fillRect(c,-h+w-14,-26,10,3,a.trim);
  }else if(style==='bankSecurity4c'){
    // Square armored frame with an external access-control reader wing.
    fillRect(c,-h-10,-61,10,64,a.frame);fillRect(c,h,-61,10,64,a.frame);fillRect(c,-h-10,-65,d.width+20,8,a.trim);
    const w=4+(h-4)*p;leaf(c,a,-h,-56,w,59);leaf(c,a,h-w,-56,w,59);
    fillRect(c,h+10,-42,15,26,a.frame);fillRect(c,h+13,-37,9,7,light);fillRect(c,h+13,-25,9,3,a.trim);
  }else if(style==='bankSecurityPortal4c'){
    // Security vestibule: two complete frames with a visible floor between them.
    fillRect(c,-h-14,-24,d.width+28,29,a.inset);
    for(const y of [-80,-57]){fillRect(c,-h-14,y,14,60,a.frame);fillRect(c,h,y,14,60,a.frame);fillRect(c,-h-14,y,d.width+28,7,a.trim);}
    const w=5+(h-5)*p;leaf(c,a,-h,-50,w,53);leaf(c,a,h-w,-50,w,53);
    fillRect(c,-h-10,-44,6,18,light);fillRect(c,h+4,-44,6,18,light);
    fillRect(c,-h,-10,d.width,2,a.trim);
  }else if(style==='bankVault4c'){
    // Circular vault housed in a massive stepped surround. The wheel/bolts travel
    // with its leaf so the open opening stays readable and the landmark persists.
    const radius=Math.max(38,h);
    fillRect(c,-h-20,-radius*2-8,20,radius*2+12,a.frame);fillRect(c,h,-radius*2-8,20,radius*2+12,a.frame);
    fillRect(c,-h-20,-radius*2-13,d.width+40,12,a.trim);
    fillRect(c,-h-26,-radius*2-3,12,radius*2-4,a.inset);
    // Hinged leaf foreshortens against its jamb while open. A full disk
    // translated outside the aperture would visibly float over map void.
    if(p<.12){
      // An open circular leaf reads edge-on as steel thickness, with hinges
      // physically connected to the west jamb. Do not squash a disk into an oval.
      fillRect(c,-h-12,-radius*2+1,14,radius*2-2,a.frame);
      fillRect(c,-h-9,-radius*2+5,5,radius*2-10,a.trim);
      fillRect(c,-h-17,-radius*1.65,22,7,a.trim);
      fillRect(c,-h-17,-radius*.45,22,7,a.trim);
      fillRect(c,h+5,-radius*2+7,8,5,light);
      c.restore();return;
    }
    c.save();c.translate((-h-8)*(1-p),0);c.scale(.16+.84*p,1);
    const cx=0,cy=-radius;
    fillOval(c,cx-radius,cy-radius,radius*2,radius*2,a.frame);
    fillOval(c,cx-radius+5,cy-radius+5,radius*2-10,radius*2-10,a.trim);
    fillOval(c,cx-radius+10,cy-radius+10,radius*2-20,radius*2-20,a.leaf);
    for(let i=0;i<8;i++){const angle=i*Math.PI/4;c.drawCircle(cx+Math.cos(angle)*(radius-8),cy+Math.sin(angle)*(radius-8),3,a.inset);}
    c.drawCircle(cx,cy,13,a.inset);c.drawCircle(cx,cy,8,a.trim);
    c.drawLine(cx-18,cy,cx+18,cy,a.edge);c.drawLine(cx,cy-18,cx,cy+18,a.edge);
    c.restore();
    fillRect(c,h+5,-radius*2+7,8,5,light);
  }else if(style==='labSliding4c'){
    // Cleanroom curved header and suspended panes; no floor sill trip hazard.
    fillRRect(c,-h-8,-68,d.width+16,15,7,a.frame);fillRect(c,-h-6,-54,6,57,a.trim);fillRect(c,h,-54,6,57,a.trim);
    const w=4+(h-4)*p;leaf(c,a,-h,-52,w,54);leaf(c,a,h-w,-52,w,54);
    fillRect(c,-h,-29,w,7,a.trim);fillRect(c,h-w,-29,w,7,a.trim);fillRect(c,-12,-63,24,4,light);
  }else if(style==='labRestrictedGlass4c'){
    // Tall sterile pylons flank a shield leaf with a narrow observation slit.
    fillRRect(c,-h-14,-71,14,75,5,a.frame);fillRRect(c,h,-71,14,75,5,a.frame);
    fillRect(c,-h-7,-67,d.width+14,7,a.trim);
    const w=5+(h-5)*p;leaf(c,a,-h,-58,w,61);leaf(c,a,h-w,-58,w,61);
    if(w>12){fillRect(c,-h+5,-47,w-8,8,a.inset);fillRect(c,h-w+3,-47,w-8,8,a.inset);}
    fillRect(c,-h-10,-53,5,28,a.trim);fillRect(c,h+4,-53,5,28,light);
  }else{
    // Prototype containment: deep blast collar, angled-looking stepped corners,
    // mechanical ribs and two external warning towers.
    fillRect(c,-h-18,-68,18,71,a.frame);fillRect(c,h,-68,18,71,a.frame);fillRect(c,-h-12,-77,d.width+24,14,a.frame);
    fillRect(c,-h-24,-56,6,46,a.trim);fillRect(c,h+18,-56,6,46,a.trim);
    const w=5+(h-5)*p;leaf(c,a,-h,-62,w,65);leaf(c,a,h-w,-62,w,65);
    for(let y=-57;y<-8;y+=13){fillRect(c,-h,y,w,4,a.trim);fillRect(c,h-w,y,w,4,a.trim);}
    fillRRect(c,-h-24,-74,10,13,3,light);fillRRect(c,h+14,-74,10,13,3,light);
  }
  c.restore();
}

/** Casino architecture stays visible while open; side-facing jambs remain upright.
 * Leaves use the physical closure progress without altering the clear aperture. */
function drawCasinoDoor(c:SkCanvas,d:DoorRuntime,set:DoorArtSet,t:number):void {
  'worklet';
  const a=set.styles[d.style!],h=d.width/2,p=Math.max(0,Math.min(1,d.progress));
  const vip=d.style==='casinoVip4d';
  const light=d.state==='CLOSED'?set.red:d.state==='CLOSING'?(Math.sin(t*10)>0?set.amber:set.red):set.green;
  c.save();c.translate(d.x,d.y);
  if(d.orientation==='vertical'){
    // Two upright pilasters sit beyond the ends of the north/south aperture.
    fillRRect(c,-13,-h-4,26,d.width+8,3,set.shadow);
    for(const y of [-h-6,h+6]){
      fillRect(c,-12,y-45,24,45,a.frame);fillRect(c,-15,y-47,30,6,a.trim);
      fillRect(c,-15,y-4,30,7,a.trim);fillRect(c,-6,y-37,3,30,a.trim);
      if(vip){fillRect(c,-8,y-55,16,8,a.frame);fillRect(c,-4,y-60,8,5,a.trim);}
    }
    // Elevated narrow rail joins both towers; floor remains clear when open.
    fillRect(c,-9,-h-43,10,d.width+4,a.frame);fillRect(c,-9,-h-43,3,d.width+4,a.trim);
    const span=Math.max(0,h*p);
    if(span>0){
      fillRect(c,-5,-h,10,span,a.leaf);fillRect(c,-5,h-span,10,span,a.leaf);
      for(let y=6;y<span;y+=10){fillRect(c,-5,-h+y,10,2,a.trim);fillRect(c,-5,h-y,10,2,a.trim);}
    }
    fillRect(c,12,h-28,10,20,a.frame);fillRect(c,14,h-25,6,5,light);
  }else if(vip){
    // Stepped crown and tall fluted brass piers read as an Art Deco VIP portal.
    fillRRect(c,-h-19,-6,d.width+38,13,3,set.shadow);
    for(const x of [-h-17,h]){
      fillRect(c,x,-69,17,73,a.frame);fillRect(c,x-3,-7,23,11,a.trim);
      fillRect(c,x+4,-62,3,49,a.trim);fillRect(c,x+10,-62,2,49,a.trim);
    }
    fillRect(c,-h-20,-74,d.width+40,9,a.trim);
    fillRect(c,-h-9,-84,d.width+18,10,a.frame);
    fillRect(c,-h+5,-91,d.width-10,7,a.trim);
    fillRect(c,-13,-98,26,7,a.frame);fillRect(c,-5,-94,10,13,a.trim);
    const w=3+(h-3)*p;leaf(c,a,-h,-64,w,66);leaf(c,a,h-w,-64,w,66);
    if(w>14){fillRect(c,-h+w-7,-43,3,25,a.trim);fillRect(c,h-w+4,-43,3,25,a.trim);}
    fillRect(c,h+17,-44,12,24,a.frame);fillRect(c,h+20,-39,6,7,light);
  }else{
    // Cashier security grille: broad roller housing and a visible barred curtain.
    fillRRect(c,-h-15,-6,d.width+30,12,3,set.shadow);
    fillRect(c,-h-12,-62,12,66,a.frame);fillRect(c,h,-62,12,66,a.frame);
    fillRRect(c,-h-17,-80,d.width+34,22,6,a.frame);
    fillRect(c,-h-12,-76,d.width+24,5,a.trim);
    fillRect(c,-h-7,-64,4,67,a.trim);fillRect(c,h+3,-64,4,67,a.trim);
    const height=3+57*p;
    for(let x=-h+5;x<h;x+=10)fillRect(c,x,-58,3,height,a.leaf);
    for(let y=-54;y<-58+height;y+=12)fillRect(c,-h,y,d.width,3,a.trim);
    fillRect(c,-h,-58+height,d.width,5,a.trim);
    fillRect(c,h+12,-47,19,32,a.frame);fillRect(c,h+16,-42,11,7,light);
    fillRect(c,h+16,-30,11,3,a.trim);
  }
  c.restore();
}

export function drawPhysicalDoor(c:SkCanvas,d:DoorRuntime,set:DoorArtSet,t:number):void {
  'worklet';
  const style=d.style??(d.type==='glass'?'galleryGlassSliding':'museumExhibition');
  if(style==='casinoVip4d'||style==='casinoSecurity4d'){drawCasinoDoor(c,d,set,t);return;}
  if(style.endsWith('4c')){drawIntegratedDoor(c,d,set,t,style);return;}
  const a=set.styles[style],half=d.width/2,p=Math.max(0,Math.min(1,d.progress));
  const light=d.state==='CLOSED'?set.red:d.state==='CLOSING'?(Math.sin(t*10)>0?set.amber:set.red):set.green;
  c.save();c.translate(d.x,d.y);
  if(d.orientation==='horizontal'){
    fillRRect(c,-half-9,-8,d.width+20,18,4,set.shadow);
    // Classical stepped moulding / slim modern jambs sit outside the aperture.
    const moulding=style.startsWith('museum')?9:6;
    fillRect(c,-half-moulding,-43,moulding,49,a.frame);fillRect(c,half,-43,moulding,49,a.frame);
    fillRect(c,-half-moulding-2,-47,d.width+moulding*2+4,6,a.frame);
    fillRect(c,-half-moulding,-42,2,47,a.trim);fillRect(c,half+moulding-2,-42,2,47,a.trim);
    const w=4+(half-4)*p;
    leaf(c,a,-half,-40,w,43);leaf(c,a,half-w,-40,w,43);
    fillRect(c,-13,-46,26,5,a.inset);fillRect(c,-7,-45,14,3,light);
    if(p>.85){fillRect(c,-4,-23,2,8,a.trim);fillRect(c,2,-23,2,8,a.trim);}
  }else{
    // Vertical seam keeps a narrow top-down footprint; elevated edge is projected north.
    fillRRect(c,-9,-half-5,22,d.width+14,3,set.shadow);
    fillRect(c,-9,-half-5,18,7,a.frame);fillRect(c,-9,half-2,18,7,a.frame);
    c.drawLine(-7,-half+2,-7,half-2,a.edge);
    const h=4+(half-4)*p;
    leaf(c,a,-6,-half,12,h);leaf(c,a,-6,half-h,12,h);
    fillRect(c,7,-half-3,3,5,light);
    if(p>.85)fillRect(c,-2,-3,4,6,a.trim);
  }
  c.restore();
}

