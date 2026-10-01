import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {MISSION_BRIEFS} from '../../game/levels/missionBriefs';
import {CHAPTERS,CHAPTER_MISSION_COUNTS,chapterMissionIndices,missionId} from '../../game/levels/campaignCatalog';
import {completeMission,freshCampaign} from '../../game/progress/campaignProgress';
import type {CampaignProgress} from '../../game/progress/campaignProgress';
import {artCrop,chapterRoute,initialRouteScroll,missionFocus,missionSelectLayout,MISSION_FOCUS,CHAPTER_HERO} from '../menu/missionRoute';
import {chapterIntroKey,translations} from '../menu/strings';

const clearUpTo=(count:number):CampaignProgress=>{
 let p=freshCampaign();
 for(let i=0;i<count;i++)p=completeMission(p,i,60+i+0.25,i%2);
 return p;
};
const states=(p:CampaignProgress,chapter:number,dev=false)=>chapterRoute(p,chapter,dev).missions.map(m=>m.state);

test('Guard / objective counts come from the mission config (derived index matches campaignStages.json)',()=>{
 const stages=JSON.parse(readFileSync('src/game/levels/stages/campaignStages.json','utf8')) as {id:string;guards:unknown[];objective?:unknown}[];
 assert.equal(Object.keys(MISSION_BRIEFS).length,stages.length);
 for(const s of stages)assert.deepEqual(MISSION_BRIEFS[s.id],{guards:s.guards.length,objectives:s.objective?1:0},s.id);
 const route=chapterRoute(freshCampaign(),1,false);
 assert.deepEqual(route.missions.map(m=>m.guards),stages.filter(s=>s.id.startsWith('02-')).map(s=>s.guards.length));
});

test('Route states: none cleared, partial, current and locked follow release progression',()=>{
 assert.deepEqual(states(freshCampaign(),0).slice(0,3),['current','locked','locked']);
 const fresh=chapterRoute(freshCampaign(),0,false);
 assert.equal(fresh.cleared,0);assert.equal(fresh.ratio,0);assert.equal(fresh.current,0);
 assert(fresh.missions.slice(1).every(m=>!m.playable),'release build: locked missions cannot start');
 // Chapter 02 with two missions cleared → 02-03 is the current mission.
 const p=clearUpTo(12);
 assert.deepEqual(states(p,1),['cleared','cleared','current',...Array(CHAPTER_MISSION_COUNTS[1]-3).fill('locked')]);
 const route=chapterRoute(p,1,false);
 assert.equal(route.cleared,2);assert.equal(route.total,CHAPTER_MISSION_COUNTS[1]);assert.equal(route.ratio,2/CHAPTER_MISSION_COUNTS[1]);
 assert.equal(route.missions[0].record?.bestTime,70.25);
 assert.equal(route.missions[2].playable,true);assert.equal(route.missions[3].playable,false);
 // Chapter not reached yet: everything locked, no current.
 assert.deepEqual(states(p,2),Array(CHAPTER_MISSION_COUNTS[2]).fill('locked'));
 assert.equal(chapterRoute(p,2,false).current,null);
});

test('All cleared: full progress, no current, every mission replayable',()=>{
 const p=clearUpTo(20);
 const route=chapterRoute(p,1,false);
 assert.deepEqual(route.missions.map(m=>m.state),Array(CHAPTER_MISSION_COUNTS[1]).fill('cleared'));
 assert.equal(route.ratio,1);assert.equal(route.current,null);
 assert(route.missions.every(m=>m.playable));
 assert.equal(chapterRoute(p,2,false).missions[0].state,'current');
});

test('Current mission prefers the Continue mission when it is open in this chapter',()=>{
 const p={...clearUpTo(10),highestUnlocked:13,lastMission:'02-03'};
 assert.deepEqual(states(p,1),['available','available','current','available',...Array(CHAPTER_MISSION_COUNTS[1]-4).fill('locked')]);
});

test('Dev/test unlock keeps the release visuals but lets locked missions start',()=>{
 const route=chapterRoute(freshCampaign(),1,true);
 assert(route.missions.every(m=>m.state==='locked'&&m.playable&&m.devUnlocked));
 assert.equal(chapterRoute(freshCampaign(),1,false).missions[0].playable,false);
});

test('Five missions fit without scrolling on current iPhones; small phones use the compact layout',()=>{
 const phones:[string,number,number,number,number][]=[
  ['iPhone 17',402,874,62,34],['iPhone 17 Pro Max',440,956,62,34],['iPhone 16e',390,844,47,34],
  ['iPhone 13 mini',375,812,50,34],['iPhone SE',375,667,20,0],
 ];
 for(const [name,W,H,top,bottom] of phones){
  const L=missionSelectLayout(W,H,{top,bottom},5);
  assert(L.fits,`${name}: ${L.total} > ${L.available}`);
  assert(L.contentW<=W-32,name);
  assert(L.currentH>L.cardH,name);
  assert(L.cardH>=60&&L.thumbH>=44,`${name}: readable card`);
  assert(L.heroH<=L.available*0.22,`${name}: hero does not push the list away`);
 }
 const L17=missionSelectLayout(402,874,{top:62,bottom:34},5);
 assert.equal(L17.compact,false);assert.equal(L17.tagline,true);
 assert.equal(missionSelectLayout(375,667,{top:20,bottom:0},5).compact,true);
});

test('Thumbnails frame a different area per mission and always cover their box',()=>{
 assert.equal(MISSION_FOCUS.length,CHAPTERS.length);assert.equal(CHAPTER_HERO.length,CHAPTERS.length);
 CHAPTERS.forEach((_,chapter)=>{
  const seen=new Set<string>();
  for(let order=0;order<CHAPTER_MISSION_COUNTS[chapter];order++){
   const f=missionFocus(chapter,order);
   seen.add(`${f.x},${f.y},${f.zoom.toFixed(2)}`);
   for(const [w,h] of [[75,58],[91,70],[62,48]]){
    const c=artCrop(w,h,f.x,f.y,f.zoom);
    assert(c.left<=0&&c.top<=0&&c.left+c.width>=w-1e-9&&c.top+c.height>=h-1e-9,`${chapter}/${order} covers`);
   }
  }
  assert.equal(seen.size,CHAPTER_MISSION_COUNTS[chapter],`chapter ${chapter+1}: distinct thumbnails`);
 });
});

test('Chapter intro copy exists for every chapter in KO and EN',()=>{
 CHAPTERS.forEach((_,i)=>{
  assert(translations.ko[chapterIntroKey(i)]);assert(translations.en[chapterIntroKey(i)]);
 });
});

test('Mission Select: card tap starts the mission directly; no PLAY text, detail screen, tab bar or red',()=>{
 const src=readFileSync('src/ui/menu/MissionSelect.tsx','utf8');
 const stages=readFileSync('src/ui/menu/StageSelectScreen.tsx','utf8');
 assert(!src.includes("t('play')")&&!stages.includes("t('play')"),'no repeated PLAY label');
 assert(src.includes("playUI('ui_select');onSelect(m.index)"),'whole card → Mission Start with ui_select');
 assert(src.includes('disabled={!m.playable}'),'locked cards cannot start');
 assert(src.includes('<MenuHeading'),'back uses the shared heading (ui_back)');
 assert(!/detail/i.test(src.replace(/accessibility\w*/g,'')),'no mission detail screen');
 assert(!/tab ?bar|BottomTab/i.test(src));
 assert(!/#(f00|ff0000|e53935|d32f2f)|'red'/i.test(src),'no red on Mission Select');
 assert(!/useAppAudio|audio\.update|playMusic/.test(src),'menu screen does not touch BGM');
 assert(stages.includes('<MissionSelect chapter={chapter}'));
 for(const i of chapterMissionIndices(1))assert(missionId(i).startsWith('02-'));
});

test('Ten-mission chapter keeps regular cards and opens scrolled to the current mission',()=>{
 const insets={top:62,bottom:34};
 const L=missionSelectLayout(402,874,insets,10);
 assert.equal(L.fits,false);assert.equal(L.compact,false);
 const early=chapterRoute(clearUpTo(1),0,false),late=chapterRoute(clearUpTo(8),0,false);
 assert.equal(initialRouteScroll(L,early,874,insets),0);
 const y=initialRouteScroll(L,late,874,insets),viewH=874-62-L.header;
 const rowTop=L.chapter+L.heroH+L.heroGap+8*(L.cardH+L.gap);
 assert(y>0&&rowTop-y>=0&&rowTop+L.currentH-y<=viewH,'current mission row is on screen');
 assert.equal(initialRouteScroll(missionSelectLayout(402,874,insets,5),chapterRoute(clearUpTo(13),1,false),874,insets),0);
});
