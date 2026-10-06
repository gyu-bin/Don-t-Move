import type {PropKind,StageDefinition} from '../game/levels/StageDefinition';

/** Production bitmaps only. Metro requires every path to be a static literal. */
export const ENVIRONMENT_IMAGE_SOURCES = {
 museum_column:require('../../assets/environment/museum/architecture/museum_column.png'),
 museum_partition:require('../../assets/environment/museum/architecture/museum_partition.png'),
 museum_display_case_large:require('../../assets/environment/museum/major/museum_display_case_large.png'),
 museum_statue_large:require('../../assets/environment/museum/major/museum_statue_large.png'),
 museum_security_desk:require('../../assets/environment/museum/major/museum_security_desk.png'),
 museum_display_low:require('../../assets/environment/museum/soft/museum_display_low.png'),
 museum_pedestal:require('../../assets/environment/museum/soft/museum_pedestal.png'),
 museum_painting:require('../../assets/environment/museum/decoration/museum_painting.png'),
 museum_rope_barrier:require('../../assets/environment/museum/decoration/museum_rope_barrier.png'),
 museum_diamond_case:require('../../assets/environment/museum/landmark/museum_diamond_case.png'),
 gallery_white_wall:require('../../assets/environment/gallery/architecture/gallery_white_wall.png'),
 gallery_movable_art_wall:require('../../assets/environment/gallery/architecture/gallery_movable_art_wall.png'),
 gallery_sculpture_large:require('../../assets/environment/gallery/major/gallery_sculpture_large.png'),
 gallery_installation_art:require('../../assets/environment/gallery/major/gallery_installation_art.png'),
 gallery_central_plinth:require('../../assets/environment/gallery/major/gallery_central_plinth.png'),
 gallery_low_pedestal:require('../../assets/environment/gallery/soft/gallery_low_pedestal.png'),
 gallery_modern_bench:require('../../assets/environment/gallery/soft/gallery_modern_bench.png'),
 gallery_abstract_frame:require('../../assets/environment/gallery/decoration/gallery_abstract_frame.png'),
 gallery_portrait_frame_a:require('../../assets/environment/gallery/decoration/gallery_portrait_frame_a.png'),
 gallery_portrait_frame_b:require('../../assets/environment/gallery/decoration/gallery_portrait_frame_b.png'),
 gallery_portrait_frame_c:require('../../assets/environment/gallery/decoration/gallery_portrait_frame_c.png'),
 gallery_portrait_frame_d:require('../../assets/environment/gallery/decoration/gallery_portrait_frame_d.png'),
 gallery_portrait_frame_e:require('../../assets/environment/gallery/decoration/gallery_portrait_frame_e.png'),
 gallery_portrait_frame_f:require('../../assets/environment/gallery/decoration/gallery_portrait_frame_f.png'),
 gallery_abstract_frame_b:require('../../assets/environment/gallery/decoration/gallery_abstract_frame_b.png'),
 gallery_abstract_frame_c:require('../../assets/environment/gallery/decoration/gallery_abstract_frame_c.png'),
 gallery_abstract_frame_d:require('../../assets/environment/gallery/decoration/gallery_abstract_frame_d.png'),
 gallery_abstract_frame_e:require('../../assets/environment/gallery/decoration/gallery_abstract_frame_e.png'),
 gallery_track_light:require('../../assets/environment/gallery/decoration/gallery_track_light.png'),
 gallery_masterpiece_wall:require('../../assets/environment/gallery/landmark/gallery_masterpiece_wall.png'),
 bank_wall:require('../../assets/environment/bank/architecture/bank_wall.png'),
 bank_staff_door:require('../../assets/environment/bank/architecture/bank_staff_door.png'),
 bank_security_gate:require('../../assets/environment/bank/architecture/bank_security_gate.png'),
 bank_vault_corridor_wall:require('../../assets/environment/bank/architecture/bank_vault_corridor_wall.png'),
 bank_teller_counter:require('../../assets/environment/bank/major/bank_teller_counter.png'),
 bank_security_checkpoint:require('../../assets/environment/bank/major/bank_security_checkpoint.png'),
 bank_deposit_box_wall:require('../../assets/environment/bank/major/bank_deposit_box_wall.png'),
 bank_cash_processing_table:require('../../assets/environment/bank/major/bank_cash_processing_table.png'),
 bank_vault_door:require('../../assets/environment/bank/major/bank_vault_door.png'),
 bank_office_desk:require('../../assets/environment/bank/soft/bank_office_desk.png'),
 bank_filing_cabinet:require('../../assets/environment/bank/soft/bank_filing_cabinet.png'),
 bank_cash_cart:require('../../assets/environment/bank/soft/bank_cash_cart.png'),
 bank_queue_barrier:require('../../assets/environment/bank/soft/bank_queue_barrier.png'),
 bank_small_safe:require('../../assets/environment/bank/soft/bank_small_safe.png'),
 bank_monitor:require('../../assets/environment/bank/decoration/bank_monitor.png'),
 bank_clock:require('../../assets/environment/bank/decoration/bank_clock.png'),
 bank_paperwork:require('../../assets/environment/bank/decoration/bank_paperwork.png'),
 bank_floor_marker:require('../../assets/environment/bank/decoration/bank_floor_marker.png'),
 bank_plant:require('../../assets/environment/bank/decoration/bank_plant.png'),
 bank_main_vault:require('../../assets/environment/bank/landmark/bank_main_vault.png'),
 bank_marble_column:require('../../assets/environment/bank/architecture/bank_marble_column.png'),
 bank_atm_bank:require('../../assets/environment/bank/major/bank_atm_bank.png'),
 bank_waiting_bench:require('../../assets/environment/bank/soft/bank_waiting_bench.png'),
 bank_security_desk:require('../../assets/environment/bank/major/bank_security_desk.png'),
 bank_guard_booth:require('../../assets/environment/bank/major/bank_guard_booth.png'),
 bank_cash_pallet:require('../../assets/environment/bank/soft/bank_cash_pallet.png'),
 bank_cage_trolley:require('../../assets/environment/bank/soft/bank_cage_trolley.png'),
 bank_counting_machine:require('../../assets/environment/bank/soft/bank_counting_machine.png'),
 bank_deposit_island:require('../../assets/environment/bank/major/bank_deposit_island.png'),
 bank_brass_screen:require('../../assets/environment/bank/architecture/bank_brass_screen.png'),
 lab_server_rack_front:require('../../assets/environment/lab/major/lab_server_rack_front.png'),
 lab_sample_fridge_front:require('../../assets/environment/lab/major/lab_sample_fridge_front.png'),
 lab_mobile_screen:require('../../assets/environment/lab/architecture/lab_mobile_screen.png'),
 lab_glass_partition_front:require('../../assets/environment/lab/architecture/lab_glass_partition_front.png'),
 lab_fume_hood:require('../../assets/environment/lab/major/lab_fume_hood.png'),
 lab_centrifuge_bench:require('../../assets/environment/lab/major/lab_centrifuge_bench.png'),
 lab_robot_cell:require('../../assets/environment/lab/major/lab_robot_cell.png'),
 lab_monitor_station:require('../../assets/environment/lab/major/lab_monitor_station.png'),
 lab_gas_rack:require('../../assets/environment/lab/soft/lab_gas_rack.png'),
 lab_specimen_tank_low:require('../../assets/environment/lab/major/lab_specimen_tank_low.png'),
 lab_decon_arch:require('../../assets/environment/lab/architecture/lab_decon_arch.png'),
 lab_wall:require('../../assets/environment/lab/architecture/lab_wall.png'),
 lab_glass_wall:require('../../assets/environment/lab/architecture/lab_glass_wall.png'),
 lab_sliding_door:require('../../assets/environment/lab/architecture/lab_sliding_door.png'),
 lab_glass_corridor:require('../../assets/environment/lab/architecture/lab_glass_corridor.png'),
 lab_sterile_partition:require('../../assets/environment/lab/architecture/lab_sterile_partition.png'),
 lab_experiment_machine:require('../../assets/environment/lab/major/lab_experiment_machine.png'),
 lab_large_table:require('../../assets/environment/lab/major/lab_large_table.png'),
 lab_cryo_unit:require('../../assets/environment/lab/major/lab_cryo_unit.png'),
 lab_equipment_rack:require('../../assets/environment/lab/major/lab_equipment_rack.png'),
 lab_sample_storage:require('../../assets/environment/lab/major/lab_sample_storage.png'),
 lab_observation_console:require('../../assets/environment/lab/major/lab_observation_console.png'),
 lab_workstation:require('../../assets/environment/lab/soft/lab_workstation.png'),
 lab_cart:require('../../assets/environment/lab/soft/lab_cart.png'),
 lab_sample_case:require('../../assets/environment/lab/soft/lab_sample_case.png'),
 lab_small_machine:require('../../assets/environment/lab/soft/lab_small_machine.png'),
 lab_stool:require('../../assets/environment/lab/soft/lab_stool.png'),
 lab_monitor:require('../../assets/environment/lab/decoration/lab_monitor.png'),
 lab_warning_sign:require('../../assets/environment/lab/decoration/lab_warning_sign.png'),
 lab_specimen_container:require('../../assets/environment/lab/decoration/lab_specimen_container.png'),
 lab_cable:require('../../assets/environment/lab/decoration/lab_cable.png'),
 lab_wall_screen:require('../../assets/environment/lab/decoration/lab_wall_screen.png'),
 lab_floor_marker:require('../../assets/environment/lab/decoration/lab_floor_marker.png'),
 lab_prototype_machine:require('../../assets/environment/lab/landmark/lab_prototype_machine.png'),
 lab_cryo_chamber:require('../../assets/environment/lab/landmark/lab_cryo_chamber.png'),
 lab_central_experiment:require('../../assets/environment/lab/landmark/lab_central_experiment.png'),
 lab_observation_room:require('../../assets/environment/lab/landmark/lab_observation_room.png'),
 casino_wall:require('../../assets/environment/casino/architecture/casino_wall.png'),
 casino_velvet_partition:require('../../assets/environment/casino/architecture/casino_velvet_partition.png'),
 casino_gold_arch:require('../../assets/environment/casino/architecture/casino_gold_arch.png'),
 casino_vip_door:require('../../assets/environment/casino/architecture/casino_vip_door.png'),
 casino_bar_counter:require('../../assets/environment/casino/architecture/casino_bar_counter.png'),
 casino_slot_bank:require('../../assets/environment/casino/major/casino_slot_bank.png'),
 casino_roulette_table:require('../../assets/environment/casino/major/casino_roulette_table.png'),
 casino_blackjack_table:require('../../assets/environment/casino/major/casino_blackjack_table.png'),
 casino_cashier_cage:require('../../assets/environment/casino/major/casino_cashier_cage.png'),
 casino_bar_island:require('../../assets/environment/casino/major/casino_bar_island.png'),
 casino_security_station:require('../../assets/environment/casino/major/casino_security_station.png'),
 casino_slot_machine:require('../../assets/environment/casino/soft/casino_slot_machine.png'),
 casino_chair:require('../../assets/environment/casino/soft/casino_chair.png'),
 casino_cocktail_table:require('../../assets/environment/casino/soft/casino_cocktail_table.png'),
 casino_divider:require('../../assets/environment/casino/soft/casino_divider.png'),
 casino_chip_cart:require('../../assets/environment/casino/soft/casino_chip_cart.png'),
 casino_chandelier:require('../../assets/environment/casino/decoration/casino_chandelier.png'),
 casino_wall_art:require('../../assets/environment/casino/decoration/casino_wall_art.png'),
 casino_drink_tray:require('../../assets/environment/casino/decoration/casino_drink_tray.png'),
 casino_neon_sign_generic:require('../../assets/environment/casino/decoration/casino_neon_sign_generic.png'),
 casino_carpet_pattern:require('../../assets/environment/casino/decoration/casino_carpet_pattern.png'),
 casino_chip_stack:require('../../assets/environment/casino/decoration/casino_chip_stack.png'),
 casino_roulette_centerpiece:require('../../assets/environment/casino/landmark/casino_roulette_centerpiece.png'),
 casino_high_roller_table:require('../../assets/environment/casino/landmark/casino_high_roller_table.png'),
 casino_cashier_vault:require('../../assets/environment/casino/landmark/casino_cashier_vault.png'),
 casino_vip_room:require('../../assets/environment/casino/landmark/casino_vip_room.png'),
 warehouse_rack:require('../../assets/environment/warehouse/major/warehouse_rack.png'),
 warehouse_container:require('../../assets/environment/warehouse/major/warehouse_container.png'),
 warehouse_forklift:require('../../assets/environment/warehouse/major/warehouse_forklift.png'),
 warehouse_crate_stack:require('../../assets/environment/warehouse/major/warehouse_crate_stack.png'),
 warehouse_tarp_cargo:require('../../assets/environment/warehouse/major/warehouse_tarp_cargo.png'),
 warehouse_drum_stack:require('../../assets/environment/warehouse/major/warehouse_drum_stack.png'),
 warehouse_liquid_tank:require('../../assets/environment/warehouse/major/warehouse_liquid_tank.png'),
 warehouse_storage_cage:require('../../assets/environment/warehouse/major/warehouse_storage_cage.png'),
 warehouse_pallet_stack:require('../../assets/environment/warehouse/soft/warehouse_pallet_stack.png'),
 warehouse_conveyor:require('../../assets/environment/warehouse/architecture/warehouse_conveyor.png'),
 warehouse_plank_stack:require('../../assets/environment/warehouse/architecture/warehouse_plank_stack.png'),
 warehouse_pipe_stack:require('../../assets/environment/warehouse/architecture/warehouse_pipe_stack.png'),
 warehouse_workbench:require('../../assets/environment/warehouse/major/warehouse_workbench.png'),
 warehouse_tool_cart:require('../../assets/environment/warehouse/soft/warehouse_tool_cart.png'),
 warehouse_hand_trolley:require('../../assets/environment/warehouse/soft/warehouse_hand_trolley.png'),
 warehouse_cones:require('../../assets/environment/warehouse/soft/warehouse_cones.png'),
 warehouse_barrier:require('../../assets/environment/warehouse/soft/warehouse_barrier.png'),
 warehouse_fence:require('../../assets/environment/warehouse/architecture/warehouse_fence.png'),
 warehouse_control_panel:require('../../assets/environment/warehouse/soft/warehouse_control_panel.png'),
 vault_door:require('../../assets/environment/vault/landmark/vault_door.png'),
 vault_deposit_wall:require('../../assets/environment/vault/architecture/vault_deposit_wall.png'),
 vault_blast_screen:require('../../assets/environment/vault/architecture/vault_blast_screen.png'),
 vault_lockers:require('../../assets/environment/vault/architecture/vault_lockers.png'),
 vault_cash_table:require('../../assets/environment/vault/major/vault_cash_table.png'),
 vault_inspection_table:require('../../assets/environment/vault/major/vault_inspection_table.png'),
 vault_cash_desk:require('../../assets/environment/vault/major/vault_cash_desk.png'),
 vault_gold_pallet:require('../../assets/environment/vault/major/vault_gold_pallet.png'),
 vault_cash_cage:require('../../assets/environment/vault/major/vault_cash_cage.png'),
 vault_case_stack:require('../../assets/environment/vault/major/vault_case_stack.png'),
 vault_armored_crate:require('../../assets/environment/vault/major/vault_armored_crate.png'),
 vault_gold_strapped:require('../../assets/environment/vault/major/vault_gold_strapped.png'),
 vault_black_cases:require('../../assets/environment/vault/major/vault_black_cases.png'),
 vault_camera_pillar:require('../../assets/environment/vault/soft/vault_camera_pillar.png'),
 vault_gold_rack:require('../../assets/environment/vault/major/vault_gold_rack.png'),
 vault_cash_trolley:require('../../assets/environment/vault/soft/vault_cash_trolley.png'),
 mansion_bookshelf:require('../../assets/environment/mansion/architecture/mansion_bookshelf.png'),
 mansion_room_divider:require('../../assets/environment/mansion/architecture/mansion_room_divider.png'),
 mansion_armor_display:require('../../assets/environment/mansion/major/mansion_armor_display.png'),
 mansion_cabinet:require('../../assets/environment/mansion/major/mansion_cabinet.png'),
 mansion_dining_table:require('../../assets/environment/mansion/major/mansion_dining_table.png'),
 mansion_writing_desk:require('../../assets/environment/mansion/major/mansion_writing_desk.png'),
 mansion_sofa:require('../../assets/environment/mansion/soft/mansion_sofa.png'),
 mansion_grand_piano:require('../../assets/environment/mansion/major/mansion_grand_piano.png'),
 hq_command_console:require('../../assets/environment/hq/major/hq_command_console.png'),
 hq_security_desk:require('../../assets/environment/hq/major/hq_security_desk.png'),
 hq_server_row:require('../../assets/environment/hq/major/hq_server_row.png'),
 hq_video_wall:require('../../assets/environment/hq/soft/hq_video_wall.png'),
 hq_security_locker:require('../../assets/environment/hq/architecture/hq_security_locker.png'),
 hq_duty_desk:require('../../assets/environment/hq/major/hq_duty_desk.png'),
 hq_checkpoint:require('../../assets/environment/hq/architecture/hq_checkpoint.png'),
 hq_wall_sign:require('../../assets/environment/hq/soft/hq_wall_sign.png'),
 hq_response_table:require('../../assets/environment/hq/major/hq_response_table.png'),
 casino_column:require('../../assets/environment/casino/architecture/casino_column.png'),
 casino_planter:require('../../assets/environment/casino/soft/casino_planter.png'),
 casino_sofa:require('../../assets/environment/casino/major/casino_sofa.png'),
 casino_card_table:require('../../assets/environment/casino/major/casino_card_table.png'),
 casino_rope_stanchion:require('../../assets/environment/casino/soft/casino_rope_stanchion.png'),
} as const;
export type EnvironmentAssetId=keyof typeof ENVIRONMENT_IMAGE_SOURCES;
export interface EnvironmentAssetSpec {
 id:EnvironmentAssetId;
 chapter:'museum'|'gallery'|'bank'|'lab'|'casino'|'warehouse'|'vault'|'mansion'|'hq';
 category:'ARCHITECTURE'|'MAJOR'|'SOFT'|'DECORATION'|'LANDMARK';
 path:string;
 resolution:{width:number;height:number};
 /** Tight object rectangle, excluding the transparent canvas margin. */
 objectBounds?:{x:number;y:number;w:number;h:number};
 /** Ground anchor normalized within objectBounds (or the full image if absent). */
 pivot:{x:number;y:number;units:'normalized'};
 footprint:{w:number;h:number};
 /** Explicit solid parts for open lanes; relative to the floor pivot in tiles. */
 collisionParts?:{x:number;y:number;w:number;h:number}[];
 physicalKind?:PropKind;
 collision:boolean;
 losBehavior:'BLOCK'|'BREAKER'|'PASS';
 defaultScale:number;
 drawWidth:number;
 drawHeight:number;
 status:string;
}
/** Artwork selection never changes physical kind, collider size or LOS role. */
const MUSEUM_REPLACEMENTS:Partial<Record<PropKind,EnvironmentAssetId>>={
 pillar:'museum_column',partition:'museum_partition',displayCase:'museum_display_case_large',
 statue:'museum_statue_large',counter:'museum_security_desk',table:'museum_display_low',
 statuePedestal:'museum_pedestal',diamondPedestal:'museum_pedestal',painting:'museum_painting',
 objectiveCase:'museum_diamond_case',
};
/** Chapter 9 Vault has no floor plans of its own yet: its maps place generic kinds, and the vault kit is chosen
 *  for them here, several pieces per kind picked by position so a room does not repeat one piece. */
const VAULT_REPLACEMENTS:Partial<Record<PropKind,EnvironmentAssetId[]>>={
 counter:['vault_cash_table','vault_inspection_table','vault_cash_desk'],
 partition:['vault_blast_screen','vault_deposit_wall','vault_lockers'],
 equipment:['vault_gold_pallet','vault_cash_cage','vault_case_stack','vault_armored_crate','vault_gold_strapped','vault_black_cases'],
 pillar:['vault_camera_pillar'],shelf:['vault_gold_rack','vault_cash_trolley'],
};
export function environmentAssetForProp(stage:StageDefinition,prop:{kind:PropKind;visualAssetId?:EnvironmentAssetId;x?:number;y?:number}):EnvironmentAssetId|undefined {
 if(stage.chapter===9){
  if(prop.visualAssetId==='bank_vault_door')return 'vault_door';
  const options=prop.visualAssetId?undefined:VAULT_REPLACEMENTS[prop.kind];
  if(options)return options[Math.abs(Math.round((prop.x??0)/20)*3+Math.round((prop.y??0)/20)*5)%options.length];
 }
 if(prop.visualAssetId)return prop.visualAssetId;
 return stage.chapter===1?MUSEUM_REPLACEMENTS[prop.kind]:undefined;
}

// Produced alongside the chapter PNG files; metadata remains independent of gameplay.
export const ENVIRONMENT_ASSETS:EnvironmentAssetSpec[] = (require('../../assets/environment/environment-assets.json') as {assets:EnvironmentAssetSpec[]}).assets;

/** Offline renderers use the same catalog as production, with their own decoder. */
export function decodeEnvironmentImages<T>(decode:(path:string)=>T):Partial<Record<EnvironmentAssetId,T>> {
 return Object.fromEntries(ENVIRONMENT_ASSETS.map(asset=>[asset.id,decode(asset.path)]));
}
