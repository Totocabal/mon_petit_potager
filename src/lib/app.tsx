import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { Garden, Planting, Profile, Species, Zone } from './types';
import { useCatalogue, usePlantings, useProfile, useZones } from './data';
import type { Relations } from './garden';

export type AppData = {
  session: Session;
  profile: Profile | null;
  garden: Garden;
  gardens: Garden[];
  selectGarden: (id: string) => void;
  zones: Zone[];
  plantings: Planting[];
  species: Species[];
  byId: Map<string, Species>;
  bySlug: Map<string, Species>;
  rels: Relations;
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
  const profile = useProfile(session.user.id);
  const value = useMemo<AppData>(() => ({
    session,
    profile: profile.data ?? null,
    garden,
    gardens,
    selectGarden,
    zones: zones.data ?? [],
    plantings: plantings.data ?? [],
    species: cat.species,
    byId: cat.byId,
    bySlug: cat.bySlug,
    rels: cat.rels,
    loading: cat.loading || zones.isLoading || plantings.isLoading
  }), [session, profile.data, garden, gardens, selectGarden, zones.data, plantings.data, cat, zones.isLoading, plantings.isLoading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
