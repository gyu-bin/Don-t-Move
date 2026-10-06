import type { Navigation } from '../world/navigation';
import { clearSegment, nodeX, nodeY } from '../world/navigation';

/**
 * Filter an immutable base graph only when door geometry changes. No static
 * blocker buckets/grid reconstruction, no per-frame graph work. Reopening
 * can use this same base graph without losing previously filtered edges.
 */
export function navigationWithDoors(base: Navigation, doorBlockers: number[]): Navigation {
  'worklet';
  const n: Navigation = {
    cols: base.cols, rows: base.rows, cell: base.cell, radius: base.radius,
    blockers: base.blockers.concat(doorBlockers),
    walkable: [], neighbors: [], components: [],
  };
  for (let i=0;i<base.walkable.length;i++) {
    const x=nodeX(base,i),y=nodeY(base,i);
    n.walkable.push(base.walkable[i] && clearSegment(x,y,x,y,doorBlockers,base.radius));
    n.neighbors.push([]);n.components.push(-1);
  }
  for (let i=0;i<n.walkable.length;i++) {
    if (!n.walkable[i]) continue;
    const adjacent=base.neighbors[i];
    for (let k=0;k<adjacent.length;k++) {
      const j=adjacent[k];
      if (n.walkable[j] && clearSegment(nodeX(base,i),nodeY(base,i),nodeX(base,j),nodeY(base,j),doorBlockers,base.radius)) n.neighbors[i].push(j);
    }
  }
  let component=0;
  for (let i=0;i<n.walkable.length;i++) {
    if (!n.walkable[i] || n.components[i]!==-1) continue;
    const queue=[i];n.components[i]=component;
    for (let q=0;q<queue.length;q++) for (let k=0;k<n.neighbors[queue[q]].length;k++) {
      const j=n.neighbors[queue[q]][k];
      if (n.components[j]!==-1) continue;
      n.components[j]=component;queue.push(j);
    }
    component++;
  }
  return n;
}
