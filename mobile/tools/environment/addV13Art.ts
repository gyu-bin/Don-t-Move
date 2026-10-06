/**
 * V13 art intake for Chapter 3–4: packages the cut-outs of the user's contact sheet as runtime sprites and
 * registers them in the asset catalog. Idempotent. Sources live in assets/environment/<venue>/_source/.
 * The physical contract (footprint, sight) of each piece is in src/game/world/propKit.ts.
 */
import fs from 'node:fs';
import path from 'node:path';
import {PROP_KIT} from '../../src/game/world/propKit';
import type {PropKind} from '../../src/game/levels/StageDefinition';
import {normalizePng} from './normalizePng';
type Row=[id:string,category:'ARCHITECTURE'|'MAJOR'|'SOFT'|'LANDMARK',kind:PropKind];
export const V13_ART:Row[]=[
 ['bank_marble_column','ARCHITECTURE','bankMarbleColumn'],['bank_atm_bank','MAJOR','bankAtmBank'],['bank_waiting_bench','SOFT','bankWaitingBench'],
 ['bank_security_desk','MAJOR','bankSecurityDesk'],['bank_guard_booth','MAJOR','bankGuardBooth'],['bank_cash_pallet','SOFT','bankCashPallet'],
 ['bank_cage_trolley','SOFT','bankCageTrolley'],['bank_counting_machine','SOFT','bankCountingMachine'],['bank_deposit_island','MAJOR','bankDepositIsland'],
 ['bank_brass_screen','ARCHITECTURE','bankBrassScreen'],
 ['lab_server_rack_front','MAJOR','labServerRack'],['lab_sample_fridge_front','MAJOR','labSampleFridge'],['lab_mobile_screen','ARCHITECTURE','labMobileScreen'],
 ['lab_glass_partition_front','ARCHITECTURE','labGlassPartition'],['lab_fume_hood','MAJOR','labFumeHood'],['lab_centrifuge_bench','MAJOR','labCentrifugeBench'],
 ['lab_robot_cell','MAJOR','labRobotCell'],
 // Phase 2C: redraws that replace the old runtime art of existing kinds, and the monitor console (a floor piece; the old wall-mounted lab_monitor is retired).
 ['warehouse_rack','MAJOR','warehouseRack'],['warehouse_container','MAJOR','warehouseContainer'],['warehouse_forklift','MAJOR','warehouseForklift'],['warehouse_crate_stack','MAJOR','warehouseCrateStack'],['warehouse_tarp_cargo','MAJOR','warehouseTarpCargo'],['warehouse_drum_stack','MAJOR','warehouseDrumStack'],['warehouse_liquid_tank','MAJOR','warehouseLiquidTank'],['warehouse_storage_cage','MAJOR','warehouseStorageCage'],['warehouse_pallet_stack','SOFT','warehousePalletStack'],['warehouse_conveyor','ARCHITECTURE','warehouseConveyor'],['warehouse_plank_stack','ARCHITECTURE','warehousePlankStack'],['warehouse_pipe_stack','ARCHITECTURE','warehousePipeStack'],['warehouse_workbench','MAJOR','warehouseWorkbench'],['warehouse_tool_cart','SOFT','warehouseToolCart'],['warehouse_hand_trolley','SOFT','warehouseHandTrolley'],['warehouse_cones','SOFT','warehouseCones'],['warehouse_barrier','SOFT','warehouseBarrier'],['warehouse_fence','ARCHITECTURE','warehouseFence'],['warehouse_control_panel','SOFT','warehouseControlPanel'],
 // Vault kit (front-view sheet of 2026-10-06): art for the generic kinds of the Chapter 9 maps, chosen at draw time.
 ['vault_door','LANDMARK','bankVaultDoor'],['vault_deposit_wall','ARCHITECTURE','partition'],['vault_blast_screen','ARCHITECTURE','partition'],['vault_lockers','ARCHITECTURE','partition'],['vault_cash_table','MAJOR','counter'],['vault_inspection_table','MAJOR','counter'],['vault_cash_desk','MAJOR','counter'],['vault_gold_pallet','MAJOR','equipment'],['vault_cash_cage','MAJOR','equipment'],['vault_case_stack','MAJOR','equipment'],['vault_armored_crate','MAJOR','equipment'],['vault_gold_strapped','MAJOR','equipment'],['vault_black_cases','MAJOR','equipment'],['vault_camera_pillar','SOFT','pillar'],['vault_gold_rack','MAJOR','shelf'],['vault_cash_trolley','SOFT','shelf'],
 ['casino_column','ARCHITECTURE','casinoColumn'],['casino_planter','SOFT','casinoPlanter'],['casino_sofa','MAJOR','casinoSofa'],['casino_card_table','MAJOR','casinoCardTable'],['casino_rope_stanchion','SOFT','casinoRopeStanchion'],
 ['lab_stool','SOFT','labStool'],['lab_cart','SOFT','labCart'],['lab_small_machine','SOFT','labSmallMachine'],['lab_monitor_station','MAJOR','labMonitorStation'],['lab_gas_rack','SOFT','labGasRack'],['lab_specimen_tank_low','MAJOR','labSpecimenTank'],['lab_decon_arch','ARCHITECTURE','labDeconArch'],
 // Mansion and Security HQ: art for the generic and Lab kinds those chapters already place (physics stay those kinds).
 ['mansion_bookshelf','ARCHITECTURE','partition'],['mansion_room_divider','ARCHITECTURE','partition'],['mansion_armor_display','MAJOR','statue'],['mansion_cabinet','MAJOR','statue'],['mansion_dining_table','MAJOR','table'],['mansion_writing_desk','MAJOR','table'],['mansion_sofa','SOFT','sofa'],['mansion_grand_piano','MAJOR','shelf'],['hq_command_console','MAJOR','labObservationConsole'],['hq_security_desk','MAJOR','labMonitorStation'],['hq_server_row','MAJOR','labServerRack'],['hq_video_wall','SOFT','labWallScreen'],['hq_security_locker','ARCHITECTURE','labWall'],['hq_duty_desk','MAJOR','labWorkstation'],['hq_checkpoint','ARCHITECTURE','labObservationRoom'],['hq_wall_sign','SOFT','labWarningSign'],['hq_response_table','MAJOR','labLargeTable'],
];
async function main(){
 const dest='assets/environment/environment-assets.json',catalog=JSON.parse(fs.readFileSync(dest,'utf8'));
 const ids=new Set(V13_ART.map(r=>r[0]));catalog.assets=catalog.assets.filter((a:{id:string})=>!ids.has(a.id));
 for(const [id,category,kind] of V13_ART){
  const chapter=id.split('_')[0] as 'bank'|'lab'|'casino'|'warehouse'|'vault'|'mansion'|'hq',size=category==='SOFT'?384:category==='LANDMARK'?768:512;
  const source=`assets/environment/${chapter}/_source/${id}.png`,file=`assets/environment/${chapter}/${category.toLowerCase()}/${id}.png`;
  if(!fs.existsSync(source))throw Error(`missing source ${source}`);
  if(!fs.existsSync(file)||fs.statSync(source).mtimeMs>fs.statSync(file).mtimeMs)await normalizePng(source,file,size);
  const meta=JSON.parse(fs.readFileSync(file.replace(/\.png$/,'.metadata.json'),'utf8')),b=meta.objectBounds,spec=PROP_KIT[kind];
  catalog.assets.push({id,chapter,category,path:file,image:file,resolution:{width:size,height:size},pivot:{x:.5,y:1,units:'normalized'},
   footprint:spec.footprint,...(spec.collisionParts?{collisionParts:spec.collisionParts}:{}),collision:spec.blocksMovement,losBehavior:spec.blocksVision?'BLOCK':'PASS',
   defaultScale:1,drawWidth:spec.drawWidth,drawHeight:spec.drawWidth*b.h/b.w,status:'READY_FOR_USER_REVIEW',
   source:{kind:'USER_CONTACT_SHEET_CUTOUT',path:source},physicalKind:kind,
   review:{style:'USER_VISUAL_REVIEW_PENDING',native:'SIMULATOR_REVIEW_PENDING',productionApproved:false},objectBounds:b});
 }
 // Furniture that became cover on 2026-10-05 (desks, tables, carts, benches) reports the same sight contract as the kit.
 for(const a of catalog.assets)if(a.physicalKind&&PROP_KIT[a.physicalKind as PropKind]&&['bank','lab','casino','warehouse'].includes(a.chapter)&&a.collision)a.losBehavior=PROP_KIT[a.physicalKind as PropKind].blocksVision?(a.losBehavior==='BREAKER'?'BREAKER':'BLOCK'):'PASS';
 fs.writeFileSync(dest,JSON.stringify(catalog,null,2)+'\n');
 console.log(JSON.stringify({total:catalog.assets.length,added:V13_ART.length}));
}
if(process.argv[1]?.endsWith('addV13Art.ts'))void main();
