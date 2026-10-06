import type {DoorStyle} from '../../src/game/doors/doorTypes';
import type {StageDefinition,PropDef,LightDef} from '../../src/game/levels/StageDefinition';
export type Point={x:number;y:number};
export type RoomRole='public'|'transition'|'restricted'|'objective'|'escape';
export interface V124bRoom {id:string;name:string;role:RoomRole;x:number;y:number;w:number;h:number;purpose?:string;
 /** V13: route node of the zone when its geometric centre holds a structure. Omitted means the centre. */
 hub?:Point;}
export interface V124bEdge {id?:string;from:string;to:string;via?:Point[];width?:number;role:'approach'|'risk'|'quickEscape'|'alternateEscape';door?:{at:Point;orientation:'horizontal'|'vertical';type?:'solid'|'glass';lockdown?:boolean;style?:DoorStyle};}
export interface V124bPlan {visualRevision?:'v12-4c';secureDoorStyle?:DoorStyle;objectiveVisualAssetId?:PropDef['visualAssetId'];objectiveScale?:number;id:string;title:string;family:string;rooms:V124bRoom[];edges:V124bEdge[];entryRoom:string;objectiveRoom:string;exitRoom:string;entry?:Point;objective?:Point;exit?:Point;entryEdge?:'top'|'bottom'|'left'|'right';exitEdge?:'top'|'bottom'|'left'|'right';
 /** Ordered ROOM IDs. Builder computes and verifies physical routes through these cells. */
 approach:string[];risk?:string[];quickEscape:string[];alternateEscape:string[];
 /** Explicit functional structures. Never auto-filled with decorative spam. */
 structures?:PropDef[];islands?:{x:number;y:number;w:number;h:number}[];lights?:LightDef[];
 patrols?:{room:string;points?:Point[];role?:'objective'|'room'|'corridor'|'roaming'|'exit'}[];
 cameras?:{room:string;at?:Point;facing?:number}[];
 highSecurity?:boolean;firstBreak?:Point;
 /** V13: authored objective-guard stops (inspection post first). Omitted keeps the automatic inspection pair. */
 objectiveStops?:Point[];
 /** V13: the rooms tile the whole floor and walls are drawn as islands, so edges add no corridor floor. */
 drawnFloor?:boolean;
 /** V13: number of guards authored for the mission, where it differs from the chapter archetype. */
 guardCount?:number;
}
export interface V124bAudit {id:string;errors:string[];entryExitDistance:number;approachZones:string[];escapeZones:string[];newEscapeZones:string[];overlap:number;physicalOverlap:number;openReachable:boolean;closedReachable:boolean;openEscapeLength:number;closedEscapeLength:number;quickEscapeLength:number;alternateEscapeLength:number;}
export type V124bStage=StageDefinition & {topologyPlan:V124bPlan};
