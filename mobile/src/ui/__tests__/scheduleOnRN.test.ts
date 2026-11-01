/**
 * react-native-worklets: `scheduleOnRN` accepts only functions defined on the RN runtime (or host functions). An arrow
 * or function created inside a worklet throws on the UI thread ("Locally defined function passed to scheduleOnRN").
 * Found in v4 simulator QA: the alarm-episode reaction in VisualPlaygroundScreen passed `()=>endAlarmEpisode(...)` and
 * threw whenever an alert ended (e.g. on Retry). Plain tests never run that UI-thread path, so this scans the source.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' || e.name === 'node_modules' ? [] : files(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

test('scheduleOnRN is never handed a function created inline (inside the worklet)', () => {
  const bad: string[] = [];
  for (const f of files(path.resolve(__dirname, '../..'))) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/scheduleOnRN\(\s*(\(|async\b|function\b|[A-Za-z_$][\w$]*\s*=>)/.test(line)) bad.push(`${path.relative(process.cwd(), f)}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(bad, [], 'pass a function defined on the RN runtime (component scope) instead:\n' + bad.join('\n'));
});
