/** Independent kit review rooms; never part of campaign or progression. */
import type {PropDef,PropKind,StageDefinition} from '../../src/game/levels/StageDefinition';
import type {EnvironmentAssetId} from '../../src/assets/environmentKit';
const p=(x:number,y:number)=>({x,y});
const prop=(kind:PropKind,id:EnvironmentAssetId,x:number,y:number):PropDef=>({kind,visualAssetId:id,x,y});
const base=(theme:'lab'|'casino'):StageDefinition=>({
 id:`${theme}-pilot`,number:0,chapter:theme==='lab'?4:5,title:`${theme==='lab'?'Lab':'Casino'} Environment Pilot`,theme,
 testPurpose:'Independent 26-asset acceptance fixture; not a campaign mission or production lock.',
 layout:Array.from({length:30},(_,y)=>y===0||y===29?'##########################':'#........................#'),
 playerSpawn:{x:4,y:27,facing:-Math.PI/2},objective:{kind:theme==='lab'?'prototype':'vaultGem',x:13,y:4.5},exit:{x:22,y:27,w:1,h:1},
 props:[],lights:[],ambientDarkness:theme==='lab'?.15:.24,
 guards:[
 {id:`${theme}-public`,x:20,y:25,facing:Math.PI,routeId:'public',visionRange:4.8,visionHalfAngle:.6},
 {id:`${theme}-restricted`,x:20,y:9,facing:Math.PI,routeId:'restricted',visionRange:5.2,visionHalfAngle:.6},
 ],
 patrolRoutes:[
 {id:'public',mode:'loop',points:[{...p(20,25),wait:.6,look:Math.PI},{...p(20,21),wait:.6,look:Math.PI},{...p(23,21),wait:.8,look:Math.PI/2},{...p(23,25),wait:.6,look:Math.PI}]},
 {id:'restricted',mode:'loop',points:[{...p(20,9),wait:.7,look:Math.PI},{...p(20,5),wait:.7,look:Math.PI},{...p(23,5),wait:.8,look:Math.PI/2},{...p(23,9),wait:.8,look:Math.PI}]},
 ],
 testRoutes:[
 {name:'main: reception → central research/islands → restricted objective',points:[p(4,27),p(12,27),p(12,4.5),p(13,4.5)]},
 {name:'safe: outer exhibit flank → objective rear',points:[p(4,27),p(2,27),p(2,4.5),p(13,4.5)]},
 {name:'risk: direct open middle floor',points:[p(4,27),p(18,27),p(18,4.5),p(13,4.5)]},
 ],
 escapeRoutes:[{name:'objective → central floor → exit hall',points:[p(13,4.5),p(12,4.5),p(12,27),p(22.5,27)]}],
});
export const LAB_PILOT:StageDefinition={...base('lab'),props:[
 prop('labWall','lab_wall',5,8),prop('labGlassWall','lab_glass_wall',8,20),prop('labSlidingDoor','lab_sliding_door',22,15),prop('labGlassCorridor','lab_glass_corridor',5,16),prop('labSterilePartition','lab_sterile_partition',15,13),
 prop('labExperimentMachine','lab_experiment_machine',8,12),prop('labLargeTable','lab_large_table',15,20),prop('labCryoUnit','lab_cryo_unit',8,7),prop('labEquipmentRack','lab_equipment_rack',22,12),prop('labSampleStorage','lab_sample_storage',5,11),prop('labObservationConsole','lab_observation_console',15,9),
 prop('labWorkstation','lab_workstation',6,24),prop('labCart','lab_cart',8.3,24),prop('labSampleCase','lab_sample_case',6,21),prop('labSmallMachine','lab_small_machine',10,24),prop('labStool','lab_stool',6,25.5),
 prop('labMonitor','lab_monitor',6,23.75),prop('labWarningSign','lab_warning_sign',15,13),prop('labSpecimenContainer','lab_specimen_container',15,19.5),prop('labCable','lab_cable',8.3,25.2),prop('labWallScreen','lab_wall_screen',5,8),prop('labFloorMarker','lab_floor_marker',12,16),
 // Reuse approved equipment as a research cluster; all lanes retain radius18.
 prop('labWorkstation','lab_workstation',9.5,14.2),prop('labCart','lab_cart',8.2,16.7),prop('labMonitor','lab_monitor',9.5,14),prop('labCable','lab_cable',9.7,15.2),prop('labSmallMachine','lab_small_machine',17,18.2),
 prop('labPrototypeMachine','lab_prototype_machine',13,4),prop('labCryoChamber','lab_cryo_chamber',5,4),prop('labCentralExperiment','lab_central_experiment',15,16),prop('labObservationRoom','lab_observation_room',21,18),
 ],lights:[{x:6,y:24,radius:7,kind:'cool',intensity:.5},{x:8,y:12,radius:6,kind:'cool',intensity:.4},{x:13,y:4.5,radius:5,kind:'cyan',intensity:.4}],landmark:{name:'Core Prototype',kind:'labPrototypeMachine',x:13,y:4}};
export const CASINO_PILOT:StageDefinition={...base('casino'),props:[
 prop('casinoWall','casino_wall',5,8),prop('casinoVelvetPartition','casino_velvet_partition',15,13),prop('casinoGoldArch','casino_gold_arch',21,18),prop('casinoVipDoor','casino_vip_door',22,15),prop('casinoBarCounter','casino_bar_counter',15,20),
 prop('casinoSlotBank','casino_slot_bank',8,24),prop('casinoRouletteTable','casino_roulette_table',8,17),prop('casinoBlackjackTable','casino_blackjack_table',15,24),prop('casinoCashierCage','casino_cashier_cage',5,11),prop('casinoBarIsland','casino_bar_island',15,16),prop('casinoSecurityStation','casino_security_station',22,12),
 prop('casinoSlotMachine','casino_slot_machine',5,24),prop('casinoChair','casino_chair',9,18.5),prop('casinoCocktailTable','casino_cocktail_table',4.5,21),prop('casinoDivider','casino_divider',15,11),prop('casinoChipCart','casino_chip_cart',6,14),
 prop('casinoChandelier','casino_chandelier',12,19),prop('casinoWallArt','casino_wall_art',5,8),prop('casinoDrinkTray','casino_drink_tray',15,19.7),prop('casinoNeonSignGeneric','casino_neon_sign_generic',22,15),prop('casinoCarpetPattern','casino_carpet_pattern',12,16),prop('casinoChipStack','casino_chip_stack',15,23.6),
 // Repeated slot rows and seating reinforce islands rather than extra walls.
 prop('casinoSlotBank','casino_slot_bank',8,21),prop('casinoChair','casino_chair',7,9.5),prop('casinoChair','casino_chair',10,9.5),
 prop('casinoRouletteCenterpiece','casino_roulette_centerpiece',8,7.7),prop('casinoHighRollerTable','casino_high_roller_table',15,7.5),prop('casinoCashierVault','casino_cashier_vault',13,3),prop('casinoVipRoom','casino_vip_room',21,3),
 ],lights:[{x:8,y:24,radius:7,kind:'warm',intensity:.55},{x:8,y:17,radius:6,kind:'warm',intensity:.5},{x:15,y:16,radius:5,kind:'warm',intensity:.4},{x:13,y:4.5,radius:5,kind:'cyan',intensity:.35}],landmark:{name:'Cashier Vault',kind:'casinoCashierVault',x:13,y:3}};
export const LAB_CASINO_PILOTS=[LAB_PILOT,CASINO_PILOT];
export const PILOT_CAMERA_MOUNTS={lab:[p(22,15),p(15,13),p(13,3)],casino:[p(5,11),p(22,15),p(21,3)]};
