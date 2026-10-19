import type { SpeciesCategory } from './types';

/** Familles du glossaire, dans l'ordre d'affichage (légumes-fruits en premier). */
export const CATEGORIES: { key: Exclude<SpeciesCategory, 'sol'>; label: string; hint: string }[] = [
  { key: 'legume-fruit', label: 'Légumes-fruits', hint: 'Tomate, courgette, aubergine…' },
  { key: 'racine', label: 'Racines et tubercules', hint: 'Carotte, pomme de terre…' },
  { key: 'feuille', label: 'Légumes-feuilles', hint: 'Salade, épinard, blette…' },
  { key: 'chou', label: 'Choux', hint: 'Chou, brocoli, kale…' },
  { key: 'bulbe', label: 'Ails, oignons et poireaux', hint: 'Ail, oignon, échalote…' },
  { key: 'legumineuse', label: 'Légumineuses et maïs', hint: 'Haricot, pois, fève, maïs' },
  { key: 'tige', label: 'Tiges et vivaces', hint: 'Asperge, artichaut, fenouil…' },
  { key: 'aromatique', label: 'Aromatiques', hint: 'Basilic, persil, thym…' },
  { key: 'fleur', label: 'Fleurs utiles', hint: 'Capucine, souci, tournesol…' },
  { key: 'petit-fruit', label: 'Petits fruits', hint: 'Fraise, framboise, myrtille…' }
];

export const categoryLabel = (key: SpeciesCategory | null) => CATEGORIES.find(c => c.key === key)?.label ?? 'Autres';

export const DIFFICULTY_LABEL = { facile: 'Facile', moyen: 'Moyen', exigeant: 'Exigeant' } as const;
