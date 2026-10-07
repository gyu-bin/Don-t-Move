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
  assert.equal(required.length, 8, 'Exactly three music and five effect sources are registered');
  const files = ['sfx/objective-pickup.wav', 'bgm/lobby.mp3', 'sfx/ui-select.wav', 'sfx/ui-back.wav', 'sfx/whistle-theft.wav', 'sfx/whistle-spotted.wav',
    'bgm/stealth.mp3', 'bgm/chase.mp3'];
  const licenses = readFileSync(new URL('../assets/audio/LICENSES.md', root), 'utf8');
  for (const file of files) {
    assert(required.includes(`../../../assets/audio/${file}`), file);
    const bytes = readFileSync(new URL(`../assets/audio/${file}`, root));
    assert(bytes.length > 1000, `${file} is a real media file`);
    if (file.endsWith('.wav')) assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert(licenses.includes(file), `${file} has documented provenance`);
  }
});

test('all generated placeholder audio is removed', () => {
  for (const name of ['intro-footstep', 'intro-turn', 'intro-freeze', 'intro-logo', 'intro-ambience', 'diamond', 'whistle']) {
    assert.equal(existsSync(new URL(`../assets/audio/${name}.wav`, root)), false, name);
  }
});

test('BGM credits preserve Lobby and identify the replacement gameplay tracks as CC0', async () => {
  const { MUSIC_CREDIT } = await import('../../game/audio/audioCredits');
  const licenses = readFileSync(new URL('../assets/audio/LICENSES.md', root), 'utf8');
  const current = licenses.split('## REPLACED')[0];
  const tracks: [string, string][] = [
    ['로비.mp3', 'Matthew Pablo'], ['Crouch jumping in your walls', 'Fupi'], ['Chase', 'Adiutorium']];
  for (const [title, author] of tracks) {
    assert(MUSIC_CREDIT.includes(title), `${title} credited in app`);
    assert(MUSIC_CREDIT.includes(author), `${author} credited in app`);
    assert(current.includes(title), `${title} documented as current`);
  }
  assert(MUSIC_CREDIT.includes('Lobby — user supplied: 로비.mp3 (Matthew Pablo metadata)'), 'Lobby credit remains unchanged');
  const gameplayCredits = MUSIC_CREDIT.split('\n').filter(line => /^(Stealth|Chase) —/.test(line));
  assert.equal(gameplayCredits.length, 2);
  for (const line of gameplayCredits) {
    assert.match(line, /CC0/);
    assert.doesNotMatch(line, /user supplied|License confirmation pending/);
  }
  assert.doesNotMatch(MUSIC_CREDIT, /Covert Affair|Kevin MacLeod/);
  assert.doesNotMatch(current, /Covert Affair|Kevin MacLeod/);
  const settings = readFileSync(new URL('ui/menu/MenuScreens.tsx', root), 'utf8');
  assert.match(settings, /\{MUSIC_CREDIT\}/, 'Settings renders the credit');
});
