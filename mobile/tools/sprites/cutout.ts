/**
 * Background removal shared by the sprite extraction tools.
 * Flood-fills background from the crop border (so interior details that
 * happen to match the background survive), assigns partial alpha to
 * anti-aliased edge pixels and colour-decontaminates them, then drops
 * detached specks.
 */
export interface Cut {
  w: number;
  h: number;
  rgba: Uint8ClampedArray; // unpremultiplied, alpha applied
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * How the background is recognised:
 *  - checker: painted grey/white checkerboard "transparency" (+ baked ground
 *    shadow): light, low-saturation pixels
 *  - solid:   a flat panel colour (sampled from the crop border). A pixel is
 *    background when it is that colour shifted EVENLY on all channels —
 *    lighter by ≤ maxLighten (compression noise) or darker by ≤ maxDarken
 *    (a baked ground shadow). Uneven shifts (warm hair, skin) and much darker
 *    pixels (outline) are kept, so dark art on a dark panel survives.
 */
export type Keyer =
  | { kind: 'checker' }
  | { kind: 'solid'; maxDarken: number; maxLighten: number; spread: number }
  /** Flat chroma colour (e.g. #00ff00): alpha from how much of the key colour a pixel contains. */
  | { kind: 'chroma'; color: [number, number, number] }
  /** Source already has real transparency: keep its alpha. */
  | { kind: 'alpha' };

/** For chroma keys: fraction (0..1) of the key colour's dominant channel excess present in a pixel. */
function keyAmount(r: number, g: number, b: number, key: [number, number, number]): number {
  const k = key[0] >= key[1] && key[0] >= key[2] ? 0 : key[1] >= key[2] ? 1 : 2;
  const c = [r, g, b];
  const others = [0, 1, 2].filter((i) => i !== k);
  const excess = c[k] - Math.max(c[others[0]], c[others[1]]);
  const keyExcess = key[k] - Math.max(key[others[0]], key[others[1]]);
  return Math.max(0, Math.min(1, excess / Math.max(1, keyExcess)));
}

/** Mean colour of the crop's 2-px border (the local background for solid keying). */
function borderColour(src: Uint8Array, W: number, x0: number, y0: number, w: number, h: number): number[] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x > 1 && y > 1 && x < w - 2 && y < h - 2) continue;
      const i = ((y0 + y) * W + (x0 + x)) * 4;
      r += src[i];
      g += src[i + 1];
      b += src[i + 2];
      n++;
    }
  }
  return [r / n, g / n, b / n];
}

/** Background removal for one cell crop. */
export function cutCell(
  src: Uint8Array,
  W: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  keyer: Keyer,
): Cut {
  if (keyer.kind === 'alpha' || keyer.kind === 'chroma') {
    const out = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = ((y0 + y) * W + (x0 + x)) * 4;
        const o = (y * w + x) * 4;
        let r = src[i];
        let g = src[i + 1];
        let b = src[i + 2];
        let a = src[i + 3] / 255;
        if (keyer.kind === 'chroma') {
          const kc = keyer.color;
          a = 1 - keyAmount(r, g, b, kc);
          if (a > 0 && a < 1) {
            // Remove key-colour spill from the edge pixel.
            r = (r - (1 - a) * kc[0]) / a;
            g = (g - (1 - a) * kc[1]) / a;
            b = (b - (1 - a) * kc[2]) / a;
          }
        }
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = Math.round(a * 255);
      }
    }
    return { w, h, rgba: out };
  }
  const panel = keyer.kind === 'solid' ? borderColour(src, W, x0, y0, w, h) : null;
  const out = new Uint8ClampedArray(w * h * 4);
  const bgLike = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * W + (x0 + x)) * 4;
      const r = src[i];
      const g = src[i + 1];
      const b = src[i + 2];
      if (panel && keyer.kind === 'solid') {
        const dr = panel[0] - r;
        const dg = panel[1] - g;
        const db = panel[2] - b;
        const spread = Math.max(dr, dg, db) - Math.min(dr, dg, db);
        const mean = (dr + dg + db) / 3;
        bgLike[y * w + x] =
          spread <= keyer.spread && mean <= keyer.maxDarken && mean >= -keyer.maxLighten ? 1 : 0;
      } else {
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const L = lum(r, g, b);
        // Checker squares are ~200–255; baked shadows darken them to ~120.
        bgLike[y * w + x] = sat <= 24 && L >= 118 ? 1 : 0;
      }
      out[(y * w + x) * 4] = r;
      out[(y * w + x) * 4 + 1] = g;
      out[(y * w + x) * 4 + 2] = b;
      out[(y * w + x) * 4 + 3] = 255;
    }
  }
  // Flood fill background from the border through bg-like pixels.
  const bg = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (bg[k] || !bgLike[k]) return;
    bg[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length) {
    const k = stack.pop()!;
    const x = k % w;
    const y = (k / w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  // Alpha + decontamination.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      const o = k * 4;
      if (bg[k]) {
        out[o + 3] = 0;
        continue;
      }
      // Edge pixel? find neighbouring background colour.
      let br = 0;
      let bgc = 0;
      let bb = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const kk = yy * w + xx;
          if (!bg[kk]) continue;
          const i = ((y0 + yy) * W + (x0 + xx)) * 4;
          br += src[i];
          bgc += src[i + 1];
          bb += src[i + 2];
          n++;
        }
      }
      if (n === 0) continue;
      br /= n;
      bgc /= n;
      bb /= n;
      let a: number;
      if (panel) {
        // Edge pixel = blend of the panel and the (darker) outline: alpha from colour distance.
        const dist = Math.abs(out[o] - br) + Math.abs(out[o + 1] - bgc) + Math.abs(out[o + 2] - bb);
        a = Math.max(0.08, Math.min(1, dist / 40));
      } else {
        const Lb = lum(br, bgc, bb);
        const Lp = lum(out[o], out[o + 1], out[o + 2]);
        const FG = 42; // typical outline/fill luminance of the character edge
        a = Math.max(0.08, Math.min(1, (Lb - Lp) / Math.max(1, Lb - FG)));
      }
      out[o] = (out[o] - (1 - a) * br) / a;
      out[o + 1] = (out[o + 1] - (1 - a) * bgc) / a;
      out[o + 2] = (out[o + 2] - (1 - a) * bb) / a;
      out[o + 3] = Math.round(a * 255);
    }
  }
  // Drop small detached specks (generator smudges on the checker).
  const comp = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  for (let k = 0; k < w * h; k++) {
    if (out[k * 4 + 3] < 128 || comp[k] >= 0) continue;
    const id = sizes.length;
    let size = 0;
    const st = [k];
    comp[k] = id;
    while (st.length) {
      const q = st.pop()!;
      size++;
      const qx = q % w;
      const qy = (q / w) | 0;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const xx = qx + dx;
        const yy = qy + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const kk = yy * w + xx;
        if (comp[kk] >= 0 || out[kk * 4 + 3] < 128) continue;
        comp[kk] = id;
        st.push(kk);
      }
    }
    sizes.push(size);
  }
  const main = sizes.indexOf(Math.max(...sizes));
  for (let k = 0; k < w * h; k++) {
    if (comp[k] >= 0 && comp[k] !== main && sizes[comp[k]] < 40) comp[k] = -2;
  }
  // Keep only pixels within 2 px of the body (removes faint shadow/smudge remnants).
  const R = 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (out[k * 4 + 3] === 0) continue;
      let near = false;
      for (let dy = -R; dy <= R && !near; dy++) {
        for (let dx = -R; dx <= R && !near; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const c = comp[yy * w + xx];
          if (c >= 0 && (c === main || sizes[c] >= 40)) near = true;
        }
      }
      if (!near) out[k * 4 + 3] = 0;
    }
  }
  return { w, h, rgba: out };
}

export interface Box {
  top: number;
  bottom: number;
  left: number;
  right: number;
  torsoX: number;
}

export function measure(c: Cut): Box {
  let top = c.h;
  let bottom = -1;
  let left = c.w;
  let right = -1;
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (c.rgba[(y * c.w + x) * 4 + 3] < 128) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    }
  }
  // Torso/head centre: opaque pixels in the upper 55 % of the silhouette.
  const limit = top + (bottom - top) * 0.55;
  let sx = 0;
  let n = 0;
  for (let y = top; y <= limit; y++) {
    for (let x = 0; x < c.w; x++) {
      if (c.rgba[(y * c.w + x) * 4 + 3] >= 128) {
        sx += x;
        n++;
      }
    }
  }
  return { top, bottom, left, right, torsoX: n ? sx / n : (left + right) / 2 };
}
