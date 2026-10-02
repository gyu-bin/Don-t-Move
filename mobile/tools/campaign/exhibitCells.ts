/**
 * Curated exhibit cells for gallery rooms that read as empty floor. Applied before the furnishing pass.
 *
 * Unlike furnishing (wall furniture, decor), these are major/medium pieces placed by room purpose:
 * each gives the room a second focal exhibit and a line-of-sight break on the way through it.
 * A piece is placed at the first listed position that keeps every authored route, patrol leg and
 * search anchor valid; if none does, the build fails rather than silently dropping the cell.
 */
import type {StageDefinition,PropDef,PropKind} from '../../src/game/levels/StageDefinition';
import type {EnvironmentAssetId} from '../../src/assets/environmentKit';
import {movementContract,propBoxes} from './furnishingPass';

type Piece={role:string;kind:PropKind;asset:EnvironmentAssetId;scale?:number;at:[number,number][]};
const sculpture=(role:string,scale:number,...at:[number,number][]):Piece=>({role,kind:'statue',asset:'gallery_sculpture_large',scale,at});
const installation=(role:string,scale:number,...at:[number,number][]):Piece=>({role,kind:'statue',asset:'gallery_installation_art',scale,at});
const artWall=(role:string,scale:number,...at:[number,number][]):Piece=>({role,kind:'partition',asset:'gallery_movable_art_wall',scale,at});
const plinth=(role:string,...at:[number,number][]):Piece=>({role,kind:'statuePedestal',asset:'gallery_central_plinth',scale:2,at});

const CELLS:Record<string,Piece[]>={
 // Private Collection: every room had one or two pieces on 60-100 tiles of floor.
 '02-09':[
  // North Sculpture Balcony (timing room): a second sculpture and an art wall split the long hall into bays.
  installation('north balcony: east bay focal exhibit / LOS break',2.1,[21.5,5.6],[20.5,5.4],[22.5,6]),
  artWall('north balcony: west bay divider / cover',1.8,[13,6.2],[12.5,5.8],[13.5,6.4]),
  // East Portrait Balcony (escape): the patrol loop and both escape lines use nearly all of its floor,
  // so only a plinth fits beside the installation without re-authoring those routes.
  plinth('east balcony: plinth beside the installation',[26.5,17.7]),
  // West Collection Arm (safe/risk choice): a plinth pair narrows the risky direct line.
  plinth('west arm: mid plinth, route divider',[12.6,18.2],[12.4,17.4],[12.8,18.8]),
  // Private Masterpiece chamber: flanking exhibits frame the objective instead of an empty hall.
  sculpture('masterpiece chamber: east flank exhibit',2.1,[23,28.4],[22.5,28.8],[23.5,28]),
  plinth('masterpiece chamber: west flank plinth',[11.6,27.6],[11.8,28.2],[11.6,26.8]),
  // Reception: a first exhibit so the opening room is not bare.
  sculpture('reception: arrival exhibit',1.7,[4.5,10.6],[5,10.4],[3.8,10.8]),
 ],
};

type Spec={kind:PropKind;asset:EnvironmentAssetId;scale?:number};
const bank=(kind:PropKind,asset:EnvironmentAssetId):Spec=>({kind,asset});
/** Bank rooms are furnished by what the room is for; the zone name states its function. */
const BANK_CLUSTERS:[RegExp,Spec[]][]=[
 [/teller|counter|public|queue|lobby|reception/i,[bank('bankTellerCounter','bank_teller_counter'),bank('bankQueueBarrier','bank_queue_barrier')]],
 [/cash|processing|workfloor|asset|loading|dispatch/i,[bank('bankCashProcessingTable','bank_cash_processing_table'),bank('bankCashCart','bank_cash_cart'),bank('bankCashCart','bank_cash_cart')]],
 [/deposit|vault|ledger|secure|restricted/i,[bank('bankDepositBoxWall','bank_deposit_box_wall'),bank('bankSmallSafe','bank_small_safe')]],
 [/security|checkpoint|command|gate|controlled|observation|inspection|monitor/i,[bank('bankSecurityCheckpoint','bank_security_checkpoint'),bank('bankFilingCabinet','bank_filing_cabinet')]],
 [/record|audit|office|clerk|staff|analysis|verification|document|supervisor|authorization/i,[bank('bankOfficeDesk','bank_office_desk'),bank('bankFilingCabinet','bank_filing_cabinet'),bank('bankFilingCabinet','bank_filing_cabinet')]],
];
const BANK_DEFAULT:Spec[]=[bank('bankOfficeDesk','bank_office_desk'),bank('bankFilingCabinet','bank_filing_cabinet')];
const GALLERY_CELLS:[RegExp,Spec[]][]=[
 [/sculpture|carving|court|atrium|terrace/i,[{kind:'statue',asset:'gallery_sculpture_large',scale:2},{kind:'statuePedestal',asset:'gallery_central_plinth',scale:2}]],
 [/installation|modern|annex|glass/i,[{kind:'statue',asset:'gallery_installation_art',scale:2},{kind:'partition',asset:'gallery_movable_art_wall',scale:1.8}]],
 [/portrait|collection|salon|gallery|wing|spine|screens|workroom|crossing/i,[{kind:'partition',asset:'gallery_movable_art_wall',scale:1.8},{kind:'statuePedestal',asset:'gallery_central_plinth',scale:2}]],
];
const GALLERY_DEFAULT:Spec[]=[{kind:'statue',asset:'gallery_sculpture_large',scale:1.8}];
/** Curated elsewhere (tools/campaign/curatedHeistFlows.ts); left alone here. */
const CURATED_ELSEWHERE=new Set(['02-06','02-10','03-08','03-10']);

/** Zone-driven cells: every authored security zone that has fewer than two substantial pieces gets its functional cluster. */
function zonePieces(def:StageDefinition):Piece[]{
 if((def.chapter!==2&&def.chapter!==3)||CURATED_ELSEWHERE.has(def.id))return [];
 const out:Piece[]=[],table=def.chapter===3?BANK_CLUSTERS:GALLERY_CELLS,fallback=def.chapter===3?BANK_DEFAULT:GALLERY_DEFAULT;
 const floorTiles=def.layout.join('').split('').filter(c=>c==='.').length;
 let budget=Math.ceil(floorTiles/70);
 for(const zone of def.securityZones??[]){
  if(budget<=0)break;
  if(/roaming/i.test(zone.name))continue;
  const substantial=propBoxes(def).filter(b=>(b.x1-b.x0)*(b.y1-b.y0)>=0.9&&Math.hypot((b.x0+b.x1)/2-zone.x,(b.y0+b.y1)/2-zone.y)<=zone.radius+1).length;
  if(substantial>=2)continue;
  const cluster=(table.find(([re])=>re.test(zone.name))?.[1]??fallback).slice(0,def.chapter===3?3:2-substantial);
  // Cluster members sit side by side: each is aimed 1.7 tiles further along the zone's x axis.
  cluster.forEach((spec,i)=>{if(budget-->0)out.push({role:`${zone.name}: ${spec.kind}`,kind:spec.kind,asset:spec.asset,scale:spec.scale as number,at:[[zone.x+(i===0?0:(i%2?1.7:-1.7)*Math.ceil(i/2)),zone.y+(i===0?-1.2:-0.6)]]});});
 }
 return out;
}

export function applyExhibitCells(source:StageDefinition):StageDefinition{
 const curated=CELLS[source.id],cells=curated??zonePieces(source);
 if(!cells.length)return source;
 const def=structuredClone(source),holds=movementContract(def);
 const floor=(x:number,y:number)=>def.layout[Math.floor(y)]?.[Math.floor(x)]==='.';
 for(const piece of cells){
  // Nearest valid spot to the intended position, on a half-tile grid within 4 tiles.
  const [wantX,wantY]=piece.at[0],spots:[number,number][]=[];
  for(let dy=-4;dy<=4;dy+=.5)for(let dx=-4;dx<=4;dx+=.5)spots.push([wantX+dx,wantY+dy]);
  spots.sort((a,b)=>Math.hypot(a[0]-wantX,a[1]-wantY)-Math.hypot(b[0]-wantX,b[1]-wantY)||a[1]-b[1]||a[0]-b[0]);
  let placed=false;
  // Full size first; a smaller casting of the same piece if the room's routes leave no space for it. Bank pieces have one size.
  const scales=piece.scale===undefined?[undefined]:[piece.scale,Math.min(piece.scale,1.7),Math.min(piece.scale,1.4),Math.min(piece.scale,1.15)];
  for(const scale of scales)for(const [x,y] of spots){
   if(placed)break;
   const prop:PropDef=scale===undefined?{kind:piece.kind,visualAssetId:piece.asset,x,y}:{kind:piece.kind,visualAssetId:piece.asset,x,y,scale,collisionScale:scale};
   const before=propBoxes(def);def.props.push(prop);
   const box=propBoxes(def).at(-1)!;
   // Whole footprint on floor, a body-width gap to every other piece, clear of spawn, objective and exit.
   const onFloor=[[box.x0,box.y0],[box.x1,box.y0],[box.x0,box.y1],[box.x1,box.y1],[x,y-.2]].every(([px,py])=>floor(px,py));
   const spaced=before.every(b=>Math.hypot(Math.max(b.x0-box.x1,box.x0-b.x1,0),Math.max(b.y0-box.y1,box.y0-b.y1,0))>=0.95);
   const exit={x:def.exit!.x+def.exit!.w/2,y:def.exit!.y+def.exit!.h/2};
   const away=[def.playerSpawn,def.objective!,exit].every(q=>Math.hypot(Math.max(box.x0-q.x,0,q.x-box.x1),Math.max(box.y0-q.y,0,q.y-box.y1))>=1.8);
   if(onFloor&&spaced&&away&&holds(def)){placed=true;break;}
   def.props.pop();
  }
  // Hand-curated cells must land; zone-driven ones are skipped when the room's routes leave no space.
  if(!placed){if(curated)throw Error(`${def.id}: exhibit cell has no valid position — ${piece.role}`);continue;}
  if(piece.kind==='statue'){const p=def.props.at(-1)!;def.lights=[...def.lights,{x:p.x,y:p.y-1,radius:3.2,kind:'warm',intensity:.46}];}
 }
 return def;
}
