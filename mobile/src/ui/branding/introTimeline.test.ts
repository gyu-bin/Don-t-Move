import {test} from 'node:test';
import assert from 'node:assert/strict';
import {INTRO_MS,INTRO_CUES,FREEZE_MS,GUARD_TURN_MS,LOBBY_AUDIO_LEAD_MS,SPLASH_MS,introFrame,BRAND} from './introTimeline';
import {scheduleIntroCues} from './introCues';
import {readFileSync} from 'node:fs';

test('Spotlight Freeze Intro lasts 4.5 s after a 1.0–1.3 s splash and clamps after the final frame',()=>{
 assert.equal(INTRO_MS,4500);
 assert(SPLASH_MS>=1000&&SPLASH_MS<=1300);
 assert(LOBBY_AUDIO_LEAD_MS>=500&&LOBBY_AUDIO_LEAD_MS<=700);
 assert.deepEqual(introFrame(9000),introFrame(INTRO_MS));
 const final=introFrame(INTRO_MS);
 for(const k of ['reveal','thiefPeek','peekOut','guardTurn','beamAlpha','beamT','lit','logoTop','logoBottom','underline','tagline'] as const)assert.equal(final[k],1,k);
 assert.equal(final.thiefSneak,0);assert.equal(final.thiefFreeze,0);assert.equal(final.guardAway,0);assert.equal(final.thiefBob,0);
});
test('beats: museum → diamond → peek → sneak → guard_turn + freeze startle → dive → peek, light on the column → logo',()=>{
 const f=(ms:number)=>introFrame(ms);
 assert(f(0).veil>=0.99,'starts from the splash navy (no black cut)');
 assert(f(500).veil<0.8&&f(500).reveal===0,'dim museum before the spotlight');
 assert(f(850).reveal>0&&f(850).reveal<1&&f(1200).reveal===1,'spotlight 0.5–1.2 s');
 assert.equal(f(1190).thiefPeek,0);assert(f(1500).thiefPeek===1&&f(1500).peekOut<1,'peek 1.2–1.8 s');
 assert(f(2100).thiefSneak===1&&f(2100).thiefPeek===0,'sneak from ~1.8 s');
 assert(f(2000).travel<f(2250).travel&&f(2250).travel<f(2590).travel,'sneak steps toward the diamond');
 assert(f(2500).guardAway>0.8&&f(2500).guardTurn===0,'guard_away while the thief sneaks');
 assert(f(GUARD_TURN_MS-1).guardTurn===0&&f(GUARD_TURN_MS).guardTurn===1&&f(GUARD_TURN_MS).guardAway===0,'guard_turn is a cut (no ghosting)');
 assert(f(GUARD_TURN_MS).thiefFreeze===1&&f(GUARD_TURN_MS).thiefSneak===0,'thief_freeze startle at the turn');
 assert(f(2900).dive>0&&f(3099).dive<=1&&f(3100).thiefFreeze===0&&f(3100).thiefPeek===1,'dive back, then peek again');
 assert(f(3200).peekOut<f(3400).peekOut,'peeks out slowly');
 assert(f(2700).beamAlpha>0&&f(2800).beamT<f(3300).beamT&&f(FREEZE_MS).beamT===1,'light sweeps diamond → hiding spot');
 assert.equal(f(3590).logoTop,0);assert(f(3800).logoTop>0&&f(3800).logoBottom<f(3800).logoTop,'DON’T then MOVE');
 assert(f(4000).underline<f(4000).logoBottom,'then the underline');
});
test('FREEZE: once hidden and holding still, every thief channel is constant',()=>{
 const at=introFrame(FREEZE_MS);
 for(let t=FREEZE_MS;t<=INTRO_MS;t+=10){
  const f=introFrame(t);
  for(const k of ['peekOut','thiefPeek','travel','dive','thiefBob','thiefLean'] as const)assert.equal(f[k],at[k],k);
  assert.equal(f.frozen,1);
 }
 assert.equal(introFrame(FREEZE_MS-10).frozen,0);
});
test('intro final frame IS the lobby frame; old branding art and white diamond overlay are gone',()=>{
 assert.deepEqual(introFrame(INTRO_MS),introFrame(INTRO_MS+100000));
 const src=readFileSync('src/ui/branding/BrandingScreen.tsx','utf8');
 assert.equal((src.match(/drawMuseumScene\(skiaSceneGfx\(canvas, art\), L,/g)??[]).length,1,'one shared scene for intro and lobby, including optional guard omission');
 assert(!/room-v2|player-v2|guard-v2|wall-v2|homeComposition/.test(src),'no legacy branding art or separate Home composition');
 for(const n of ['bg_museum','thief_peek','thief_sneak','thief_freeze','guard_away','guard_turn','fg_column_left'])assert(src.includes(`opening/${n}.png`),n);
 assert(!/M 195 452 L 219 478 L 195 516 L 171 478 Z/.test(src),'no white diamond overlay');
 assert(!readFileSync('app.json','utf8').includes('splash-mark'),'native splash has no diamond mark');
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
test('effect order and palette are bounded',()=>{
 assert.deepEqual(INTRO_CUES.map(c=>c.name),['footstep','turn','freeze','logo']);
 assert(INTRO_CUES.every(c=>c.at<INTRO_MS));
 assert.equal(INTRO_CUES.find(c=>c.name==='freeze')!.at,FREEZE_MS);
 assert.equal(BRAND.navy,'#081824');
 for(let t=0;t<=INTRO_MS;t+=10){const f=introFrame(t);for(const n of [f.veil,f.reveal,f.logo,f.copy,f.beamAlpha,f.lit,f.thiefPeek,f.thiefSneak,f.thiefFreeze,f.guardAway,f.guardTurn])assert(n>=0&&n<=1);}
});
