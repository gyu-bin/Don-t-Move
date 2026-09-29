/** Bounds a caller's wait; late completion cannot change the settled result. */
export function withDeadline<T>(work: Promise<T>, milliseconds: number, label: string): Promise<T> {
 return new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`${label} timed out`)), milliseconds);
  work.then(value => { clearTimeout(timer); resolve(value); },
   error => { clearTimeout(timer); reject(error); });
 });
}
