import {chapterMissionIndices,missionId,missionIndex} from '../../game/levels/campaignCatalog';
import {MISSION_BRIEFS} from '../../game/levels/missionBriefs';
import {canPlayMission} from '../../game/progress/campaignProgress';
import type {CampaignProgress,MissionRecord} from '../../game/progress/campaignProgress';

/** Visual state follows RELEASE progression; `playable` additionally honours the dev/test unlock. */
export type RouteState='cleared'|'current'|'available'|'locked';
export interface RouteMission {
 index:number;id:string;order:number;state:RouteState;
 /** Tap starts the mission (release rules, or dev/test unlock). */
 playable:boolean;
 /** Shown locked, but the dev/test build lets it start anyway. */
 devUnlocked:boolean;
 record?:MissionRecord;guards:number;objectives:number;
}
export interface ChapterRoute {missions:RouteMission[];cleared:number;total:number;ratio:number;current:number|null}

export function chapterRoute(campaign:CampaignProgress,chapter:number,devUnlock:boolean):ChapterRoute {
 const indices=chapterMissionIndices(chapter);
 const cleared=(i:number)=>campaign.records[missionId(i)]?.cleared===true;
 const released=(i:number)=>canPlayMission(campaign,i,false);
 const open=indices.filter(i=>released(i)&&!cleared(i));
 const last=missionIndex(campaign.lastMission);
 // Same mission HOME "Continue" resumes when it belongs here; otherwise the first open one.
 const current=open.includes(last)?last:open[0]??null;
 const missions=indices.map((index,order):RouteMission=>{
  const id=missionId(index),brief=MISSION_BRIEFS[id];
  const state:RouteState=cleared(index)?'cleared':index===current?'current':released(index)?'available':'locked';
  const playable=canPlayMission(campaign,index,devUnlock);
  return {index,id,order,state,playable,devUnlocked:state==='locked'&&playable,record:campaign.records[id],
   guards:brief?.guards??0,objectives:brief?.objectives??0};
 });
 const done=missions.filter(m=>m.state==='cleared').length;
 return {missions,cleared:done,total:missions.length,ratio:missions.length?done/missions.length:0,current};
}

// ── Venue artwork crops ───────────────────────────────────────────────────────────────
// Each chapter has one 384×576 venue painting (assets/branding/stages). The hero shows a wide
// band of it; each mission thumbnail frames a different area of the same venue, moving from the
// entrance toward the objective, so cards within a chapter read as different rooms.
export const VENUE_ART={w:384,h:576} as const;
/** Hero band centre (source px) per chapter; framed right of the venue's foreground pillar. */
export const CHAPTER_HERO:readonly (readonly [x:number,y:number])[]=[[240,270],[250,250],[240,235],[250,210],[250,235],[240,215],[240,260],[250,210],[240,280]];
export const HERO_ZOOM=1.3;
type Focus=readonly [x:number,y:number,zoom?:number];
/** Thumbnail focus (source px) per chapter, in route order. */
export const MISSION_FOCUS:readonly (readonly Focus[])[]=[
 [[230,470],[330,200],[320,110],[100,175],[300,320],[360,440],[180,50],[180,150],[365,255],[185,250]],
 [[200,385],[225,285],[345,225],[300,345],[140,200]],
 [[230,370],[300,190],[245,285],[335,255],[130,210]],
 [[250,440],[250,60],[335,300],[310,215],[240,180]],
 [[330,335],[120,150],[270,50],[320,235],[270,220]],
 [[300,74],[140,100],[350,250],[295,190],[175,325,2.8]],
 [[356,380],[116,90],[326,124],[296,325],[175,245,2.6]],
 [[330,400],[127,250],[330,270],[232,300],[272,140]],
 [[268,114],[188,70],[175,320,2.8],[290,250],[203,300]],
];
export const THUMB_ZOOM=2.1;
export function missionFocus(chapter:number,order:number) {
 const set=MISSION_FOCUS[chapter]??MISSION_FOCUS[0];
 const [x,y,zoom]=set[order%set.length];
 return {x,y,zoom:(zoom??THUMB_ZOOM)*(order<set.length?1:0.72)};
}
/** Image size/offset that frames source point (fx,fy) in a box; zoom 1 = full source width. */
export function artCrop(boxW:number,boxH:number,fx:number,fy:number,zoom:number) {
 const s=Math.max(boxW*zoom/VENUE_ART.w,boxH/VENUE_ART.h);
 const width=VENUE_ART.w*s,height=VENUE_ART.h*s;
 const left=Math.min(0,Math.max(boxW-width,boxW/2-fx*s));
 const top=Math.min(0,Math.max(boxH-height,boxH/2-fy*s));
 return {width,height,left,top};
}

// ── Layout ────────────────────────────────────────────────────────────────────────────
export interface Insets {top:number;bottom:number}
/** Ratio-based layout; picks the compact variant when the regular one would scroll with 5 missions. */
export function missionSelectLayout(W:number,H:number,insets:Insets,count=5) {
 const side=W>=400?18:16;
 const contentW=Math.min(W-side*2,560);
 const available=H-insets.top-insets.bottom;
 const make=(compact:boolean)=>{
  const header=compact?44:48;
  const chapter=compact?66:80;
  const heroH=Math.round(Math.min(170,Math.max(92,contentW/(compact?3.2:2.6))));
  const cardH=compact?62:76,currentH=compact?72:90,gap=compact?6:8;
  const heroGap=compact?10:14;
  const list=Math.max(0,count-1)*cardH+currentH+count*gap;
  const total=header+chapter+heroH+heroGap+list+8;
  return {compact,header,chapter,heroH,heroGap,cardH,currentH,gap,list,total};
 };
 // Compact only when it removes the scroll; long chapters (10 missions) keep readable cards and scroll.
 const regular=make(false),compact=make(true);
 const L=regular.total<=available||compact.total>available?regular:compact;
 const taglineH=26;
 const nodeCol=34;
 const thumbH=L.cardH-(L.compact?14:18),currentThumbH=L.currentH-(L.compact?16:20);
 return {...L,side,contentW,available,nodeCol,thumbW:Math.round(thumbH*1.3),thumbH,currentThumbW:Math.round(currentThumbH*1.3),currentThumbH,
  tagline:L.total+taglineH<=available,taglineH,fits:L.total<=available};
}

/** Initial scroll offset that centres the current mission when the route is longer than the screen. */
export function initialRouteScroll(L:ReturnType<typeof missionSelectLayout>,route:ChapterRoute,screenH:number,insets:Insets) {
 if(L.fits||route.current===null)return 0;
 const order=route.missions.findIndex(m=>m.index===route.current);
 const viewH=screenH-insets.top-L.header;
 const top=L.chapter+L.heroH+L.heroGap;
 const contentH=top+L.list+(L.tagline?L.taglineH:0)+insets.bottom+12;
 const target=top+order*(L.cardH+L.gap)-(viewH-(L.currentH+L.gap))/2;
 return Math.round(Math.min(Math.max(0,contentH-viewH),Math.max(0,target)));
}
