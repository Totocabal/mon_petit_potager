import { useQuery } from '@tanstack/react-query';
import { iso, parse, today } from './dates';

/** Seuil de pluie (mm) à partir duquel une plante en pleine terre est considérée comme arrosée. */
export const RAIN_MM = 3;

export type WeatherDay = { date: string; rain: number; tmax: number; tmin: number; code: number; /** probabilité de pluie (%) ; null pour les jours passés */ chance: number | null };
export type Weather = { days: WeatherDay[]; current?: { temp: number; code: number } };
export type Place = { name: string; lat: number; lon: number };
/** Une suggestion de ville : le lieu, plus de quoi distinguer les homonymes (département ou région, pays). */
export type PlaceHit = Place & { id: number; detail: string };

/** Trouve une ville (Open-Meteo, sans clé). */
export async function geocode(city: string): Promise<Place | null> {
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`);
  if (!r.ok) throw new Error('Recherche de la ville impossible');
  const j = await r.json();
  const p = j.results?.[0];
  return p ? { name: p.name, lat: p.latitude, lon: p.longitude } : null;
}

type GeoResult = { id?: number; name: string; latitude: number; longitude: number; admin1?: string; admin2?: string; country?: string };

/** Ligne d'information sous le nom d'une ville : « Rhône · France ». */
export function placeDetail(r: Pick<GeoResult, 'admin1' | 'admin2' | 'country'>): string {
  const region = r.admin2 && r.admin2 !== r.admin1 ? r.admin2 : r.admin1;
  return [region, r.country].filter(Boolean).join(' · ');
}

/** Suggestions de villes pour une saisie partielle (Open-Meteo, sans clé). Vide en dessous de 2 lettres. */
export async function searchPlaces(query: string, signal?: AbortSignal, count = 6): Promise<PlaceHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${count}&language=fr&format=json`, { signal });
  if (!r.ok) throw new Error('Recherche de la ville impossible');
  const j = await r.json();
  return ((j.results ?? []) as GeoResult[]).map((p, i) => ({ id: p.id ?? i, name: p.name, lat: p.latitude, lon: p.longitude, detail: placeDetail(p) }));
}

async function fetchWeather(lat: number, lon: number): Promise<Weather> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code&current=temperature_2m,weather_code&past_days=3&forecast_days=8&timezone=auto`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Météo indisponible');
  const j = await r.json();
  const d = j.daily, c = j.current;
  return {
    days: d.time.map((t: string, i: number) => ({ date: t, rain: d.precipitation_sum[i] ?? 0, tmax: Math.round(d.temperature_2m_max[i]), tmin: Math.round(d.temperature_2m_min[i]), code: d.weather_code[i], chance: d.precipitation_probability_max?.[i] ?? null })),
    current: c ? { temp: Math.round(c.temperature_2m), code: c.weather_code } : undefined
  };
}

export function useWeather(lat: number | null | undefined, lon: number | null | undefined) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    enabled: lat != null && lon != null,
    staleTime: 30 * 60_000,
    retry: 1,
    queryFn: () => fetchWeather(lat!, lon!)
  });
}

/** Dernier jour (≤ aujourd'hui) où il a assez plu pour arroser, ou null. */
export function lastRainyDay(w: Weather | undefined, now = today()): Date | null {
  if (!w) return null;
  const limit = iso(now);
  const hit = w.days.filter(d => d.date <= limit && d.rain >= RAIN_MM).map(d => d.date).sort().pop();
  return hit ? parse(hit) : null;
}

/** Pluie prévue aujourd'hui ou demain (mm). */
export function rainSoon(w: Weather | undefined, now = today()): number {
  if (!w) return 0;
  const t = iso(now);
  const tm = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  return w.days.filter(d => d.date === t || d.date === tm).reduce((s, d) => s + d.rain, 0);
}

/** Pluie (mm) prévue un jour donné (yyyy-mm-dd). */
export function rainOn(w: Weather | undefined, date: string): number {
  return w?.days.find(d => d.date === date)?.rain ?? 0;
}

export type Sky = 'soleil' | 'eclaircies' | 'nuageux' | 'brouillard' | 'pluie' | 'averses' | 'neige' | 'orage';

export const SKY_LABEL: Record<Sky, string> = {
  soleil: 'ensoleillé', eclaircies: 'éclaircies', nuageux: 'nuageux', brouillard: 'brouillard',
  pluie: 'pluie', averses: 'averses', neige: 'neige', orage: 'orage'
};

/** Code WMO (Open-Meteo) → ciel illustré. */
export function skyOf(code: number): Sky {
  if (code === 0) return 'soleil';
  if (code <= 2) return 'eclaircies';
  if (code === 3) return 'nuageux';
  if (code <= 48) return 'brouillard';
  if (code <= 67) return 'pluie';
  if (code <= 77) return 'neige';
  if (code <= 86) return code >= 85 ? 'neige' : 'averses';
  return 'orage';
}

export function describe(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Ensoleillé', icon: '☀️' };
  if (code <= 2) return { label: 'Éclaircies', icon: '🌤️' };
  if (code === 3) return { label: 'Couvert', icon: '☁️' };
  if (code <= 48) return { label: 'Brouillard', icon: '🌫️' };
  if (code <= 57) return { label: 'Bruine', icon: '🌦️' };
  if (code <= 67) return { label: 'Pluie', icon: '🌧️' };
  if (code <= 77) return { label: 'Neige', icon: '❄️' };
  if (code <= 82) return { label: 'Averses', icon: '🌦️' };
  return { label: 'Orage', icon: '⛈️' };
}
