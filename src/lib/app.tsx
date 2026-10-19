import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Garden, Planting, Profile, Species, Zone } from './types';
import { useCatalogue, usePlantingHistory, usePlantings, useProfile, useZones } from './data';
import { isSol, type Relations } from './garden';
import { lastRainyDay, useWeather, type Weather } from './weather';

export type AppData = {
  session: Session;
  profile: Profile | null;
  garden: Garden;
  gardens: Garden[];
  selectGarden: (id: string) => void;
  zones: Zone[];
  /** Toutes les plantations, sols compris (jachère, paillage) : pour dessiner les grilles */
  plantings: Planting[];
  /** Seulement les plantes (sans jachère ni paillage) : arrosage, récolte, comptes */
  crops: Planting[];
  /** Plantations retirées récemment (rotation des cultures) */
  history: Planting[];
  species: Species[];
  byId: Map<string, Species>;
  bySlug: Map<string, Species>;
  rels: Relations;
  weather: Weather | undefined;
  /** Dernier jour de pluie utile pour une zone (null si zone abritée ou sans météo). */
  rainFor: (zoneId: string) => Date | null;
  loading: boolean;
};

const Ctx = createContext<AppData | null>(null);

export function useApp(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp hors du fournisseur');
  return v;
}

export function AppProvider({ session, garden, gardens, selectGarden, children }: { session: Session; garden: Garden; gardens: Garden[]; selectGarden: (id: string) => void; children: ReactNode }) {
  const cat = useCatalogue();
  const zones = useZones(garden.id);
  const plantings = usePlantings(garden.id);
  const history = usePlantingHistory(garden.id);
  const profile = useProfile(session.user.id);
  const weather = useWeather(profile.data?.lat, profile.data?.lon);
  const value = useMemo<AppData>(() => ({
    session,
    profile: profile.data ?? null,
    garden,
    gardens,
    selectGarden,
    zones: zones.data ?? [],
    plantings: plantings.data ?? [],
    crops: (plantings.data ?? []).filter(p => !isSol(cat.byId.get(p.species_id))),
    history: history.data ?? [],
    species: cat.species,
    byId: cat.byId,
    bySlug: cat.bySlug,
    rels: cat.rels,
    weather: weather.data,
    rainFor: (zoneId: string) => (zones.data?.find(z => z.id === zoneId)?.sheltered ? null : lastRainyDay(weather.data)),
    loading: cat.loading || zones.isLoading || plantings.isLoading
  }), [session, profile.data, garden, gardens, selectGarden, zones.data, plantings.data, history.data, cat, weather.data, zones.isLoading, plantings.isLoading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
