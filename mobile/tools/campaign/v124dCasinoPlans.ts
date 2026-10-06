/** Phase 4D: live 05-05 entry/objective/escape captures showed toy-sized gaming
 * furniture and a second miniature cashier at pickup. Reuse the authored floor
 * graphs, give each furniture role its own scale, and keep a clear room shoulder.
 * These are candidates for live revalidation, not a visual or difficulty PASS.
 */
import {V124B_LATE_PLANS} from './v124bLatePlans';
import type {V124bPlan} from './v124bTypes';
import type {PropDef} from '../../src/game/levels/StageDefinition';

export const V124D_CASINO_PLANS:V124bPlan[]=structuredClone(
 V124B_LATE_PLANS.filter(p=>p.id.startsWith('05-')),
);
// Live 05-02 entry: shorten the empty arrival connector by two tiles while
// retaining the public room, table salon, and separate VIP access branch.
const lounge=V124D_CASINO_PLANS.find(p=>p.id==='05-02')!;
lounge.rooms.find(r=>r.id==='P')!.y=22;
const loungeApproach=lounge.edges.find(e=>e.from==='P'&&e.to==='T'&&e.role==='approach')!;
loungeApproach.via=[{x:4,y:24.5}];

// Positions are local to functional rooms, so historical translated floor graphs
// remain intact. Physical and visual scales agree; no invisible clearance cheats.
type Fixture=[room:string,kind:PropDef['kind'],x:number,y:number,scale:number];
// Chapter 5 has no automatic kind→image fallback (environmentAssetForProp only
// defaults Museum). Every fixture must carry its approved bitmap explicitly.
const fixtureAssets:Partial<Record<PropDef['kind'],NonNullable<PropDef['visualAssetId']>>>={
 casinoSlotBank:'casino_slot_bank',
 casinoRouletteTable:'casino_roulette_table',
 casinoBlackjackTable:'casino_blackjack_table',
 casinoHighRollerTable:'casino_high_roller_table',
 casinoRouletteCenterpiece:'casino_roulette_centerpiece',
 casinoSecurityStation:'casino_security_station',
 casinoCashierCage:'casino_cashier_cage',
 casinoCashierVault:'casino_cashier_vault',
 casinoChipCart:'casino_chip_cart',
 casinoBarCounter:'casino_bar_counter',
 casinoBarIsland:'casino_bar_island',
 casinoDivider:'casino_divider',
};
const furniture:Record<string,Fixture[]>={
 '05-01':[
  ['T','casinoSlotBank',2,1.7,1.12],
  ['T','casinoRouletteTable',1.9,5.25,1.1],
  ['R','casinoSecurityStation',1.6,1.5,1.05],
  ['O','casinoCashierCage',1.7,1.1,1.3],
  ['B','casinoChipCart',1.25,1.4,1.05],
  ['E','casinoBarCounter',3.7,4.5,.85],
  ['X','casinoDivider',1.05,1.25,1],
 ],
 '05-02':[
  ['P','casinoDivider',1.05,1.25,1],
  ['A','casinoBlackjackTable',2.4,1.9,1.05],
  ['T','casinoHighRollerTable',1.8,1.8,1],
  ['R','casinoDivider',4.2,1.25,1.1],
  ['O','casinoCashierVault',1.8,1.2,1],
  ['B','casinoChipCart',1.25,1.4,1.05],
  ['E','casinoBarCounter',3.7,4.5,.85],
  ['X','casinoSecurityStation',1.6,1.4,1.05],
 ],
 '05-03':[
  ['P','casinoSlotBank',2,1.65,1],
  ['T','casinoBarIsland',2.4,2,1.1],
  ['R','casinoSecurityStation',1.6,1.4,1.15],
  ['O','casinoCashierCage',1.7,1.1,1.3],
  ['B','casinoChipCart',1.25,1.4,1.05],
  ['E','casinoBarCounter',1.7,1.4,1.05],
  ['X','casinoDivider',1.05,1.25,1],
 ],
 '05-04':[
  ['P','casinoSlotBank',2,1.65,1],
  // Move left from the wall; preserve a full-body northern room-center lane.
  ['T','casinoRouletteCenterpiece',3.9,5.5,.9],
  ['R','casinoChipCart',1.35,1.5,1.15],
  ['O','casinoCashierVault',1.8,1.2,1],
  ['B','casinoSecurityStation',1.6,1.4,1.1],
  ['E','casinoBarCounter',2.5,1.4,1.15],
  ['X','casinoDivider',1.05,1.25,1],
 ],
 '05-05':[
  // The entry has one full slot bank; the floor has one large gaming table.
  // Remove the two adjacent undersized tables rather than enlarging a collision
  // cluster. The western shoulder remains the approach/escape passage.
  ['P','casinoSlotBank',2,1.65,1],
  ['T','casinoSlotBank',1.85,2.3,1.1],
  ['T','casinoBlackjackTable',3.9,5.8,1.15],
  ['R','casinoSecurityStation',1.7,1.5,1.15],
  ['O','casinoCashierVault',3,1.1,1.1],
  ['B','casinoChipCart',1.3,1.4,1.1],
  ['E','casinoBarCounter',2.5,1.4,1.15],
  ['X','casinoDivider',1.05,1.25,1],
 ],
};

for(const plan of V124D_CASINO_PLANS){
 plan.structures=furniture[plan.id].map(([id,kind,x,y,scale])=>{
  const room=plan.rooms.find(r=>r.id===id)!;
  const visualAssetId=fixtureAssets[kind];
  if(!visualAssetId)throw Error(`${plan.id}: missing approved fixture image for ${kind}`);
  return {kind,visualAssetId,x:room.x+x,y:room.y+y,scale,collisionScale:scale};
 });
 // Existing glass jewel display: the world objective still uses Casino's jewel.
 // One architectural cashier at the back wall, one small readable pickup case.
 plan.secureDoorStyle='casinoVip4d';
 for(const edge of plan.edges)if(edge.door?.lockdown)edge.door.style='casinoSecurity4d';
 plan.objectiveVisualAssetId='museum_diamond_case';
 plan.objectiveScale=1.15;
}
