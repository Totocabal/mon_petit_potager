import { CATEGORIES } from './glossary';
import { monthsText } from './dates';
import { isSol } from './garden';
import type { AlmanacActivity, AlmanacCategory, AlmanacSort } from './almanac';
import type { Species } from './types';

export type PlantFilters = { category: AlmanacCategory; activity: AlmanacActivity; sort: AlmanacSort };
export const DEFAULT_FILTERS: PlantFilters = { category: 'toutes', activity: 'all', sort: 'name' };

export const ACTIVITY_LABEL: Record<AlmanacActivity, string> = { all: 'Tout', indoor: 'Semis sous abri', outdoor: 'Semis en place et plantations', harvest: 'Récoltes' };
export const SORT_LABEL: Record<AlmanacSort, string> = { name: 'Nom : A → Z', 'name-desc': 'Nom : Z → A', difficulty: 'Les plus faciles d’abord' };
export const categoryName = (c: AlmanacCategory) => (c === 'toutes' ? 'Toutes' : c === 'autres' ? 'Autres plantes' : CATEGORIES.find(x => x.key === c)?.label ?? 'Autres plantes');

/** Sans accents ni majuscules, pour chercher « epinard » et trouver « Épinard ». */
export const normalize = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Les plantes (jamais les sols) dont le nom ou la famille contient la saisie. */
export function searchPlants(list: Species[], q: string): Species[] {
  const n = normalize(q.trim());
  return list.filter(s => !isSol(s) && (!n || normalize(s.name + ' ' + s.family).includes(n)));
}

/** Filtres qui s'écartent de leur valeur par défaut, pour le badge du bouton « Filtres » (l'activité n'existe que dans la vue du mois). */
export function activeFilters(f: PlantFilters, view: 'mois' | 'toutes'): { key: keyof PlantFilters; label: string }[] {
  const out: { key: keyof PlantFilters; label: string }[] = [];
  if (f.category !== DEFAULT_FILTERS.category) out.push({ key: 'category', label: categoryName(f.category) });
  if (view === 'mois' && f.activity !== DEFAULT_FILTERS.activity) out.push({ key: 'activity', label: ACTIVITY_LABEL[f.activity] });
  if (f.sort !== DEFAULT_FILTERS.sort) out.push({ key: 'sort', label: SORT_LABEL[f.sort] });
  return out;
}

/** Plantes rangées par famille du glossaire, dans l'ordre d'affichage ; celles sans famille à la fin. */
export function groupByCategory(list: Species[]) {
  const groups = CATEGORIES.map(c => ({ key: c.key as string, label: c.label, hint: c.hint, list: list.filter(s => s.category === c.key) }));
  const others = list.filter(s => s.category === null || !CATEGORIES.some(c => c.key === s.category));
  if (others.length) groups.push({ key: 'autres', label: 'Autres plantes', hint: '', list: others });
  return groups.filter(g => g.list.length);
}

/** Quand semer ou planter, en quelques mots : la première période (« mars–avr. »), suivie de « + » s'il y en a d'autres ; « Vivace » sans fenêtre connue. */
export function seasonText(s: Pick<Species, 'plant_out_months' | 'sow_indoor_months' | 'perennial'>): string {
  const ms = s.plant_out_months.length ? s.plant_out_months : s.sow_indoor_months;
  if (!ms.length) return s.perennial ? 'Vivace' : '—';
  const [first, ...more] = monthsText(ms).split(', ');
  return more.length ? first + ' +' : first;
}
