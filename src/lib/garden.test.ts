import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ageDays, blocInfo, isThirsty, thirstyIn, blocName, buildRelations, colLabel, de, everyDays, findSpot, footprintText, freeRects, inSeason, isBig, isMulti, isReady, isSol,
  lc, nextWater, needsWater, neighbors, occupancy, pitchCm, placeText, plantCount, plantingsIn, rangPlan, range, rel, remainingPieces, spacingOk,
  stage, toSegments, tooClose, zoneFits, zoneGround, zoneSize
} from './garden';
import { iso, parse } from './dates';
import { byId, companion, planting, species, zone } from '../test/fixtures';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 19, 12)); });
afterEach(() => vi.useRealTimers());

describe('textes et repères', () => {
  it('colLabel et blocName nomment les blocs A1, B1, AA…', () => {
    expect(colLabel(0)).toBe('A'); expect(colLabel(25)).toBe('Z'); expect(colLabel(26)).toBe('AA');
    expect(blocName(0, 0)).toBe('A1'); expect(blocName(2, 3)).toBe('C4');
  });
  it('de gère l’élision, sauf pour le haricot', () => {
    expect(de('ail')).toBe('d’ail'); expect(de('Échalote')).toBe('d’Échalote'); expect(de('haricot nain')).toBe('de haricot nain'); expect(de('tomate')).toBe('de tomate');
  });
  it('lc, range, placeText', () => {
    expect(lc('Tomate')).toBe('tomate');
    expect(range(3, 3)).toBe('3'); expect(range(3, 5)).toBe('3 à 5');
    expect(placeText({ x: 2, y: 0, w: 1, h: 1 })).toBe('rang 1, case 3');
    expect(placeText({ x: 0, y: 1, w: 4, h: 2 })).toBe('rangs 2 à 3, cases 1 à 4');
  });
  it('inSeason regarde les semis sous abri et les plantations', () => {
    const s = species({ sow_indoor_months: [3], plant_out_months: [5, 6] });
    expect([2, 3, 4, 5, 6].map(m => inSeason(s, m))).toEqual([false, true, false, true, true]);
  });
});

describe('zones et terrain', () => {
  it('zoneSize et isBig', () => {
    expect(zoneSize({ cols: 10, rows: 4 })).toEqual({ w: 300, h: 120 });
    expect(isBig({ cols: 12, rows: 12 })).toBe(false); expect(isBig({ cols: 13, rows: 5 })).toBe(true);
  });
  it('zoneFits refuse les débordements et les chevauchements, accepte le contact', () => {
    const a = zone({ id: 'a', x_cm: 0, y_cm: 0, cols: 10, rows: 10 }); // 300 × 300 cm
    const b = zone({ id: 'b', x_cm: 400, y_cm: 0, cols: 10, rows: 10 });
    const t = { w: 1000, h: 600 };
    expect(zoneFits([a, b], a, 0, 0, t)).toBe(true);
    expect(zoneFits([a, b], a, -10, 0, t)).toBe(false);
    expect(zoneFits([a, b], a, 800, 0, t)).toBe(false); // dépasse à droite
    expect(zoneFits([a, b], a, 150, 0, t)).toBe(false); // chevauche b
    expect(zoneFits([a, b], a, 100, 0, t)).toBe(true); // touche b (300 + 100 = 400)
    expect(zoneFits([a, b], a, 0, 400, t)).toBe(false); // dépasse en bas (400 + 300 > 600)
  });
  it('findSpot trouve la première place libre avec une allée de 50 cm, ou null', () => {
    const a = zone({ id: 'a', x_cm: 50, y_cm: 50, cols: 10, rows: 10 }); // 50..350
    expect(findSpot([], 1000, 1000, 300, 300)).toEqual({ x: 50, y: 50 });
    const s = findSpot([a], 1000, 1000, 300, 300)!;
    expect(s.x >= 400 || s.y >= 400).toBe(true); // 350 + 50 d'allée
    expect(findSpot([a], 400, 400, 300, 300)).toBeNull();
  });
});

describe('plantes sur plusieurs cases', () => {
  const tomate = species({ id: 't', span_w: 2, span_h: 2, spacing_cm: 60 });
  const courge = species({ id: 'c', span_w: 3, span_h: 3, spacing_cm: 90 });
  const duo = species({ id: 'd', span_w: 2, span_h: 1, spacing_cm: 60 });
  const carotte = species({ id: 'k', plants_per_cell: 16, spacing_cm: 7.5 });
  it('isMulti, footprintText', () => {
    expect(isMulti(tomate)).toBe(true); expect(isMulti(carotte)).toBe(false);
    expect(footprintText(courge)).toBe('3 × 3'); expect(footprintText(duo)).toBe('2 × 1');
  });
  it('plantCount compte les plants selon l’empreinte', () => {
    expect(plantCount({ w: 3, h: 2 }, carotte)).toBe(96);
    expect(plantCount({ w: 4, h: 4 }, tomate)).toBe(4);
    expect(plantCount({ w: 6, h: 3 }, courge)).toBe(2);
    expect(plantCount({ w: 4, h: 1 }, duo)).toBe(2);
    expect(plantCount({ w: 1, h: 1 }, tomate)).toBe(1); // reste de plantation rognée : au moins un plant
    expect(plantCount({ w: 5, h: 5 }, species({ kind: 'sol' }))).toBe(0);
  });
  it('pitchCm et spacingOk comparent la grille à la distance recommandée (tolérance de 25 %)', () => {
    expect(pitchCm(tomate)).toBe(60); expect(pitchCm(courge)).toBe(90); expect(pitchCm(carotte)).toBe(7.5);
    expect(pitchCm(species({ plants_per_cell: 4 }))).toBe(15);
    expect(spacingOk(species({ id: 'x', span_w: 2, span_h: 2, inrow_spacing_cm: 50 }))).toBe(true);
    expect(spacingOk(species({ id: 'x', inrow_spacing_cm: 40, plants_per_cell: 4 }))).toBe(false); // 15 cm < 30
    expect(spacingOk(species({ id: 'x', inrow_spacing_cm: 40 }))).toBe(true); // 30 cm ≥ 30
  });
});

describe('occupancy, plantingsIn, freeRects', () => {
  const z = zone({ cols: 5, rows: 4 });
  const a = planting({ id: 'a', x: 0, y: 0, w: 2, h: 2 });
  const b = planting({ id: 'b', x: 3, y: 3, w: 4, h: 4 }); // dépasse de la zone
  it('occupancy remplit la grille et coupe ce qui dépasse', () => {
    const g = occupancy(z, [a, b]);
    expect(g.length).toBe(4); expect(g[0].length).toBe(5);
    expect(g[1][1]?.id).toBe('a'); expect(g[2][1]).toBeNull();
    expect(g[3][4]?.id).toBe('b'); expect(g[3][2]).toBeNull();
  });
  it('plantingsIn renvoie chaque plantation une seule fois', () => {
    const g = occupancy(z, [a, b]);
    expect(plantingsIn(g, 0, 5, 0, 4).map(p => p.id).sort()).toEqual(['a', 'b']);
    expect(plantingsIn(g, 0, 1, 0, 1).map(p => p.id)).toEqual(['a']);
    expect(plantingsIn(g, 2, 3, 0, 4)).toEqual([]);
  });
  it('freeRects couvre exactement les cases libres, sans chevauchement', () => {
    const g = occupancy(z, [a, b]);
    const rects = freeRects(g, 0, 5, 0, 4);
    const seen = new Set<string>();
    for (const r of rects) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const k = x + ',' + y; expect(seen.has(k)).toBe(false); seen.add(k); expect(g[y][x]).toBeNull(); }
    const free = g.flat().filter(c => !c).length;
    expect(seen.size).toBe(free);
  });
  it('freeRects fusionne les rangs identiques en un seul rectangle', () => {
    expect(freeRects(occupancy(zone({ cols: 4, rows: 3 }), []), 0, 4, 0, 3)).toEqual([{ x: 0, y: 0, w: 4, h: 3 }]);
    const g = occupancy(zone({ cols: 4, rows: 3 }), [planting({ x: 1, y: 1, w: 1, h: 1 })]);
    expect(freeRects(g, 0, 4, 0, 3).reduce((t, r) => t + r.w * r.h, 0)).toBe(11);
  });
  it('freeRects respecte la zone demandée', () => {
    const g = occupancy(zone({ cols: 10, rows: 10 }), []);
    expect(freeRects(g, 2, 5, 1, 3)).toEqual([{ x: 2, y: 1, w: 3, h: 2 }]);
  });
});

describe('remainingPieces : libérer un rectangle', () => {
  const cellsOf = (rs: { x: number; y: number; w: number; h: number }[]) => new Set(rs.flatMap(r => Array.from({ length: r.w * r.h }, (_, i) => `${r.x + (i % r.w)},${r.y + Math.floor(i / r.w)}`)));
  it('retire tout quand la plantation est entièrement dans le rectangle', () => {
    expect(remainingPieces({ x: 1, y: 1, w: 3, h: 1 }, { x0: 0, x1: 10, y0: 0, y1: 10 })).toEqual([]);
  });
  it('garde la plantation telle quelle si elle est hors du rectangle, même collée à lui', () => {
    expect(remainingPieces({ x: 8, y: 8, w: 2, h: 2 }, { x0: 0, x1: 5, y0: 0, y1: 5 })).toEqual([{ x: 8, y: 8, w: 2, h: 2 }]);
    expect(remainingPieces({ x: 5, y: 0, w: 2, h: 2 }, { x0: 0, x1: 5, y0: 0, y1: 5 })).toEqual([{ x: 5, y: 0, w: 2, h: 2 }]); // touche le bord : pas de découpe
    expect(remainingPieces({ x: 0, y: 5, w: 3, h: 2 }, { x0: 0, x1: 5, y0: 0, y1: 5 })).toEqual([{ x: 0, y: 5, w: 3, h: 2 }]);
  });
  it('coupe un rang au milieu en deux morceaux', () => {
    const out = remainingPieces({ x: 0, y: 2, w: 10, h: 1 }, { x0: 3, x1: 6, y0: 2, y1: 3 });
    expect(cellsOf(out)).toEqual(cellsOf([{ x: 0, y: 2, w: 3, h: 1 }, { x: 6, y: 2, w: 4, h: 1 }]));
  });
  it('un plant sur plusieurs cases est retiré en entier dès qu’une case est touchée', () => {
    expect(remainingPieces({ x: 0, y: 0, w: 4, h: 2 }, { x0: 1, x1: 2, y0: 0, y1: 1 }, { w: 2, h: 2 })).toEqual([{ x: 2, y: 0, w: 2, h: 2 }]);
    expect(remainingPieces({ x: 0, y: 0, w: 6, h: 3 }, { x0: 0, x1: 5, y0: 0, y1: 5 }, { w: 3, h: 3 })).toEqual([]);
  });
  it('propriété : les cases libérées sont exactement celles du rectangle, le reste est conservé sans chevauchement', () => {
    let seed = 7;
    const rnd = (n: number) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    for (let i = 0; i < 300; i++) {
      const p = { x: rnd(6), y: rnd(6), w: 1 + rnd(6), h: 1 + rnd(6) };
      const x0 = rnd(10), y0 = rnd(10), r = { x0, x1: x0 + 1 + rnd(8), y0, y1: y0 + 1 + rnd(8) };
      const out = remainingPieces(p, r);
      const orig = cellsOf([p]), kept = cellsOf(out);
      for (const c of kept) expect(orig.has(c)).toBe(true);
      const total = out.reduce((t, q) => t + q.w * q.h, 0);
      expect(total).toBe(kept.size); // aucun chevauchement entre morceaux
      for (const c of orig) { const [x, y] = c.split(',').map(Number); const inRect = x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1; expect(kept.has(c)).toBe(!inRect); }
    }
  });
});

describe('zoneGround', () => {
  const j = species({ id: 'j', slug: 'jachere', kind: 'sol' }), pa = species({ id: 'p', slug: 'paillage', kind: 'sol' }), t = species({ id: 't' });
  const z = zone({ cols: 4, rows: 2 });
  const index = byId(j, pa, t);
  it('renvoie le sol quand toute la zone est couverte du même sol', () => {
    expect(zoneGround(z, [planting({ species_id: 'j', x: 0, y: 0, w: 4, h: 2 })], index)).toBe('jachere');
    expect(zoneGround(z, [planting({ id: '1', species_id: 'p', x: 0, y: 0, w: 4, h: 1 }), planting({ id: '2', species_id: 'p', x: 0, y: 1, w: 4, h: 1 })], index)).toBe('paillage');
  });
  it('renvoie null s’il reste une case libre, une plante ou un mélange de sols', () => {
    expect(zoneGround(z, [planting({ species_id: 'j', x: 0, y: 0, w: 4, h: 1 })], index)).toBeNull();
    expect(zoneGround(z, [planting({ id: '1', species_id: 'j', x: 0, y: 0, w: 4, h: 1 }), planting({ id: '2', species_id: 't', x: 0, y: 1, w: 4, h: 1 })], index)).toBeNull();
    expect(zoneGround(z, [planting({ id: '1', species_id: 'j', x: 0, y: 0, w: 4, h: 1 }), planting({ id: '2', species_id: 'p', x: 0, y: 1, w: 4, h: 1 })], index)).toBeNull();
  });
  it('isSol', () => { expect(isSol(j)).toBe(true); expect(isSol(t)).toBe(false); expect(isSol(undefined)).toBe(false); });
});

describe('voisinages', () => {
  const rels = buildRelations([companion('a', 'b', 'good'), companion('a', 'c', 'bad')]);
  it('buildRelations est symétrique', () => {
    expect(rel(rels, 'a', 'b')?.relation).toBe('good'); expect(rel(rels, 'b', 'a')?.relation).toBe('good');
    expect(rel(rels, 'b', 'c')).toBeNull();
  });
  it('neighbors repère les bons et mauvais voisins autour du rectangle, diagonales comprises', () => {
    const z = zone({ cols: 5, rows: 5 });
    const g = occupancy(z, [planting({ id: '1', species_id: 'b', x: 0, y: 0 }), planting({ id: '2', species_id: 'c', x: 2, y: 2 })]);
    expect(neighbors(g, { x: 1, y: 1, w: 1, h: 1 }, 'a', rels)).toEqual({ good: ['b'], bad: ['c'] });
    expect(neighbors(g, { x: 4, y: 4, w: 1, h: 1 }, 'a', rels)).toEqual({ good: [], bad: [] });
    expect(neighbors(g, { x: 1, y: 1, w: 1, h: 1 }, 'a', rels, '2').bad).toEqual([]); // la plantation exclue n'est pas comptée
  });
  it('rangPlan saute les cases occupées et celles à côté d’un mauvais voisin', () => {
    const z = zone({ cols: 6, rows: 3 });
    const g = occupancy(z, [planting({ id: '1', species_id: 'c', x: 3, y: 0 }), planting({ id: '2', species_id: 'a', x: 5, y: 1 })]);
    const plan = rangPlan(g, 1, 0, 6, 'a', rels);
    expect(plan.ok).toEqual([0, 1]); // 2, 3, 4 touchent c (ligne du dessus) ; 5 est occupée
    expect(plan.busy).toBe(1); expect(plan.badCells).toBe(3); expect(plan.bad).toEqual(['c']);
  });
  it('toSegments regroupe les colonnes consécutives', () => {
    expect(toSegments([])).toEqual([]);
    expect(toSegments([1, 2, 3, 6, 8, 9])).toEqual([{ x: 1, w: 3 }, { x: 6, w: 1 }, { x: 8, w: 2 }]);
  });
  it('tooClose signale les voisines plus serrées que la moyenne des distances recommandées, sans compter les sols', () => {
    const grand = species({ id: 'g', inrow_spacing_cm: 100 }), autre = species({ id: 'o', inrow_spacing_cm: 100 }), sol = species({ id: 'j', kind: 'sol' });
    const idx = byId(grand, autre, sol);
    const z = zone({ cols: 4, rows: 4 });
    const g = occupancy(z, [planting({ id: '1', species_id: 'o', x: 1, y: 0 }), planting({ id: '2', species_id: 'j', x: 0, y: 1 })]);
    const hits = tooClose(g, { x: 1, y: 1, w: 1, h: 1 }, grand, idx);
    expect([...hits.keys()]).toEqual(['o']); // gap 30 cm < 75 ; le sol est ignoré
    expect(tooClose(g, { x: 3, y: 3, w: 1, h: 1 }, grand, idx).size).toBe(0);
  });
});

describe('arrosage, récolte, stade', () => {
  const s = species({ water_every_days: 3, harvest_months: [10], days_to_harvest: 60 });
  it('everyDays préfère la valeur de la plantation', () => {
    expect(everyDays(planting(), s)).toBe(3); expect(everyDays(planting({ water_every_days: 5 }), s)).toBe(5);
  });
  it('nextWater part du dernier arrosage, ou du semis, et tient compte de la pluie', () => {
    expect(iso(nextWater(planting({ sown_at: '2026-10-10' }), s))).toBe('2026-10-13');
    expect(iso(nextWater(planting({ sown_at: '2026-10-10', last_watered_at: '2026-10-15' }), s))).toBe('2026-10-18');
    expect(iso(nextWater(planting({ last_watered_at: '2026-10-15' }), s, parse('2026-10-17')))).toBe('2026-10-20'); // la pluie du 17 compte
    expect(iso(nextWater(planting({ last_watered_at: '2026-10-15' }), s, parse('2026-10-10')))).toBe('2026-10-18'); // pluie plus ancienne : ignorée
  });
  it('needsWater : vrai dès la date prévue', () => {
    const p = planting({ last_watered_at: '2026-10-16' }); // prévu le 19
    expect(needsWater(p, s)).toBe(true);
    expect(needsWater(planting({ last_watered_at: '2026-10-17' }), s)).toBe(false);
    expect(needsWater(p, s, parse('2026-10-19'), parse('2026-10-18'))).toBe(false); // pluie hier
  });
  it('isReady demande le bon mois et la durée écoulée (ou une vivace)', () => {
    expect(isReady(planting({ sown_at: '2026-06-01' }), s)).toBe(true);
    expect(isReady(planting({ sown_at: '2026-09-01' }), s)).toBe(false); // 48 jours seulement
    expect(isReady(planting({ sown_at: '2026-01-01' }), species({ harvest_months: [7], days_to_harvest: 60 }))).toBe(false); // mauvais mois
    expect(isReady(planting(), species({ harvest_months: [10], days_to_harvest: null }))).toBe(true);
  });
  it('stage : semis, plantation, croissance, récolte', () => {
    const lent = species({ harvest_months: [3], days_to_harvest: 100 });
    expect(stage(planting({ sown_at: '2026-10-10' }), lent)).toBe(0); // 9 j sur 100
    expect(stage(planting({ sown_at: '2026-09-10' }), lent)).toBe(1); // 39 j
    expect(stage(planting({ sown_at: '2026-06-10' }), lent)).toBe(2); // 131 j mais hors mois de récolte
    expect(stage(planting({ sown_at: '2026-06-01' }), s)).toBe(3);
    expect(stage(planting(), species({ days_to_harvest: null }))).toBe(2);
    expect(ageDays(planting({ sown_at: '2026-10-09' }))).toBe(10);
  });
});

describe('isThirsty et thirstyIn', () => {
  const s = species({ id: 's', water_every_days: 3 });
  const sol = species({ id: 'j', kind: 'sol' });
  const dry = planting({ last_watered_at: '2026-10-10' }); // prévu le 13 : en retard
  it('une plante dont l’arrosage est dû est à arroser', () => {
    expect(isThirsty(dry, s)).toBe(true);
    expect(isThirsty(planting({ last_watered_at: '2026-10-18' }), s)).toBe(false);
  });
  it('pas pour un sol, une espèce inconnue ou des alertes coupées', () => {
    expect(isThirsty(dry, sol)).toBe(false);
    expect(isThirsty(dry, undefined)).toBe(false);
    expect(isThirsty({ ...dry, alerts_enabled: false }, s)).toBe(false);
  });
  it('la pluie récente compte comme un arrosage', () => {
    expect(isThirsty(dry, s, parse('2026-10-18'))).toBe(false);
    expect(isThirsty(dry, s, parse('2026-10-11'))).toBe(true);
  });
  it('thirstyIn ne garde que les plantations à arroser du rectangle', () => {
    const z = zone({ cols: 6, rows: 2 });
    const ps = [planting({ id: 'soif', x: 0, y: 0, w: 2, h: 1, last_watered_at: '2026-10-10' }), planting({ id: 'ok', x: 3, y: 0, w: 1, h: 1, last_watered_at: '2026-10-18' }), planting({ id: 'loin', x: 5, y: 1, w: 1, h: 1, last_watered_at: '2026-10-10' })];
    const g = occupancy(z, ps);
    expect(thirstyIn(g, 0, 6, 0, 2, byId(s)).map(p => p.id).sort()).toEqual(['loin', 'soif']);
    expect(thirstyIn(g, 0, 3, 0, 2, byId(s)).map(p => p.id)).toEqual(['soif']);
    expect(thirstyIn(g, 3, 5, 0, 2, byId(s))).toEqual([]);
  });
});

describe('blocInfo', () => {
  it('donne l’espèce dominante, les cases libres et la présence de plants prêts', () => {
    const s = species({ id: 'a', harvest_months: [10] }), o = species({ id: 'b' });
    const z = zone({ cols: 6, rows: 5 });
    const g = occupancy(z, [planting({ id: '1', species_id: 'a', x: 0, y: 0, w: 3, h: 2, sown_at: '2026-01-01' }), planting({ id: '2', species_id: 'b', x: 3, y: 0, w: 1, h: 1 })]);
    const info = blocInfo(z, g, 0, 0, byId(s, o));
    expect(info).toEqual({ dom: 'a', free: 25 - 7, ready: true });
    expect(blocInfo(z, g, 1, 0, byId(s, o))).toEqual({ dom: null, free: 5, ready: false }); // bloc de 1 colonne × 5 rangs
  });
});
