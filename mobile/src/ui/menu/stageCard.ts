import type { StageProgress } from '../../game/progress/stageProgress';
import { canSelectStage } from '../../game/progress/stageProgress';
export function stageCardState(progress:StageProgress,index:number) {
 const unlocked=canSelectStage(progress,index);
 return {unlocked,cleared:progress.clearedStages.includes(index),current:unlocked&&index===progress.highestUnlocked};
}
export function formatTime(seconds:number|undefined) {
 if(seconds===undefined)return '—';
 const centiseconds=Math.round(seconds*100);
 return `${String(Math.floor(centiseconds/6000)).padStart(2,'0')}:${String(Math.floor(centiseconds/100)%60).padStart(2,'0')}.${String(centiseconds%100).padStart(2,'0')}`;
}
