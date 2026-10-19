import { useSyncExternalStore } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import type { Planting } from './types';
import { supabase } from './supabase';
import { applyOp, createOutbox, type Op, type QueuedOp } from './outbox';

export const OUTBOX_KEY = 'potager-outbox';
export const CACHE_KEY = 'potager-cache';

function load(): QueuedOp[] {
  try { const v = JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function save(ops: QueuedOp[]) {
  try { if (ops.length) localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops)); else localStorage.removeItem(OUTBOX_KEY); } catch { /* stockage plein ou indisponible */ }
}
const ok = (res: { error: { message: string } | null }) => { if (res.error) throw new Error(res.error.message); };

/** Envoie une modification au serveur. Les identifiants viennent de l'appareil : « ignorer les doublons » rend un renvoi sans danger. */
async function run(op: Op): Promise<void> {
  switch (op.kind) {
    case 'water':
      ok(await supabase.from('watering_logs').upsert(op.ids.map((id, i) => ({ id: op.logIds[i], garden_id: op.garden_id, planting_id: id, source: 'manuel' })), { onConflict: 'id', ignoreDuplicates: true }));
      ok(await supabase.from('plantings').update({ last_watered_at: op.day }).in('id', op.ids));
      break;
    case 'add':
      ok(await supabase.from('plantings').upsert(op.rows.map(({ created_at: _c, ...r }) => r), { onConflict: 'id', ignoreDuplicates: true }));
      break;
    case 'remove':
      ok(await supabase.from('plantings').update({ removed_at: op.at }).in('id', op.ids));
      break;
    case 'cut':
      for (const c of op.cuts) {
        const [first, ...rest] = c.keep;
        ok(await supabase.from('plantings').update(first ?? { removed_at: op.at }).eq('id', c.id));
        if (rest.length) ok(await supabase.from('plantings').upsert(rest.map((r, i) => ({ ...c.base, ...r, id: c.newIds[i] })), { onConflict: 'id', ignoreDuplicates: true }));
      }
      break;
  }
}

export const outbox = createOutbox({ load, save, run, online: () => typeof navigator === 'undefined' || navigator.onLine !== false });

/** Enregistre une modification : visible tout de suite à l'écran, envoyée dès que le réseau le permet. Lève l'erreur si le serveur la refuse. */
export async function submit(qc: QueryClient, op: Op): Promise<void> {
  const q = outbox.enqueue(op);
  qc.setQueryData(['plantings', op.garden_id], (rows: Planting[] | undefined) => (rows ? applyOp(rows, op) : rows));
  const res = await outbox.flush();
  const refused = res.failed.find(f => f.op.opId === q.opId);
  if (refused || !outbox.pending().length) qc.invalidateQueries({ queryKey: ['plantings', op.garden_id] });
  if (refused) throw refused.error;
}

/** Réseau disponible ? Se met à jour tout seul. */
const subscribeOnline = (cb: () => void) => { window.addEventListener('online', cb); window.addEventListener('offline', cb); return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); }; };
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine !== false, () => true);
export const usePendingCount = () => useSyncExternalStore(outbox.subscribe, () => outbox.pending().length, () => 0);
