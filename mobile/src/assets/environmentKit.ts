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
} as const;
export type EnvironmentAssetId=keyof typeof ENVIRONMENT_IMAGE_SOURCES;
export interface EnvironmentAssetSpec {
 id:EnvironmentAssetId;
 chapter:'museum'|'gallery'|'bank'|'lab'|'casino';
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
export function environmentAssetForProp(stage:StageDefinition,prop:{kind:PropKind;visualAssetId?:EnvironmentAssetId}):EnvironmentAssetId|undefined {
 if(prop.visualAssetId)return prop.visualAssetId;
 return stage.chapter===1?MUSEUM_REPLACEMENTS[prop.kind]:undefined;
}

// Produced alongside the chapter PNG files; metadata remains independent of gameplay.
export const ENVIRONMENT_ASSETS:EnvironmentAssetSpec[] = (require('../../assets/environment/environment-assets.json') as {assets:EnvironmentAssetSpec[]}).assets;

/** Offline renderers use the same catalog as production, with their own decoder. */
export function decodeEnvironmentImages<T>(decode:(path:string)=>T):Partial<Record<EnvironmentAssetId,T>> {
 return Object.fromEntries(ENVIRONMENT_ASSETS.map(asset=>[asset.id,decode(asset.path)]));
}
