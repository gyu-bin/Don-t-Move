/**
 * Visual Polish Pass 2: re-projects a box-shaped sprite painted with camera yaw into the zero-yaw view the rest of
 * the kit uses (front face + moderate top face, verticals upright, no side face). Pixel work only: the front face
 * and the top face of the existing painting are resampled into their zero-yaw positions; the side face is dropped.
 * The result is placed inside the piece's catalog objectBounds, bottom on the ground line, centred, so the
 * runtime crop, catalog and PROP_KIT stay untouched. Originals are never written; output goes to a candidate dir.
 *
 *   NODE_PATH=node_modules node tools/visual-polish/reprojectBox.cjs tools/visual-polish/pass2/lab-boxes.json [outDir]
 *
 * Parameters per piece (canvas pixel coordinates of the current runtime PNG, which labTune.cjs already levelled):
 *   left, corner        x of the front face's left edge and of the front/side corner line
 *   frontTop, bottom    y of the front face's top edge (where the top face begins) and of the ground line
 *   farLeftX, farRightX, topY   the top face's far edge (back-left and back-right corners, their y)
 *   widthScale          output front width = (corner-left) × widthScale; 1 keeps the painted front width
 *   heightScale         vertical scale of the whole piece (1 = unchanged); used to keep tall pieces under a wall cap
 *   topScale            vertical scale of the top face only (1 = same thickness as painted)
 *   edgeFade            px of the right edge of the front face to fade out, when the corner line was painted dark
 */
const fs = require('fs'), path = require('path'), {PNG} = require('pngjs');

function sample(im, x, y) {
  // Bilinear, alpha-weighted so transparent neighbours do not darken edges.
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  let r = 0, g = 0, b = 0, a = 0;
  for (const [xx, yy, w] of [[x0, y0, (1 - tx) * (1 - ty)], [x0 + 1, y0, tx * (1 - ty)], [x0, y0 + 1, (1 - tx) * ty], [x0 + 1, y0 + 1, tx * ty]]) {
    if (xx < 0 || yy < 0 || xx >= im.width || yy >= im.height || w === 0) continue;
    const i = (yy * im.width + xx) * 4, al = im.data[i + 3] / 255 * w;
    r += im.data[i] * al; g += im.data[i + 1] * al; b += im.data[i + 2] * al; a += al;
  }
  return a > 0 ? [r / a, g / a, b / a, a * 255] : [0, 0, 0, 0];
}

function reproject(src, p, bounds, pivotY) {
  const out = new PNG({width: src.width, height: src.height});
  // `front` may be a 4-corner quad {tl,tr,br,bl} when the painting has converging edges; the plain
  // left/corner/frontTop/bottom rectangle is the special case of that.
  const q = p.front ?? {tl: [p.left, p.frontTop], tr: [p.corner, p.frontTop], br: [p.corner, p.bottom], bl: [p.left, p.bottom]};
  const frontW = ((q.tr[0] - q.tl[0]) + (q.br[0] - q.bl[0])) / 2, frontH = ((q.bl[1] - q.tl[1]) + (q.br[1] - q.tr[1])) / 2;
  const topH = (q.tl[1] + q.tr[1]) / 2 - p.topY;
  const sy = p.heightScale ?? 1, outFrontW = frontW * (p.widthScale ?? 1), outFrontH = frontH * sy, outTopH = topH * sy * (p.topScale ?? 1);
  const ground = bounds.y + bounds.h * pivotY, cx = bounds.x + bounds.w / 2;
  // Stickers that overhang the right edge count towards the centred width.
  const overhang = Math.max(0, ...(p.stickers ?? []).filter(s => !s.anchor || s.anchor === 'right').map(s => (s.dx ?? 0) + s.src.w));
  const topRise = Math.max(0, ...(p.stickers ?? []).filter(s => s.anchor === 'top').map(s => s.src.h * sy - (s.dy ?? 0)));
  const oxL = cx - (outFrontW + overhang) / 2, oyFrontTop = ground - outFrontH, oyTop = oyFrontTop - outTopH;
  if (outFrontW + overhang > bounds.w + 0.5 || oyTop - topRise < bounds.y - 0.5) throw Error(`${p.id}: result ${outFrontW.toFixed(0)}×${(ground - oyTop).toFixed(0)} does not fit objectBounds ${bounds.w}×${bounds.h}`);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const px = x + 0.5, py = y + 0.5;
    const u = (px - oxL) / outFrontW;
    if (u < 0 || u > 1) continue;
    // Anti-alias the cut left/right boundary over one output pixel.
    let sx, sy2, fade = Math.min(1, (px - oxL) + 0.5, (oxL + outFrontW - px) + 0.5);
    const nearX = q.tl[0] + u * (q.tr[0] - q.tl[0]), nearY = q.tl[1] + u * (q.tr[1] - q.tl[1]);
    if (py >= oyFrontTop && py <= ground) {
      // Front face: painted quad → rectangle (bilinear).
      const v = (py - oyFrontTop) / outFrontH, lowX = q.bl[0] + u * (q.br[0] - q.bl[0]), lowY = q.bl[1] + u * (q.br[1] - q.bl[1]);
      sx = nearX + v * (lowX - nearX); sy2 = nearY + v * (lowY - nearY);
      if (p.edgeFade) fade = Math.min(fade, (oxL + outFrontW - px) / p.edgeFade);
    } else if (py >= oyTop && py < oyFrontTop) {
      // Top face: the painted trapezoid (near edge on the front, far edge at the back) → rectangle.
      const v = (py - oyTop) / outTopH; // 0 at the far edge, 1 at the front edge
      const farX = p.farLeftX + u * (p.farRightX - p.farLeftX);
      sx = farX + v * (nearX - farX); sy2 = p.topY + v * (nearY - p.topY);
    } else continue;
    const [r, g, b, a] = sample(src, sx - 0.5, sy2 - 0.5);
    const i = (y * out.width + x) * 4;
    out.data[i] = Math.round(r); out.data[i + 1] = Math.round(g); out.data[i + 2] = Math.round(b); out.data[i + 3] = Math.round(a * fade);
  }
  // Stickers: parts that live on the dropped side face but belong to the object's identity (a lever, a handle)
  // are copied unwarped and composited at the output's right edge: {src:{x,y,w,h}, dx, dy} with dx from the
  // right edge of the new front, dy from the old front-top row (scaled like the front).
  for (const s of p.stickers ?? []) {
    // anchor "right" (default): beside the new front's right edge. anchor "top": centred on the object, its bottom
    // on the object's top row (a beacon, a sign), dy moving it down into the paint.
    // anchor "left": dx from the new front's left edge, dy from the front-top row (a rail extension, a post).
    const ox = s.anchor === 'top' ? oxL + outFrontW / 2 - s.src.w / 2 + (s.dx ?? 0) : s.anchor === 'left' ? oxL + (s.dx ?? 0) : oxL + outFrontW + (s.dx ?? 0);
    const oy = s.anchor === 'top' ? oyTop - s.src.h * sy + (s.dy ?? 0) : oyFrontTop + ((s.src.y - (s.anchor === 'left' ? q.tl[1] : q.tr[1])) * sy) + (s.dy ?? 0);
    for (let y = 0; y < s.src.h; y++) for (let x = 0; x < s.src.w; x++) {
      const si = ((s.src.y + y) * src.width + s.src.x + x) * 4, a = src.data[si + 3] / 255;
      if (a === 0) continue;
      const dx = Math.round(ox + x), dy = Math.round(oy + y * sy);
      if (dx < 0 || dy < 0 || dx >= out.width || dy >= out.height) continue;
      const di = (dy * out.width + dx) * 4, a0 = out.data[di + 3] / 255, aOut = a + a0 * (1 - a);
      for (let k = 0; k < 3; k++) out.data[di + k] = Math.round((src.data[si + k] * a + out.data[di + k] * a0 * (1 - a)) / (aOut || 1));
      out.data[di + 3] = Math.round(aOut * 255);
    }
  }
  return {out, placed: {x: oxL, y: oyTop, w: outFrontW, h: ground - oyTop}};
}

/** mode "scale": the whole object resampled by heightScale (and widthScale), bottom on the ground line, centred. */
function rescale(src, p, bounds, pivotY) {
  let x0 = src.width, x1 = -1, y0 = src.height, y1 = -1;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) if (src.data[(y * src.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, sx = p.widthScale ?? 1, sy = p.heightScale ?? 1;
  const ground = bounds.y + bounds.h * pivotY, cx = bounds.x + bounds.w / 2;
  const oxL = cx - w * sx / 2, oyT = ground - h * sy;
  const out = new PNG({width: src.width, height: src.height});
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const u = (x + 0.5 - oxL) / (w * sx), v = (y + 0.5 - oyT) / (h * sy);
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    const [r, g, b, a] = sample(src, x0 + u * w - 0.5, y0 + v * h - 0.5), i = (y * out.width + x) * 4;
    out.data[i] = Math.round(r); out.data[i + 1] = Math.round(g); out.data[i + 2] = Math.round(b); out.data[i + 3] = Math.round(a);
  }
  return {out, placed: {x: oxL, y: oyT, w: w * sx, h: h * sy}};
}

function main() {
  const [paramsFile, outDirArg] = process.argv.slice(2);
  if (!paramsFile) throw Error('usage: reprojectBox.cjs <params.json> [outDir]');
  const params = JSON.parse(fs.readFileSync(paramsFile, 'utf8'));
  const catalog = JSON.parse(fs.readFileSync('assets/environment/environment-assets.json', 'utf8')).assets;
  const outDir = outDirArg ?? params.outDir;
  fs.mkdirSync(outDir, {recursive: true});
  for (const p of params.pieces) {
    const asset = catalog.find(a => a.id === p.id);
    if (!asset) throw Error(`unknown asset ${p.id}`);
    const src = PNG.sync.read(fs.readFileSync(asset.path));
    const bounds = asset.objectBounds ?? {x: 0, y: 0, w: src.width, h: src.height};
    const {out, placed} = (p.mode === 'scale' ? rescale : reproject)(src, p, bounds, asset.pivot.y);
    const file = path.join(outDir, `${p.id}.png`);
    fs.writeFileSync(file, PNG.sync.write(out));
    console.log(`${p.id}: ${asset.path} → ${file}; object now ${placed.w.toFixed(0)}×${placed.h.toFixed(0)} px at x ${placed.x.toFixed(0)}, top y ${placed.y.toFixed(0)} (bounds ${bounds.w}×${bounds.h})`);
  }
}
main();
