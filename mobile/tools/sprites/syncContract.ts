/** Generated documentation; numeric source is the runtime, not these tables. */
import fs from 'node:fs';
import path from 'node:path';
import { GAIT_SPEED, PLAYER_SPRITE_SCALE } from '../../src/game/core/locomotion';
import { plantedFeet, plantingFor, SHEETS } from './spriteSpec';

const begin = '<!-- RUNTIME-PLANTING:BEGIN -->';
const end = '<!-- RUNTIME-PLANTING:END -->';
export function contractTables(): string {
  const lines = [begin, '', '이 표는 `npm run sprites:contract`로 Runtime에서 생성한다. 수동으로 숫자를 수정하지 않는다.',
    'Player는 `PLAYER_SPRITE_STRIDE`, Guard는 기존 `GAIT_STRIDE`를 사용한다.',
    `Player Sprite scale = ${PLAYER_SPRITE_SCALE.toFixed(8)} world units/px.`,
    'RIGHT Walk는 동일 발 landmark + PNG SHA256 결합 검수 대상이다. 제작 데이터 형식은 `FOOT_TRACKS.md` 참고.', ''];
  for (const spec of SHEETS.filter(s=>s.gait !== undefined)) {
    const pl=plantingFor(spec)!;
    lines.push(`#### ${spec.file} — Runtime-derived`, '',
      `Cycle ${pl.strideWorld} world units / ${spec.frames} frames; ${pl.perFramePx.toFixed(2)} sprite px/frame; stance ${pl.stance*100}%.`,
      `기준 속도 ${GAIT_SPEED[spec.gait!]} world units/s → ${(GAIT_SPEED[spec.gait!]/pl.strideWorld*2).toFixed(2)} steps/s.`, '',
      '| Frame | Beat | Planted feet (sprite px, + = forward) |','|---|---|---|');
    for(let i=0;i<spec.frames;i++) lines.push(`| ${i+1} | ${spec.beats[i]} | ${plantedFeet(spec,i).map(p=>`${p.foot} ${p.forwardPx>=0?'+':''}${p.forwardPx.toFixed(2)}`).join(', ') || '—'} |`);
    lines.push('');
  }
  return lines.concat(end).join('\n');
}
function main() {
  const file=path.resolve(__dirname,'../../art/characters/SPEC.md');
  const source=fs.readFileSync(file,'utf8');
  const start=source.indexOf(begin), finish=source.indexOf(end);
  if(start<0 || finish<start) throw new Error('generated contract markers missing');
  const next=source.slice(0,start)+contractTables()+source.slice(finish+end.length);
  if(process.argv.includes('--check')) {
    if(next!==source) throw new Error('SPEC is stale; run npm run sprites:contract');
    console.log('SPEC matches runtime');
  } else { fs.writeFileSync(file,next); console.log('SPEC regenerated from runtime'); }
}
if(require.main===module) main();
