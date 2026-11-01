/**
 * Visual Polish: read-only checks for swapping runtime art without changing the game. Writes nothing.
 * Run from mobile/ (the tsconfig maps react-native-skia to the Node shim):
 *   TSX_TSCONFIG_PATH=tools/sprites/tsconfig.runtime.json node --import tsx tools/visual-polish/artSwapCheck.ts <command>
 *     usage [--json]                     which environment pictures each mission really draws, with size on screen
 *     check <assetId> <candidate.png>    a repainted environment piece against the piece it replaces
 *     dupes                              runtime images whose decoded pixels are identical
 * Character sheets: use `npm run locomotion:validate` / `tools/locomotion/validate.ts <dir>` (see VISUAL_CONTRACT.md).
 * `check` exits 1 when it finds an error.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import crypto from 'node:crypto';
import fs from 'node:fs';
import {initSkiaNode} from '../sprites/skiaNode';
import {pixelDiagnostics, type EnvironmentManifest} from '../environment/contract';

require.extensions['.png'] = module => { module.exports = 0; };
const {environmentAssetForProp} = require('../../src/assets/environmentKit');
const {PROP_KIT} = require('../../src/game/world/propKit');
const {compileStage} = require('../../src/game/world/compileStage');
const {campaignStages} = require('../../src/game/levels/campaignStages');

const TILE = 40;
const CATALOG: EnvironmentManifest = JSON.parse(fs.readFileSync('assets/environment/environment-assets.json', 'utf8'));
const CHARACTER_SHEETS = ['player_idle', 'player_sneak', 'player_walk', 'player_run', 'guard_idle', 'guard_walk', 'guard_run', 'guard_whistle', 'guard_search']
  .map(n => `assets/characters/${n}.png`);

type Rgba = {w: number; h: number; px: Uint8Array};
async function decoder() {
  const ck = await initSkiaNode();
  return (file: string): Rgba => {
    const img = ck.MakeImageFromEncoded(fs.readFileSync(file));
    if (!img) throw Error(`cannot decode ${file}`);
    const w = img.width(), h = img.height();
    const px = img.readPixels(0, 0, {width: w, height: h, colorType: ck.ColorType.RGBA_8888, alphaType: ck.AlphaType.Unpremul, colorSpace: ck.ColorSpace.SRGB}) as Uint8Array;
    img.delete();
    return {w, h, px};
  };
}

/** Every prop of every mission, with the picture the runtime picks and its drawn size (world units). */
function placements() {
  const rows: {mission: string; kind: string; asset: string | null; drawW: number; drawH: number | null; pxPerWorld: number | null}[] = [];
  for (const def of campaignStages) for (const p of compileStage(def).props) {
    const id: string | undefined = environmentAssetForProp(def, p);
    const a = id ? CATALOG.assets.find(x => x.id === id) : undefined;
    const b = a?.objectBounds ?? (a ? {w: a.resolution.width, h: a.resolution.height} : null);
    const drawW = PROP_KIT[p.kind].drawWidth * TILE * p.scale;
    rows.push({mission: def.id, kind: p.kind, asset: id ?? null, drawW, drawH: b ? drawW * b.h / b.w : null, pxPerWorld: b ? b.w / drawW : null});
  }
  return rows;
}

function usage(json: boolean) {
  const rows = placements();
  const byAsset = new Map<string, typeof rows>();
  for (const r of rows) byAsset.set(r.asset ?? `(vector) ${r.kind}`, [...(byAsset.get(r.asset ?? `(vector) ${r.kind}`) ?? []), r]);
  const summary = [...byAsset].map(([asset, list]) => {
    const dens = list.map(r => r.pxPerWorld).filter((v): v is number => v !== null), hs = list.map(r => r.drawH).filter((v): v is number => v !== null);
    return {asset, placed: list.length, missions: [...new Set(list.map(r => r.mission))],
      pxPerWorld: dens.length ? [Math.min(...dens), Math.max(...dens)].map(v => +v.toFixed(2)) : null,
      heightTiles: hs.length ? [Math.min(...hs), Math.max(...hs)].map(v => +(v / TILE).toFixed(2)) : null};
  }).sort((a, b) => a.asset.localeCompare(b.asset));
  const placed = new Set(rows.map(r => r.asset));
  const notPlaced = CATALOG.assets.map(a => a.id).filter(id => !placed.has(id));
  if (json) { console.log(JSON.stringify({summary, notPlacedAsProp: notPlaced}, null, 1)); return; }
  for (const s of summary) console.log(`${s.asset.padEnd(34)} ×${String(s.placed).padStart(3)}  px/world ${JSON.stringify(s.pxPerWorld)}  height ${JSON.stringify(s.heightTiles)} tiles  ${s.missions.length} missions`);
  console.log(`\nNot placed as a prop (${notPlaced.length}; some are drawn by special code, see VISUAL_CONTRACT.md):\n${notPlaced.join(', ')}`);
}

function luminance(img: Rgba) {
  let sum = 0, n = 0;
  for (let i = 0; i < img.px.length; i += 4) if (img.px[i + 3] > 200) { sum += 0.2126 * img.px[i] + 0.7152 * img.px[i + 1] + 0.0722 * img.px[i + 2]; n++; }
  return n ? sum / n : 0;
}

/** Dark, part-transparent pixels in the lower half with no solid pixel nearby: a painted floor shadow (labTune.cjs dropShadow). */
function paintedShadowPixels(img: Rgba, from: number) {
  let n = 0;
  const A = (x: number, y: number) => img.px[(y * img.w + x) * 4 + 3];
  for (let y = Math.floor(from); y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4, a = img.px[i + 3];
    if (a === 0 || a >= 200 || Math.max(img.px[i], img.px[i + 1], img.px[i + 2]) >= 120) continue;
    let solid = false;
    for (let dy = -2; dy <= 2 && !solid; dy++) for (let dx = -2; dx <= 2; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < img.w && yy < img.h && A(xx, yy) >= 250) { solid = true; break; }
    }
    if (!solid) n++;
  }
  return n;
}

async function check(id: string, candidate: string) {
  const asset = CATALOG.assets.find(a => a.id === id);
  if (!asset) throw Error(`unknown asset id ${id} (see assets/environment/environment-assets.json)`);
  const decode = await decoder();
  const errors: string[] = [], warnings: string[] = [], notes: string[] = [];
  if (!fs.readFileSync(candidate).subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) errors.push('not a PNG file');
  const now = decode(asset.path), cand = decode(candidate);
  if (cand.w !== asset.resolution.width || cand.h !== asset.resolution.height) errors.push(`canvas ${cand.w}×${cand.h}, must stay ${asset.resolution.width}×${asset.resolution.height}`);
  const d = pixelDiagnostics(cand.px, cand.w, cand.h);
  if (!d.bounds) errors.push('empty image');
  if (d.transparentFraction < 0.01) errors.push('no transparent background (flattened or checkerboard)');
  if (d.cornerAlpha.some(a => a > 16)) errors.push('visible pixels in a canvas corner');
  if (d.edgePixels) warnings.push(`${d.edgePixels} visible pixels touch the canvas edge (clipped?)`);
  const ob = asset.objectBounds, b = d.bounds;
  if (ob && b) {
    // The runtime crops to the catalog objectBounds, so anything outside it is cut off.
    const over = Math.max(ob.x - b.x, ob.y - b.y, b.x + b.w - (ob.x + ob.w), b.y + b.h - (ob.y + ob.h));
    if (over > 1) errors.push(`object ${JSON.stringify(b)} extends outside catalog objectBounds ${JSON.stringify(ob)}: it would be cropped`);
    const drawn = placements().filter(r => r.asset === id);
    const pxPerWorld = drawn.length ? Math.min(...drawn.map(r => r.pxPerWorld!)) : ob.w / (asset.drawWidth * TILE);
    const groundRow = ob.y + ob.h * asset.pivot.y, lift = groundRow - (b.y + b.h);
    if (Math.abs(lift) > 2) warnings.push(`lowest pixel ${lift > 0 ? 'above' : 'below'} the ground line by ${Math.abs(lift).toFixed(0)} px ≈ ${(Math.abs(lift) / pxPerWorld).toFixed(1)} world units (${lift > 0 ? 'floats' : 'sinks'})`);
    const sideGap = Math.max(b.x - ob.x, ob.x + ob.w - (b.x + b.w));
    if (sideGap > 4) warnings.push(`object is ${sideGap} px narrower than its catalog bounds on one side: it draws smaller / off-centre`);
    notes.push(`drawn in ${new Set(drawn.map(r => r.mission)).size} missions; ${pxPerWorld.toFixed(2)} px per world unit at the largest placement`);
  }
  const nb = pixelDiagnostics(now.px, now.w, now.h).bounds;
  if (b && nb) {
    // Dark glass and soft edges also count, so compare with the piece being replaced rather than with zero.
    const shadow = paintedShadowPixels(cand, b.y + b.h * 0.5), before = paintedShadowPixels(now, nb.y + nb.h * 0.5);
    if (shadow > before * 1.5 + b.w) warnings.push(`${shadow} soft dark pixels in the lower half (current piece: ${before}): a painted floor shadow? Structures carry none`);
  }
  const l0 = luminance(now), l1 = luminance(cand);
  if (l0 && Math.abs(l1 / l0 - 1) > 0.15) warnings.push(`mean brightness ${l1.toFixed(0)} vs current ${l0.toFixed(0)} (${((l1 / l0 - 1) * 100).toFixed(0)}%)`);
  console.log(JSON.stringify({id, candidate, current: asset.path, objectBounds: ob, candidateBounds: b, errors, warnings, notes}, null, 1));
  if (errors.length) process.exitCode = 1;
}

async function dupes() {
  const decode = await decoder();
  const files = [...CATALOG.assets.map(a => a.path), ...CHARACTER_SHEETS, 'assets/museum/museum_atlas.png'];
  const seen = new Map<string, string[]>();
  for (const f of files) {
    const img = decode(f), key = crypto.createHash('md5').update(img.px).digest('hex') + `:${img.w}x${img.h}`;
    seen.set(key, [...(seen.get(key) ?? []), f]);
  }
  const groups = [...seen.values()].filter(g => g.length > 1);
  console.log(groups.length ? groups.map(g => g.join('  ==  ')).join('\n') : 'no pixel-identical runtime images');
}

const [cmd, a1, a2] = process.argv.slice(2);
if (cmd === 'usage') usage(a1 === '--json');
else if (cmd === 'check' && a1 && a2) void check(a1, a2);
else if (cmd === 'dupes') void dupes();
else { console.error('usage: artSwapCheck.ts usage [--json] | check <assetId> <candidate.png> | dupes'); process.exitCode = 2; }
