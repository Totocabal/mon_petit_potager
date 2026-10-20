import { addDays, iso, parse, today } from './dates';
import { isReady, isSol } from './garden';
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
