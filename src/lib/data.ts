import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Companion, Garden, Planting, Profile, Species, Zone } from './types';
import { buildRelations } from './garden';
import { iso, today } from './dates';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/* ---------- session ---------- */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/* ---------- catalogue ---------- */
export function useCatalogue() {
  const q = useQuery({
    queryKey: ['catalogue'],
    staleTime: Infinity,
    queryFn: async () => {
      const species = check(await supabase.from('species').select('*').order('name')) as Species[];
      const companions = check(await supabase.from('species_companions').select('*')) as Companion[];
      return { species, companions };
    }
  });
  return useMemo(() => {
    const species = q.data?.species ?? [];
    return {
      loading: q.isLoading,
      species,
      byId: new Map(species.map(s => [s.id, s])),
      bySlug: new Map(species.map(s => [s.slug, s])),
      rels: buildRelations(q.data?.companions ?? [])
    };
  }, [q.data, q.isLoading]);
}

/* ---------- profil ---------- */
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const r = await supabase.from('profiles').select('*').eq('id', userId!).maybeSingle();
      return check(r) as Profile | null;
    }
  });
}
export function useSaveProfile(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Profile>) => { check(await supabase.from('profiles').upsert({ id: userId!, ...p })); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', userId] })
  });
}

/* ---------- potagers ---------- */
const GARDEN_KEY = 'potager-courant';
export function useGardens() {
  return useQuery({
    queryKey: ['gardens'],
    queryFn: async () => check(await supabase.from('gardens').select('*').order('created_at')) as Garden[]
  });
}
export function useCurrentGarden() {
  const gardens = useGardens();
  const [id, setId] = useState<string | null>(() => { try { return localStorage.getItem(GARDEN_KEY); } catch { return null; } });
  const list = gardens.data ?? [];
  const garden = list.find(g => g.id === id) ?? list[0] ?? null;
  const select = (gid: string) => { setId(gid); try { localStorage.setItem(GARDEN_KEY, gid); } catch { /* stockage indisponible */ } };
  return { loading: gardens.isLoading, gardens: list, garden, select };
}
export function useCreateGarden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: { name: string; terrain_width_cm: number; terrain_length_cm: number }) =>
      check(await supabase.from('gardens').insert(g).select().single()) as Garden,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gardens'] })
  });
}
export function useUpdateGarden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Garden> & { id: string }) => { check(await supabase.from('gardens').update(patch).eq('id', id)); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gardens'] })
  });
}

/* ---------- zones ---------- */
export function useZones(gardenId: string | undefined) {
  return useQuery({
    queryKey: ['zones', gardenId],
    enabled: !!gardenId,
    queryFn: async () => check(await supabase.from('zones').select('*').eq('garden_id', gardenId!).order('created_at')) as Zone[]
  });
}
export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (z: Omit<Zone, 'id' | 'created_at'>) => check(await supabase.from('zones').insert(z).select().single()) as Zone,
    onSuccess: (z) => qc.invalidateQueries({ queryKey: ['zones', z.garden_id] })
  });
}
export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (z: Zone) => { check(await supabase.from('zones').delete().eq('id', z.id)); return z; },
    onSuccess: (z) => { qc.invalidateQueries({ queryKey: ['zones', z.garden_id] }); qc.invalidateQueries({ queryKey: ['plantings', z.garden_id] }); }
  });
}

/* ---------- plantations ---------- */
export function usePlantings(gardenId: string | undefined) {
  return useQuery({
    queryKey: ['plantings', gardenId],
    enabled: !!gardenId,
    queryFn: async () => check(await supabase.from('plantings').select('*').eq('garden_id', gardenId!).is('removed_at', null)) as Planting[]
  });
}
export type NewPlanting = Pick<Planting, 'garden_id' | 'zone_id' | 'species_id' | 'x' | 'y' | 'w' | 'h'> & { sown_at?: string };
export function useAddPlantings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: NewPlanting[]) => {
      const t = iso(today());
      check(await supabase.from('plantings').insert(rows.map(r => ({ sown_at: t, last_watered_at: t, ...r }))));
      return rows[0]?.garden_id;
    },
    onSuccess: (gid) => qc.invalidateQueries({ queryKey: ['plantings', gid] })
  });
}
export function useWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ps: Planting[]) => {
      const t = iso(today());
      check(await supabase.from('watering_logs').insert(ps.map(p => ({ garden_id: p.garden_id, planting_id: p.id, source: 'manuel' }))));
      check(await supabase.from('plantings').update({ last_watered_at: t }).in('id', ps.map(p => p.id)));
      return ps[0]?.garden_id;
    },
    onSuccess: (gid) => qc.invalidateQueries({ queryKey: ['plantings', gid] })
  });
}
export function useUpdatePlanting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ p, patch }: { p: Planting; patch: Partial<Planting> }) => {
      check(await supabase.from('plantings').update(patch).eq('id', p.id));
      return p.garden_id;
    },
    onSuccess: (gid) => qc.invalidateQueries({ queryKey: ['plantings', gid] })
  });
}
