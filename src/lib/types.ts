export type Species = {
  id: string;
  slug: string;
  name: string;
  family: string;
  height: 'basse' | 'moyenne' | 'haute';
  spacing_cm: number;
  plants_per_cell: number;
  span_cells: number;
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
};

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
  timezone: string;
};

export const ZONE_TYPES: { value: ZoneType; label: string; big: boolean }[] = [
  { value: 'carre', label: 'Carré', big: false },
  { value: 'jardiniere', label: 'Jardinière', big: false },
  { value: 'parcelle', label: 'Parcelle', big: true },
  { value: 'serre', label: 'Serre', big: true }
];
