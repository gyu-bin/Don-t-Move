import type { StageDefinition } from '../../game/levels/StageDefinition';

/** External row -1 is absent from the finite layout, although the world ends
 * at y=0. Only these two V5 rooms expose floor on that boundary. Include the
 * corner wall columns so the same wall projection joins both side returns. */
export function northBoundaryColumns(def: StageDefinition): number[] {
  if (def.id !== '01-08' && def.id !== '02-06') return [];
  const row = def.layout[0] ?? '';
  const columns = new Set<number>();
  for (let x = 0; x < row.length; x++) {
    if (row[x] !== '.') continue;
    columns.add(x);
    if (row[x - 1] === '#') columns.add(x - 1);
    if (row[x + 1] === '#') columns.add(x + 1);
  }
  return [...columns].sort((a, b) => a - b);
}
