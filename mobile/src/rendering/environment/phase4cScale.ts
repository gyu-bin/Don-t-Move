import type {EnvironmentAssetId} from '../../assets/environmentKit';

/** World pixels, measured against the approximately 52px standing character.
 * These are role-specific authoring targets, not global scale multipliers.
 * Collision-bearing structures must be enlarged together with their collider. */
export const PHASE4C_SCALE_BUDGETS = {
  SMALL: { minWidth:24, maxWidth:48, role:'Tools and small movable equipment' },
  MEDIUM: { minWidth:70, maxWidth:110, role:'Benches, desks, small exhibits' },
  LARGE: { minWidth:130, maxWidth:210, role:'Sculpture, bench islands, major machinery' },
  ARCHITECTURAL: { minWidth:180, maxWidth:320, role:'Teller counters, central installations, vault surround' },
} as const;

/** Normalized bottom-edge profiles of the reviewed PNGs. Their lowest pixel
 * is at the right-hand foot; placing a circular shadow at that pixel creates a
 * detached blob below the left/central feet. Contacts follow the projected base.
 * Parameters are fractions of actual rendered sprite width, independent of atlas
 * transparent margins and authoring scale. */
export interface GroundContactProfile { span:number; slope:number; inset:number; depth:number; }
export const PHASE4C_CONTACT:Partial<Record<EnvironmentAssetId,GroundContactProfile>> = {
  bank_cash_processing_table:{span:.88,slope:.015,inset:.005,depth:.025},
  bank_teller_counter:{span:.92,slope:.015,inset:.005,depth:.025},
  museum_security_desk:{span:.88,slope:.01,inset:.005,depth:.025},
  lab_large_table:{span:.87,slope:.13,inset:.01,depth:.045},
  lab_workstation:{span:.86,slope:.12,inset:.01,depth:.045},
  lab_observation_console:{span:.87,slope:.10,inset:.01,depth:.04},
  lab_glass_wall:{span:.92,slope:.18,inset:.01,depth:.025},
  lab_glass_corridor:{span:.93,slope:.20,inset:.01,depth:.025},
  lab_sterile_partition:{span:.9,slope:.14,inset:.01,depth:.025},
  lab_wall:{span:.92,slope:.13,inset:.01,depth:.025},
  lab_equipment_rack:{span:.75,slope:.13,inset:.025,depth:.065},
  lab_sample_storage:{span:.78,slope:.12,inset:.025,depth:.065},
  lab_cryo_unit:{span:.75,slope:.12,inset:.02,depth:.07},
  lab_cart:{span:.8,slope:.17,inset:.015,depth:.055},
  lab_sample_case:{span:.85,slope:.015,inset:.015,depth:.045},
  lab_small_machine:{span:.8,slope:.10,inset:.015,depth:.045},
  lab_prototype_machine:{span:.75,slope:.08,inset:.025,depth:.065},
  lab_central_experiment:{span:.76,slope:.05,inset:.035,depth:.06},
  lab_experiment_machine:{span:.76,slope:.07,inset:.025,depth:.06},
  lab_cryo_chamber:{span:.76,slope:.07,inset:.025,depth:.06},
};
