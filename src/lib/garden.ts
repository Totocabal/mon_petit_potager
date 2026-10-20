import type { Companion, Planting, Species, Variety, Zone } from './types';
import { addDays, diffDays, parse, today } from './dates';

/** Taille d'une case et d'un bloc. */
export const CELL_CM = 30;
export const BLOC = 5;

/** Emprise d'une zone sur le terrain, en cm. */
export const zoneSize = (z: Pick<Zone, 'cols' | 'rows'>) => ({ w: z.cols * CELL_CM, h: z.rows * CELL_CM });

/** La zone peut-elle être posée en (x, y) cm : dans le terrain et sans chevaucher une autre zone ? */
export function zoneFits(zones: Zone[], z: Zone, x: number, y: number, terrain: { w: number; h: number }): boolean {
  const s = zoneSize(z);
  if (x < 0 || y < 0 || x + s.w > terrain.w || y + s.h > terrain.h) return false;
  return !zones.some(o => {
    if (o.id === z.id) return false;
    const t = zoneSize(o);
    return x < o.x_cm + t.w && o.x_cm < x + s.w && y < o.y_cm + t.h && o.y_cm < y + s.h;
  });
}

/**
 * Tailles possibles d'une zone déjà créée, en cases : on agrandit vers l'est et le sud (l'angle nord-ouest ne bouge pas).
 * Plus petit : jamais en dessous de ce qui est planté. Plus grand : jusqu'au bord du terrain ou d'une autre zone ; 12 cases au plus pour une petite zone.
 * Le pas est de 5 cases (un bloc) pour parcelle et serre, d'une case sinon.
 */
export function resizeBounds(zones: Zone[], z: Zone, plantings: Pick<Planting, 'x' | 'y' | 'w' | 'h'>[], terrain: { w: number; h: number }, big: boolean, cols = z.cols, rows = z.rows) {
  const step = big ? 5 : 1;
  const up = (v: number) => Math.max(step, Math.ceil(v / step) * step);
  const minCols = up(Math.max(0, ...plantings.map(p => p.x + p.w))), minRows = up(Math.max(0, ...plantings.map(p => p.y + p.h)));
  const cap = big ? Infinity : 12;
  const grow = (from: number, fits: (n: number) => boolean) => { let best = from; for (let n = from; n <= cap && fits(n); n += step) best = n; return best; };
  const maxCols = grow(minCols, n => zoneFits(zones, { ...z, cols: n, rows }, z.x_cm, z.y_cm, terrain));
  const maxRows = grow(minRows, n => zoneFits(zones, { ...z, cols, rows: n }, z.x_cm, z.y_cm, terrain));
  return { step, minCols, minRows, maxCols: Math.max(maxCols, minCols, z.cols), maxRows: Math.max(maxRows, minRows, z.rows) };
}

/** Une zone est « grande » au-delà de 12 × 12 cases : on la parcourt en blocs de 5 × 5. */
export const isBig = (z: Pick<Zone, 'cols' | 'rows'>) => z.cols > 12 || z.rows > 12;

export const meters = (cm: number) => (cm / 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' m';
export const nf = (n: number) => n.toLocaleString('fr-FR');
export const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export const de = (s: string) => (/^[aeiouyéèêœh]/i.test(s) && !/^haricot/i.test(s) ? 'd’' : 'de ') + s;
export const range = (a: number, b: number) => (a === b ? String(a) : a + ' à ' + b);

export const colLabel = (i: number) => (i >= 26 ? String.fromCharCode(64 + Math.floor(i / 26)) : '') + String.fromCharCode(65 + (i % 26));
export const blocName = (bx: number, by: number) => colLabel(bx) + (by + 1);

export function placeText(p: Pick<Planting, 'x' | 'y' | 'w' | 'h'>): string {
  return (p.h > 1 ? 'rangs ' : 'rang ') + range(p.y + 1, p.y + p.h) + ', ' + (p.w > 1 ? 'cases ' : 'case ') + range(p.x + 1, p.x + p.w);
}

/** Nombre de plants d'une plantation (rectangle de cases). */
export function plantCount(p: Pick<Planting, 'w' | 'h'>, s: Species): number {
  if (isSol(s)) return 0;
  return isMulti(s) ? Math.max(1, Math.floor(p.w / s.span_w) * Math.floor(p.h / s.span_h)) : p.w * p.h * s.plants_per_cell;
}

/** Couverture du sol (jachère, paillage) plutôt qu'une plante. */
export const isSol = (s: Pick<Species, 'kind'> | undefined | null) => s?.kind === 'sol';

/** Un plant qui occupe plusieurs cases (2 × 1, 3 × 1, 2 × 2…). */
export const isMulti = (s: Pick<Species, 'span_w' | 'span_h'>) => s.span_w * s.span_h > 1;

/** « 2 × 2 », « 3 × 1 »… */
export const footprintText = (s: Pick<Species, 'span_w' | 'span_h'>) => `${s.span_w} × ${s.span_h}`;

export type Grid = (Planting | null)[][];

/** Grille de la zone : chaque case pointe vers la plantation qui l'occupe. */
export function occupancy(z: Pick<Zone, 'cols' | 'rows'>, plantings: Planting[]): Grid {
  const g: Grid = Array.from({ length: z.rows }, () => Array<Planting | null>(z.cols).fill(null));
  for (const p of plantings) {
    for (let y = p.y; y < Math.min(z.rows, p.y + p.h); y++) for (let x = p.x; x < Math.min(z.cols, p.x + p.w); x++) g[y][x] = p;
  }
  return g;
}

/** Distance réelle (cm) entre deux plants d'une même plantation, selon la grille de cases. */
export const pitchCm = (s: Species) => (isMulti(s) ? CELL_CM * s.span_w : CELL_CM / Math.sqrt(s.plants_per_cell));

/** La grille respecte-t-elle la distance recommandée entre plants ? (tolérance de 25 %) */
export const spacingOk = (s: Species) => pitchCm(s) >= s.inrow_spacing_cm * 0.75;

/** Espèces voisines plantées plus près que la distance recommandée (moyenne des deux espèces, tolérance de 25 %). */
export function tooClose(g: Grid, r: { x: number; y: number; w: number; h: number }, s: Species, byId: Map<string, Species>, excludeId?: string) {
  const out = new Map<string, { gap: number; need: number }>();
  for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
    const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    const q = !inside && g[y] ? g[y][x] : null;
    const o = q && q.id !== excludeId ? byId.get(q.species_id) : undefined;
    if (!q || !o || isSol(o) || isSol(s)) continue;
    const gap = (pitchCm(s) + pitchCm(o)) / 2;
    const need = 0.75 * (s.inrow_spacing_cm + o.inrow_spacing_cm) / 2;
    if (gap < need) out.set(o.id, { gap: Math.round(gap), need: Math.round(need) });
  }
  return out;
}

/** Ce qui reste d'une plantation après avoir libéré le rectangle [x0, x1) × [y0, y1).
 *  Un plant qui occupe plusieurs cases est retiré en entier dès qu'il est touché. */
export function remainingPieces(p: Pick<Planting, 'x' | 'y' | 'w' | 'h'>, r: { x0: number; x1: number; y0: number; y1: number }, unit = { w: 1, h: 1 }): { x: number; y: number; w: number; h: number }[] {
  let ax0 = Math.max(p.x, r.x0), ax1 = Math.min(p.x + p.w, r.x1), ay0 = Math.max(p.y, r.y0), ay1 = Math.min(p.y + p.h, r.y1);
  if (ax0 >= ax1 || ay0 >= ay1) return [{ x: p.x, y: p.y, w: p.w, h: p.h }];
  ax0 = p.x + Math.floor((ax0 - p.x) / unit.w) * unit.w;
  ax1 = Math.min(p.x + p.w, p.x + Math.ceil((ax1 - p.x) / unit.w) * unit.w);
  ay0 = p.y + Math.floor((ay0 - p.y) / unit.h) * unit.h;
  ay1 = Math.min(p.y + p.h, p.y + Math.ceil((ay1 - p.y) / unit.h) * unit.h);
  return [
    { x: p.x, y: p.y, w: p.w, h: ay0 - p.y },
    { x: p.x, y: ay1, w: p.w, h: p.y + p.h - ay1 },
    { x: p.x, y: ay0, w: ax0 - p.x, h: ay1 - ay0 },
    { x: ax1, y: ay0, w: p.x + p.w - ax1, h: ay1 - ay0 }
  ].filter(q => q.w > 0 && q.h > 0);
}

/** Rectangles couvrant les cases libres de [x0, x1) × [y0, y1) : segments par rang, puis rangs identiques fusionnés. */
export function freeRects(grid: Grid, x0: number, x1: number, y0: number, y1: number): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  for (let y = y0; y < Math.min(y1, grid.length); y++) {
    let x = x0;
    while (x < Math.min(x1, grid[y].length)) {
      if (grid[y][x]) { x++; continue; }
      let w = 1;
      while (x + w < Math.min(x1, grid[y].length) && !grid[y][x + w]) w++;
      const up = out.find(r => r.x === x && r.w === w && r.y + r.h === y);
      if (up) up.h++; else out.push({ x, y, w, h: 1 });
      x += w;
    }
  }
  return out;
}

/** État du sol d'une zone entière : tout en jachère ou tout paillé, sinon null. */
export function zoneGround(z: Pick<Zone, 'cols' | 'rows'>, plantings: Planting[], bySpecies: Map<string, Species>): 'jachere' | 'paillage' | null {
  const g = occupancy(z, plantings);
  let slug: string | null = null;
  for (const row of g) for (const p of row) {
    const s = p ? bySpecies.get(p.species_id) : null;
    if (!p || !s || !isSol(s) || (slug && slug !== s.slug)) return null;
    slug = s.slug;
  }
  return slug === 'jachere' || slug === 'paillage' ? slug : null;
}

/** Plantations distinctes qui touchent le rectangle de cases [x0, x1) × [y0, y1). */
export function plantingsIn(grid: Grid, x0: number, x1: number, y0: number, y1: number): Planting[] {
  const seen = new Set<Planting>();
  for (let y = y0; y < Math.min(y1, grid.length); y++) for (let x = x0; x < Math.min(x1, grid[y].length); x++) { const p = grid[y][x]; if (p) seen.add(p); }
  return [...seen];
}

/** Index des voisinages, par paire d'identifiants d'espèces. */
export type Relations = Map<string, Companion>;
export function buildRelations(list: Companion[]): Relations {
  const m: Relations = new Map();
  for (const c of list) { m.set(c.species_a + '|' + c.species_b, c); m.set(c.species_b + '|' + c.species_a, c); }
  return m;
}
export const rel = (r: Relations, a: string, b: string) => r.get(a + '|' + b) ?? null;

/** Prête à récolter : mois de récolte et durée atteinte (ou vivace). */
/** Jours jusqu'à la récolte : celui de la plantation (variété choisie) l'emporte sur celui de l'espèce ; null = pas de délai connu. */
export const harvestDays = (p: Pick<Planting, 'days_to_harvest'>, s: Pick<Species, 'days_to_harvest'>): number | null => p.days_to_harvest ?? s.days_to_harvest;

/** Ce qu'une plantation retient de sa variété : son identifiant et ce qui la distingue de l'espèce. */
export const varietyFields = (v: Pick<Variety, 'id' | 'days_to_harvest'> | null | undefined): Pick<Planting, 'variety_id' | 'days_to_harvest'> => ({ variety_id: v?.id ?? null, days_to_harvest: v?.days_to_harvest ?? null });

export function isReady(p: Planting, s: Species, now = today()): boolean {
  if (!s.harvest_months.includes(now.getMonth() + 1)) return false;
  const need = harvestDays(p, s);
  return need == null || diffDays(now, parse(p.sown_at)) >= need;
}

export const ageDays = (p: Planting, now = today()) => diffDays(now, parse(p.sown_at));
export const everyDays = (p: Planting, s: Species) => p.water_every_days ?? s.water_every_days;

/** `rain` : dernier jour de pluie suffisante, à ignorer pour une zone abritée. */
export function nextWater(p: Planting, s: Species, rain: Date | null = null): Date {
  let last = parse(p.last_watered_at ?? p.sown_at);
  if (rain && rain > last) last = rain;
  return addDays(last, everyDays(p, s));
}
export const needsWater = (p: Planting, s: Species, now = today(), rain: Date | null = null) => diffDays(nextWater(p, s, rain), now) <= 0;

/** À arroser : une plante (jamais un sol) dont les alertes sont actives et dont l'arrosage est dû. Même règle que « Aujourd'hui au jardin ». */
export const isThirsty = (p: Planting, s: Species | undefined, rain: Date | null = null, now = today()) => !!s && !isSol(s) && p.alerts_enabled && needsWater(p, s, now, rain);

/** Plantations à arroser dans le rectangle [x0, x1) × [y0, y1) d'une grille. */
export function thirstyIn(grid: Grid, x0: number, x1: number, y0: number, y1: number, bySpecies: Map<string, Species>, rain: Date | null = null): Planting[] {
  return plantingsIn(grid, x0, x1, y0, y1).filter(p => isThirsty(p, bySpecies.get(p.species_id), rain));
}

/** Stade affiché sur la frise : 0 semis, 1 plantation, 2 croissance/fleurs, 3 récolte. */
export function stage(p: Planting, s: Species): number {
  if (isReady(p, s)) return 3;
  const need = harvestDays(p, s);
  if (need == null) return 2;
  const f = ageDays(p) / need;
  return f < 0.2 ? 0 : f < 0.55 ? 1 : 2;
}
export const stageNames = (s: Species) => ['Semis', 'Plantation', ['Solanacées', 'Cucurbitacées', 'Fabacées', 'Rosacées'].includes(s.family) ? 'Fleurs' : 'Croissance', 'Récolte'];

/** Voisins d'un rectangle (les 8 cases autour). */
export function neighbors(g: Grid, r: { x: number; y: number; w: number; h: number }, speciesId: string, rels: Relations, excludeId?: string) {
  const good = new Set<string>(), bad = new Set<string>();
  for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) {
    const inside = x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    const q = !inside && g[y] ? g[y][x] : null;
    if (!q || q.id === excludeId) continue;
    const c = rel(rels, speciesId, q.species_id);
    if (c?.relation === 'good') good.add(q.species_id);
    if (c?.relation === 'bad') bad.add(q.species_id);
  }
  return { good: [...good], bad: [...bad] };
}

/** Cases plantables d'un rang : libres et sans mauvais voisin autour. */
export function rangPlan(g: Grid, y: number, x0: number, x1: number, speciesId: string, rels: Relations) {
  const ok: number[] = [];
  let busy = 0, badCells = 0;
  const good = new Set<string>(), badW = new Set<string>();
  for (let x = x0; x < x1; x++) {
    if (g[y][x]) { busy++; continue; }
    const n = neighbors(g, { x, y, w: 1, h: 1 }, speciesId, rels);
    n.good.forEach(s => good.add(s));
    if (n.bad.length) { badCells++; n.bad.forEach(s => badW.add(s)); } else ok.push(x);
  }
  return { ok, busy, badCells, good: [...good], bad: [...badW] };
}

/** Regroupe des colonnes consécutives en rectangles d'un rang. */
export function toSegments(xs: number[]): { x: number; w: number }[] {
  const out: { x: number; w: number }[] = [];
  let start: number | null = null;
  xs.forEach((x, i) => {
    if (start === null) start = x;
    if (xs[i + 1] !== x + 1) { out.push({ x: start, w: x - start + 1 }); start = null; }
  });
  return out;
}

/** Clés des cases d'un bloc (rang × largeur de la zone + colonne), pour une sélection. */
export function blocKeys(z: Pick<Zone, 'cols' | 'rows'>, bx: number, by: number): number[] {
  const out: number[] = [];
  for (let y = by * BLOC; y < Math.min(z.rows, by * BLOC + BLOC); y++) for (let x = bx * BLOC; x < Math.min(z.cols, bx * BLOC + BLOC); x++) out.push(y * z.cols + x);
  return out;
}

export function blocInfo(z: Pick<Zone, 'cols' | 'rows'>, g: Grid, bx: number, by: number, bySpecies: Map<string, Species>) {
  const cnt = new Map<string, number>();
  let free = 0, ready = false;
  for (let y = by * BLOC; y < Math.min(z.rows, by * BLOC + BLOC); y++) for (let x = bx * BLOC; x < Math.min(z.cols, bx * BLOC + BLOC); x++) {
    const p = g[y][x];
    if (!p) { free++; continue; }
    cnt.set(p.species_id, (cnt.get(p.species_id) ?? 0) + 1);
    const s = bySpecies.get(p.species_id);
    if (s && isReady(p, s)) ready = true;
  }
  const dom = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0];
  return { dom: dom ? dom[0] : null, free, ready };
}

/** Première place libre du terrain pour une nouvelle zone (50 cm d'allée autour). */
export function findSpot(zones: Zone[], terrainW: number, terrainH: number, w: number, h: number): { x: number; y: number } | null {
  const free = (x: number, y: number) => x + w <= terrainW && y + h <= terrainH &&
    !zones.some(b => x < b.x_cm + b.cols * CELL_CM + 50 && b.x_cm < x + w + 50 && y < b.y_cm + b.rows * CELL_CM + 50 && b.y_cm < y + h + 50);
  for (let y = 50; y + h <= terrainH; y += 50) for (let x = 50; x + w <= terrainW; x += 50) if (free(x, y)) return { x, y };
  return null;
}

export const inSeason = (s: Species, month: number) => s.plant_out_months.includes(month) || s.sow_indoor_months.includes(month);

/** Couleur principale de chaque espèce, pour les vues d'ensemble. */
export const SPCOLOR: Record<string, string> = { tomate: '#E2553F', 'tomate-cerise': '#EF6A4F', poivron: '#D9452F', aubergine: '#6B3FA0', courgette: '#3E8A47', concombre: '#2F7A3E', courge: '#E8782A', 'haricot-nain': '#5FB25C', 'haricot-a-rames': '#4E9A4F', 'petit-pois': '#7DBB5C', feve: '#9CCB7C', carotte: '#F08A3C', radis: '#E0457B', betterave: '#8E2350', navet: '#9B5FC0', panais: '#CDBB8E', poireau: '#6FAF7A', oignon: '#D9963F', ail: '#BFA97E', echalote: '#B35E48', salade: '#8CC66B', mache: '#2F7A3E', epinard: '#356E3E', blette: '#E2553F', chou: '#A6D785', brocoli: '#4E9A4F', fraise: '#E2553F', basilic: '#5FB25C', persil: '#3E8A47', ciboulette: '#B07BD8', capucine: '#F08A3C', 'oeillet-d-inde': '#F6A623', jachere: '#B8A27A', paillage: '#E3B94F', mais: '#F6C445', 'pomme-de-terre': '#D9B77A', 'chou-fleur': '#E8E2CF', kale: '#356E3E', 'chou-rave': '#B5DB91', 'celeri-rave': '#D9C79A', fenouil: '#D3DDB0', piment: '#E2402F', melon: '#F2D98B', pasteque: '#3E8A47', 'pak-choi': '#8CC66B', roquette: '#3E8A47', topinambour: '#C79A5E', artichaut: '#8CBF72', asperge: '#8CC66B', rhubarbe: '#D9455F', oseille: '#6FAF7A', aneth: '#8CC66B', coriandre: '#5FB25C', menthe: '#3FA66B', thym: '#9DBB84', romarin: '#79A27B', sauge: '#A9C4A5', tournesol: '#F6C445', souci: '#F08A2A', framboisier: '#D93A5A', groseillier: '#E2403F', myrtille: '#4B5FA8' };
export const SPTINT: Record<string, string> = { tomate: '#FBE3DC', 'tomate-cerise': '#FBE3DC', poivron: '#FBE3DC', aubergine: '#ECE3F4', courgette: '#E1EFD6', concombre: '#E1EFD6', courge: '#FDE8D3', 'haricot-nain': '#E1EFD6', 'haricot-a-rames': '#E1EFD6', 'petit-pois': '#E1EFD6', feve: '#E1EFD6', carotte: '#FDE8D3', radis: '#FCE1E8', betterave: '#ECE3F4', navet: '#ECE3F4', panais: '#F3EDE1', poireau: '#E1EFD6', oignon: '#FDE8D3', ail: '#F3EDE1', echalote: '#FDE8D3', salade: '#E1EFD6', mache: '#E1EFD6', epinard: '#E1EFD6', blette: '#FFF1C7', chou: '#E1EFD6', brocoli: '#E1EFD6', fraise: '#FBE3DC', basilic: '#E1EFD6', persil: '#E1EFD6', ciboulette: '#ECE3F4', capucine: '#FDE8D3', 'oeillet-d-inde': '#FFF1C7', jachere: '#F3EDE1', paillage: '#FFF1C7', mais: '#FFF1C7', 'pomme-de-terre': '#F3EDE1', 'chou-fleur': '#F3EDE1', kale: '#E1EFD6', 'chou-rave': '#E1EFD6', 'celeri-rave': '#F3EDE1', fenouil: '#F3EDE1', piment: '#FBE3DC', melon: '#FFF1C7', pasteque: '#E1EFD6', 'pak-choi': '#E1EFD6', roquette: '#E1EFD6', topinambour: '#FDE8D3', artichaut: '#E1EFD6', asperge: '#E1EFD6', rhubarbe: '#FCE1E8', oseille: '#E1EFD6', aneth: '#E1EFD6', coriandre: '#E1EFD6', menthe: '#E1EFD6', thym: '#E1EFD6', romarin: '#E1EFD6', sauge: '#E1EFD6', tournesol: '#FFF1C7', souci: '#FDE8D3', framboisier: '#FCE1E8', groseillier: '#FBE3DC', myrtille: '#ECE3F4' };
