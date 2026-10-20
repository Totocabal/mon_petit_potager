import { describe, expect, it } from 'vitest';
import { activeFilters, DEFAULT_FILTERS, groupByCategory, normalize, searchPlants, seasonText } from './plants';
import { species } from '../test/fixtures';

describe('searchPlants', () => {
  const list = [species({ id: '1', name: 'Épinard', family: 'Amaranthacées' }), species({ id: '2', name: 'Tomate', family: 'Solanacées' }), species({ id: '3', name: 'Jachère', kind: 'sol' })];
  it('cherche sans accents ni majuscules, dans le nom et la famille', () => {
    expect(normalize('Épinard')).toBe('epinard');
    expect(searchPlants(list, 'EPINARD').map(s => s.id)).toEqual(['1']);
    expect(searchPlants(list, 'solanac').map(s => s.id)).toEqual(['2']);
  });
  it('une saisie vide garde toutes les plantes, jamais les sols', () => {
    expect(searchPlants(list, '  ').map(s => s.id)).toEqual(['1', '2']);
  });
});

describe('activeFilters', () => {
  it('aucun filtre par défaut', () => expect(activeFilters(DEFAULT_FILTERS, 'mois')).toEqual([]));
  it('liste ce qui s’écarte du défaut', () => {
    const f = { category: 'racine' as const, activity: 'harvest' as const, sort: 'difficulty' as const };
    expect(activeFilters(f, 'mois').map(x => x.key)).toEqual(['category', 'activity', 'sort']);
  });
  it('l’activité ne compte pas dans la vue « toutes »', () => {
    expect(activeFilters({ ...DEFAULT_FILTERS, activity: 'indoor' }, 'toutes')).toEqual([]);
    expect(activeFilters({ ...DEFAULT_FILTERS, category: 'autres' }, 'toutes').map(x => x.label)).toEqual(['Autres plantes']);
  });
});

describe('groupByCategory et seasonText', () => {
  it('range par famille dans l’ordre du glossaire, et les autres à la fin', () => {
    const g = groupByCategory([species({ id: 'a', category: 'aromatique' }), species({ id: 'b', category: 'legume-fruit' }), species({ id: 'c', category: null })]);
    expect(g.map(x => x.key)).toEqual(['legume-fruit', 'aromatique', 'autres']);
  });
  it('seasonText préfère la plantation, sinon le semis sous abri, sinon « Vivace »', () => {
    expect(seasonText({ plant_out_months: [5], sow_indoor_months: [3, 4], perennial: false })).toBe('mai');
    expect(seasonText({ plant_out_months: [], sow_indoor_months: [3, 4], perennial: false })).toMatch(/mars/);
    expect(seasonText({ plant_out_months: [3, 4, 7, 8], sow_indoor_months: [], perennial: false })).toMatch(/ \+$/); // plusieurs périodes : la première, puis « + »
    expect(seasonText({ plant_out_months: [], sow_indoor_months: [], perennial: true })).toBe('Vivace');
    expect(seasonText({ plant_out_months: [], sow_indoor_months: [], perennial: false })).toBe('—');
  });
});
