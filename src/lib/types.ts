export type Species = {
  id: string;
  slug: string;
  name: string;
  family: string;
  height: 'basse' | 'moyenne' | 'haute';
  spacing_cm: number;
  plants_per_cell: number;
  /** Empreinte d'un plant, en cases : 1 × 1 (défaut), 2 × 1, 3 × 1, 2 × 2… */
  span_w: number;
  span_h: number;
  inrow_spacing_cm: number;
  row_spacing_cm: number;
  water_every_days: number;
  exposure: 'soleil' | 'mi-ombre';
  sow_indoor_months: number[];
  plant_out_months: number[];
  harvest_months: number[];
  days_to_harvest: number | null;
  perennial: boolean;
  frost_sensitive: boolean;
  notes: string | null;
  /** 'sol' : jachère, paillage… (ni arrosé, ni récolté, ni compté comme plant) */
  kind: 'plante' | 'sol';
  /** Fiche détaillée (glossaire) */
  category: SpeciesCategory | null;
  difficulty: 'facile' | 'moyen' | 'exigeant' | null;
  sow_depth_cm: number | null;
  germination_days: number | null;
  description: string | null;
  sowing: string | null;
  soil: string | null;
  care: string | null;
  pests: string | null;
  harvest_tips: string | null;
  /** Années avant de replanter la même famille au même endroit ; null = pas de contrainte */
  rotation_years: number | null;
};

export type SpeciesCategory = 'legume-fruit' | 'racine' | 'bulbe' | 'feuille' | 'chou' | 'tige' | 'legumineuse' | 'aromatique' | 'fleur' | 'petit-fruit' | 'sol';

export type Companion = {
  species_a: string;
  species_b: string;
  relation: 'good' | 'bad';
  reason: string | null;
};

export type Garden = {
  id: string;
  name: string;
  terrain_width_cm: number;
  terrain_length_cm: number;
  created_by: string;
  created_at: string;
};

export type ZoneType = 'carre' | 'jardiniere' | 'parcelle' | 'serre';

export type Zone = {
  id: string;
  garden_id: string;
  name: string;
  type: ZoneType;
  x_cm: number;
  y_cm: number;
  cols: number;
  rows: number;
  north_side: 'top' | 'right' | 'bottom' | 'left';
  sheltered: boolean;
  created_at: string;
};

export type Planting = {
  id: string;
  garden_id: string;
  zone_id: string;
  species_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sown_at: string;
  last_watered_at: string | null;
  water_every_days: number | null;
  alerts_enabled: boolean;
  removed_at: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  first_name: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string;
};

export const ZONE_TYPES: { value: ZoneType; label: string; big: boolean }[] = [
  { value: 'carre', label: 'Carré', big: false },
  { value: 'jardiniere', label: 'Jardinière', big: false },
  { value: 'parcelle', label: 'Parcelle', big: true },
  { value: 'serre', label: 'Serre', big: true }
];

export type Task = {
  id: string;
  garden_id: string;
  planting_id: string | null;
  zone_id: string | null;
  title: string;
  detail: string | null;
  due_date: string;
  done_at: string | null;
  done_by: string | null;
  origin: 'auto' | 'manuel';
};

export type Member = { garden_id: string; user_id: string; role: 'owner' | 'member'; joined_at: string; first_name: string | null };
export type Invite = { id: string; garden_id: string; email: string | null; token: string; expires_at: string; accepted_at: string | null };

export type AlertSettings = { user_id: string; enabled: boolean; skip_if_rain: boolean; reminder_hour: 8 | 19 };
