import { describe, expect, it } from 'vitest';
import { almanacEntries } from './almanac';
import { species } from '../test/fixtures';

const carotte = species({ id: 'c', name: 'Carotte', category: 'racine', difficulty: 'facile', plant_out_months: [10], harvest_months: [10] });
const epinard = species({ id: 'e', name: 'Épinard', category: 'feuille', difficulty: 'moyen', sow_indoor_months: [10], harvest_months: [11] });
const artichaut = species({ id: 'a', name: 'Artichaut', category: 'tige', difficulty: 'exigeant', plant_out_months: [10], harvest_months: [10] });
const other = species({ id: 'o', name: 'Autre', difficulty: null, plant_out_months: [10] });
const catalogue = [epinard, carotte, artichaut, other, species({ id: 'sol', kind: 'sol', plant_out_months: [10], harvest_months: [10] })];
const entries = (options: Partial<Parameters<typeof almanacEntries>[1]> = {}) => almanacEntries(catalogue, { month: 10, category: 'toutes', activity: 'all', sort: 'name', ...options });

describe('filtres et tri de l’Almanach', () => {
  it('applique le mois et exclut les sols sans compter deux fois les plantes communes aux listes', () => {
    expect(entries().total).toBe(4);
    expect(entries().harvest.map(s => s.id)).toEqual(['a', 'c']);
    expect(entries({ month: 11 }).harvest.map(s => s.id)).toEqual(['e']);
    expect(entries({ month: 11 }).sow).toEqual([]);
  });
  it('filtre les deux listes par catégorie', () => {
    expect(entries({ category: 'racine' }).sow).toEqual([carotte]);
    expect(entries({ category: 'racine' }).harvest).toEqual([carotte]);
  });
  it('distingue les semis sous abri des semis en place et plantations', () => {
    expect(entries({ activity: 'indoor' }).sow).toEqual([epinard]);
    expect(entries({ activity: 'indoor' }).harvest).toEqual([]);
    expect(entries({ activity: 'outdoor' }).sow.map(s => s.id)).toEqual(['a', 'o', 'c']);
    expect(entries({ activity: 'outdoor' }).harvest).toEqual([]);
  });
  it('ne montre que les récoltes quand cette activité est choisie', () => {
    expect(entries({ activity: 'harvest' }).sow).toEqual([]);
    expect(entries({ activity: 'harvest' }).total).toBe(2);
  });
  it('combine mois, catégorie et activité et gère les résultats vides', () => {
    expect(entries({ category: 'racine', activity: 'indoor' }).total).toBe(0);
    expect(entries({ category: 'feuille', activity: 'harvest', month: 11 }).harvest).toEqual([epinard]);
  });
  it('trie les noms dans les deux sens, y compris les accents', () => {
    expect(entries().sow.map(s => s.name)).toEqual(['Artichaut', 'Autre', 'Carotte', 'Épinard']);
    expect(entries({ sort: 'name-desc' }).sow.map(s => s.name)).toEqual(['Épinard', 'Carotte', 'Autre', 'Artichaut']);
  });
  it('classe les plus faciles en premier et les difficultés inconnues en dernier', () => {
    expect(entries({ sort: 'difficulty' }).sow.map(s => s.id)).toEqual(['c', 'e', 'a', 'o']);
  });
  it('garde accessibles les plantes sans catégorie et ne modifie pas le catalogue', () => {
    expect(entries({ category: 'autres' }).sow).toEqual([other]);
    const order = catalogue.map(s => s.id);
    entries({ sort: 'name-desc' });
    expect(catalogue.map(s => s.id)).toEqual(order);
  });
});
