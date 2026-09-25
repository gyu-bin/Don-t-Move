import type { SkCanvas, SkPaint } from '@shopify/react-native-skia';

/**
 * Reusable mutable geometry objects that live on the UI runtime.
 * Draw helpers mutate these instead of allocating a rect per call, so the
 * render loop produces (almost) no garbage.
 */
interface Scratch {
  rect: { x: number; y: number; width: number; height: number };
  rrect: { rect: { x: number; y: number; width: number; height: number }; rx: number; ry: number };
}

declare const globalThis: { __dmScratch?: Scratch };

export function scratch(): Scratch {
  'worklet';
  let s = globalThis.__dmScratch;
  if (s === undefined) {
    const rect = { x: 0, y: 0, width: 0, height: 0 };
    s = { rect, rrect: { rect: { x: 0, y: 0, width: 0, height: 0 }, rx: 0, ry: 0 } };
    globalThis.__dmScratch = s;
  }
  return s;
}

export function fillRRect(
  canvas: SkCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  paint: SkPaint,
): void {
  'worklet';
  const rr = scratch().rrect;
  rr.rect.x = x;
  rr.rect.y = y;
  rr.rect.width = w;
  rr.rect.height = h;
  rr.rx = r;
  rr.ry = r;
  canvas.drawRRect(rr, paint);
}

export function fillOval(canvas: SkCanvas, x: number, y: number, w: number, h: number, paint: SkPaint): void {
  'worklet';
  const r = scratch().rect;
  r.x = x;
  r.y = y;
  r.width = w;
  r.height = h;
  canvas.drawOval(r, paint);
}

export function fillRect(canvas: SkCanvas, x: number, y: number, w: number, h: number, paint: SkPaint): void {
  'worklet';
  const r = scratch().rect;
  r.x = x;
  r.y = y;
  r.width = w;
  r.height = h;
  canvas.drawRect(r, paint);
}
