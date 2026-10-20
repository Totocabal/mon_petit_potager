import { Link } from 'react-router-dom';
import type { CalendarDay, CalendarEvent } from '../lib/calendar';
import { addDays, fmt, iso, JOURS, cap, parse } from '../lib/dates';
import type { Variety, Zone } from '../lib/types';
import { Tile } from './ui';

type CompletableEvent = Extract<CalendarEvent, { kind: 'water' | 'task' }>;

export function CalendarTimeline({ groups, zones, varieties, now, pending, onComplete }: {
  groups: CalendarDay[]; zones: Zone[]; varieties: Map<string, Variety>; now: Date;
  pending: string | null; onComplete: (event: CompletableEvent) => void;
}) {
  const current = iso(now);
  const tomorrow = iso(addDays(now, 1));
  const zoneName = (id: string | null) => zones.find(z => z.id === id)?.name ?? '';
  return (
    <ol aria-label="Gestes du potager par date" className="relative ml-1 flex flex-col gap-6 border-l-2 border-trait pb-1 pl-6">
      {groups.map(group => {
        const isToday = group.date === current;
        const title = group.date === null ? 'Tout le mois' : isToday ? 'Aujourd’hui' : group.date === tomorrow ? 'Demain' : cap(JOURS[parse(group.date).getDay()]);
        return (
          <li key={group.date ?? 'periods'} className="relative">
            <span aria-hidden="true" className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 ${isToday ? 'border-vert bg-vert ring-4 ring-vert-doux' : 'border-trait bg-fond'}`} />
            <div className="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="font-titre text-lg font-semibold">{title}</h2>
              {group.date && <time dateTime={group.date} className="text-sm font-bold text-gris">{fmt(parse(group.date))}</time>}
              <span className="rounded-full bg-vert-doux px-2 py-0.5 text-xs font-extrabold text-vert">{group.events.length} geste{group.events.length > 1 ? 's' : ''}</span>
            </div>
            {group.date === null && <p className="mb-3 text-xs text-gris">Périodes favorables pour renouveler vos cultures, selon votre climat.</p>}
            <ul className="flex flex-col gap-2.5">
              {group.events.map(event => {
                const s = event.kind === 'task' ? null : event.kind === 'harvest' ? event.harvest.species : event.species;
                const p = event.kind === 'water' ? event.plantings[0] : event.kind === 'harvest' ? event.harvest.planting : null;
                const variety = p?.variety_id ? varieties.get(p.variety_id)?.name : null;
                const label = event.kind === 'water' ? `Arroser : ${s!.name}` : event.kind === 'task' ? event.task.title : event.kind === 'harvest' ? `Récolter : ${s!.name}` : event.kind === 'indoor' ? `Semer sous abri : ${s!.name}` : `Semer ou planter : ${s!.name}`;
                const count = event.kind === 'water' ? event.plantings.length : event.kind === 'harvest' ? event.harvest.count : 0;
                return (
                  <li key={event.id} className="flex flex-col gap-3 rounded-carte bg-white p-4" aria-busy={pending === event.id}>
                    <div className="flex items-center gap-3">
                      {s ? <Tile slug={s.slug} w={40} h={40} size={32} round={14} /> : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-vert-doux text-vert"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h6M9 3h6v4H9zM6 5H5v16h14V5h-1M8 14l3 3 5-6" /></svg></span>}
                      <div className="min-w-0">
                        <h3 className="font-titre text-base font-semibold leading-snug">{label}</h3>
                        {p && <p className="mt-0.5 text-xs text-gris">{[zoneName(p.zone_id), variety, count > 1 ? `${count} emplacements` : ''].filter(Boolean).join(' · ')}</p>}
                        {event.kind === 'task' && <p className="mt-0.5 text-xs text-gris">{zoneName(event.task.zone_id) || 'Tout le potager'} · Votre tâche</p>}
                      </div>
                    </div>
                    {event.kind === 'water' && <p className="text-xs text-gris">Arrosage dû selon vos alertes et la pluie récente.</p>}
                    {event.kind === 'task' && event.task.detail && <p className="whitespace-pre-line text-sm text-gris">{event.task.detail}</p>}
                    {event.kind === 'water' || event.kind === 'task' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button type="button" disabled={pending !== null} onClick={() => onComplete(event)} aria-label={event.kind === 'water' ? `Noter l’arrosage : ${s!.name}, ${zoneName(p!.zone_id)}` : `Terminer : ${event.task.title}`} className="squish min-h-11 rounded-xl bg-vert-doux px-3 text-sm font-extrabold text-vert disabled:opacity-50">{pending === event.id ? 'Enregistrement…' : '✓ C’est fait'}</button>
                        {event.kind === 'task' && event.task.due_date < current ? <span className="text-xs font-extrabold text-alerte">En retard · {fmt(parse(event.task.due_date))}</span> : <span className="text-xs text-gris">{isToday ? 'À faire aujourd’hui' : 'Tâche prévue'}</span>}
                      </div>
                    ) : event.kind === 'harvest' ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-soleil-doux px-2 py-1 text-xs font-extrabold text-soleil-encre">{isToday ? 'À maturité estimée' : 'Date estimée'}</span>
                        <Link to={event.harvest.count > 1 ? `/zones/${p!.zone_id}` : `/plantes/${p!.id}`} className="flex min-h-11 items-center text-sm font-extrabold text-vert">{event.harvest.count > 1 ? 'Voir mes plantations' : 'Voir ma plantation'} →</Link>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-full bg-vert-doux px-2 py-1 text-xs font-extrabold text-vert">Période favorable</span>
                        <Link to={`/glossaire/${s!.slug}`} className="flex min-h-11 items-center text-sm font-extrabold text-vert">Voir les conseils →</Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
