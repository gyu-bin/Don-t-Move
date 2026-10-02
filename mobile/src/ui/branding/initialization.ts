/** Bounds a caller's wait; late completion cannot change the settled result. */
export function withDeadline<T>(work: Promise<T>, milliseconds: number, label: string): Promise<T> {
 return new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds);
  work.then(value => { clearTimeout(timer); resolve(value); },
   error => { clearTimeout(timer); reject(error); });
 });
}

/** Resolve a transition once, independently of a UI-thread animation callback.
 * Disposal invalidates stale worklet callbacks as well as the timer. */
export function completionDeadline(onComplete: () => void, milliseconds: number) {
 let active = true;
 const finish = () => { if (!active) return; active = false; clearTimeout(timer); onComplete(); };
 const timer = setTimeout(finish, milliseconds);
 return {finish, cancel: () => { active = false; clearTimeout(timer); }};
}
