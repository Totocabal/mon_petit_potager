import { useState } from 'react';
import { useApp } from '../lib/app';
import { useDeleteTask, useTasks, useToggleTask } from '../lib/data';
import { BackHeader, Btn, Page, useToast } from '../components/ui';
import { TaskSheet } from '../components/TaskSheet';
import { diffDays, parse, today, whenText } from '../lib/dates';

export default function Tasks() {
  const { garden, session, zones } = useApp();
  const tasks = useTasks(garden.id);
  const toggle = useToggleTask(garden.id, session.user.id);
  const del = useDeleteTask(garden.id);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const list = tasks.data ?? [];
  const todo = list.filter(t => !t.done_at);
  const allDone = list.filter(t => t.done_at);
  const done = allDone.slice(-10).reverse();
  async function clearDone() {
    for (const t of allDone) await del.mutateAsync(t.id);
    toast(`${allDone.length} tâche${allDone.length > 1 ? 's' : ''} supprimée${allDone.length > 1 ? 's' : ''}`);
    setConfirmAll(false);
  }
  const zoneName = (id: string | null) => zones.find(z => z.id === id)?.name;

  return (
    <Page>
      <BackHeader title="Tâches" kicker={garden.name} />
      <Btn onClick={() => setOpen(true)}>+ Ajouter une tâche</Btn>
      <section className="rounded-carte bg-white px-4 py-1">
        {todo.length === 0 && <p className="py-4 text-gris">Aucune tâche prévue.</p>}
        {todo.map(t => {
          const late = diffDays(parse(t.due_date), today()) < 0;
          return (
            <div key={t.id} className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait py-2.5 last:border-0">
              <button aria-label={`Terminer : ${t.title}`} onClick={() => toggle.mutate({ id: t.id, done: true })} className="h-8 w-8 shrink-0 rounded-full border-2 border-vert" />
              <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">{t.title}</b>
                {t.detail && <span className="mt-0.5 text-[13px] leading-snug text-encre/85">{t.detail}</span>}
                <span className={`text-[13px] ${late ? 'font-extrabold text-alerte' : 'text-gris'}`}>{late ? 'En retard · ' : ''}{whenText(parse(t.due_date))}{zoneName(t.zone_id) ? ' · ' + zoneName(t.zone_id) : ''}</span></span>
              <button aria-label={`Supprimer : ${t.title}`} onClick={() => del.mutate(t.id)} className="px-2 text-xl text-gris">×</button>
            </div>
          );
        })}
      </section>
      {done.length > 0 && (
        <section className="flex flex-col gap-1 rounded-carte bg-white px-4 py-3">
          <h2 className="font-titre text-lg font-semibold">Terminées</h2>
          {done.map(t => (
            <div key={t.id} className="flex min-h-11 items-center gap-1">
              <button onClick={() => toggle.mutate({ id: t.id, done: false })} aria-label={`Rouvrir : ${t.title}`} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left text-gris">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-vert text-xs text-white">✓</span><span className="truncate line-through">{t.title}</span>
              </button>
              <button aria-label={`Supprimer : ${t.title}`} onClick={() => del.mutate(t.id)} disabled={del.isPending} className="flex h-11 w-11 shrink-0 items-center justify-center text-xl text-gris">×</button>
            </div>
          ))}
          {confirmAll ? (
            <div className="mt-1 flex flex-col gap-2 rounded-[20px] bg-alerte-doux p-3 text-[#6B2418]">
              <p className="font-extrabold">Supprimer les {allDone.length} tâches terminées ?</p>
              <div className="flex gap-2"><Btn variant="danger" onClick={clearDone} disabled={del.isPending}>Supprimer</Btn><Btn variant="contour" onClick={() => setConfirmAll(false)}>Annuler</Btn></div>
            </div>
          ) : (
            <button onClick={() => setConfirmAll(true)} className="mt-1 min-h-11 self-center text-sm font-extrabold text-alerte">Supprimer toutes les terminées · {allDone.length}</button>
          )}
        </section>
      )}
      {open && <TaskSheet onClose={() => setOpen(false)} />}
    </Page>
  );
}
