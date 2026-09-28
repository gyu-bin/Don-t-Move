import {test} from 'node:test';
import assert from 'node:assert/strict';
import {INTRO_MS,INTRO_CUES,introFrame,BRAND} from './introTimeline';
import {scheduleIntroCues} from './introCues';
import {readFileSync} from 'node:fs';
test('HOME handoff keeps decoded backdrop visible and fades menus over 250ms',()=>{
 for(let ms=0;ms<=INTRO_MS;ms++)assert(introFrame(ms).dark<=0.32);
 assert.equal(introFrame(1950).start,0);assert.equal(introFrame(2200).start,1);
 assert(introFrame(2075).start>0&&introFrame(2075).start<1);
 const source=readFileSync('src/ui/branding/BrandingScreen.tsx','utf8');
 assert(source.includes('()=>cachedArt'));assert(source.includes('homeStyle'));assert(source.includes('accessibilityElementsHidden={intro}'));
});
test('cinematic timeline lasts 2.2s and ends on the exact Start composition',()=>{
 assert.equal(INTRO_MS,2200);
 const final=introFrame(INTRO_MS);assert.equal(final.start,1);assert.equal(final.scene,0);assert.equal(final.dark,0);assert.equal(final.logo,1);
 assert.deepEqual(introFrame(9000),final);
});
test('skip/unmount cancels every cue, mute schedules none, replay has fresh cues',()=>{
 const pending:(()=>void)[]=[],emitted:string[]=[];
 const schedule=(fn:()=>void)=>{pending.push(fn);return pending.length as unknown as ReturnType<typeof setTimeout>;};
 let cleared=0;
 const cancel=scheduleIntroCues(true,n=>emitted.push(n),schedule,()=>{cleared++;});
 cancel();pending.forEach(fn=>fn());assert.equal(cleared,4);assert.equal(emitted.length,0);
 pending.length=0;scheduleIntroCues(false,n=>emitted.push(n),schedule);assert.equal(pending.length,0);
 scheduleIntroCues(true,n=>emitted.push(n),schedule);pending.forEach(fn=>fn());
 assert.deepEqual(emitted,['footstep','turn','freeze','logo']);
});
test('packaged icon is 1024px opaque RGB and uses the supplied source',()=>{
 const icon=readFileSync(new URL('../../../assets/branding/app-icon.png',import.meta.url));
 assert.equal(icon.readUInt32BE(16),1024);assert.equal(icon.readUInt32BE(20),1024);assert.equal(icon[25],2);
 const script=readFileSync(new URL('../../../tools/brandingAssets.mjs',import.meta.url),'utf8');
 assert(script.includes('icon-reference.png'));assert(!script.includes('icon-square-source.png'));
});
test('all visible motion freezes for 300ms; player hides then peeks',()=>{
 assert(introFrame(500).playerX<introFrame(0).playerX);
 assert(introFrame(1100).playerX>introFrame(500).playerX);
 for(let t=1100;t<=1400;t+=10)assert.deepEqual(introFrame(t),introFrame(1100));
});
test('Start peek exposes both eyes beyond the wall; hiding still conceals them',()=>{
 const wallRight=65,eyes=[{x:47,width:23},{x:84,width:19}];
 const peek=introFrame(INTRO_MS).playerX,hidden=introFrame(500).playerX;
 for(const eye of eyes){
  assert(eye.x+peek>=wallRight,'eye must not be buried behind the wall on Start');
  assert(eye.x+eye.width+hidden<=wallRight,'eyes remain hidden during retreat');
 }
});
test('effect order and palette are bounded; skipped timeline has no pending cues',()=>{
 assert.deepEqual(INTRO_CUES.map(c=>c.name),['footstep','turn','freeze','logo']);
 assert(INTRO_CUES.every(c=>c.at<INTRO_MS));
 assert.equal(INTRO_CUES.filter(c=>c.at>INTRO_MS).length,0);
 assert.equal(BRAND.navy,'#081824');
 for(let t=0;t<=INTRO_MS;t+=10){const f=introFrame(t);for(const n of [f.logo,f.dark,f.scene,f.start])assert(n>=0&&n<=1);}
});
