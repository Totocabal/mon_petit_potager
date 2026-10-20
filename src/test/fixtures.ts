import type { Companion, Planting, Species, Zone } from '../lib/types';

/** Espèce de test : une plante simple à 1 plant par case, que chaque test précise. */
export const species = (o: Partial<Species> = {}): Species => ({
  id: 's', slug: 's', name: 'Espèce', family: 'Famille', height: 'basse', spacing_cm: 30, plants_per_cell: 1, span_w: 1, span_h: 1,
  inrow_spacing_cm: 30, row_spacing_cm: 30, water_every_days: 3, exposure: 'soleil', sow_indoor_months: [], plant_out_months: [], harvest_months: [],
  days_to_harvest: null, perennial: false, frost_sensitive: false, notes: null, kind: 'plante', category: null, difficulty: null, sow_depth_cm: null,
  germination_days: null, description: null, sowing: null, soil: null, care: null, pests: null, pests_treatment: null, harvest_tips: null, rotation_years: null, ...o
});

export const planting = (o: Partial<Planting> = {}): Planting => ({
  id: 'p', garden_id: 'g', zone_id: 'z', species_id: 's', x: 0, y: 0, w: 1, h: 1, sown_at: '2026-05-01', last_watered_at: null,
  water_every_days: null, alerts_enabled: true, removed_at: null, created_at: '2026-05-01', ...o
});

export const zone = (o: Partial<Zone> = {}): Zone => ({
  id: 'z', garden_id: 'g', name: 'Zone', type: 'carre', x_cm: 0, y_cm: 0, cols: 10, rows: 10, north_side: 'top', sheltered: false, created_at: '2026-01-01', ...o
});

export const companion = (a: string, b: string, relation: 'good' | 'bad'): Companion => ({ species_a: a, species_b: b, relation, reason: null });

/** Index d'espèces par identifiant, comme `byId` dans l'app. */
export const byId = (...list: Species[]) => new Map(list.map(s => [s.id, s]));
