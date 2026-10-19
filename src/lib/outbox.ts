import type { Planting } from './types';

/**
 * File d'attente des modifications faites hors ligne (arroser, planter, vider).
 * Chaque modification est appliquée tout de suite à l'écran, gardée sur l'appareil, puis envoyée dans l'ordre au retour du réseau.
 * Les identifiants sont créés côté appareil : renvoyer une modification déjà reçue ne crée donc jamais de doublon.
 */
export type Rect = { x: number; y: number; w: number; h: number };
export type PlantingRow = Omit<Planting, 'created_at'> & { created_at?: string };

export type Op =
  | { kind: 'water'; garden_id: string; ids: string[]; logIds: string[]; day: string }
  | { kind: 'add'; garden_id: string; rows: PlantingRow[] }
  | { kind: 'cut'; garden_id: string; at: string; cuts: { id: string; keep: Rect[]; newIds: string[]; base: Omit<Planting, 'id' | 'created_at' | 'x' | 'y' | 'w' | 'h'> }[] }
  | { kind: 'remove'; garden_id: string; ids: string[]; at: string };
export type QueuedOp = Op & { opId: string };

/** Les plantations affichées (non retirées) une fois la modification appliquée. Rejouer deux fois donne le même résultat. */
export function applyOp(rows: Planting[], op: Op): Planting[] {
  switch (op.kind) {
    case 'water': {
      const ids = new Set(op.ids);
      return rows.map(p => (ids.has(p.id) ? { ...p, last_watered_at: op.day } : p));
    }
    case 'add': {
      const have = new Set(rows.map(p => p.id));
      return [...rows, ...op.rows.filter(r => !have.has(r.id)).map(r => ({ ...r, created_at: r.created_at ?? new Date().toISOString() }))];
    }
    case 'remove': {
      const ids = new Set(op.ids);
      return rows.filter(p => !ids.has(p.id));
    }
    case 'cut': {
      const byId = new Map(op.cuts.map(c => [c.id, c]));
      const out: Planting[] = [];
      const have = new Set(rows.map(p => p.id));
      for (const p of rows) {
        const c = byId.get(p.id);
        if (!c) { out.push(p); continue; }
        const [first] = c.keep;
        if (first) out.push({ ...p, ...first });
      }
      for (const c of op.cuts) {
        const src = rows.find(p => p.id === c.id);
        c.keep.slice(1).forEach((r, i) => { if (!have.has(c.newIds[i]) && src) out.push({ ...src, ...r, id: c.newIds[i] }); });
      }
      return out;
    }
  }
}

/** Les plantations du serveur, avec par-dessus les modifications pas encore envoyées de ce potager. */
export const applyPending = (rows: Planting[], ops: QueuedOp[], gardenId: string) => ops.filter(o => o.garden_id === gardenId).reduce(applyOp, rows);

/** Une erreur due au réseau (à réessayer plus tard), et non un refus du serveur. */
export function isNetworkError(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e ?? '');
  return /failed to fetch|network|load failed|fetch failed|timeout|timed out|offline|internet/i.test(m);
}

export type FlushResult = { sent: number; failed: { op: QueuedOp; error: Error }[]; left: number };

type Deps = { load: () => QueuedOp[]; save: (ops: QueuedOp[]) => void; run: (op: Op) => Promise<void>; online: () => boolean };

export function createOutbox({ load, save, run, online }: Deps) {
  let ops = load();
  let inflight: Promise<FlushResult> | null = null;
  const listeners = new Set<() => void>();
  const changed = () => { save(ops); listeners.forEach(l => l()); };
  let n = 0;

  async function loop(): Promise<FlushResult> {
    const res: FlushResult = { sent: 0, failed: [], left: 0 };
    try {
      while (ops.length && online()) {
        const op = ops[0];
        try { await run(op); ops = ops.filter(o => o !== op); res.sent++; changed(); }
        catch (e) {
          const error = e instanceof Error ? e : new Error(String(e));
          if (isNetworkError(error)) break;
          ops = ops.filter(o => o !== op); res.failed.push({ op, error }); changed();
        }
      }
    } finally { res.left = ops.length; }
    return res;
  }

  return {
    pending: () => ops,
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
    enqueue(op: Op): QueuedOp {
      const q = { ...op, opId: `${Date.now().toString(36)}-${(n++).toString(36)}` } as QueuedOp;
      ops = [...ops, q]; changed();
      return q;
    },
    flush(): Promise<FlushResult> {
      if (inflight) return inflight;
      // L'envoi en cours est retiré une fois terminé, même s'il se termine tout de suite (hors ligne) : sinon un vieux résultat serait renvoyé pour toujours
      const p: Promise<FlushResult> = loop().finally(() => { if (inflight === p) inflight = null; });
      inflight = p;
      return p;
    },
    clear() { ops = []; changed(); }
  };
}
