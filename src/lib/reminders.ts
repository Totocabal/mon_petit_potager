import { addDays, iso, parse, today } from './dates';
import { everyDays, isReady } from './garden';
import { RAIN_MM, type Weather } from './weather';
import type { Planting, Species, Task, Zone } from './types';

export type Reminder = { at: Date; title: string; body: string };

/** Même présentation que les rappels du site : trois noms, puis « et N autres ». */
const list = (names: string[]) => (names.length <= 3 ? names.join(', ') : names.slice(0, 3).join(', ') + ` et ${names.length - 3} autre${names.length - 3 > 1 ? 's' : ''}`);

/**
 * Rappels des prochains jours (arrosage, récolte, tâches), d'après les plantations, les tâches et la météo.
 * On suppose qu'aucun arrosage n'est fait entre-temps : le plan est recalculé à chaque ouverture de l'app.
 */
export function planReminders(o: {
  crops: Planting[]; byId: Map<string, Species>; zones: Zone[]; tasks: Task[]; weather: Weather | undefined;
  hour: number; skipIfRain: boolean; now?: Date; days?: number;
}): Reminder[] {
  const now = o.now ?? new Date();
  const first = today();
  const todayAt = new Date(first.getFullYear(), first.getMonth(), first.getDate(), o.hour, 0, 0);
  const start = todayAt.getTime() - now.getTime() > 60_000 ? first : addDays(first, 1);
  const sheltered = new Set(o.zones.filter(z => z.sheltered).map(z => z.id));
  const rainyDays = (o.weather?.days ?? []).filter(d => d.rain >= RAIN_MM).map(d => d.date).sort();
  const out: Reminder[] = [];

  for (let i = 0; i < (o.days ?? 7); i++) {
    const day = addDays(start, i), key = iso(day);
    const parts: string[] = [];

    const rainToday = o.skipIfRain && rainyDays.includes(key);
    if (!rainToday) {
      const water = new Set<string>();
      for (const p of o.crops) {
        const s = o.byId.get(p.species_id);
        if (!s || !p.alerts_enabled) continue;
        let last = parse(p.last_watered_at ?? p.sown_at);
        if (o.skipIfRain && !sheltered.has(p.zone_id)) {
          const rain = rainyDays.filter(d => d <= key).pop();
          if (rain && parse(rain) > last) last = parse(rain);
        }
        if (addDays(last, everyDays(p, s)) <= day) water.add(s.name);
      }
      if (water.size) parts.push('À arroser : ' + list([...water]));
    }

    const harvest = new Set<string>();
    for (const p of o.crops) { const s = o.byId.get(p.species_id); if (s && isReady(p, s, day)) harvest.add(s.name); }
    if (harvest.size) parts.push('À récolter : ' + list([...harvest]));

    const todo = o.tasks.filter(t => !t.done_at && t.due_date <= key);
    if (todo.length) parts.push(todo.length === 1 ? 'Tâche : ' + todo[0].title : `${todo.length} tâches du jour`);

    if (parts.length) out.push({ at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), o.hour, 0, 0), title: 'Mon petit potager', body: parts.join(' · ') });
  }
  return out;
}
