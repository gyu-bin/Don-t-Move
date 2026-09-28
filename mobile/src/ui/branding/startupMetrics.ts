type StartupEntry = { name: string; ms: number; wallMs: number; detail?: unknown };
const entries: StartupEntry[] = [];
export function markStartup(name: string, detail?: unknown) {
  const entry = { name, ms: performance.now(), wallMs: Date.now(), detail };
  entries.push(entry);
  if (entries.length > 100) entries.shift();
  if (__DEV__) console.info('[startup]', JSON.stringify(entry));
}
export function startupSnapshot() { return [...entries]; }
if (__DEV__) Object.assign(globalThis, { dontMoveStartup: startupSnapshot });
