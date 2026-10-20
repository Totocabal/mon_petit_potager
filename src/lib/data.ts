import { siteUrl } from './native';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AlertSettings, Companion, Garden, Invite, Member, Planting, Profile, Species, Task, Variety, Zone } from './types';
import { buildRelations, type PlannedTaskDraft } from './garden';
import { applyPending, isNetworkError, type PlantingRow } from './outbox';
import { outbox, submit } from './offline';
import { addDays, iso, today } from './dates';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(isNetworkError(res.error.message) ? 'Pas de connexion : réessayez une fois en ligne.' : res.error.message);
  return res.data as T;
}

/**
 * Hors ligne avec un jeton expiré, Supabase ne peut pas le renouveler et ne rend aucune session : on reprend celle gardée sur l'appareil
 * pour continuer à consulter ses données. Les envois reprendront au retour du réseau (le jeton se renouvelle alors tout seul).
 */
function offlineSession(): Session | null {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.+-auth-token$/.test(k)) {
        const s = JSON.parse(localStorage.getItem(k) ?? 'null');
        if (s?.user && s.access_token) return s as Session;
      }
    }
  } catch { /* stockage illisible */ }
  return null;
}

/* ---------- session ---------- */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? offlineSession()));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

/* ---------- catalogue ---------- */
/**
 * Version du contenu du catalogue (espèces, associations, variétés…). Le catalogue est gardé sur l'appareil et ne se redemande jamais (`staleTime: Infinity`) :
 * à chaque ajout ou changement de forme, **augmentez ce nombre**, sinon les appareils déjà ouverts gardent l'ancien catalogue et ne voient pas la nouveauté.
 */
export const CATALOGUE_VERSION = 3;

export function useCatalogue() {
  const q = useQuery({
    queryKey: ['catalogue', CATALOGUE_VERSION],
    staleTime: Infinity,
    queryFn: async () => {
      const species = check(await supabase.from('species').select('*').order('name')) as Species[];
      const companions = check(await supabase.from('species_companions').select('*')) as Companion[];
      const varieties = check(await supabase.from('varieties').select('*').order('sort')) as Variety[];
      return { species, companions, varieties };
    }
  });
  return useMemo(() => {
    const species = q.data?.species ?? [];
    const varieties = q.data?.varieties ?? [];
    const bySpecies = new Map<string, Variety[]>();
    varieties.forEach(v => bySpecies.set(v.species_id, [...(bySpecies.get(v.species_id) ?? []), v]));
    return {
      varieties,
      varietyById: new Map(varieties.map(v => [v.id, v])),
      varietiesOf: (speciesId: string) => bySpecies.get(speciesId) ?? [],
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
export function useDeleteGarden() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { check(await supabase.from('gardens').delete().eq('id', id)); return id; },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['gardens'] });
      for (const k of ['zones', 'plantings', 'tasks', 'members', 'invites']) qc.removeQueries({ queryKey: [k, id] });
    }
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
export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ z, patch }: { z: Zone; patch: Partial<Zone> }) => { check(await supabase.from('zones').update(patch).eq('id', z.id)); return z; },
    onSuccess: (z) => qc.invalidateQueries({ queryKey: ['zones', z.garden_id] })
  });
}
export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (z: Zone) => { check(await supabase.from('zones').delete().eq('id', z.id)); return z; },
    onSuccess: (z) => { for (const k of ['zones', 'plantings', 'tasks']) qc.invalidateQueries({ queryKey: [k, z.garden_id] }); }
  });
}

/* ---------- plantations ---------- */
export function usePlantings(gardenId: string | undefined) {
  return useQuery({
    queryKey: ['plantings', gardenId],
    enabled: !!gardenId,
    // Les modifications faites hors ligne et pas encore envoyées restent visibles par-dessus ce que renvoie le serveur
    queryFn: async () => applyPending(check(await supabase.from('plantings').select('*').eq('garden_id', gardenId!).is('removed_at', null)) as Planting[], outbox.pending(), gardenId!)
  });
}
export type NewPlanting = Pick<Planting, 'garden_id' | 'zone_id' | 'species_id' | 'x' | 'y' | 'w' | 'h'> & { sown_at?: string } & Partial<Pick<Planting, 'variety_id' | 'days_to_harvest' | 'water_every_days'>>;
export function useAddPlantings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: NewPlanting[]) => {
      if (!rows.length) return [] as PlantingRow[];
      const t = iso(today());
      const full: PlantingRow[] = rows.map(r => {
        const sown = r.sown_at ?? t;
        return { id: crypto.randomUUID(), sown_at: sown, last_watered_at: sown > t ? null : t, water_every_days: null, alerts_enabled: true, removed_at: null, variety_id: null, days_to_harvest: null, ...r };
      });
      await submit(qc, { kind: 'add', garden_id: rows[0].garden_id, rows: full });
      return full;
    }
  });
}
export function useWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ps: Planting[]) => {
      if (!ps.length) return;
      await submit(qc, { kind: 'water', garden_id: ps[0].garden_id, ids: ps.map(p => p.id), logIds: ps.map(() => crypto.randomUUID()), day: iso(today()) });
    }
  });
}
/** Plantations retirées des 6 dernières années : sert à la rotation des cultures. */
export function usePlantingHistory(gardenId: string | undefined) {
  return useQuery({
    queryKey: ['plantings', gardenId, 'history'],
    enabled: !!gardenId,
    queryFn: async () => {
      const since = iso(addDays(today(), -366 * 6));
      return check(await supabase.from('plantings').select('*').eq('garden_id', gardenId!).not('removed_at', 'is', null).gte('removed_at', since)) as Planting[];
    }
  });
}

/** Retire plusieurs plantations d'un coup (elles gardent leur historique). */
export function useRemovePlantings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ps: Planting[]) => {
      if (!ps.length) return;
      await submit(qc, { kind: 'remove', garden_id: ps[0].garden_id, ids: ps.map(p => p.id), at: new Date().toISOString() });
    }
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

/** Applique des découpes : chaque plantation garde les morceaux indiqués (aucun = retirée), avec son historique. */
export function useCutPlantings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cuts: { p: Planting; keep: { x: number; y: number; w: number; h: number }[] }[]) => {
      if (!cuts.length) return;
      await submit(qc, {
        kind: 'cut', garden_id: cuts[0].p.garden_id, at: new Date().toISOString(),
        cuts: cuts.map(({ p, keep }) => {
          const { id, created_at: _c, x: _x, y: _y, w: _w, h: _h, ...base } = p;
          return { id, keep, newIds: keep.slice(1).map(() => crypto.randomUUID()), base };
        })
      });
    }
  });
}

/* ---------- tâches manuelles ---------- */
export function useTasks(gardenId: string) {
  return useQuery({
    queryKey: ['tasks', gardenId],
    queryFn: async () => check(await supabase.from('tasks').select('*').eq('garden_id', gardenId).order('due_date')) as Task[]
  });
}
export function useAddTask(gardenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { title: string; due_date: string; zone_id?: string | null; detail?: string | null }) => {
      check(await supabase.from('tasks').insert({ garden_id: gardenId, origin: 'manuel', ...t }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', gardenId] })
  });
}
export function useAddTasks(gardenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: PlannedTaskDraft[]) => {
      if (!rows.length) return;
      check(await supabase.from('tasks').insert(rows.map(r => ({ garden_id: gardenId, ...r }))));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', gardenId] })
  });
}
export function useToggleTask(gardenId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      check(await supabase.from('tasks').update(done ? { done_at: new Date().toISOString(), done_by: userId } : { done_at: null, done_by: null }).eq('id', id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', gardenId] })
  });
}
export function useDeleteTask(gardenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { check(await supabase.from('tasks').delete().eq('id', id)); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', gardenId] })
  });
}

/* ---------- partage du potager ---------- */
export function useMembers(gardenId: string) {
  return useQuery({
    queryKey: ['members', gardenId],
    queryFn: async () => {
      const ms = check(await supabase.from('garden_members').select('*').eq('garden_id', gardenId).order('joined_at')) as Omit<Member, 'first_name'>[];
      const ps = check(await supabase.from('profiles').select('id, first_name').in('id', ms.map(m => m.user_id))) as { id: string; first_name: string | null }[];
      return ms.map(m => ({ ...m, first_name: ps.find(p => p.id === m.user_id)?.first_name ?? null })) as Member[];
    }
  });
}
export function useInvites(gardenId: string) {
  return useQuery({
    queryKey: ['invites', gardenId],
    queryFn: async () => check(await supabase.from('garden_invites').select('*').eq('garden_id', gardenId).is('accepted_at', null).gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: false })) as Invite[]
  });
}
export function useCreateInvite(gardenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string | null) => check(await supabase.from('garden_invites').insert({ garden_id: gardenId, email }).select().single()) as Invite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', gardenId] })
  });
}
export function useDeleteInvite(gardenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { check(await supabase.from('garden_invites').delete().eq('id', id)); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites', gardenId] })
  });
}
export function useRemoveMember(gardenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => { check(await supabase.from('garden_members').delete().eq('garden_id', gardenId).eq('user_id', userId)); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', gardenId] }); qc.invalidateQueries({ queryKey: ['gardens'] }); }
  });
}

export const inviteUrl = (token: string) => `${siteUrl}/invitation/${token}`;
/** Envoie à la personne un lien de connexion qui la mène directement à l'invitation. */
export async function sendInviteEmail(email: string, token: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: inviteUrl(token) } });
  if (error) throw new Error(error.message);
}
export async function acceptInvite(token: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invite', { invite_token: token });
  if (error) throw new Error(error.message);
  return data as string;
}

/* ---------- alertes ---------- */
const DEFAULT_ALERTS = { enabled: false, skip_if_rain: true, reminder_hour: 19 as const };
export function useAlertSettings(userId: string) {
  return useQuery({
    queryKey: ['alerts', userId],
    queryFn: async () => ((check(await supabase.from('alert_settings').select('*').eq('user_id', userId).maybeSingle()) as AlertSettings | null) ?? { user_id: userId, ...DEFAULT_ALERTS }) as AlertSettings
  });
}
export function useSaveAlertSettings(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<AlertSettings, 'user_id'>>) => {
      const cur = qc.getQueryData<AlertSettings>(['alerts', userId]) ?? { user_id: userId, ...DEFAULT_ALERTS };
      check(await supabase.from('alert_settings').upsert({ ...cur, ...patch, user_id: userId }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts', userId] })
  });
}
/** Active ou coupe les alertes d'arrosage de toutes les plantations d'une espèce. */
export function useSetSpeciesAlerts(gardenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ speciesId, on }: { speciesId: string; on: boolean }) => {
      check(await supabase.from('plantings').update({ alerts_enabled: on }).eq('garden_id', gardenId).eq('species_id', speciesId).is('removed_at', null));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plantings', gardenId] })
  });
}
