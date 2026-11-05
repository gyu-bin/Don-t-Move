import type { StageTheme } from '../levels/StageDefinition';
import type { FootstepSurface } from '../stealth/footsteps';

export interface MissionAcoustics {
  surface: FootstepSurface;
  hearingSensitivity: number;
}

// Reuse the rendered substrate. Only the visibly riveted vault panels get a metal timbre.
const SURFACE_BY_THEME: Record<StageTheme, FootstepSurface> = {
  museum: 'stone',
  gallery: 'stone',
  bank: 'stone',
  lab: 'stone',
  casino: 'carpet',
  mansion: 'wood',
  warehouse: 'concrete',
  security: 'stone',
  blacksite: 'stone',
  vault: 'metal',
};

// Sensitivity scales received strength, not guard vision, routes, or timers.
// Keep missions independently tunable because sight pressure and close crossings vary.
const HEARING_BY_MISSION: Readonly<Partial<Record<string, number>>> = {
  '01-01': .19, '01-02': .82, '01-03': .86, '01-04': .39, '01-05': .79,
  '01-06': .29, '01-07': .88, '01-08': .78, '01-09': .32, '01-10': .27,
  '02-01': .87, '02-02': .86, '02-03': .81, '02-04': .83, '02-05': .79,
  '02-06': .87, '02-07': .86, '02-08': .35, '02-09': .81, '02-10': .44,
  '03-01': .82, '03-02': .85, '03-03': .82, '03-04': .78, '03-05': .78,
  '04-01': .85, '04-02': .84, '04-03': .83, '04-04': .78, '04-05': .80,
  '05-01': .93, '05-02': .91, '05-03': .93, '05-04': .94, '05-05': .64,
  '06-01': .35, '06-02': .19, '06-03': .35, '06-04': .74, '06-05': .19,
  '07-01': .86, '07-02': .35, '07-03': .84, '07-04': .79, '07-05': .35,
  '08-01': .82, '08-02': .39, '08-03': .26, '08-04': .80, '08-05': .77,
  '09-01': .78, '09-02': .78, '09-03': .16, '09-04': .77, '09-05': .35,
};

export function getMissionAcoustics(id: string, theme: StageTheme): MissionAcoustics {
  'worklet';
  const sensitivity = HEARING_BY_MISSION[id];
  return {
    surface: SURFACE_BY_THEME[theme],
    hearingSensitivity: typeof sensitivity === 'number' ? sensitivity : 0,
  };
}
