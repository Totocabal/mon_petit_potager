import { describe, expect, it } from 'vitest';
import { agoText, blockedCells, rotationHits, rotationMessage } from './rotation';
import { parse } from './dates';
import { byId, planting, species, zone } from '../test/fixtures';

const NOW = parse('2026-10-19');
const melon = species({ id: 'melon', name: 'Melon', family: 'Cucurbitacées', rotation_years: 3 });
const courgette = species({ id: 'cg', name: 'Courgette', family: 'Cucurbitacées', rotation_years: 3 });
const tomate = species({ id: 'tom', name: 'Tomate', family: 'Solanacées', rotation_years: 3 });
const thym = species({ id: 'thym', name: 'Thym', family: 'Lamiacées', rotation_years: null });
const artichaut = species({ id: 'art', name: 'Artichaut', family: 'Astéracées', rotation_years: null });
const salade = species({ id: 'sal', name: 'Salade', family: 'Astéracées', rotation_years: 2 });
const jachere = species({ id: 'j', name: 'Jachère', family: 'Cucurbitacées', kind: 'sol', rotation_years: 3 });
const index = byId(melon, courgette, tomate, thym, artichaut, salade, jachere);
const ended = (id: string, sid: string, x: number, y: number, w: number, h: number, removed: string, zone_id = 'z') => planting({ id, species_id: sid, x, y, w, h, zone_id, removed_at: removed + 'T10:00:00Z' });
const cell = (x: number, y: number) => ({ x, y, w: 1, h: 1 });

describe('rotationHits', () => {
  const history = [ended('a', 'melon', 0, 0, 4, 2, '2026-02-19')]; // melon arrêté il y a 8 mois
  it('signale la même famille cultivée récemment au même endroit', () => {
    const hits = rotationHits(history, index, 'z', cell(1, 0), courgette, NOW);
    expect(hits).toHaveLength(1);
    expect(hits[0].species.id).toBe('melon');
    expect(hits[0].until.getFullYear()).toBe(2029);
  });
  it('ne signale rien ailleurs, dans une autre zone ou pour une autre famille', () => {
    expect(rotationHits(history, index, 'z', cell(5, 5), courgette, NOW)).toEqual([]);
    expect(rotationHits(history, index, 'autre', cell(1, 0), courgette, NOW)).toEqual([]);
    expect(rotationHits(history, index, 'z', cell(1, 0), tomate, NOW)).toEqual([]);
  });
  it('ne signale rien une fois la durée écoulée', () => {
    const vieux = [ended('a', 'melon', 0, 0, 4, 2, '2023-10-18')]; // plus de 3 ans
    expect(rotationHits(vieux, index, 'z', cell(1, 0), courgette, NOW)).toEqual([]);
    const limite = [ended('a', 'melon', 0, 0, 4, 2, '2023-10-25')]; // il reste quelques jours
    expect(rotationHits(limite, index, 'z', cell(1, 0), courgette, NOW)).toHaveLength(1);
  });
  it('ignore les plantations encore en place, les plantes sans rotation et les sols', () => {
    expect(rotationHits([planting({ species_id: 'melon', w: 4, h: 2 })], index, 'z', cell(1, 0), courgette, NOW)).toEqual([]);
    expect(rotationHits([ended('a', 'thym', 0, 0, 2, 2, '2026-09-01')], index, 'z', cell(0, 0), thym, NOW)).toEqual([]);
    expect(rotationHits([ended('a', 'j', 0, 0, 2, 2, '2026-09-01')], index, 'z', cell(0, 0), courgette, NOW)).toEqual([]);
    expect(rotationHits(history, index, 'z', cell(1, 0), jachere, NOW)).toEqual([]); // un sol n'est pas soumis à la rotation
  });
  it('une culture de la même famille sans rotation (artichaut) ne bloque pas la salade', () => {
    expect(rotationHits([ended('a', 'art', 0, 0, 2, 2, '2026-09-01')], index, 'z', cell(0, 0), salade, NOW)).toEqual([]);
  });
  it('prend la durée la plus longue des deux cultures', () => {
    const longue = species({ id: 'x', family: 'Cucurbitacées', rotation_years: 5 });
    const h = [ended('a', 'x', 0, 0, 1, 1, '2023-10-01')]; // 3 ans : suffisant pour 3, pas pour 5
    expect(rotationHits(h, byId(longue, melon), 'z', cell(0, 0), melon, NOW)).toHaveLength(1);
  });
  it('un rectangle plus grand qu’une case est testé sur toutes ses cases', () => {
    expect(rotationHits(history, index, 'z', { x: 3, y: 1, w: 3, h: 3 }, courgette, NOW)).toHaveLength(1); // touche la case (3,1)
    expect(rotationHits(history, index, 'z', { x: 4, y: 0, w: 2, h: 2 }, courgette, NOW)).toEqual([]);
  });
});

describe('blockedCells', () => {
  const z = zone({ id: 'z', cols: 8, rows: 6 });
  it('liste les cases à éviter (y * colonnes + x)', () => {
    const b = blockedCells([ended('a', 'melon', 0, 0, 4, 2, '2026-02-19')], index, z, courgette, NOW);
    expect(b.size).toBe(8);
    expect(b.has(0)).toBe(true); expect(b.has(1 * 8 + 3)).toBe(true); expect(b.has(4)).toBe(false); expect(b.has(2 * 8)).toBe(false);
  });
  it('coupe les plantations qui dépassent de la zone', () => {
    const b = blockedCells([ended('a', 'melon', 6, 4, 5, 5, '2026-02-19')], index, z, courgette, NOW);
    expect(b.size).toBe(2 * 2);
  });
  it('est vide pour une plante sans rotation, un sol ou une autre zone', () => {
    const h = [ended('a', 'melon', 0, 0, 4, 2, '2026-02-19')];
    expect(blockedCells(h, index, z, thym, NOW).size).toBe(0);
    expect(blockedCells(h, index, z, jachere, NOW).size).toBe(0);
    expect(blockedCells(h, index, zone({ id: 'autre' }), courgette, NOW).size).toBe(0);
  });
  it('est cohérent avec rotationHits case par case', () => {
    const h = [ended('a', 'melon', 1, 1, 3, 2, '2025-11-01'), ended('b', 'cg', 5, 3, 2, 2, '2022-01-01')];
    const b = blockedCells(h, index, z, melon, NOW);
    for (let y = 0; y < z.rows; y++) for (let x = 0; x < z.cols; x++) expect(b.has(y * z.cols + x)).toBe(rotationHits(h, index, 'z', cell(x, y), melon, NOW).length > 0);
  });
});

describe('textes', () => {
  it('agoText', () => {
    expect(agoText(parse('2026-10-10'), NOW)).toBe('ce mois-ci');
    expect(agoText(parse('2026-02-19'), NOW)).toBe('il y a 8 mois');
    expect(agoText(parse('2025-10-19'), NOW)).toBe('il y a 1 an');
    expect(agoText(parse('2024-08-19'), NOW)).toBe('il y a 2 ans et 2 mois');
  });
  it('rotationMessage cite la famille, les cultures, l’ancienneté et la date conseillée', () => {
    const hits = rotationHits([ended('a', 'melon', 0, 0, 4, 2, '2026-02-19')], index, 'z', cell(1, 0), courgette, NOW);
    const msg = rotationMessage(courgette, hits);
    expect(msg).toContain('cucurbitacées'); expect(msg).toContain('melon'); expect(msg).toContain('il y a 8 mois'); expect(msg).toContain('2029');
    expect(rotationMessage(courgette, [])).toBe('');
  });
});
