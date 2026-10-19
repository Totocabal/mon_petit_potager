import { describe, expect, it, vi } from 'vitest';
import { applyOp, applyPending, createOutbox, isNetworkError, type Op, type QueuedOp } from './outbox';
import { planting } from '../test/fixtures';

const base = { garden_id: 'g', zone_id: 'z', species_id: 's', sown_at: '2026-05-01', last_watered_at: null, water_every_days: null, alerts_enabled: true, removed_at: null };

describe('applyOp', () => {
  const rows = [planting({ id: 'a', x: 0, y: 0, w: 4, h: 1 }), planting({ id: 'b', x: 0, y: 2 })];
  it('arrosage : met à jour la date, sans toucher aux autres', () => {
    const out = applyOp(rows, { kind: 'water', garden_id: 'g', ids: ['a'], logIds: ['l'], day: '2026-10-19' });
    expect(out.map(p => p.last_watered_at)).toEqual(['2026-10-19', null]);
  });
  it('ajout : ajoute les nouvelles plantations, une seule fois même rejoué', () => {
    const op: Op = { kind: 'add', garden_id: 'g', rows: [{ ...base, id: 'n', x: 5, y: 5, w: 1, h: 1 }] };
    const once = applyOp(rows, op);
    expect(once.map(p => p.id)).toEqual(['a', 'b', 'n']);
    expect(applyOp(once, op)).toHaveLength(3);
  });
  it('retrait : enlève les plantations', () => {
    expect(applyOp(rows, { kind: 'remove', garden_id: 'g', ids: ['a'], at: 'x' }).map(p => p.id)).toEqual(['b']);
  });
  it('découpe : la première pièce garde l’identifiant, les autres en reçoivent de nouveaux', () => {
    const op: Op = { kind: 'cut', garden_id: 'g', at: 'x', cuts: [{ id: 'a', keep: [{ x: 0, y: 0, w: 1, h: 1 }, { x: 3, y: 0, w: 1, h: 1 }], newIds: ['a2'], base }] };
    const out = applyOp(rows, op);
    expect(out.map(p => [p.id, p.x, p.w])).toEqual([['a', 0, 1], ['b', 0, 1], ['a2', 3, 1]]);
    expect(applyOp(out, op)).toHaveLength(3);
  });
  it('découpe sans morceau restant : la plantation disparaît', () => {
    const op: Op = { kind: 'cut', garden_id: 'g', at: 'x', cuts: [{ id: 'b', keep: [], newIds: [], base }] };
    expect(applyOp(rows, op).map(p => p.id)).toEqual(['a']);
  });
  it('applyPending ne rejoue que les modifications du bon potager', () => {
    const ops = [{ opId: '1', kind: 'remove', garden_id: 'g', ids: ['a'], at: 'x' }, { opId: '2', kind: 'remove', garden_id: 'autre', ids: ['b'], at: 'x' }] as QueuedOp[];
    expect(applyPending(rows, ops, 'g').map(p => p.id)).toEqual(['b']);
  });
});

describe('isNetworkError', () => {
  it('reconnaît les coupures réseau, pas les refus du serveur', () => {
    expect(isNetworkError(new Error('TypeError: Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('Load failed'))).toBe(true);
    expect(isNetworkError(new Error('new row violates row-level security policy'))).toBe(false);
  });
});

describe('createOutbox', () => {
  const water = (id: string): Op => ({ kind: 'water', garden_id: 'g', ids: [id], logIds: [id + 'l'], day: '2026-10-19' });
  function make(run: (op: Op) => Promise<void>, online = () => true, start: QueuedOp[] = []) {
    let stored: QueuedOp[] = start;
    const box = createOutbox({ load: () => stored, save: o => { stored = o; }, run, online });
    return { box, stored: () => stored };
  }
  it('envoie dans l’ordre et vide la file', async () => {
    const seen: string[] = [];
    const { box, stored } = make(async op => { seen.push((op as { ids: string[] }).ids[0]); });
    box.enqueue(water('a')); box.enqueue(water('b'));
    const r = await box.flush();
    expect(seen).toEqual(['a', 'b']);
    expect([r.sent, r.left, stored().length]).toEqual([2, 0, 0]);
  });
  it('hors ligne : rien n’est envoyé, tout est gardé', async () => {
    const run = vi.fn(async () => {});
    const { box, stored } = make(run, () => false);
    box.enqueue(water('a'));
    const r = await box.flush();
    expect(run).not.toHaveBeenCalled();
    expect([r.left, stored().length]).toEqual([1, 1]);
  });
  it('hors ligne puis en ligne : le deuxième envoi part bien', async () => {
    let on = false;
    const run = vi.fn(async () => {});
    const { box } = make(run, () => on);
    box.enqueue(water('a'));
    expect((await box.flush()).left).toBe(1);
    on = true;
    const r = await box.flush();
    expect([run.mock.calls.length, r.sent, r.left]).toEqual([1, 1, 0]);
  });
  it('coupure réseau en route : on s’arrête et on garde le reste', async () => {
    let calls = 0;
    const { box } = make(async () => { if (++calls === 2) throw new Error('Failed to fetch'); });
    box.enqueue(water('a')); box.enqueue(water('b')); box.enqueue(water('c'));
    const r = await box.flush();
    expect([r.sent, r.left, r.failed.length]).toEqual([1, 2, 0]);
  });
  it('refus du serveur : la modification est abandonnée et signalée, la suite continue', async () => {
    const { box } = make(async op => { if ((op as { ids: string[] }).ids[0] === 'a') throw new Error('row-level security'); });
    const qa = box.enqueue(water('a')); box.enqueue(water('b'));
    const r = await box.flush();
    expect([r.sent, r.left]).toEqual([1, 0]);
    expect(r.failed.map(f => f.op.opId)).toEqual([qa.opId]);
  });
  it('un seul envoi à la fois, et une modification ajoutée pendant l’envoi est prise', async () => {
    const seen: string[] = [];
    const { box } = make(async op => { await Promise.resolve(); seen.push((op as { ids: string[] }).ids[0]); });
    box.enqueue(water('a'));
    const p1 = box.flush();
    box.enqueue(water('b'));
    const p2 = box.flush();
    expect(p2).toBe(p1);
    await p1;
    expect(seen).toEqual(['a', 'b']);
  });
  it('la file reprise au démarrage est conservée', async () => {
    const start = [{ ...water('a'), opId: 'x' }] as QueuedOp[];
    const { box } = make(async () => {}, () => true, start);
    expect(box.pending()).toHaveLength(1);
    expect((await box.flush()).sent).toBe(1);
  });
});
