export const INTRO_MS=4500;
/** Brand splash length before the museum fades in. */
export const SPLASH_MS=1200;
/** Lobby BGM starts fading in this long before the intro ends (and never restarts in Home). */
export const LOBBY_AUDIO_LEAD_MS=650;
/** Thief is hidden behind the column, light resting beside him: every thief channel is constant from here. */
export const FREEZE_MS=3450;
/** guard_away → guard_turn is a cut, not a cross-fade; the thief startles (thief_freeze) at the same instant. */
export const GUARD_TURN_MS=2600;
export const BRAND={navy:'#081824',black:'#020A10',blue:'#0F2A3D',ivory:'#FFF4D6',cyan:'#3EC5FF',scene:'#020E1B'};
export const INTRO_CUES=[{at:1900,name:'footstep'},{at:GUARD_TURN_MS,name:'turn'},{at:FREEZE_MS,name:'freeze'},{at:3600,name:'logo'}] as const;

/**
 * Spotlight Freeze Intro. Pure function of time; the Lobby is introFrame(INTRO_MS),
 * so the final intro frame and the first Lobby frame are the same picture.
 * 0.0–0.5 museum fades in · 0.5–1.2 spotlight/diamond · 1.2–1.8 thief_peek behind the column ·
 * 1.8–2.6 thief_sneak toward the diamond (guard_away) · 2.6 guard_turn + thief_freeze startle ·
 * 2.85–3.1 thief dives back behind the column · 3.15–3.45 thief_peek again while the light sweeps
 * diamond → where he stood → the column edge · 3.45 FREEZE (hidden, holding still) · 3.6–4.5 logo.
 */
export function introFrame(ms:number){
 'worklet';
 const t=Math.max(0,Math.min(INTRO_MS,ms));
 const clamp=(v:number)=>Math.max(0,Math.min(1,v));
 const ease=(a:number,b:number)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
 const out=(a:number,b:number)=>{const x=clamp((t-a)/(b-a));return 1-(1-x)*(1-x);};
 const lerp=(a:number,b:number,x:number)=>a+(b-a)*x;

 const fadeIn=out(0,500);
 const reveal=ease(500,1200);
 const veil=lerp(lerp(1,.74,fadeIn),.5,reveal);

 // Thief motion is evaluated at min(t, FREEZE) → literally frozen afterwards.
 const m=Math.min(t,FREEZE_MS);
 const at=(a:number,b:number)=>{const x=clamp((m-a)/(b-a));return x*x*(3-2*x);};
 const atOut=(a:number,b:number)=>{const x=clamp((m-a)/(b-a));return 1-(1-x)*(1-x);};
 const atIn=(a:number,b:number)=>{const x=clamp((m-a)/(b-a));return x*x;};
 const step=(a:number,b:number)=>{const x=clamp((m-a)/(b-a));return x<=0||x>=1?0:Math.sin(Math.PI*x);};
 const frozen=t>=FREEZE_MS?1:0;
 const hidden=m>=3100?1:0;                       // back behind the column
 const toSneak=at(1780,1900);
 const startled=m>=GUARD_TURN_MS?1:0;
 const thiefPeek=hidden?1:at(1200,1320)*(1-toSneak);
 const peekOut=hidden?atOut(3150,FREEZE_MS):atOut(1200,1750);
 const thiefSneak=toSneak*(1-startled);
 const thiefFreeze=startled*(1-hidden);         // "!" startle, then the dive (the column hides the rest)
 const travel=.55*at(1900,2200)+.45*at(2300,2600);
 const dive=atIn(2850,3100);
 const thiefBob=0-(step(1900,2200)+step(2300,2600))*.004;
 const thiefLean=1.5*step(1900,2200)+1.5*step(2300,2600);

 // Guard: guard_away (own flashlight pointing away) → cut to guard_turn → beam sweeps diamond → hiding spot.
 const turn=t>=GUARD_TURN_MS?1:0;
 const guardAway=lerp(0,.85,reveal)*(1-turn);
 const guardTurn=turn;
 const beamAlpha=ease(2650,2800);
 const beamT=ease(2750,3350);
 const lit=ease(3250,3450);

 const copy=ease(150,450)*(1-ease(900,1150));
 const logoTop=ease(3600,3850),logoBottom=ease(3720,3970),underline=ease(3900,4150),tagline=ease(4050,4350);
 return {t,fadeIn,reveal,veil,peekOut,thiefPeek,thiefSneak,thiefFreeze,travel,dive,thiefBob,thiefLean,frozen,
  guardAway,guardTurn,beamAlpha,beamT,lit,copy,logoTop,logoBottom,underline,tagline,logo:logoTop};
}
export type IntroFrame=ReturnType<typeof introFrame>;
