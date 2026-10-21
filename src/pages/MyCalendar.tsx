import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useTasks, useToggleTask, useWater } from '../lib/data';
import { calendarTimeline, type CalendarEvent } from '../lib/calendar';
import { cap, MOIS, today } from '../lib/dates';
import { BottomNav, Loading, Page, useToast } from '../components/ui';
import { CalendarTimeline } from '../components/CalendarTimeline';

export default function MyCalendar() {
  const { garden, session, crops, byId, zones, loading, rainFor, varietyById } = useApp();
  const tasks = useTasks(garden.id);
  const water = useWater();
  const toggleTask = useToggleTask(garden.id, session.user.id);
  const toast = useToast();
  const now = today();
  const [offset, setOffset] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const selected = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const groups = calendarTimeline({ crops, byId, tasks: tasks.data ?? [], year: selected.getFullYear(), month: selected.getMonth() + 1, now, rainFor });
  const hasCrops = crops.some(p => !p.removed_at);

  async function complete(event: Extract<CalendarEvent, { kind: 'water' | 'task' }>) {
    if (pending) return;
    setPending(event.id);
    try {
      if (event.kind === 'water') {
        await water.mutateAsync(event.plantings);
        toast(`Arrosage noté : ${event.species.name}`);
      } else {
        await toggleTask.mutateAsync({ id: event.task.id, done: true });
        toast('Tâche terminée');
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Impossible d’enregistrer. Réessayez.');
    } finally {
      setPending(null);
    }
  }

  if (loading) return <Loading />;
  return (
    <Page nav>
      <header className="pt-6 lg:pt-0">
        <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-gris">{garden.name}</p>
        <h1 className="font-titre text-[31px] font-semibold text-vert">Calendrier</h1>
      </header>
      <div role="group" aria-label="Mois de mon calendrier" className="flex items-center justify-between gap-2 rounded-[20px] bg-white p-2">
        <button type="button" aria-label="Mois précédent" disabled={offset === 0} onClick={() => setOffset(n => n - 1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-vert-doux text-vert disabled:opacity-40"><Chevron left /></button>
        <p aria-live="polite" className="text-center font-titre text-lg font-semibold">{cap(MOIS[selected.getMonth()])} {selected.getFullYear()}</p>
        <button type="button" aria-label="Mois suivant" disabled={offset === 11} onClick={() => setOffset(n => n + 1)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-vert-doux text-vert disabled:opacity-40"><Chevron /></button>
      </div>
      {!hasCrops && <Link to="/potager" className="rounded-carte bg-vert-doux p-4 font-bold text-vert">Ajoutez des plantes à votre potager pour retrouver ici leurs semis, plantations et récoltes →</Link>}
      {tasks.isPending && <p role="status" className="text-sm text-gris">Chargement des tâches…</p>}
      {tasks.isError && <p role="alert" className="text-sm text-alerte">Impossible de charger les tâches. <Link to="/taches" className="underline">Réessayer depuis la page des tâches</Link>.</p>}
      {groups.length ? <CalendarTimeline groups={groups} zones={zones} varieties={varietyById} now={now} pending={pending} onComplete={complete} /> : !tasks.isPending && <p className="rounded-carte bg-white p-4 text-sm text-gris">Aucun geste prévu pour ce mois-ci.</p>}
      <p className="text-xs text-gris">Les récoltes sont estimées selon la saison et le délai de la variété : vérifiez la maturité sur place.</p>
      <Link to="/taches" className="flex min-h-11 items-center self-start font-extrabold text-vert">Gérer mes tâches →</Link>
      <BottomNav />
    </Page>
  );
}

function Chevron({ left = false }: { left?: boolean }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={left ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>;
}
