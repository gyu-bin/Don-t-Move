import * as fs from 'fs';
import type { CanvasKit } from 'canvaskit-wasm';

/** Loads CanvasKit (the WASM Skia shipped with react-native-skia) for Node tooling. */
export async function initSkiaNode(): Promise<CanvasKit> {
  const g = globalThis as { CanvasKit?: CanvasKit };
  if (g.CanvasKit) return g.CanvasKit;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const init = require('canvaskit-wasm/bin/full/canvaskit.js');
  g.CanvasKit = (await init()) as CanvasKit;
  return g.CanvasKit;
}

/** Label font for guide sheets (macOS system font); null → labels are skipped. */
export function loadLabelFont(ck: CanvasKit, size: number) {
  const candidates = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial.ttf',
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const face = ck.Typeface.MakeFreeTypeFaceFromData(fs.readFileSync(p).buffer as ArrayBuffer);
    if (face) return new ck.Font(face, size);
  }
  return null;
}
