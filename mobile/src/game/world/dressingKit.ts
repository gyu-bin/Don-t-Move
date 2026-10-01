/** Museum dressing uses one shared physical/visual contract. Tile units;
 * floor-contact anchor at bottom centre. None of these low exhibits blocks LOS. */
export type DressingKind =
 | 'display_low' | 'display_glass_small' | 'pedestal_small' | 'pedestal_medium'
 | 'rope_barrier' | 'bench_museum' | 'plaque' | 'painting_wall' | 'plant_small'
 | 'sculpture_small' | 'floor_runner' | 'spotlight_small' | 'security_panel'
 | 'archive_label' | 'restoration_tray' | 'utility_cart'
 | 'gallery_plinth_low' | 'gallery_installation_low' | 'gallery_floor_marker';
export interface DressingSpec {
 category:'soft'|'decoration';
 footprint:{w:number;h:number};
 blocksMovement:boolean;
 blocksVision:false;
 /** Suggested rendered width and height including raised body, in tiles. */
 drawWidth:number;drawHeight:number;
 /** Mount above contact anchor in world units. */
 mountHeight:number;
 floorDetail:boolean;
 heightRole:string;
}
const low=(w:number,h:number,drawHeight:number,heightRole:string):DressingSpec=>({category:'soft',footprint:{w,h},blocksMovement:true,blocksVision:false,drawWidth:w,drawHeight,mountHeight:0,floorDetail:false,heightRole});
const decor=(w:number,h:number,mountHeight=0,floorDetail=false):DressingSpec=>({category:'decoration',footprint:{w:0,h:0},blocksMovement:false,blocksVision:false,drawWidth:w,drawHeight:h,mountHeight,floorDetail,heightRole:floorDetail?'flat floor marking':'wall / exhibit surface detail'});
export const DRESSING_KIT:Record<DressingKind,DressingSpec>={
 // Low Gallery exhibits stay below sight height; solid bases are never phantom floors.
 gallery_plinth_low:low(.8,.5,.62,'low modern exhibition plinth'),
 gallery_installation_low:low(.85,.5,.95,'small low installation; sight passes above it'),
 gallery_floor_marker:decor(1.4,.72,0,true),
 display_low:low(.95,.5,.65,'knee-height glazed exhibit'),
 display_glass_small:low(.65,.45,.65,'waist-height transparent case'),
 pedestal_small:low(.4,.4,.62,'low plinth'),
 pedestal_medium:low(.55,.45,.72,'waist-height plinth'),
 rope_barrier:low(.95,.18,.48,'low cord and solid posts'),
 bench_museum:low(1.1,.4,.5,'low visitor bench'),
 sculpture_small:low(.42,.4,.85,'small display bust below standing eye line'),
 utility_cart:low(.7,.45,.65,'low wheeled restoration trolley'),
 plant_small:{...low(.34,.34,.72,'small planter; foliage does not occlude sight'),category:'decoration',drawWidth:.65},
 plaque:decor(.32,.22,12),
 painting_wall:decor(1.15,.78,18),
 floor_runner:decor(1.3,.6,0,true),
 spotlight_small:decor(.18,.24,17),
 security_panel:decor(.8,.48,16),
 archive_label:decor(.38,.16,12),
 restoration_tray:decor(.45,.26,0,true),
};
