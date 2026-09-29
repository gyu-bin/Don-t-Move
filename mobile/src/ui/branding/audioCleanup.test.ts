import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);

test('only the licensed gameplay registry may load bundled audio', () => {
  const visit = (directory: URL): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) visit(url);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
        const source = readFileSync(url, 'utf8');
        if (!fileURLToPath(url).endsWith('/game/audio/audioAssets.ts')) assert.doesNotMatch(source, /require\(['"][^'"]+\.(?:wav|mp3|m4a)['"]\)/,
          `${fileURLToPath(url)} must route audio through the licensed central registry`);
      }
    }
  };
  visit(root);
  const registry = readFileSync(new URL('game/audio/audioAssets.ts', root), 'utf8');
  const required = [...registry.matchAll(/require\(['"]([^'"]+)['"]\)/g)].map(match=>match[1]);
  assert.equal(required.length, 8, 'Exactly four music and four effect sources are licensed');
  const files = ['bgm/lobby.m4a', 'sfx/ui-select.wav', 'sfx/ui-back.wav', 'sfx/whistle-theft.wav', 'sfx/whistle-spotted.wav',
    'bgm/stealth.m4a', 'bgm/theft-alert.m4a', 'bgm/chase.m4a'];
  const licenses = readFileSync(new URL('../assets/audio/LICENSES.md', root), 'utf8');
  for (const file of files) {
    assert(required.includes(`../../../assets/audio/${file}`), file);
    const bytes = readFileSync(new URL(`../assets/audio/${file}`, root));
    assert(bytes.length > 1000, `${file} is a real media file`);
    assert.equal(bytes.toString('ascii', file.endsWith('.wav') ? 0 : 4, file.endsWith('.wav') ? 4 : 8),
      file.endsWith('.wav') ? 'RIFF' : 'ftyp');
    assert(licenses.includes(file), `${file} has documented provenance`);
  }
});

test('all generated placeholder audio is removed', () => {
  for (const name of ['intro-footstep', 'intro-turn', 'intro-freeze', 'intro-logo', 'intro-ambience', 'diamond', 'whistle']) {
    assert.equal(existsSync(new URL(`../assets/audio/${name}.wav`, root)), false, name);
  }
});
