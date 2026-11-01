/**
 * Visual Art Final Pass: lab_gas_rack yaw fix by depth-layer re-alignment (pixel work, no repaint).
 * The painting was made with camera yaw: things deeper in the cage are offset to the right in proportion to their
 * depth. Measured on assets/environment/lab/polished/lab_gas_rack.png (canvas px):
 *   front posts  x 85–94 / 261–271   (depth 0)
 *   cylinders    x 105–279            (mid depth, ≈ −11 px to align)
 *   back frame   top rail + back posts x 111–291 (full depth, ≈ −22 px to align)
 *   base plate   front edge slopes 17 px down to the right; its right side face is visible
 * Rebuild: back frame shifted −22 and drawn first, cylinders + chain shifted −11, the base front levelled (vertical
 * shear of the base layer only) with its side face dropped, the left front post unchanged and the right front post
 * rebuilt as its mirror (the yawed one showed a side face); cylinder 4's part hidden behind that post is filled from
 * the same columns of cylinder 3. The whole result is re-centred on the catalog objectBounds (same canvas, same
 * bounds, bottom on the ground row) so the prop stands where it did. Everything is the original paint.
 *
 *   NODE_PATH=node_modules node tools/visual-polish/final-art/gasRackRebuild.cjs <out.png>
 */
const fs = require('fs'), {PNG} = require('pngjs');
const SRC = 'assets/environment/lab/polished/lab_gas_rack.png';
const out = process.argv[2];
if (!out) throw Error('usage: gasRackRebuild.cjs <out.png>');
const src = PNG.sync.read(fs.readFileSync(SRC)), W = src.width, H = src.height;
const dst = new PNG({width: W, height: H});

// Regions (inclusive-exclusive) in source canvas px, each with a horizontal shift and an optional base shear.
const RAIL_BOTTOM = 62, POST_TOP = 104, BASE_TOP = 334;
// back frame: the top rail, plus the back posts' columns above the cylinder caps (back-left 108–120, back-right 279–294)
const inBack = (x, y) => (y < RAIL_BOTTOM && x >= 104) || (y < 86 && ((x >= 108 && x < 120) || (x >= 279 && x < 295)));
// cylinders + chain: everything between the front posts below the rail, except the back posts above the caps and
// the right side rails beyond cylinder 4 (x ≥ 279)
const inCyl = (x, y) => y >= RAIL_BOTTOM && y < BASE_TOP + 10 && x >= 98 && x < 279 && !(y < 86 && x >= 108 && x < 120);
const inBase = (x, y) => y >= BASE_TOP && x < 276;                                        // base plate without its right side face
const inLeftPost = (x, y) => x >= 84 && x < 97 && y >= POST_TOP && y < BASE_TOP + 24;
// Base front edge: y 355 at x 74 → y 372 at x 264. Level it to the left height.
const baseShear = x => -17 * (x - 74) / 190;

/** Like blit, but each destination-region pixel (x,y) reads the source at map(x,y). */
function blitMapped(test, map, dx, clipY) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!test(x, y)) continue;
    const [sx, sy] = map(x, y); if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const i = (sy * W + sx) * 4, a = src.data[i + 3]; if (!a) continue;
    const nx = x + dx, ny = y; if (nx < 0 || nx >= W || (clipY !== undefined && ny > clipY)) continue;
    const j = (ny * W + nx) * 4, af = a / 255, ab = dst.data[j + 3] / 255, ao = af + ab * (1 - af);
    for (let k = 0; k < 3; k++) dst.data[j + k] = Math.round((src.data[i + k] * af + dst.data[j + k] * ab * (1 - af)) / (ao || 1));
    dst.data[j + 3] = Math.round(ao * 255);
  }
}
function blit(test, dx, shearOf, clipY) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!test(x, y)) continue;
    const i = (y * W + x) * 4, a = src.data[i + 3];
    if (!a) continue;
    const nx = x + dx, ny = Math.round(y + (shearOf ? shearOf(x) : 0));
    if (nx < 0 || nx >= W || ny < 0 || ny >= H || (clipY !== undefined && ny > clipY)) continue;
    const j = (ny * W + nx) * 4, af = a / 255, ab = dst.data[j + 3] / 255, ao = af + ab * (1 - af);
    for (let k = 0; k < 3; k++) dst.data[j + k] = Math.round((src.data[i + k] * af + dst.data[j + k] * ab * (1 - af)) / (ao || 1));
    dst.data[j + 3] = Math.round(ao * 255);
  }
}
blit(inBack, -22);                       // back frame first (behind everything)
// Cylinders and chain. The right part of cylinder 4 (x 259–279) was painted behind the yawed front-right post;
// it is rebuilt from the same columns of cylinder 3, one cylinder pitch (41 px) to the left.
const PITCH = 41, HIDDEN = [259, 279];
blitMapped((x, y) => inCyl(x, y), (x, y) => (x >= HIDDEN[0] && x < HIDDEN[1] && y >= 86) ? [x - PITCH, y] : [x, y], -11);
blit(inBase, 0, baseShear);              // levelled base
blit(inLeftPost, 0);                     // left front post
// Right front post = the left post mirrored about the cage centre, so both posts match in width, shading and height.
const CX = 178;
blitMapped((x, y) => x >= 2 * CX - 97 && x <= 2 * CX - 84 && y >= POST_TOP && y < BASE_TOP + 24, (x, y) => [2 * CX - x, y], 0, 357);

// Re-centre on the catalog bounds and put the lowest pixel back on the ground row.
const cat = JSON.parse(fs.readFileSync('assets/environment/environment-assets.json', 'utf8')).assets.find(a => a.id === 'lab_gas_rack');
const ob = cat.objectBounds, ground = ob.y + ob.h * cat.pivot.y - 1;
let x0 = W, x1 = -1, y1 = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dst.data[(y * W + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
const sx = Math.round(ob.x + ob.w / 2 - (x0 + x1 + 1) / 2), sy = Math.round(ground - y1);
const fin = new PNG({width: W, height: H});
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const nx = x + sx, ny = y + sy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
  const i = (y * W + x) * 4, j = (ny * W + nx) * 4; for (let k = 0; k < 4; k++) fin.data[j + k] = dst.data[i + k];
}
fs.mkdirSync(require('path').dirname(out), {recursive: true});
fs.writeFileSync(out, PNG.sync.write(fin));
console.log(`${SRC} → ${out}: object x ${x0 + sx}–${x1 + sx}, bottom ${y1 + sy} (shift ${sx},${sy})`);
