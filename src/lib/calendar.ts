import { addDays, iso, parse, today } from './dates';
import { isReady, isSol, isThirsty } from './garden';
import type { Planting, Species, Task } from './types';

export type HarvestPlan = { species: Species; planting: Planting; date: string; count: number };

/** Calendrier du potager : renouvellement des espèces cultivées, récoltes et tâches du mois.
 * Les récoltes restent des estimations, calculées avec la même règle que l’accueil.
 */
export function monthPlan(o: { crops: Planting[]; byId: Map<string, Species>; tasks: Task[]; year: number; month: number; now?: Date }) {
  const now = o.now ?? today();
  const start = new Date(o.year, o.month - 1, 1);
  const end = new Date(o.year, o.month, 0);
  const current = now.getFullYear() === o.year && now.getMonth() + 1 === o.month;
  const first = current ? now : start;
  const active = o.crops.filter(p => !p.removed_at && o.byId.has(p.species_id) && !isSol(o.byId.get(p.species_id)) && parse(p.sown_at) <= end);
  const cultivated = [...new Set(active.map(p => p.species_id))].map(id => o.byId.get(id)!).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const harvest = new Map<string, HarvestPlan>();
  for (const p of active) {
    const s = o.byId.get(p.species_id)!;
    for (let date = first; date <= end; date = addDays(date, 1)) {
      if (date < parse(p.sown_at) || !isReady(p, s, date)) continue;
      const key = [p.species_id, p.zone_id, p.variety_id, iso(date)].join('|');
      const group = harvest.get(key);
      if (group) group.count++;
      else harvest.set(key, { species: s, planting: p, date: iso(date), count: 1 });
      break;
    }
  }
  const tasks = o.tasks.filter(t => !t.done_at && t.due_date <= iso(end) && (t.due_date >= iso(start) || current)).sort((a, b) => a.due_date.localeCompare(b.due_date));
  return {
    cultivated,
    indoor: cultivated.filter(s => s.sow_indoor_months.includes(o.month)),
    outdoor: cultivated.filter(s => s.plant_out_months.includes(o.month)),
    harvest: [...harvest.values()].sort((a, b) => a.date.localeCompare(b.date) || a.species.name.localeCompare(b.species.name, 'fr')),
    tasks,
  };
}

export type CalendarEvent = { id: string } & (
  | { kind: 'water'; species: Species; plantings: Planting[] }
  | { kind: 'task'; task: Task }
  | { kind: 'harvest'; harvest: HarvestPlan }
  | { kind: 'indoor' | 'outdoor'; species: Species }
);
export type CalendarDay = { date: string | null; events: CalendarEvent[] };

/** Regroupe les gestes datés dans l’ordre ; les périodes de semis gardent une précision mensuelle. */
export function calendarTimeline(o: Parameters<typeof monthPlan>[0] & { rainFor: (zoneId: string) => Date | null }): CalendarDay[] {
  const plan = monthPlan(o);
  const now = o.now ?? today();
  const key = iso(now);
  const days = new Map<string, CalendarEvent[]>();
  const add = (date: string, event: CalendarEvent) => days.set(date, [...(days.get(date) ?? []), event]);
  if (o.year === now.getFullYear() && o.month === now.getMonth() + 1) {
    const water = new Map<string, Extract<CalendarEvent, { kind: 'water' }>>();
    for (const p of o.crops) {
      const species = o.byId.get(p.species_id);
      if (p.removed_at || parse(p.sown_at) > now || !isThirsty(p, species, o.rainFor(p.zone_id), now)) continue;
      const id = `water:${p.species_id}:${p.zone_id}`;
      const group = water.get(id);
      if (group) group.plantings.push(p);
      else water.set(id, { id, kind: 'water', species: species!, plantings: [p] });
    }
    for (const event of water.values()) add(key, event);
  }
  for (const task of plan.tasks) add(task.due_date < key ? key : task.due_date, { id: `task:${task.id}`, kind: 'task', task });
  for (const harvest of plan.harvest) add(harvest.date, { id: `harvest:${harvest.planting.id}`, kind: 'harvest', harvest });
  const groups: CalendarDay[] = [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, events]) => ({ date, events }));
  const periods: CalendarEvent[] = [
    ...plan.indoor.map(species => ({ id: `indoor:${species.id}`, kind: 'indoor' as const, species })),
    ...plan.outdoor.map(species => ({ id: `outdoor:${species.id}`, kind: 'outdoor' as const, species })),
  ];
  if (periods.length) groups.push({ date: null, events: periods });
  return groups;
}
