import type { TextKey } from './menu/strings';

/** What a button on the mission-clear screen does. */
export type ResultAction = 'nextStage' | 'nextChapter' | 'chapters' | 'retry' | 'home';
export const RESULT_LABEL: Record<ResultAction, TextKey> = {
  nextStage: 'next', nextChapter: 'nextChapter', chapters: 'chapters', retry: 'replay', home: 'home',
};

/**
 * Buttons of the mission-clear screen. The label always says what the button does:
 * - inside a chapter the main button goes on to the next mission;
 * - on a chapter's last mission it says "next chapter", and only if that chapter can really be played;
 * - after the very last mission there is nothing to go on to, so the main button is the chapter list.
 * A mission that is still locked is never started from here.
 */
export function resultActions(input: { index: number; missionCount: number; chapterFinal: boolean; nextPlayable: boolean }): { primary: ResultAction; secondary: ResultAction[] } {
  const last = input.index >= input.missionCount - 1;
  if (last || !input.nextPlayable) return { primary: 'chapters', secondary: ['retry', 'home'] };
  return { primary: input.chapterFinal ? 'nextChapter' : 'nextStage', secondary: ['chapters', 'retry', 'home'] };
}
