import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CalendarDay, CalendarEvent } from '../lib/calendar';
import { addDays, fmt, iso, JOURS, cap, parse } from '../lib/dates';
import type { Variety, Zone } from '../lib/types';
import { Tile } from './ui';

type CompletableEvent = Extract<CalendarEvent, { kind: 'water' | 'task' }>;
type Common = { zones: Zone[]; varieties: Map<string, Variety>; current: string; pending: string | null; onComplete: (event: CompletableEvent) => void };

/** Gestes visibles d'une journée avant « + N autres gestes ». */
const VISIBLE = 4;

/** Calendrier du potager : une carte par jour, un geste par ligne ; récoltes et semis sont résumés en une ligne qui se déplie. */
export function CalendarTimeline({ groups, zones, varieties, now, pending, onComplete }: {
  groups: CalendarDay[]; zones: Zone[]; varieties: Map<string, Variety>; now: Date;
  pending: string | null; onComplete: (event: CompletableEvent) => void;
}) {
  const current = iso(now);
  const tomorrow = iso(addDays(now, 1));
  return (
    <ol aria-label="Gestes du potager par date" className="flex flex-col gap-4">
      {groups.map(group => {
        const isToday = group.date === current;
        const title = group.date === null ? 'Tout le mois' : isToday ? 'Aujourd’hui' : group.date === tomorrow ? 'Demain' : cap(JOURS[parse(group.date).getDay()]);
        return (
          <li key={group.date ?? 'periods'} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 px-1">
              <h2 className={`font-titre text-lg font-semibold ${isToday ? 'text-vert' : ''}`}>{title}</h2>
              {group.date && <time dateTime={group.date} className="text-sm font-bold text-gris">{fmt(parse(group.date))}</time>}
              <span className="rounded-full bg-vert-doux px-2 py-0.5 text-xs font-extrabold text-vert">{group.events.length} geste{group.events.length > 1 ? 's' : ''}</span>
            </div>
            {group.date === null && <p className="px-1 text-xs text-gris">Périodes favorables pour renouveler vos cultures, selon votre climat.</p>}
            <DayCard events={group.events} isToday={isToday} zones={zones} varieties={varieties} current={current} pending={pending} onComplete={onComplete} />
          </li>
        );
      })}
    </ol>
  );
}

function DayCard({ events, isToday, ...c }: { events: CalendarEvent[]; isToday: boolean } & Common) {
  const [more, setMore] = useState(false);
  const done = events.filter((e): e is CompletableEvent => e.kind === 'water' || e.kind === 'task');
  const harvest = events.filter(e => e.kind === 'harvest');
  const sow = events.filter(e => e.kind === 'indoor' || e.kind === 'outdoor');
  const shown = more ? done : done.slice(0, VISIBLE);
  return (
    <ul className="flex flex-col rounded-carte bg-white px-4 py-1">
      {shown.map(e => <EventRow key={e.id} event={e} isToday={isToday} {...c} />)}
      {done.length > VISIBLE && <li><button type="button" aria-expanded={more} onClick={() => setMore(m => !m)} className="flex min-h-11 w-full items-center justify-center font-extrabold text-vert">{more ? 'Réduire' : `+ ${done.length - VISIBLE} autre${done.length - VISIBLE > 1 ? 's' : ''} geste${done.length - VISIBLE > 1 ? 's' : ''}`}</button></li>}
      {harvest.length > 0 && <Summary label="Récolter" icon="🧺" tone="bg-soleil-doux" events={harvest} isToday={isToday} {...c} />}
      {sow.length > 0 && <Summary label="Semer ou planter" icon="🌱" tone="bg-vert-doux" events={sow} isToday={isToday} {...c} />}
    </ul>
  );
}

/** Une ligne qui résume plusieurs gestes de même nature et les déplie à la demande. */
function Summary({ label, icon, tone, events, isToday, ...c }: { label: string; icon: string; tone: string; events: CalendarEvent[]; isToday: boolean } & Common) {
  const [open, setOpen] = useState(false);
  const n = events.length;
  return (
    <li className="border-b border-dashed border-trait last:border-0">
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)} className="flex min-h-[58px] w-full items-center gap-3 text-left">
        <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${tone}`}>{icon}</span>
        <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">{label}</b><span className="truncate text-[13px] text-gris">{n} plante{n > 1 ? 's' : ''}{label === 'Récolter' ? (isToday ? ' à maturité estimée' : ' · date estimée') : ' · période favorable'}</span></span>
        <span className="font-extrabold text-vert">{open ? 'Réduire' : 'Voir →'}</span>
      </button>
      {open && <ul className="flex flex-col pb-1">{events.map(e => <EventRow key={e.id} event={e} isToday={isToday} {...c} />)}</ul>}
    </li>
  );
}

function EventRow({ event, zones, varieties, current, pending, onComplete }: { event: CalendarEvent; isToday: boolean } & Common) {
  const zoneName = (id: string | null) => zones.find(z => z.id === id)?.name ?? '';
  const s = event.kind === 'task' ? null : event.kind === 'harvest' ? event.harvest.species : event.species;
  const p = event.kind === 'water' ? event.plantings[0] : event.kind === 'harvest' ? event.harvest.planting : null;
  const variety = p?.variety_id ? varieties.get(p.variety_id)?.name : null;
  const count = event.kind === 'water' ? event.plantings.length : event.kind === 'harvest' ? event.harvest.count : 0;
  const label = event.kind === 'water' ? `Arroser · ${s!.name}` : event.kind === 'task' ? event.task.title : event.kind === 'harvest' ? `Récolter · ${s!.name}` : event.kind === 'indoor' ? `Semer sous abri · ${s!.name}` : `Semer ou planter · ${s!.name}`;
  const late = event.kind === 'task' && event.task.due_date < current;
  const sub = event.kind === 'task'
    ? late ? `En retard · ${fmt(parse(event.task.due_date))}` : [zoneName(event.task.zone_id) || 'Tout le potager', event.task.detail].filter(Boolean).join(' · ')
    : p ? [zoneName(p.zone_id), variety, count > 1 ? `${count} emplacements` : ''].filter(Boolean).join(' · ') : '';
  const busy = pending === event.id;
  return (
    <li className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait py-1 last:border-0" aria-busy={busy}>
      {s ? <Tile slug={s.slug} w={40} h={40} size={32} round={12} /> : <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vert-doux text-vert"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5h6M9 3h6v4H9zM6 5H5v16h14V5h-1M8 14l3 3 5-6" /></svg></span>}
      <span className="flex min-w-0 flex-1 flex-col"><b className="truncate font-extrabold">{label}</b>{sub && <span className={`truncate text-[13px] ${late ? 'font-extrabold text-alerte' : 'text-gris'}`}>{sub}</span>}</span>
      {event.kind === 'water' || event.kind === 'task' ? (
        <button type="button" disabled={pending !== null} onClick={() => onComplete(event)} aria-label={event.kind === 'water' ? `Noter l’arrosage : ${s!.name}, ${zoneName(p!.zone_id)}` : `Terminer : ${event.task.title}`} className="squish flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-vert text-xs font-extrabold text-vert ${busy ? 'bg-vert-doux' : ''}`}>{busy ? '…' : ''}</span>
        </button>
      ) : event.kind === 'harvest' ? (
        <Link to={event.harvest.count > 1 ? `/zones/${p!.zone_id}` : `/plantes/${p!.id}`} className="flex min-h-11 shrink-0 items-center font-extrabold text-vert">Voir →</Link>
      ) : (
        <Link to={`/glossaire/${s!.slug}`} className="flex min-h-11 shrink-0 items-center font-extrabold text-vert">Conseils →</Link>
      )}
    </li>
  );
}
