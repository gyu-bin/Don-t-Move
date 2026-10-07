/**
 * QA override: every mission can be selected and started, whatever the save says.
 *
 * It only lifts the selection / entry limit. It writes nothing: no clear record, no unlock, no chapter progress.
 * The mission list keeps showing the real state of the save (cleared, current), and a mission that is only open
 * because of this override is tagged QA. With the override off, progression is exactly the normal one.
 *
 * On: a development bundle, or a bundle built with EXPO_PUBLIC_DM_QA_UNLOCK_ALL=1 (inlined when the bundle is
 * exported — see docs/reports/RC_HOTFIX_QA_UNLOCK_0505_REPORT.md for how a TestFlight update gets it).
 * A store release must be built or updated WITHOUT that variable.
 */
export function qaUnlockAllEnabled(dev: boolean, flag: string | undefined): boolean {
  return dev || flag === '1';
}

export const QA_UNLOCK_ALL: boolean = qaUnlockAllEnabled(
  typeof __DEV__ !== 'undefined' && __DEV__,
  process.env.EXPO_PUBLIC_DM_QA_UNLOCK_ALL,
);
