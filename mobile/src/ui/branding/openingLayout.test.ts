import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { BG, COLUMN, GUARD, THIEF, openingLayout } from './openingLayout';

const PHONES: [number, number, number, number][] = [
  [402, 874, 62, 34], // iPhone 17
  [393, 852, 59, 34], [430, 932, 59, 34], [440, 956, 62, 34], [390, 844, 47, 34], [375, 812, 47, 34], [375, 667, 20, 0], [320, 568, 20, 0],
];
const png = (p: string) => { const b = readFileSync(p); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }; };

test('opening assets exist with the measured sizes; characters and column carry real alpha', () => {
  const dir = 'assets/branding/opening/';
  assert.deepEqual([png(dir + 'bg_museum.png').w, png(dir + 'bg_museum.png').h], [BG.w, BG.h]);
  for (const n of ['thief_peek', 'thief_sneak', 'thief_freeze']) { const p = png(dir + n + '.png'); assert.deepEqual([p.w, p.h, p.colorType], [THIEF.w, THIEF.h, 6], n); }
  for (const n of ['guard_away', 'guard_turn']) { const p = png(dir + n + '.png'); assert.deepEqual([p.w, p.h, p.colorType], [GUARD.w, GUARD.h, 6], n); }
  const c = png(dir + 'fg_column_left.png'); assert.deepEqual([c.w, c.h, c.colorType], [COLUMN.w, COLUMN.h, 6]);
});

test('background is never stretched, covers the screen and keeps the diamond on the centre axis', () => {
  for (const [W, H, top, bottom] of PHONES) {
    const L = openingLayout(W, H, { top, bottom, left: 0, right: 0 });
    assert(Math.abs(L.bg.w / L.bg.h - BG.w / BG.h) < 1e-9, 'uniform scale');
    assert(L.bg.x <= 0 && L.bg.x + L.bg.w >= W && L.bg.y <= 0 && L.bg.y + L.bg.h >= H, 'covers');
    assert(Math.abs(L.diamond.x - W / 2) < 1e-9);
    assert(L.diamond.y / H > 0.45 && L.diamond.y / H < 0.58, `diamond ${L.diamond.y / H}`);
  }
});

test('thief LEFT (hidden behind the column) / diamond CENTRE / guard RIGHT, flashlight on the lens', () => {
  for (const [W, H, top, bottom] of PHONES) {
    const L = openingLayout(W, H, { top, bottom, left: 0, right: 0 });
    const k = L.thief.k;
    const freezeLeft = L.thief.finalX - (THIEF.anchorX - 168) * k, freezeRight = L.thief.finalX + (529 - THIEF.anchorX) * k;
    assert(freezeLeft >= L.column.rim - 0.08 * W && freezeRight < W / 2, 'startle pose left of centre, at most its back edge behind the column');
    assert(L.face.x > 0 && L.face.y > L.logoTop, 'startle face on screen');
    assert(L.peekFace.x > L.column.rim && L.peekFace.x < W * 0.35 && L.peekFace.y > L.logoTop + L.logoSize * 2.6, 'hidden thief peeks just right of the column, below the logo');
    assert(Math.abs(L.hideSpot.x - L.column.rim) < 3, 'light rests on the column edge');
    assert(L.thief.diveX + (529 - THIEF.anchorX) * k <= L.column.rim, 'dive ends fully behind the column');
    const gk = L.guard.w / GUARD.w;
    const gLeft = L.guard.x + 100 * gk, gRight = L.guard.x + 343 * gk;
    assert(gLeft > W / 2 && gRight <= W, 'guard_turn figure inside the right half');
    assert(Math.abs(L.flashlight.x - (L.guard.x + GUARD.lensX * gk)) < 1e-9 && Math.abs(L.flashlight.y - (L.guard.y + GUARD.lensY * gk)) < 1e-9);
    if (H >= 667) assert(L.thief.ground < L.menu.y && L.guardFeet.y < L.menu.y, 'feet above the menu');
    assert(Math.abs(L.thief.peekX - (THIEF.anchorX - THIEF.peekCutX) * k - L.column.rim) < 1e-9, 'peek cut line sits on the column rim');
  }
});

test('lobby bands: logo top, centred 72–82 % buttons, tagline clear of the home indicator', () => {
  for (const [W, H, top, bottom] of PHONES) {
    const L = openingLayout(W, H, { top, bottom, left: 0, right: 0 });
    assert(L.logoTop >= top + 10 && L.logoTop <= H * 0.16);
    const m = L.menu;
    assert(Math.abs(m.x + m.w / 2 - W / 2) < 1e-9, 'buttons centred');
    assert(m.w / W >= 0.72 && m.w / W <= 0.82, `button width ${m.w / W}`);
    if (H >= 667) assert(m.y >= L.pedestalBottomY, 'pedestal stays visible above the menu');
    assert(m.y + m.h <= H - L.taglineBottom - 25, 'menu above tagline');
    assert(L.taglineBottom >= Math.max(bottom, 12) + 14, 'tagline clear of the home indicator');
  }
});
