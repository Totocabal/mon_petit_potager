import { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_TYPES } from '../../supabase/functions/_shared/notification-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { planReminders } from './reminders';
import { iso } from './dates';
import { byId, planting, species, zone } from '../test/fixtures';
import type { Task } from './types';
import type { Weather, WeatherDay } from './weather';

// lundi 19 octobre 2026, 08 h 00
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 19, 8)); });
afterEach(() => vi.useRealTimers());

const tomate = species({ id: 't', name: 'Tomate', water_every_days: 2 });
const carotte = species({ id: 'c', name: 'Carotte', water_every_days: 4 });
const index = byId(tomate, carotte);
const zones = [zone({ id: 'z', sheltered: false }), zone({ id: 'abri', sheltered: true })];
const d = (n: number) => iso(new Date(2026, 9, 19 + n));
const wday = (n: number, rain: number): WeatherDay => ({ date: d(n), rain, tmax: 15, tmin: 8, code: 3, chance: null });
const dry: Weather = { days: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(n => wday(n, 0)) };
const task = (id: string, due: number, title = 'Pailler', done = false): Task => ({ id, garden_id: 'g', planting_id: null, zone_id: null, title, detail: null, due_date: d(due), done_at: done ? '2026-10-01' : null, done_by: null, origin: 'manuel' });
// `now` est lu à chaque appel : il doit venir de l'horloge simulée de chaque test
const base = () => ({ crops: [planting({ id: '1', species_id: 't', last_watered_at: d(-1) })], byId: index, zones, tasks: [] as Task[], weather: dry, hour: 19, skipIfRain: true, now: new Date() });
const plan = (o: Partial<Parameters<typeof planReminders>[0]> = {}) => planReminders({ ...base(), ...o });
const dates = (rs: ReturnType<typeof plan>) => rs.map(r => iso(r.at));

describe('jours et heures', () => {
  it('commence aujourd’hui si l’heure du rappel n’est pas passée, sinon demain', () => {
    expect(plan({ crops: [planting({ species_id: 't', last_watered_at: d(-5) })] })[0].at.getHours()).toBe(19);
    expect(dates(plan({ crops: [planting({ species_id: 't', last_watered_at: d(-5) })] }))[0]).toBe(d(0));
    expect(dates(plan({ crops: [planting({ species_id: 't', last_watered_at: d(-5) })], now: new Date(2026, 9, 19, 21) }))[0]).toBe(d(1));
  });
  it('couvre 7 jours par défaut, et respecte `days`', () => {
    const crops = [planting({ species_id: 't', last_watered_at: d(-20), water_every_days: 1 })];
    expect(plan({ crops })).toHaveLength(7);
    expect(plan({ crops, days: 3 })).toHaveLength(3);
  });
  it('programme à l’heure demandée', () => {
    expect(plan({ hour: 8, now: new Date(2026, 9, 19, 6) })[0].at.getHours()).toBe(8);
  });
});

describe('arrosage', () => {
  it('rappelle à la date prévue puis chaque jour tant que ce n’est pas arrosé', () => {
    const rs = plan(); // dernier arrosage hier, tous les 2 jours : prévu demain
    expect(dates(rs)).toEqual([d(1), d(2), d(3), d(4), d(5), d(6)]);
    expect(rs[0].body).toBe('À arroser : Tomate');
    expect(rs[0].title).toBe('Mon petit potager');
  });
  it('un jour de pluie, pas de rappel ; la pluie remet le compteur à zéro', () => {
    const weather: Weather = { days: dry.days.map(x => (x.date === d(2) ? wday(2, 8) : x)) };
    const ds = dates(plan({ weather }));
    expect(ds).not.toContain(d(2)); // jour de pluie : pas de rappel
    expect(ds[0]).toBe(d(1)); // avant la pluie : toujours prévu
    expect(ds).toContain(d(4)); // la pluie du jour 2 compte comme arrosage : prochain rappel 2 jours plus tard
    expect(ds).not.toContain(d(3));
  });
  it('une plante sous abri est à arroser même un jour de pluie', () => {
    const weather: Weather = { days: dry.days.map(x => (x.date === d(1) ? wday(1, 12) : x)) };
    const abritee = planting({ id: 'a', species_id: 't', zone_id: 'abri', last_watered_at: d(-1) }); // prévue demain, jour de pluie
    const dehors = planting({ id: 'b', species_id: 'c', zone_id: 'z', last_watered_at: d(-3) }); // prévue demain aussi
    const rs = plan({ weather, crops: [abritee, dehors] });
    expect(rs[0].body).toBe('À arroser : Tomate'); // la carotte dehors est arrosée par la pluie
    expect(dates(rs)[0]).toBe(d(1));
  });
  it('sans tenir compte de la pluie quand on le demande', () => {
    const weather: Weather = { days: dry.days.map(x => (x.date === d(2) ? wday(2, 8) : x)) };
    expect(dates(plan({ weather, skipIfRain: false }))).toContain(d(2));
  });
  it('une zone sous abri ne profite pas de la pluie', () => {
    const weather: Weather = { days: dry.days.map(x => (x.date === d(0) ? wday(0, 10) : x)) };
    const crops = [planting({ species_id: 't', zone_id: 'abri', last_watered_at: d(-1) })];
    expect(dates(plan({ weather, crops }))[0]).toBe(d(1)); // abri : la pluie d'aujourd'hui ne compte pas
    expect(dates(plan({ weather, crops: [planting({ species_id: 't', zone_id: 'z', last_watered_at: d(-1) })] }))[0]).toBe(d(2)); // dehors : arrosé par la pluie
  });
  it('ignore les plantations dont les alertes sont coupées, pas encore plantées ou d’espèce inconnue', () => {
    const crops = [
      planting({ species_id: 't', last_watered_at: d(-9), alerts_enabled: false }),
      planting({ id: '2', species_id: 'inconnue', last_watered_at: d(-9) }),
      planting({ id: '3', species_id: 't', sown_at: d(15), last_watered_at: null })
    ];
    expect(plan({ crops })).toEqual([]);
  });
  it('regroupe les noms : trois puis « et N autres »', () => {
    const noms = ['A', 'B', 'C', 'D', 'E'].map((n, i) => species({ id: 'e' + i, name: n }));
    const crops = noms.map((s, i) => planting({ id: 'p' + i, species_id: s.id, last_watered_at: d(-9) }));
    expect(plan({ crops, byId: byId(...noms) })[0].body).toBe('À arroser : A, B, C et 2 autres');
    expect(plan({ crops: crops.slice(0, 4), byId: byId(...noms) })[0].body).toBe('À arroser : A, B, C et 1 autre');
  });
});

describe('récolte et tâches', () => {
  it('annonce les plantes prêtes à récolter', () => {
    const prete = species({ id: 'p', name: 'Courge', water_every_days: 99, harvest_months: [10], days_to_harvest: 30 });
    const rs = plan({ crops: [planting({ species_id: 'p', sown_at: '2026-06-01', last_watered_at: d(0) })], byId: byId(prete) });
    expect(rs[0].body).toBe('À récolter : Courge');
  });
  it('ne compte pas une récolte hors saison', () => {
    const hors = species({ id: 'p', name: 'Courge', water_every_days: 99, harvest_months: [7], days_to_harvest: 30 });
    expect(plan({ crops: [planting({ species_id: 'p', sown_at: '2026-06-01', last_watered_at: d(0) })], byId: byId(hors) })).toEqual([]);
  });
  it('ajoute les tâches du jour, en retard comprises, mais pas celles faites ou à venir', () => {
    const tasks = [task('1', -2, 'Semer la mâche'), task('2', 3, 'Plus tard'), task('3', 0, 'Faite', true)];
    const rs = plan({ crops: [], tasks });
    expect(rs.map(r => iso(r.at))).toEqual([d(0), d(1), d(2), d(3), d(4), d(5), d(6)]);
    expect(rs[0].body).toBe('Tâche : Semer la mâche');
    expect(rs[3].body).toBe('2 tâches du jour'); // le jour 3, la tâche « Plus tard » s'ajoute
  });
  it('assemble arrosage, récolte et tâche dans un seul message', () => {
    const prete = species({ id: 'p', name: 'Courge', water_every_days: 99, harvest_months: [10], days_to_harvest: 30 });
    const crops = [planting({ id: '1', species_id: 't', last_watered_at: d(-9) }), planting({ id: '2', species_id: 'p', sown_at: '2026-06-01', last_watered_at: d(0) })];
    const rs = plan({ crops, byId: byId(tomate, prete), tasks: [task('1', 0, 'Pailler')] });
    expect(rs[0].body).toBe('À arroser : Tomate · À récolter : Courge · Tâche : Pailler');
  });
});

describe('choix des types de rappels', () => {
  it('coupe l’arrosage sans couper les tâches personnelles', () => {
    const rs = plan({ preferences: { notify_water: false }, crops: [planting({ species_id: 't', last_watered_at: d(-9) })], tasks: [task('1', 0, 'Pailler')] });
    expect(rs[0].body).toBe('Tâche : Pailler');
  });
  it('coupe ensemble récoltes estimées et tâches automatiques de récolte', () => {
    const prete = species({ id: 'p', name: 'Courge', water_every_days: 99, harvest_months: [10], days_to_harvest: 30 });
    const harvestTask = { ...task('1', 0, 'Récolter : courge'), origin: 'auto' as const, notification_type: 'harvest' as const };
    const rs = plan({ preferences: { notify_harvest: false }, crops: [planting({ species_id: 'p', sown_at: '2026-06-01', last_watered_at: d(0) })], byId: byId(prete), tasks: [harvestTask] });
    expect(rs).toEqual([]);
  });
  it.each(['sow_indoor', 'sow_outdoor', 'plant', 'harvest', 'care', 'personal'] as const)('ne conserve que les tâches du type choisi : %s', chosen => {
    const kinds = ['sow_indoor', 'sow_outdoor', 'plant', 'harvest', 'care', 'personal'] as const;
    const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    for (const { key } of NOTIFICATION_TYPES) preferences[`notify_${key}`] = key === chosen;
    const tasks = kinds.map(kind => ({ ...task(kind, 0, kind), origin: kind === 'personal' ? 'manuel' as const : 'auto' as const, notification_type: kind }));
    const rs = plan({ preferences, crops: [], tasks });
    expect(rs[0].body).toBe(`Tâche : ${chosen}`);
  });
  it('ne programme aucun rappel lorsque tous les types sont désactivés', () => {
    const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES };
    for (const { key } of NOTIFICATION_TYPES) preferences[`notify_${key}`] = false;
    expect(plan({ preferences, tasks: [task('1', 0)] })).toEqual([]);
  });
});


describe('rappels météo anticipés', () => {
  it('joint le gel et la neige de demain au rappel d’aujourd’hui', () => {
    const weather = { days: [{ ...wday(1, 8), tmin: -1, code: 73 }] };
    const rs = plan({ weather, byId: byId(species({ id: 't', name: 'Tomate', frost_sensitive: true, water_every_days: 99 })), days: 1 });
    expect(rs).toHaveLength(1);
    expect(rs[0].body).toContain('Gel possible demain');
    expect(rs[0].body).toContain('Neige prévue demain');
    expect(iso(rs[0].at)).toBe(d(0));
  });
  it('les préférences météo ne coupent pas les rappels de tâches', () => {
    const weather = { days: [{ ...wday(1, 8), tmin: -1, code: 73 }] };
    const rs = plan({ weather, crops: [], tasks: [task('1', 0)], preferences: { notify_frost: false, notify_snow: false }, days: 1 });
    expect(rs[0].body).toBe('Tâche : Pailler');
  });
});
