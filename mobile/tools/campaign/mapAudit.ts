/** Read-only layout audit: prop density, open-floor size and isolated props per stage.
 *  Usage: node --import tsx tools/campaign/mapAudit.ts <outDir> [chapters, e.g. 1,2,3] */
import fs from 'node:fs';
import path from 'node:path';
import { PROP_KIT } from '../../src/game/world/propKit';
const stages = JSON.parse(fs.readFileSync(process.argv[4] ?? 'src/game/levels/stages/campaignStages.json', 'utf8'));

type Box = { x0: number; y0: number; x1: number; y1: number; kind: string; cx: number; cy: number };
const out = process.argv[2] ?? 'Reports/MapAudit';
const chapters = (process.argv[3] ?? '1,2,3').split(',').map(Number);
fs.mkdirSync(path.join(out, 'svg'), { recursive: true });
const rows: Record<string, unknown>[] = [];

for (const s of stages as any[]) {
  if (!chapters.includes(s.chapter)) continue;
  const layout: string[] = s.layout;
  const H = layout.length, W = Math.max(...layout.map(r => r.length));
  const floor = (x: number, y: number) => layout[y]?.[x] === '.';
  const boxes: Box[] = [];
  const decor: { x: number; y: number; kind: string }[] = [];
  for (const p of s.props as any[]) {
    const spec = (PROP_KIT as any)[p.kind];
    if (!spec) continue;
    if (!spec.blocksMovement || spec.footprint.w === 0) { decor.push({ x: p.x, y: p.y, kind: p.kind }); continue; }
    // Same physical scale rule as compileStage.
    const scaled = /^(bank|galleryGlass|lab|casino)/.test(p.kind);
    const k = p.collisionScale ?? (scaled ? (p.scale ?? 1) : 1);
    const w = spec.footprint.w * k, h = spec.footprint.h * k;
    boxes.push({ x0: p.x - w / 2, x1: p.x + w / 2, y0: p.y - h, y1: p.y, kind: p.kind, cx: p.x, cy: p.y - h / 2 });
  }
  // Sample the floor on a half-tile grid; distance to the nearest wall tile or blocking prop.
  const distBox = (x: number, y: number, b: Box) => Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
  const walls: [number, number][] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (layout[y]?.[x] === '#') walls.push([x, y]);
  const distWall = (x: number, y: number) => {
    let best = Infinity;
    for (const [wx, wy] of walls) {
      const d = Math.hypot(Math.max(wx - x, 0, x - (wx + 1)), Math.max(wy - y, 0, y - (wy + 1)));
      if (d < best) best = d;
    }
    return best;
  };
  let floorTiles = 0, open3 = 0, maxClear = 0, maxAt = { x: 0, y: 0 };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!floor(x, y)) continue;
    floorTiles++;
    const cx = x + 0.5, cy = y + 0.5;
    const d = Math.min(distWall(cx, cy), ...boxes.map(b => distBox(cx, cy, b)));
    if (d >= 3) open3++;
    if (d > maxClear) { maxClear = d; maxAt = { x: cx, y: cy }; }
  }
  const covered = boxes.reduce((a, b) => a + (b.x1 - b.x0) * (b.y1 - b.y0), 0);
  // "Out of nowhere": a blocking prop with no wall and no other prop within 2.5 tiles.
  const isolated = boxes.filter(b => {
    const toWall = distWall(b.cx, b.cy);
    const toProp = Math.min(Infinity, ...boxes.filter(o => o !== b).map(o => distBox(b.cx, b.cy, o)));
    return toWall > 2.5 && toProp > 2.5;
  });
  // Props whose footprint overlaps a wall tile or leaves the floor.
  const offFloor = boxes.filter(b => ![[b.x0 + 0.05, b.y0 + 0.05], [b.x1 - 0.05, b.y0 + 0.05], [b.x0 + 0.05, b.y1 - 0.05], [b.x1 - 0.05, b.y1 - 0.05]]
    .every(([x, y]) => floor(Math.floor(x), Math.floor(y))));
  rows.push({
    id: s.id, title: s.title, size: `${W}x${H}`, floorTiles, blockingProps: boxes.length, decor: decor.length + (s.dressing?.length ?? 0),
    propsPer100Floor: +(boxes.length * 100 / floorTiles).toFixed(1), coveragePct: +(covered * 100 / floorTiles).toFixed(1),
    openFloorPct: +(open3 * 100 / floorTiles).toFixed(1), largestClearRadius: +maxClear.toFixed(1), largestClearAt: maxAt,
    isolated: isolated.map(b => `${b.kind}@${b.cx},${+b.y1.toFixed(1)}`), offFloor: offFloor.map(b => `${b.kind}@${b.cx},${+b.y1.toFixed(1)}`),
    guards: s.guards.length, cameras: s.cameras?.length ?? 0,
  });
  const T = 24, e: string[] = [];
  e.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * T}" height="${H * T + 26}" font-family="monospace" font-size="9">`);
  e.push(`<rect width="100%" height="100%" fill="#0b0f14"/><text x="4" y="${H * T + 17}" fill="#fff" font-size="13">${s.id} ${s.title} — props ${boxes.length}, open≥3t ${(open3 * 100 / floorTiles).toFixed(0)}%, clear r ${maxClear.toFixed(1)}</text>`);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = layout[y]?.[x];
    if (c === '.') e.push(`<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="#2a3340" stroke="#222a34" stroke-width="0.5"/>`);
    else if (c === '#') e.push(`<rect x="${x * T}" y="${y * T}" width="${T}" height="${T}" fill="#7c8794"/>`);
  }
  e.push(`<circle cx="${maxAt.x * T}" cy="${maxAt.y * T}" r="${maxClear * T}" fill="#ff3b3b" fill-opacity="0.16" stroke="#ff3b3b" stroke-dasharray="4 3"/>`);
  for (const b of boxes) {
    const iso = isolated.includes(b), off = offFloor.includes(b);
    e.push(`<rect x="${b.x0 * T}" y="${b.y0 * T}" width="${(b.x1 - b.x0) * T}" height="${Math.max(3, (b.y1 - b.y0) * T)}" fill="${off ? '#ff00ff' : iso ? '#ff9f1a' : '#d9b36c'}" stroke="#000" stroke-width="0.6"/>`);
    e.push(`<text x="${b.x0 * T}" y="${b.y0 * T - 2}" fill="#e8e8e8">${b.kind.replace(/^bank|^gallery/, '')}</text>`);
  }
  for (const d of decor) e.push(`<circle cx="${d.x * T}" cy="${d.y * T}" r="3" fill="#5fb0ff"/>`);
  for (const g of s.guards) e.push(`<circle cx="${g.x * T}" cy="${g.y * T}" r="6" fill="#e5484d"/>`);
  for (const r of s.patrolRoutes ?? []) e.push(`<polyline points="${r.points.map((p: any) => `${p.x * T},${p.y * T}`).join(' ')}" fill="none" stroke="#e5484d" stroke-opacity="0.5" stroke-dasharray="3 3"/>`);
  for (const c of s.cameras ?? []) e.push(`<rect x="${c.x * T - 5}" y="${c.y * T - 5}" width="10" height="10" fill="#ffd60a"/>`);
  e.push(`<circle cx="${s.playerSpawn.x * T}" cy="${s.playerSpawn.y * T}" r="6" fill="#30d158"/>`);
  e.push(`<path d="M${s.objective.x * T} ${s.objective.y * T - 8}l7 8-7 8-7-8z" fill="#64d2ff"/>`);
  e.push(`<rect x="${s.exit.x * T}" y="${s.exit.y * T}" width="${s.exit.w * T}" height="${s.exit.h * T}" fill="none" stroke="#30d158" stroke-width="2"/>`);
  e.push('</svg>');
  fs.writeFileSync(path.join(out, 'svg', `${s.id}.svg`), e.join('\n'));
}
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(rows, null, 1));
for (const r of rows) console.log([r.id, r.size, 'floor', r.floorTiles, 'props', r.blockingProps, 'decor', r.decor, 'p/100', r.propsPer100Floor, 'cover%', r.coveragePct, 'open%', r.openFloorPct, 'clearR', r.largestClearRadius, 'iso', (r.isolated as string[]).length, 'off', (r.offFloor as string[]).length].join(' '));
