import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarTimeline, monthPlan } from './calendar';
import { byId, planting, species } from '../test/fixtures';
import type { Task } from './types';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 20, 10)); });
afterEach(() => vi.useRealTimers());
const crop = species({ sow_indoor_months: [10], plant_out_months: [11], harvest_months: [10, 11], days_to_harvest: 90 });
const plan = (o: Partial<Parameters<typeof monthPlan>[0]> = {}) => monthPlan({ crops: [planting({ sown_at: '2026-10-01' })], byId: byId(crop), tasks: [], year: 2026, month: 10, ...o });
const task = (id: string, due_date: string, done_at: string | null = null): Task => ({ id, due_date, done_at, garden_id: 'g', planting_id: null, zone_id: null, title: id, detail: null, done_by: null, origin: 'manuel' });

describe('calendrier personnel', () => {
  it('propose les semis uniquement pour les espèces du potager, sans doublon', () => {
    const result = plan({ crops: [planting(), planting({ id: 'p2' })], byId: byId(crop, species({ id: 'autre', sow_indoor_months: [10] })) });
    expect(result.indoor.map(s => s.id)).toEqual(['s']);
    expect(result.outdoor).toEqual([]);
    expect(plan({ month: 11 }).outdoor.map(s => s.id)).toEqual(['s']);
  });
  it('exclut les sols, les plantes retirées et les espèces inconnues', () => {
    const result = plan({ crops: [planting({ removed_at: '2026-10-10' }), planting({ id: 'sol', species_id: 'sol' }), planting({ id: 'inconnue', species_id: 'inconnue' })], byId: byId(crop, species({ id: 'sol', kind: 'sol' })) });
    expect(result.cultivated).toEqual([]);
    expect(result.harvest).toEqual([]);
  });
  it('retient le délai de la variété plutôt que celui de l’espèce', () => {
    const result = plan({ crops: [planting({ sown_at: '2026-10-01', days_to_harvest: 25, variety_id: 'v' })] });
    expect(result.harvest[0].date).toBe('2026-10-26');
    expect(plan().harvest).toEqual([]);
  });
  it('présente les cultures déjà mûres dès aujourd’hui', () => {
    expect(plan({ crops: [planting({ sown_at: '2026-06-01' })] }).harvest[0].date).toBe('2026-10-20');
  });
  it('respecte la saison de récolte même si le délai est atteint', () => {
    expect(plan({ crops: [planting()], byId: byId(species({ harvest_months: [8], days_to_harvest: 10 })) }).harvest).toEqual([]);
  });
  it('ne prévoit aucune récolte avant la plantation, même sans délai connu', () => {
    const result = plan({ crops: [planting({ sown_at: '2026-10-28' })], byId: byId(species({ harvest_months: [10] })) });
    expect(result.harvest[0].date).toBe('2026-10-28');
    expect(plan({ crops: [planting({ sown_at: '2027-01-01' })] }).cultivated).toEqual([]);
  });
  it('regroupe les emplacements identiques et conserve les variétés distinctes', () => {
    const result = plan({ crops: [planting(), planting({ id: 'p2' }), planting({ id: 'p3', variety_id: 'v' }), planting({ id: 'p4', zone_id: 'autre' })] });
    expect(result.harvest.map(h => h.count)).toEqual([2, 1, 1]);
  });
  it('gère le passage à l’année suivante et les échéances en jours locaux', () => {
    const result = plan({ year: 2027, month: 1, crops: [planting({ sown_at: '2026-12-20', days_to_harvest: 20 })], byId: byId(species({ harvest_months: [1] })) });
    expect(result.harvest[0].date).toBe('2027-01-09');
  });
  it('affiche les tâches du mois et les retards actuels, sans les tâches terminées', () => {
    const tasks = [task('novembre', '2026-11-03'), task('finie', '2026-10-21', '2026-10-20'), task('mois', '2026-10-30'), task('retard', '2026-09-01')];
    expect(plan({ tasks }).tasks.map(t => t.id)).toEqual(['retard', 'mois']);
    expect(plan({ tasks, month: 11 }).tasks.map(t => t.id)).toEqual(['novembre']);
  });
  it('garde les tâches manuelles lorsque le potager est vide', () => {
    const result = plan({ crops: [], tasks: [task('préparer le sol', '2026-10-25')] });
    expect(result.indoor).toEqual([]);
    expect(result.harvest).toEqual([]);
    expect(result.tasks).toHaveLength(1);
  });
});

const timeline = (o: Partial<Parameters<typeof calendarTimeline>[0]> = {}) => calendarTimeline({ crops: [planting({ sown_at: '2026-08-15', days_to_harvest: 70 })], byId: byId(crop), tasks: [], year: 2026, month: 10, rainFor: () => null, ...o });

describe('timeline du calendrier', () => {
  it('classe les gestes par date et garde les semis dans une période non datée', () => {
    const result = timeline({ tasks: [task('pailler', '2026-10-22')] });
    expect(result.map(g => g.date)).toEqual(['2026-10-20', '2026-10-22', '2026-10-24', null]);
    expect(result.map(g => g.events.map(e => e.kind))).toEqual([['water'], ['task'], ['harvest'], ['indoor']]);
  });
  it('place les tâches en retard aujourd’hui et conserve leur échéance originale', () => {
    const result = timeline({ tasks: [task('retard', '2026-09-01'), task('aujourd’hui', '2026-10-20')] });
    const events = result[0].events.filter(e => e.kind === 'task');
    expect(result[0].date).toBe('2026-10-20');
    expect(events.map(e => e.task.due_date)).toEqual(['2026-09-01', '2026-10-20']);
  });
  it('regroupe l’arrosage par espèce et zone avec les bons identifiants à enregistrer', () => {
    const result = timeline({ crops: [planting({ id: 'a' }), planting({ id: 'b' }), planting({ id: 'c', zone_id: 'serre' })] });
    const water = result[0].events.filter(e => e.kind === 'water');
    expect(water.map(e => e.plantings.map(p => p.id))).toEqual([['a', 'b'], ['c']]);
  });
  it('respecte la pluie récente pour les zones extérieures et les abris', () => {
    const result = timeline({ crops: [planting({ id: 'dehors' }), planting({ id: 'abri', zone_id: 'serre' })], rainFor: id => id === 'serre' ? null : new Date(2026, 9, 20) });
    const water = result[0].events.filter(e => e.kind === 'water');
    expect(water.flatMap(e => e.plantings.map(p => p.id))).toEqual(['abri']);
  });
  it('ne signale pas d’arrosage pour les plantes retirées, futures, inconnues, les sols ou les alertes désactivées', () => {
    const result = timeline({ crops: [planting({ removed_at: '2026-10-19' }), planting({ id: 'future', sown_at: '2026-10-25' }), planting({ id: 'inconnue', species_id: 'inconnue' }), planting({ id: 'sol', species_id: 'sol' }), planting({ id: 'sans-alerte', alerts_enabled: false })], byId: byId(crop, species({ id: 'sol', kind: 'sol' })) });
    expect(result.flatMap(g => g.events).filter(e => e.kind === 'water')).toEqual([]);
  });
  it('ne crée pas de dates d’arrosage hypothétiques pour les mois futurs', () => {
    const result = timeline({ month: 11 });
    expect(result.flatMap(g => g.events).some(e => e.kind === 'water')).toBe(false);
    expect(result[result.length - 1]?.date).toBeNull();
    expect(result[result.length - 1]?.events[0].kind).toBe('outdoor');
  });
  it('fait disparaître un arrosage enregistré et une tâche terminée', () => {
    const result = timeline({ crops: [planting({ last_watered_at: '2026-10-20' })], tasks: [task('faite', '2026-10-20', '2026-10-20')] });
    expect(result.flatMap(g => g.events).some(e => e.kind === 'water' || e.kind === 'task')).toBe(false);
  });
  it('garde les tâches seules dans un potager vide, sans groupe vide', () => {
    expect(timeline({ crops: [] })).toEqual([]);
    const result = timeline({ crops: [], tasks: [task('préparer', '2026-10-23')] });
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('2026-10-23');
    expect(result[0].events[0].kind).toBe('task');
  });
});
