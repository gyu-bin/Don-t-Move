/** Individually authored architecture. [x,y,width,height] in tile units.
 * Internal walls establish loops, dog-legs and room connections; cuts shape the building.
 * These are not random seeds or copies of a single resized room.
 */
export type Box=[number,number,number,number];
export interface Blueprint {size:[number,number];walls:Box[];cuts:Box[];plan:string;}
const b=(w:number,h:number,plan:string,walls:Box[],cuts:Box[]=[]):Blueprint=>({size:[w,h],plan,walls,cuts});
export const BLUEPRINTS:Blueprint[]=[
 // Museum: easy central exhibit, offset aisle, distraction alcoves, split escape, double gallery.
 b(18,17,'Single exhibit loop with a sheltered west approach',[[7,6,3,4]]),
 b(19,17,'Staggered display walls; two cross-aisles',[[6,4,1,7],[11,8,1,5]],[[1,1,3,2]]),
 b(18,19,'Three sculpture pockets around a dog-leg investigation corridor',[[6,5,5,1],[10,9,1,5],[4,12,3,1]]),
 b(20,18,'Split exhibition wing with upper and lower escape bypasses',[[5,5,7,1],[12,5,1,6],[7,10,3,1]],[[1,7,2,4]]),
 b(21,19,'Two offset galleries linked by three narrow observation windows',[[6,4,1,9],[7,8,6,1],[13,11,1,4],[10,4,5,1]]),
 // Gallery: partitions, salon strip, blind-wall lure, closing shutters, private exhibition.
 b(18,18,'Long painting wall and a rear bench bypass',[[6,5,1,8],[10,6,3,1]],[[1,1,2,3]]),
 b(20,17,'Three staggered salons on a long exhibition spine',[[5,4,1,6],[9,7,1,6],[13,4,1,5]]),
 b(19,20,'Blind exhibition wall with a U-shaped return corridor',[[5,6,8,1],[5,6,1,8],[9,11,4,1]],[[1,1,4,2]]),
 b(21,18,'Two cross-partitions with side-door escape windows',[[6,4,1,8],[7,9,6,1],[13,5,1,4],[12,13,4,1]]),
 b(22,20,'Four-room private collection with a diagonal connecting hall',[[6,4,1,10],[7,7,5,1],[12,10,1,6],[13,12,4,1],[15,4,1,4]]),
 // Bank: counters, deposit aisles, office detour, audit loop, strongroom antechambers.
 b(19,18,'Teller counter island with a side-office entrance',[[6,6,5,2],[11,10,1,3]],[[1,1,3,3]]),
 b(20,19,'Parallel deposit lanes joined at opposing ends',[[5,5,1,9],[9,3,1,9],[13,7,1,8]]),
 b(21,18,'L-shaped office block and two counter approaches',[[6,5,6,1],[11,5,1,7],[5,11,3,1]],[[1,7,2,4]]),
 b(20,21,'Audit desks surround a broken square security loop',[[5,6,7,1],[5,6,1,7],[10,12,5,1],[14,8,1,4]]),
 b(23,21,'Three vault antechambers with a service-corridor escape',[[6,4,1,11],[7,7,5,1],[12,7,1,9],[13,12,5,1],[16,4,1,4]]),
 // Lab: central apparatus, asymmetric ring, paired workcells, containment crosses, research compound.
 b(18,20,'Central apparatus loop and isolated observation bay',[[7,6,3,5]],[[1,1,3,3],[13,15,4,4]]),
 b(21,19,'Offset circular-equipment ring with two radial aisles',[[7,5,5,5],[4,11,3,1],[13,11,3,1]]),
 b(20,22,'Paired workcells and a false-signal side passage',[[5,5,5,1],[9,6,1,5],[5,14,6,1],[12,10,1,7]]),
 b(22,20,'Containment cross with four independent exit connections',[[6,5,1,9],[7,9,5,1],[12,4,1,6],[12,13,5,1]],[[1,1,3,4]]),
 b(23,22,'Dual experiment loops linked by a protected equipment spine',[[6,5,4,4],[13,10,4,5],[6,13,1,5],[14,4,1,3],[9,16,3,1]]),
 // Casino: table floor, split pit, service detour, VIP barrier, royal room.
 b(20,18,'Open gaming pit with staggered sight-breaking islands',[[6,5,2,2],[11,9,2,3]],[[1,1,4,2]]),
 b(21,20,'Two gaming pits and an offset cashier crossover',[[6,5,4,1],[10,8,1,6],[5,13,3,1],[14,6,2,2]]),
 b(22,19,'Service alcoves around a long central table corridor',[[5,6,9,1],[5,6,1,6],[10,11,5,1]],[[1,1,2,3]]),
 b(21,22,'VIP rooms around a broken central perimeter',[[6,5,1,10],[7,10,5,1],[12,6,1,5],[12,15,4,1],[15,4,1,3]]),
 b(24,21,'Royal room, cashier loop and two competing escape aisles',[[6,4,1,12],[7,8,6,1],[13,8,1,8],[14,13,5,1],[16,4,1,4]]),
 // Mansion: side-entry salon, long hall, stair alcoves, linked chambers, estate loop.
 b(19,19,'Side entrance into two connected salons',[[6,5,1,8],[7,9,5,1]],[[1,1,3,3]]),
 b(22,18,'Long hall with alternating living-room doors',[[5,4,1,7],[10,7,1,6],[15,4,1,7],[6,11,2,1]]),
 b(20,23,'Stair landing loop and three room-to-room hiding pockets',[[5,5,6,1],[10,6,1,8],[5,13,3,1],[12,16,3,1]],[[1,1,3,4]]),
 b(23,20,'Night-watch chambers linked through a central reception hall',[[6,4,1,11],[7,8,5,1],[12,11,1,5],[13,6,4,1]]),
 b(24,23,'Heirloom suite, long service return and two connected loops',[[6,5,5,1],[6,5,1,10],[11,9,1,8],[15,5,1,7],[12,16,6,1],[16,12,3,1]]),
 // Warehouse: loading island, staggered shelf aisles, wrong aisle lure, inspection cross, shipment compound.
 b(21,19,'Loading bay island and two cargo lanes',[[7,5,3,7],[13,9,2,3]],[[1,1,4,3]]),
 b(22,21,'Three offset storage aisles with alternating end gaps',[[5,5,2,10],[10,3,2,10],[15,8,2,9]]),
 b(23,20,'Forked aisle with a hidden cross-loading passage',[[6,5,10,1],[6,5,1,8],[11,10,1,6],[14,12,4,1]]),
 b(22,23,'Inspection cross and independent perimeter loading lanes',[[6,4,1,13],[7,10,6,1],[13,6,1,5],[13,16,4,1],[16,4,1,3]]),
 b(25,22,'Container compound with a long protected shipping exit',[[6,4,2,12],[11,7,2,11],[16,4,2,10],[18,13,3,1],[8,17,3,1]]),
 // Security HQ: control island, server ring, camera blind corridor, restricted wing, Black Site structure.
 b(20,20,'Control desk loop and blind monitor-wall approach',[[7,6,5,3],[5,12,3,1]],[[1,1,3,4]]),
 b(23,19,'Two server islands with a surveillance crossover',[[6,5,3,7],[13,7,3,6],[10,4,3,1]]),
 b(22,22,'Blind-feed S corridor with two technician bypasses',[[5,5,9,1],[13,5,1,8],[6,12,7,1],[6,12,1,5]]),
 b(24,20,'Restricted rooms and a parallel security-return corridor',[[6,4,1,11],[7,8,6,1],[13,8,1,8],[16,4,1,6],[17,12,3,1]]),
 b(25,23,'Black Site archive: asymmetric rooms, security dog-leg and outer bypass',[[6,5,6,1],[6,5,1,11],[12,9,1,10],[16,4,1,8],[17,11,4,1],[8,16,4,1]],[[1,1,3,3],[19,17,5,5]]),
 // Vault: outer seal, inner chambers, decoy corridor, lockdown bypass, final security compound.
 b(21,21,'Outer seal loop around a heavy vault island',[[7,6,6,5],[5,13,3,1]],[[1,1,3,3]]),
 b(24,21,'Inner chambers joined by opposing security doorways',[[6,4,1,12],[7,8,6,1],[13,11,1,6],[16,4,1,7]]),
 b(23,24,'Decoy security corridor and a hidden side-room loop',[[5,6,10,1],[14,6,1,10],[6,12,6,1],[6,12,1,7],[10,18,4,1]]),
 b(25,22,'Lockdown cross with two independent protected escape lanes',[[6,4,1,13],[7,10,7,1],[14,5,1,6],[14,15,6,1],[18,4,1,6]]),
 b(26,24,'Master vault compound with two antechambers, outer loop and rear escape',[[6,5,1,14],[7,9,6,1],[13,6,1,12],[17,4,1,9],[14,17,7,1],[18,12,4,1]],[[1,1,3,3]]),
];
