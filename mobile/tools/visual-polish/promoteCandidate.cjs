/**
 * Visual Polish Pass 3: promotes an approved candidate PNG into production without touching the original file.
 * The candidate is copied to `assets/environment/<venue>/polished/<id>.png` (with the metadata sidecar), and the
 * two places the runtime reads the path from are switched to it: the `require` line in
 * `src/assets/environmentKit.ts` and `path`/`image` in `assets/environment/environment-assets.json`. The original
 * stays byte-identical at its old path, so reverting is `--revert <id>` (paths switched back, polished copy removed).
 *
 *   node tools/visual-polish/promoteCandidate.cjs <id> <candidate.png>      promote
 *   node tools/visual-polish/promoteCandidate.cjs --revert <id>              put the original path back
 *
 * Nothing about collision, LOS, objectBounds or pivot changes: the candidate must already have passed
 * `artSwapCheck.ts check` (same canvas, inside the same objectBounds, bottom on the ground line).
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const KIT = 'src/assets/environmentKit.ts', CATALOG = 'assets/environment/environment-assets.json';
const md5 = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');

const args = process.argv.slice(2), revert = args[0] === '--revert', id = revert ? args[1] : args[0], candidate = args[1];
if (!id || (!revert && !candidate)) throw Error('usage: promoteCandidate.cjs <id> <candidate.png> | --revert <id>');
const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const asset = catalog.assets.find(a => a.id === id);
if (!asset) throw Error(`unknown asset ${id}`);
const kit = fs.readFileSync(KIT, 'utf8');
const line = new RegExp(`^ ${id}:require\\('\\.\\.\\/\\.\\.\\/(assets\\/environment\\/[^']+)'\\),$`, 'm');
const m = kit.match(line);
if (!m) throw Error(`${id}: no require line in ${KIT}`);
if (m[1] !== asset.path) throw Error(`${id}: kit (${m[1]}) and catalog (${asset.path}) disagree; fix that first`);

const venue = asset.path.split('/')[2];
const polished = `assets/environment/${venue}/polished/${id}.png`, polishedSide = polished.replace('.png', '.metadata.json');
const catalogText = fs.readFileSync(CATALOG, 'utf8');

function switchPaths(to) {
  fs.writeFileSync(KIT, kit.replace(line, ` ${id}:require('../../${to}'),`));
  // Edit the two path strings in place so the catalog keeps its formatting; nothing else in the entry changes.
  const from = asset.path, re = new RegExp(`("(?:path|image)":\\s*)"${from.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"`, 'g');
  const next = catalogText.replace(re, `$1"${to}"`);
  if (next === catalogText) throw Error(`${id}: path ${from} not found in the catalog text`);
  fs.writeFileSync(CATALOG, next);
}

if (revert) {
  if (!asset.path.includes('/polished/')) throw Error(`${id} is not promoted`);
  if (!fs.existsSync(polishedSide)) throw Error(`${polishedSide} missing: cannot tell where the original lives`);
  const back = JSON.parse(fs.readFileSync(polishedSide, 'utf8')).polishedFrom.original;
  if (!fs.existsSync(back)) throw Error(`original missing: ${back}`);
  switchPaths(back);
  for (const f of [polished, polishedSide]) fs.unlinkSync(f);
  console.log(`${id}: reverted to ${back} (md5 ${md5(back)})`);
} else {
  if (asset.path.includes('/polished/')) throw Error(`${id} is already promoted; --revert first`);
  if (!fs.existsSync(candidate)) throw Error(`candidate missing: ${candidate}`);
  const original = asset.path;
  fs.mkdirSync(path.dirname(polished), {recursive: true});
  fs.copyFileSync(candidate, polished);
  const side = original.replace('.png', '.metadata.json');
  const meta = fs.existsSync(side) ? JSON.parse(fs.readFileSync(side, 'utf8')) : {};
  meta.path = polished;
  meta.polishedFrom = {original, originalMd5: md5(original), candidate, candidateMd5: md5(candidate), date: new Date().toISOString().slice(0, 10)};
  fs.writeFileSync(polishedSide, JSON.stringify(meta, null, 2) + '\n');
  switchPaths(polished);
  console.log(`${id}: ${original} (md5 ${md5(original)}, untouched) → runtime now reads ${polished} (md5 ${md5(polished)})`);
}
