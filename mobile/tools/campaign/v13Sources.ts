/**
 * Which plans each derived chapter is built from. This table is the wiring, not a description of it: v13Casino.ts
 * and v13Late.ts take their base plans from here and from nowhere else.
 *
 * Chapters 1–4 and 9 have floor plans of their own (v13Museum / v13Gallery / v13Bank / v13Lab / v13Vault).
 * The four derived chapters differ in WHEN they branch off, and that difference is deliberate:
 *
 *  inherits Phase 7   Chapter 5 ← Bank and Chapter 6 ← Gallery take the plans AFTER the Phase 7 layer
 *                     (v13Phase7.ts: LANES, PHASE7, REPLACED). A lane fix on 03-0x / 02-0x reaches its twin.
 *  own patches        Chapter 7 ← Museum and Chapter 8 ← Lab take the FROZEN plans, as they were before Phase 7,
 *                     and carry patches of their own (LATE in v13Phase7.ts, applied after secure()). A fix on
 *                     01-0x / 04-0x does not reach them.
 *
 * `order` is the base plan of each mission of the derived chapter, first to fifth. Chapter 5 swaps the third and
 * fourth Bank plans. Changing a row here changes maps: it is level design, not housekeeping.
 */
import type {V13Mission} from './v13Types';
import {V13_MUSEUM_FROZEN} from './v13Museum';
import {V13_GALLERY} from './v13Gallery';
import {V13_BANK} from './v13Bank';
import {V13_LAB_FROZEN} from './v13Lab';

export type DerivedChapter=5|6|7|8;
export const DERIVED_FROM:Record<DerivedChapter,{chapter:number;plans:V13Mission[];phase7:'inherits Phase 7'|'own patches';order:string[]}>={
 5:{chapter:3,plans:V13_BANK,phase7:'inherits Phase 7',order:['03-01','03-02','03-04','03-03','03-05']},
 6:{chapter:2,plans:V13_GALLERY,phase7:'inherits Phase 7',order:['02-01','02-02','02-03','02-04','02-05']},
 7:{chapter:1,plans:V13_MUSEUM_FROZEN,phase7:'own patches',order:['01-01','01-02','01-03','01-04','01-05']},
 8:{chapter:4,plans:V13_LAB_FROZEN,phase7:'own patches',order:['04-01','04-02','04-03','04-04','04-05']},
};
/** The five base plans of a derived chapter, in mission order. */
export function derivedBases(chapter:DerivedChapter):V13Mission[]{
 const {plans,order}=DERIVED_FROM[chapter];
 return order.map(id=>{const base=plans.find(m=>m.id===id);if(!base)throw Error(`Chapter ${chapter}: base plan ${id} not found`);return base;});
}
/** The base plan a derived mission comes from ('05-03' → '03-04'), or undefined for a chapter with plans of its own. */
export function baseMissionOf(id:string):string|undefined{
 return DERIVED_FROM[Number(id.slice(0,2)) as DerivedChapter]?.order[Number(id.slice(3))-1];
}
