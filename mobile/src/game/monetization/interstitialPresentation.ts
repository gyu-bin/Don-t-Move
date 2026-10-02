/** Native presentation completion is independent of loading and game navigation. */
export type ShowResult = 'shown' | 'skipped';
export interface PresentableAd {
 show(): Promise<void>;
 readonly loaded?: boolean;
 addAdEventListener(type: string, listener: (...args: unknown[]) => void): () => void;
}
export function presentLoadedAd(ad: PresentableAd, events: {opened: string; closed: string; error: string},
 onSettled: (result: ShowResult) => void, startDeadlineMs = 8000, confirmGraceMs = 1500): {result: Promise<ShowResult>; cancel: () => void; confirmDismissed: () => void} {
 let finish: (value: ShowResult) => void = () => {};
 let opened = false, openedAt = 0;
 const result = new Promise<ShowResult>(resolve => {
  let settled = false;
  const unsubs: (() => void)[] = [];
  const recovery = setInterval(() => {
   // The SDK updates its public loaded flag before dispatching CLOSED/ERROR.
   // Recover a dropped consumer callback only when native lifecycle already ended.
   if (opened && ad.loaded === false) finish('shown');
  }, 1000);
  const timer = setTimeout(() => finish('skipped'), startDeadlineMs);
  finish = value => {
   if (settled) return;
   settled = true; clearTimeout(timer); clearInterval(recovery);
   for (const unsub of unsubs) { try { unsub(); } catch { /* Native cleanup is best effort. */ } }
   try { onSettled(value); } finally { resolve(value); }
  };
  try {
   unsubs.push(ad.addAdEventListener(events.opened, () => {
    // A visible native ad must never be cut off by a JS elapsed-time limit.
    opened = true; openedAt = Date.now(); clearTimeout(timer);
   }));
   unsubs.push(ad.addAdEventListener(events.closed, () => finish('shown')));
   unsubs.push(ad.addAdEventListener(events.error, () => finish('skipped')));
   void ad.show().catch(() => finish('skipped'));
  } catch { finish('skipped'); }
 });
 // A touch reaching the app's own UI proves the full-screen native ad no longer
 // covers it. Before OPENED the start deadline owns recovery, so this is a no-op;
 // a double-tap landing while the ad is still animating in is ignored too.
 return {result, cancel: () => finish('skipped'),
  confirmDismissed: () => { if (opened && Date.now() - openedAt >= confirmGraceMs) finish('shown'); }};
}
