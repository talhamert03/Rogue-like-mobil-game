import { Rng } from '../core/rng';
import type { MapNode, MapState, NodeType } from './runTypes';

export const MAP_ROWS = 13; // rows 0..12, boss after row 12
export const MAP_COLS = 7;

/**
 * Generates a Slay-the-Spire style layered map: several paths are walked from
 * the bottom row to the top, merging where they overlap. Paths never cross.
 */
export function generateMap(rng: Rng, act: number, bossId: string, eliteWeight = 1): MapState {
  const rows = MAP_ROWS;
  const cols = MAP_COLS;
  const grid: (MapNode | null)[][] = Array.from({ length: rows }, () => Array(cols).fill(null));
  const edges = new Set<string>();
  let nextId = 0;
  const nodeAt = (r: number, c: number): MapNode => {
    let n = grid[r][c];
    if (!n) {
      n = { id: nextId++, row: r, col: c, type: 'battle', next: [] };
      grid[r][c] = n;
    }
    return n;
  };

  const PATHS = 6;
  const starts: number[] = [];
  for (let p = 0; p < PATHS; p++) {
    let c = rng.int(0, cols - 1);
    if (p === 1) while (starts.length && c === starts[0]) c = rng.int(0, cols - 1);
    starts.push(c);
    let cur = c;
    nodeAt(0, cur);
    for (let r = 0; r < rows - 1; r++) {
      const options = [cur - 1, cur, cur + 1].filter((x) => x >= 0 && x < cols);
      // avoid crossing existing edges
      const valid = options.filter((nc) => {
        if (nc === cur) return true;
        // crossing: an edge from (r, nc) to (r+1, cur)
        return !edges.has(`${r}:${nc}>${cur}`);
      });
      const nc = rng.pick(valid.length ? valid : [cur]);
      nodeAt(r + 1, nc);
      edges.add(`${r}:${cur}>${nc}`);
      cur = nc;
    }
  }
  // build next lists from edges
  for (const e of edges) {
    const [a, b] = e.split('>');
    const [r, c] = a.split(':').map(Number);
    const from = grid[r][c]!;
    const to = grid[r + 1][Number(b)]!;
    if (!from.next.includes(to.id)) from.next.push(to.id);
  }

  const nodes: MapNode[] = [];
  for (const row of grid) for (const n of row) if (n) nodes.push(n);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const parents = new Map<number, MapNode[]>();
  for (const n of nodes) for (const id of n.next) {
    const arr = parents.get(id) ?? [];
    arr.push(n);
    parents.set(id, arr);
  }

  // assign room types
  const weights: Partial<Record<NodeType, number>> = { battle: 45, event: 22, elite: 8 * eliteWeight, rest: 12, shop: 5, treasure: 0 };
  for (const n of nodes.sort((a, b) => a.row - b.row || a.col - b.col)) {
    if (n.row === 0) n.type = 'battle';
    else if (n.row === 6) n.type = 'treasure';
    else if (n.row === rows - 1) n.type = 'rest';
    else {
      for (let attempt = 0; attempt < 12; attempt++) {
        const t = rng.weighted(weights) as NodeType;
        if (t === 'elite' && n.row < 4) continue;
        if (t === 'rest' && (n.row < 4 || n.row === rows - 2)) continue;
        const ps = parents.get(n.id) ?? [];
        // no two special rooms of the same kind in a row
        if (t !== 'battle' && t !== 'event' && ps.some((p) => p.type === t)) continue;
        // siblings (same parent) should differ
        const sib = ps.flatMap((p) => p.next.map((id) => byId.get(id)!)).filter((s) => s.id !== n.id && s.row === n.row);
        if (t !== 'battle' && sib.some((s) => s.type === t)) continue;
        n.type = t;
        break;
      }
    }
  }
  // guarantee at least one shop per map
  if (!nodes.some((n) => n.type === 'shop')) {
    const cands = nodes.filter((n) => n.row >= 3 && n.row <= 10 && n.type === 'event');
    if (cands.length) rng.pick(cands).type = 'shop';
  }
  return { act, rows, cols, nodes: nodes.sort((a, b) => a.id - b.id), cur: null, bossId };
}

/** nodes the player can move to next */
export function availableNodes(map: MapState): MapNode[] {
  if (map.cur === null) return map.nodes.filter((n) => n.row === 0);
  const cur = map.nodes.find((n) => n.id === map.cur);
  if (!cur) return [];
  return cur.next.map((id) => map.nodes.find((n) => n.id === id)!).filter(Boolean);
}

export function isBossNext(map: MapState): boolean {
  if (map.cur === null) return false;
  const cur = map.nodes.find((n) => n.id === map.cur);
  return !!cur && cur.row === map.rows - 1;
}

/** Tower mode: a short linear map segment of `len` floors with 2-3 choices each */
export function generateTowerSegment(rng: Rng, startFloor: number, len: number, bossId: string): MapState {
  const nodes: MapNode[] = [];
  let id = 0;
  let prev: MapNode[] = [];
  for (let r = 0; r < len; r++) {
    const floor = startFloor + r;
    const count = floor % 5 === 0 ? 1 : rng.int(2, 3);
    const cols = rng.sample([0, 1, 2, 3, 4, 5, 6].slice(1, 6), count).sort((a, b) => a - b);
    const row: MapNode[] = cols.map((c) => ({ id: id++, row: r, col: c, type: 'battle' as NodeType, next: [] }));
    for (const n of row) {
      if (floor % 10 === 0) n.type = 'boss';
      else if (floor % 5 === 0) n.type = 'elite';
      else n.type = rng.weighted({ battle: 50, event: 16, rest: 12, shop: 10, treasure: 8, elite: 6 }) as NodeType;
    }
    if (floor % 10 !== 0 && floor % 5 !== 0 && !row.some((n) => n.type === 'battle')) row[0].type = 'battle';
    for (const p of prev) p.next = row.map((n) => n.id);
    nodes.push(...row);
    prev = row;
  }
  return { act: 0, rows: len, cols: MAP_COLS, nodes, cur: null, bossId };
}
