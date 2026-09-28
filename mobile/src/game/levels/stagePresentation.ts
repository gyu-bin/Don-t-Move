import type { StageTheme, ValuableKind } from './StageDefinition';

/** Reuses the existing environment kit; these are place-specific material palettes. */
export const STAGE_PALETTES: Record<StageTheme, { floor: string[]; wall: string; carpet: string; light: 'warm'|'cool'|'cyan'|'green'|'red'; darkness: number }> = {
  museum: { floor:['#1c2230','#202838'], wall:'#2c313c', carpet:'#3e1116', light:'warm', darkness:0.43 },
  gallery: { floor:['#343039','#3b3540'], wall:'#57505b', carpet:'#46344e', light:'warm', darkness:0.38 },
  bank: { floor:['#293832','#304038'], wall:'#48574a', carpet:'#214934', light:'green', darkness:0.43 },
  lab: { floor:['#1f3544','#294351'], wall:'#365366', carpet:'#244d64', light:'cyan', darkness:0.40 },
  casino: { floor:['#342238','#402a43'], wall:'#54304c', carpet:'#6c193c', light:'warm', darkness:0.42 },
  mansion: { floor:['#342920','#403125'], wall:'#614635', carpet:'#4c1720', light:'warm', darkness:0.47 },
  warehouse: { floor:['#30322e','#383b34'], wall:'#484c40', carpet:'#514628', light:'warm', darkness:0.48 },
  security: { floor:['#242e3c','#2c3848'], wall:'#3e4b60', carpet:'#253b52', light:'cool', darkness:0.47 },
  blacksite: { floor:['#1b202c','#232734'], wall:'#303449', carpet:'#352735', light:'red', darkness:0.57 },
  vault: { floor:['#30323d','#383b48'], wall:'#505665', carpet:'#514326', light:'cool', darkness:0.48 },
};
/** Temporary readable proxies from the existing atlas, not new final item art. */
export const VALUABLES: Record<ValuableKind, { label: string; sprite: string }> = {
  diamond:{label:'DIAMOND',sprite:'diamond'}, painting:{label:'RARE PAINTING',sprite:'painting'},
  vaultGem:{label:'VAULT GEM',sprite:'diamond'}, prototype:{label:'PROTOTYPE',sprite:'displayCase'},
  jewel:{label:'ROYAL JEWEL',sprite:'diamond'}, artifact:{label:'ARTIFACT',sprite:'statue'},
  case:{label:'CONTRABAND CASE',sprite:'crate'}, data:{label:'DATA DEVICE',sprite:'cctv'},
  classified:{label:'CLASSIFIED PROTOTYPE',sprite:'displayCase'}, masterDiamond:{label:'MASTER DIAMOND',sprite:'diamond'},
};
