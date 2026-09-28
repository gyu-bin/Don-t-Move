export const INTRO_MS=2200;
export const BRAND={navy:'#081824',black:'#020A10',blue:'#0F2A3D',ivory:'#FFF4D6',cyan:'#3EC5FF'};
export const INTRO_CUES=[{at:150,name:'footstep'},{at:700,name:'turn'},{at:1100,name:'freeze'},{at:1700,name:'logo'}] as const;
export function introFrame(ms:number){
 'worklet';
 const ease=(a:number,b:number)=>{const t=Math.max(0,Math.min(1,(ms-a)/(b-a)));return t*t*(3-2*t);};
 const time=Math.min(ms,1100),move=Math.max(0,Math.min(1,time/500)),peek=Math.max(0,Math.min(1,(time-500)/600));
 // Wall ends at x=65; first eye begins at local x=47. At the final
 // peek (+18), both eyes clear the wall while the body stays concealed.
 return {playerX:30*(1-move)-48*move+66*peek,guardTurn:-0.18+peek*0.34,
  beamTurn:0.32-peek*0.58,dark:0.32*ease(1400,1650)*(1-ease(1950,2200)),
  logo:ease(1600,1830),start:ease(1950,2200),scene:1-ease(1500,1750)};
}
