/** Authoring review contract only; never read by the frame worklet or UI. */
export type V3Point={x:number;y:number};
export type ZonePurpose='approach'|'timing'|'observation'|'safe-risk-choice'|'narrow-stealth'|'lure'|'junction'|'security-check'|'objective'|'chase-break'|'escape'|'lockdown'|'service-route';
export type MeaningfulFeature='security-pressure'|'route-choice'|'LOS-challenge'|'cover-interaction'|'landmark'|'objective'|'meaningful-traversal';
export interface V3Zone {
 id:string;name:string;purpose:ZonePurpose[];
 bounds:{x:number;y:number;w:number;h:number};
 features:MeaningfulFeature[];
 guardIds:string[];cameraIds:string[];
 /** A reason is required; a boolean cannot establish deliberate safety. */
 intentionalSafeReason?:string;
 /** Local arrival/refuge pocket; does not exempt the rest of a room or promise permanent safety. */
 intentionalSafeBounds?:{x:number;y:number;w:number;h:number};
 cells?:{name:string;purpose:ZonePurpose;point:V3Point}[];
}
export interface V3MissionDesign {
 id:string;missionFantasy:string;architecture:string;
 topology:{entrySide:string;objectiveRegion:string;exitSide:string;routeShape:string;escapeDirection:string};
 entry:V3Point;objective:V3Point;exit:V3Point;
 zones:V3Zone[];
 landmark:{name:string;point:V3Point;relation:'objective'|'route-decision'|'checkpoint'|'climax'|'escape-transition';reason:string};
 coverChain:{name:string;point:V3Point;reason:string}[];
 guardRoles:{id:string;role:string;zones:string[]}[];
 cctv:{id:string;mountContext:string;counterplay:string}[];
 searchSectors:{guardId:string;zones:string[]}[];
 /** Explicit local decisions, not a number of decorations. */
 structureReasons:{kind:string;point:V3Point;reason:string}[];
 changes:string[];
 /** Empty means preserved after audit; each failure carries before/after evidence in QA. */
 baselineFailures:string[];
}
export const V3_AUTHORING_ORDER=['missionFantasy','architecture','entryObjectiveExit','zonePurpose','routeTopology','landmark','securityCoverage','hideLOSBreak','gameplayStructures','softStructures','lighting','decoration'] as const;
