import { isSol } from './garden';
import type { Species, SpeciesCategory } from './types';

export type AlmanacCategory = Exclude<SpeciesCategory, 'sol'> | 'toutes' | 'autres';
export type AlmanacActivity = 'all' | 'indoor' | 'outdoor' | 'harvest';
export type AlmanacSort = 'name' | 'name-desc' | 'difficulty';
const DIFFICULTY_ORDER = { facile: 0, moyen: 1, exigeant: 2 } as const;

/** Les filtres s’appliquent aux deux listes du mois, sans modifier le catalogue partagé. */
export function almanacEntries(species: Species[], o: { month: number; category: AlmanacCategory; activity: AlmanacActivity; sort: AlmanacSort }) {
  const plants = species.filter(s => !isSol(s) && (o.category === 'toutes' || (o.category === 'autres' ? s.category === null : s.category === o.category)));
  plants.sort((a, b) => {
    const names = a.name.localeCompare(b.name, 'fr');
    if (o.sort === 'name-desc') return -names;
    if (o.sort === 'difficulty') return (a.difficulty ? DIFFICULTY_ORDER[a.difficulty] : 3) - (b.difficulty ? DIFFICULTY_ORDER[b.difficulty] : 3) || names;
    return names;
  });
  const sow = o.activity === 'harvest' ? [] : plants.filter(s => o.activity === 'indoor' ? s.sow_indoor_months.includes(o.month) : o.activity === 'outdoor' ? s.plant_out_months.includes(o.month) : s.sow_indoor_months.includes(o.month) || s.plant_out_months.includes(o.month));
  const harvest = o.activity === 'all' || o.activity === 'harvest' ? plants.filter(s => s.harvest_months.includes(o.month)) : [];
  return { sow, harvest, total: new Set([...sow, ...harvest].map(s => s.id)).size };
}
