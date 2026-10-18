import type { Species, Zone } from './types';
import { rel, type Grid, type Relations } from './garden';

export type Area = { x: number; y: number; w: number; h: number };
export type Choice = { species: Species; weight: number };
export type Rect = { species_id: string; x: number; y: number; w: number; h: number };
export type Plan = {
  rects: Rect[];
  /** espèce par case, en coordonnées de la zone (null = vide) */
  cells: (string | null)[][];
  counts: Map<string, number>;
  bad: number;
  good: number;
  placed: number;
  free: number;
  /** cases laissées vides pour séparer deux espèces qui ne s'entendent pas */
  gaps: number;
};

/** Petit générateur pseudo-aléatoire reproductible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(a: T[], r: () => number): T[] {
  const o = a.slice();
  for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}

/** Répartit `total` cases entre des poids (méthode du plus fort reste), au moins 1 case chacun si possible. */
function share(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map(w => (total * w) / sum);
  const out = raw.map(v => Math.floor(v));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of order) { if (left <= 0) break; out[i]++; left--; }
  if (total >= weights.length) for (let i = 0; i < out.length; i++) if (out[i] === 0) { const j = out.indexOf(Math.max(...out)); out[j]--; out[i]++; }
  return out;
}

/** Arêtes de voisinage (8 directions, chaque paire une seule fois) : mauvaises et bonnes. */
function score(sp: (string | null)[][], area: Area, rels: Relations, tall: Set<string>, north: Zone['north_side']) {
  const H = sp.length, W = sp[0]?.length ?? 0;
  let bad = 0, good = 0, bonus = 0;
  const x0 = Math.max(0, area.x - 1), x1 = Math.min(W - 1, area.x + area.w);
  const y0 = Math.max(0, area.y - 1), y1 = Math.min(H - 1, area.y + area.h);
  const inArea = (x: number, y: number) => x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const a = sp[y][x]; if (!a) continue;
    for (const [dx, dy] of [[1, 0], [1, 1], [0, 1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!inArea(x, y) && !inArea(nx, ny)) continue;
      const b = sp[ny][nx]; if (!b || b === a) continue;
      const c = rel(rels, a, b);
      if (c?.relation === 'bad') bad++; else if (c?.relation === 'good') good++;
    }
    if (inArea(x, y) && tall.has(a)) {
      // les grandes plantes plutôt côté nord : elles ne font pas d'ombre aux autres
      const d = north === 'top' ? y - area.y : north === 'bottom' ? area.y + area.h - 1 - y : north === 'left' ? x - area.x : area.x + area.w - 1 - x;
      bonus -= d * 0.05;
    }
  }
  return { bad, good, value: -1000 * bad + 3 * good + bonus };
}

type Attempt = { sp: (string | null)[][]; value: number; bad: number; good: number; order: string[]; dir: 'rows' | 'cols' };

/**
 * Propose un plan : chaque espèce reçoit une part des cases libres (selon son poids),
 * les espèces à 2 × 2 cases sont posées d'abord, les autres remplissent le reste par bandes.
 * On teste de nombreux ordres et on garde celui avec le moins de mauvais voisins, puis le plus de bons.
 */
export function generatePlan(opts: { zone: Pick<Zone, 'cols' | 'rows' | 'north_side'>; area: Area; existing: Grid; picks: Choice[]; rels: Relations; seed: number }): Plan {
  const { zone, area, existing, picks, rels, seed } = opts;
  const r = rng(seed);
  const base: (string | null)[][] = existing.map(row => row.map(p => (p ? p.species_id : null)));
  const isFree = (x: number, y: number) => x >= area.x && x < area.x + area.w && y >= area.y && y < area.y + area.h && x < zone.cols && y < zone.rows && !existing[y][x];
  const freeCells: [number, number][] = [];
  for (let y = area.y; y < Math.min(zone.rows, area.y + area.h); y++) for (let x = area.x; x < Math.min(zone.cols, area.x + area.w); x++) if (isFree(x, y)) freeCells.push([x, y]);
  const tall = new Set(picks.filter(p => p.species.height === 'haute').map(p => p.species.id));
  const big = picks.filter(p => p.species.span_cells > 1);
  const small = picks.filter(p => p.species.span_cells <= 1);
  const totalW = picks.reduce((t, p) => t + p.weight, 0) || 1;

  const empty = (): Plan['cells'] => base.map(row => row.slice());
  if (!picks.length || !freeCells.length) {
    return { rects: [], cells: empty(), counts: new Map(), bad: 0, good: 0, placed: 0, free: freeCells.length, gaps: 0 };
  }

  const blocks: Rect[] = [];
  const attempts = Math.min(900, 150 + picks.length * 90);
  let best: Attempt | null = null;
  let bestBlocks: Rect[] = [];

  const run = (order: Choice[], dir: 'rows' | 'cols', rr: () => number): { a: Attempt; blocks: Rect[] } => {
    const sp = empty();
    const placedBlocks: Rect[] = [];
    // 1. espèces 2 × 2 : blocs alignés sur la grille de la zone, éparpillés au hasard
    for (const b of big) {
      const want = Math.max(1, Math.round(((freeCells.length * b.weight) / totalW) / 4));
      const cand: [number, number][] = [];
      for (let y = area.y; y + 1 < area.y + area.h; y += 2) for (let x = area.x; x + 1 < area.x + area.w; x += 2) cand.push([x, y]);
      let n = 0;
      for (const [x, y] of shuffle(cand, rr)) {
        if (n >= want) break;
        if (![0, 1].every(dy => [0, 1].every(dx => isFree(x + dx, y + dy) && sp[y + dy][x + dx] === null))) continue;
        for (const dy of [0, 1]) for (const dx of [0, 1]) sp[y + dy][x + dx] = b.species.id;
        placedBlocks.push({ species_id: b.species.id, x, y, w: 2, h: 2 });
        n++;
      }
    }
    // 2. les autres : bandes consécutives dans l'ordre de lecture (lignes ou colonnes)
    const rest = freeCells.filter(([x, y]) => sp[y][x] === null);
    rest.sort(dir === 'rows' ? (a, b) => a[1] - b[1] || a[0] - b[0] : (a, b) => a[0] - b[0] || a[1] - b[1]);
    if (small.length && rest.length) {
      const ord = order.filter(p => p.species.span_cells <= 1);
      const q = share(rest.length, ord.map(p => p.weight));
      let i = 0;
      ord.forEach((p, k) => { for (let n = 0; n < q[k]; n++) { const [x, y] = rest[i++]; sp[y][x] = p.species.id; } });
    }
    const s = score(sp, area, rels, tall, zone.north_side);
    return { a: { sp, value: s.value, bad: s.bad, good: s.good, order: order.map(p => p.species.id), dir }, blocks: placedBlocks };
  };

  const consider = (res: { a: Attempt; blocks: Rect[] }) => { if (!best || res.a.value > best.value) { best = res.a; bestBlocks = res.blocks; } };
  for (let i = 0; i < attempts; i++) consider(run(shuffle(picks, r), r() < 0.5 ? 'rows' : 'cols', r));
  // petit raffinement : échanges de deux espèces dans le meilleur ordre
  for (let pass = 0; pass < 3 && best; pass++) {
    const cur: Attempt = best;
    const ord = cur.order.map(id => picks.find(p => p.species.id === id)!);
    for (let i = 0; i < ord.length; i++) for (let j = i + 1; j < ord.length; j++) {
      const o = ord.slice(); [o[i], o[j]] = [o[j], o[i]];
      consider(run(o, cur.dir, rng(seed + pass * 31 + i * 7 + j)));
    }
  }
  const fin: Attempt = best!;
  blocks.push(...bestBlocks);

  // Mauvais voisins inévitables : on laisse des cases vides entre eux (côté de l'espèce la plus fréquente).
  let gaps = 0;
  if (fin.bad > 0) {
    const total = () => { const m = new Map<string, number>(); for (const row of fin.sp) for (const id of row) if (id) m.set(id, (m.get(id) ?? 0) + 1); return m; };
    const clear = (x: number, y: number) => {
      const bi = blocks.findIndex(b => x >= b.x && x < b.x + 2 && y >= b.y && y < b.y + 2);
      if (bi >= 0) { const b = blocks[bi]; for (const dy of [0, 1]) for (const dx of [0, 1]) { fin.sp[b.y + dy][b.x + dx] = null; gaps++; } blocks.splice(bi, 1); }
      else { fin.sp[y][x] = null; gaps++; }
    };
    for (let guard = 0; guard < zone.cols * zone.rows; guard++) {
      const m = total();
      let hit: [number, number] | null = null;
      outer: for (let y = 0; y < zone.rows; y++) for (let x = 0; x < zone.cols; x++) {
        const a = fin.sp[y][x]; if (!a) continue;
        for (const [dx, dy] of [[1, 0], [1, 1], [0, 1], [-1, 1]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= zone.cols || ny >= zone.rows) continue;
          const b = fin.sp[ny][nx]; if (!b || b === a || rel(rels, a, b)?.relation !== 'bad') continue;
          const aNew = isFree(x, y), bNew = isFree(nx, ny);
          if (!aNew && !bNew) continue;
          hit = aNew && (!bNew || (m.get(a) ?? 0) >= (m.get(b) ?? 0)) ? [x, y] : [nx, ny];
          break outer;
        }
      }
      if (!hit) break;
      clear(hit[0], hit[1]);
    }
    fin.bad = 0;
  }

  // rectangles : cases à 1 plant fusionnées en segments puis en rangs identiques ; blocs 2 × 2 tels quels
  const bigIds = new Set(big.map(b => b.species.id));
  const rects: Rect[] = [...blocks];
  const taken = new Set(blocks.flatMap(b => [0, 1].flatMap(dy => [0, 1].map(dx => (b.y + dy) * zone.cols + b.x + dx))));
  const segs: Rect[] = [];
  for (let y = area.y; y < Math.min(zone.rows, area.y + area.h); y++) {
    let x = area.x;
    while (x < Math.min(zone.cols, area.x + area.w)) {
      const id = fin.sp[y][x];
      if (!id || existing[y][x] || taken.has(y * zone.cols + x) || bigIds.has(id)) { x++; continue; }
      let w = 1;
      while (x + w < Math.min(zone.cols, area.x + area.w) && fin.sp[y][x + w] === id && !existing[y][x + w] && !taken.has(y * zone.cols + x + w)) w++;
      segs.push({ species_id: id, x, y, w, h: 1 });
      x += w;
    }
  }
  const merged: Rect[] = [];
  for (const sg of segs) {
    const up = merged.find(m => m.species_id === sg.species_id && m.x === sg.x && m.w === sg.w && m.y + m.h === sg.y);
    if (up) up.h++; else merged.push({ ...sg });
  }
  rects.push(...merged);

  const counts = new Map<string, number>();
  let placed = 0;
  for (let y = area.y; y < Math.min(zone.rows, area.y + area.h); y++) for (let x = area.x; x < Math.min(zone.cols, area.x + area.w); x++) {
    const id = fin.sp[y][x];
    if (id && !existing[y][x]) { counts.set(id, (counts.get(id) ?? 0) + 1); placed++; }
  }
  return { rects, cells: fin.sp, counts, bad: fin.bad, good: fin.good, placed, free: freeCells.length, gaps };
}
