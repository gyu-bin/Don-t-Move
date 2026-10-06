/**
 * V13 Phase 1 — architecture-first authoring for Chapter 1–2.
 *
 * A mission is drawn as one ASCII floor plan. Every floor cell carries the letter of its zone, `#` is wall,
 * a space is outside the building. Zones are rectangles (the bounding box of their letter); walls drawn
 * inside a zone stay walls. Structures, guards and cameras are authored afterwards, in that order.
 */
import type {PropDef} from '../../src/game/levels/StageDefinition';
import type {Point,RoomRole,V124bEdge} from './v124bTypes';

/** Why a structure is in the map. Decoration is the only role that never affects play. */
export type StructureRole='hiding'|'losBreak'|'sightline'|'divider'|'observation'|'threshold'|'decor';
export interface V13Structure {
 name:string;roles:StructureRole[];kind:PropDef['kind'];asset?:PropDef['visualAssetId'];
 /** Centre of the collision footprint, tile units. Wall-mounted art uses its wall-face base instead. */
 x:number;y:number;scale:number;flip?:boolean;
}
export interface V13Stop extends Point {
 /** What the guard faces while standing here. */
 look:Point;
 /** Seconds standing at this stop (default 1.5). */
 wait?:number;
}
export type V13GuardRole='lobby'|'crossing'|'restricted'|'objective'|'escape';
export interface V13Guard {
 role:V13GuardRole;zone:string;
 /** One sentence: what this guard is there to watch. */
 watches:string;
 /** First stop is the starting post. Objective guard: first stop is the inspection post at the prize. */
 stops:V13Stop[];
 /** Walk the stops as a closed circuit instead of there-and-back. */
 loop?:boolean;
 startDelay?:number;
}
export interface V13Camera {zone:string;at:Point;facing:number;watches:string;}
export interface V13Zone {id:string;name:string;role:RoomRole;purpose:string;
 /** Route node of the zone. Defaults to the clear point nearest the zone centre. */
 hub?:Point;}
export interface V13Mission {
 id:string;title:string;family:string;
 /** Route shape the architecture is built around (L, branching, S, U, loop, …). */
 topology:string;
 map:string[];zones:Record<string,V13Zone>;
 entry:Point;objective:Point;exit:Point;
 entryEdge:'top'|'bottom'|'left'|'right';exitEdge:'top'|'bottom'|'left'|'right';
 /** Expected building thirds for entry / objective / exit, e.g. ['bottom-left','top-right','top-centre']. */
 placement:[string,string,string];
 edges:V124bEdge[];
 approach:string[];risk:string[];quickEscape:string[];alternateEscape:string[];
 /** Cover graph: structure names in the order the thief uses them. */
 cover:{safe:string[];risk:string[];escape:string[]};
 structures:V13Structure[];
 /** Drawn wall masses (piers, cores, stubs) that work as cover or dividers; named so the cover graph can use them. */
 walls:{name:string;roles:StructureRole[];at:string}[];
 guards:V13Guard[];cameras:V13Camera[];
 objectiveScale?:number;
 /** Art for the prize stand and the style of the secure door, where the venue default is not wanted. */
 objectiveAsset?:PropDef['visualAssetId'];secureDoorStyle?:import('../../src/game/doors/doorTypes').DoorStyle;
 /** Alarm follows the pickup at once, without a guard seeing the empty stand. Omitted keeps the source mission's setting. */
 highSecurity?:boolean;
}
