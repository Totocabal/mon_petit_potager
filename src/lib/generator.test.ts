import { describe, expect, it } from 'vitest';
import { generatePlan, type Plan } from './generator';
import { buildRelations, occupancy } from './garden';
import { companion, planting, species, zone } from '../test/fixtures';

const salade = species({ id: 'sal', name: 'Salade', height: 'basse' });
const tomate = species({ id: 'tom', name: 'Tomate', height: 'haute', span_w: 2, span_h: 2, spacing_cm: 60 });
const fenouil = species({ id: 'fen', name: 'Fenouil', height: 'moyenne' });
const carotte = species({ id: 'car', name: 'Carotte', plants_per_cell: 16 });
const rels = buildRelations([companion('tom', 'fen', 'bad'), companion('sal', 'car', 'good')]);
const z = zone({ cols: 10, rows: 8 });
const area = { x: 0, y: 0, w: 10, h: 8 };
const empty = () => occupancy(z, []);
const SEEDS = [1, 2, 3, 42, 1234, 99999];

/** Cases couvertes par les rectangles du plan, par espèce. */
const covered = (plan: Plan) => {
  const m = new Map<string, string>(); // "x,y" -> espèce
  for (const r of plan.rects) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const k = x + ',' + y; expect(m.has(k), `case ${k} couverte deux fois`).toBe(false); m.set(k, r.species_id); }
  return m;
};

describe('generatePlan : invariants', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed} : les rectangles couvrent exactement les cases placées, sans chevauchement`, () => {
      const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: salade, weight: 2 }, { species: tomate, weight: 1 }, { species: carotte, weight: 1 }], rels, seed });
      const m = covered(plan);
      expect(m.size).toBe(plan.placed);
      let fromCells = 0;
      plan.cells.forEach((row, y) => row.forEach((id, x) => { if (id) { fromCells++; expect(m.get(x + ',' + y)).toBe(id); } }));
      expect(fromCells).toBe(plan.placed);
      expect([...plan.counts.values()].reduce((a, b) => a + b, 0)).toBe(plan.placed);
    });
    it(`seed ${seed} : les plants sur plusieurs cases forment des blocs complets alignés sur la grille`, () => {
      const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: tomate, weight: 3 }, { species: salade, weight: 1 }], rels, seed });
      const blocs = plan.rects.filter(r => r.species_id === 'tom');
      expect(blocs.length).toBeGreaterThan(0);
      for (const b of blocs) { expect(b.w).toBe(2); expect(b.h).toBe(2); expect((b.x - area.x) % 2).toBe(0); expect((b.y - area.y) % 2).toBe(0); }
    });
  }

  it('est reproductible : même graine, même plan', () => {
    const o = { zone: z, area, existing: empty(), picks: [{ species: salade, weight: 1 }, { species: carotte, weight: 2 }], rels, seed: 7 };
    expect(generatePlan(o).cells).toEqual(generatePlan(o).cells);
  });

  it('ne touche ni aux cases déjà plantées ni à ce qui est hors de la zone choisie', () => {
    const existing = occupancy(z, [planting({ id: 'e', species_id: 'x', x: 2, y: 2, w: 3, h: 2 })]);
    const small = { x: 1, y: 1, w: 5, h: 4 };
    const plan = generatePlan({ zone: z, area: small, existing, picks: [{ species: salade, weight: 1 }], rels, seed: 3 });
    plan.cells.forEach((row, y) => row.forEach((id, x) => {
      const inside = x >= small.x && x < small.x + small.w && y >= small.y && y < small.y + small.h;
      if (existing[y][x]) expect(id).toBe('x');
      else if (!inside) expect(id).toBeNull();
    }));
    expect(plan.free).toBe(5 * 4 - 3 * 2);
    expect(plan.placed).toBe(plan.free); // une seule espèce simple : toutes les cases libres sont remplies
  });

  it('renvoie un plan vide sans espèce ou sans case libre', () => {
    expect(generatePlan({ zone: z, area, existing: empty(), picks: [], rels, seed: 1 }).placed).toBe(0);
    const full = occupancy(z, [planting({ x: 0, y: 0, w: 10, h: 8 })]);
    const plan = generatePlan({ zone: z, area, existing: full, picks: [{ species: salade, weight: 1 }], rels, seed: 1 });
    expect(plan.placed).toBe(0); expect(plan.rects).toEqual([]); expect(plan.free).toBe(0);
  });

  it('répartit les cases selon les poids', () => {
    const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: salade, weight: 3 }, { species: carotte, weight: 1 }], rels: new Map(), seed: 5 });
    expect(plan.counts.get('sal')).toBe(60); expect(plan.counts.get('car')).toBe(20);
  });
});

describe('generatePlan : voisinages', () => {
  it('ne place jamais côte à côte (diagonales comprises) deux espèces qui ne s’entendent pas', () => {
    for (const seed of SEEDS) {
      const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: tomate, weight: 2 }, { species: fenouil, weight: 2 }, { species: salade, weight: 1 }], rels, seed });
      expect(plan.bad).toBe(0);
      for (let y = 0; y < z.rows; y++) for (let x = 0; x < z.cols; x++) {
        const a = plan.cells[y][x]; if (!a) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const b = plan.cells[y + dy]?.[x + dx];
          if (b && b !== a) expect(rels.get(a + '|' + b)?.relation, `${a} à côté de ${b} (seed ${seed})`).not.toBe('bad');
        }
      }
    }
  });

  it('laisse des cases vides pour séparer deux mauvais voisins quand c’est inévitable', () => {
    const tight = zone({ cols: 4, rows: 2 });
    const plan = generatePlan({ zone: tight, area: { x: 0, y: 0, w: 4, h: 2 }, existing: occupancy(tight, []), picks: [{ species: salade, weight: 1 }, { species: species({ id: 'mal', name: 'Mal' }), weight: 1 }], rels: buildRelations([companion('sal', 'mal', 'bad')]), seed: 4 });
    expect(plan.bad).toBe(0);
    expect(plan.gaps).toBeGreaterThan(0);
    expect(plan.placed + plan.gaps).toBeLessThanOrEqual(8);
  });
});

describe('generatePlan : cases à éviter (rotation)', () => {
  it('une espèce n’est jamais placée sur ses cases bloquées', () => {
    const blocked = new Set<number>();
    for (let y = 0; y < 3; y++) for (let x = 0; x < 6; x++) blocked.add(y * z.cols + x);
    for (const seed of SEEDS) {
      const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: salade, weight: 1 }, { species: carotte, weight: 1 }], rels: new Map(), seed, blocked: new Map([['sal', blocked]]) });
      plan.cells.forEach((row, y) => row.forEach((id, x) => { if (id === 'sal') expect(blocked.has(y * z.cols + x)).toBe(false); }));
      expect(plan.counts.get('sal')).toBeGreaterThan(0);
    }
  });
  it('un plant sur plusieurs cases évite aussi les cases bloquées', () => {
    const blocked = new Set<number>();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 5; x++) blocked.add(y * z.cols + x); // moitié gauche
    const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: tomate, weight: 2 }], rels: new Map(), seed: 11, blocked: new Map([['tom', blocked]]) });
    for (const r of plan.rects) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) expect(x).toBeGreaterThanOrEqual(5);
  });
  it('sans cases bloquées, la même espèce peut occuper ces cases', () => {
    const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: salade, weight: 1 }], rels: new Map(), seed: 1 });
    expect(plan.placed).toBe(80);
  });
  it('laisse libres les cases que personne n’a le droit d’occuper', () => {
    const all = new Set<number>(Array.from({ length: 80 }, (_, i) => i));
    const plan = generatePlan({ zone: z, area, existing: empty(), picks: [{ species: salade, weight: 1 }], rels: new Map(), seed: 1, blocked: new Map([['sal', all]]) });
    expect(plan.placed).toBe(0);
  });
});
