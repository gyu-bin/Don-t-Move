import { createContext, useContext } from 'react';
import { DEFAULT_PROGRESS } from '../../game/progress/stageProgress';
import type { StageProgress } from '../../game/progress/stageProgress';
import { translate } from './strings';
import type { TextKey } from './strings';

export type Preferences = Pick<StageProgress,'language'|'soundEnabled'|'musicEnabled'|'controlMode'>;
export const MenuContext = createContext({
 progress: DEFAULT_PROGRESS,
 preferences: (_patch:Partial<Preferences>) => {},
 home: () => {},
 /** Leave the mission for the chapter list (not the Home intro). */
 chapters: () => {},
});
export function useMenu() {
 const context = useContext(MenuContext);
 return {...context, t:(key:TextKey) => translate(context.progress.language,key)};
}
