import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFICATION_PREFERENCES, NOTIFICATION_TYPES, notificationEnabled, taskNotificationEnabled, taskNotificationType } from '../../supabase/functions/_shared/notification-types';
import { plannedTasksFor } from './garden';
import { parse } from './dates';
import { species } from '../test/fixtures';

const auto = (title: string) => ({ title, origin: 'auto' as const });

describe('types de notifications partagés entre web et téléphone', () => {
  it('conserve tous les rappels des anciens réglages', () => {
    for (const { key } of NOTIFICATION_TYPES) {
      expect(notificationEnabled(undefined, key)).toBe(true);
      expect(notificationEnabled({}, key)).toBe(true);
      expect(notificationEnabled(DEFAULT_NOTIFICATION_PREFERENCES, key)).toBe(true);
    }
  });
  it('désactive un type indépendamment des autres', () => {
    const prefs = { notify_water: false, notify_harvest: false };
    expect(notificationEnabled(prefs, 'water')).toBe(false);
    expect(notificationEnabled(prefs, 'harvest')).toBe(false);
    expect(notificationEnabled(prefs, 'personal')).toBe(true);
  });
  it.each([
    ['Semis sous abri : tomate', 'sow_indoor'],
    ['Semer en place : carotte', 'sow_outdoor'],
    ['Surveiller la levée : radis', 'sow_outdoor'],
    ['Planter en place : tomate', 'plant'],
    ['Récolter : tomate', 'harvest'],
    ['Entretien : tomate', 'care'],
    ['Ancienne tâche automatique inconnue', 'care'],
  ] as const)('reconnaît les anciennes tâches : %s', (title, expected) => {
    expect(taskNotificationType(auto(title))).toBe(expected);
  });
  it('ne confond pas une tâche personnelle avec une tâche automatique au titre identique', () => {
    const task = { title: 'Récolter : tomate', origin: 'manuel' as const };
    expect(taskNotificationType(task)).toBe('personal');
    expect(taskNotificationEnabled({ notify_harvest: false }, task)).toBe(true);
    expect(taskNotificationEnabled({ notify_personal: false }, task)).toBe(false);
  });
  it('préserve le type explicite même si le titre est modifié', () => {
    expect(taskNotificationType({ ...auto('Titre modifié'), notification_type: 'sow_indoor' })).toBe('sow_indoor');
  });
  it('attribue un type stable aux nouvelles tâches de semis sous abri et repiquage', () => {
    const s = species({ sow_indoor_months: [3], plant_out_months: [5], care: 'Tuteurer.', days_to_harvest: 70, harvest_months: [7] });
    const tasks = plannedTasksFor({ species: s, zoneId: 'z', plantDate: parse('2027-05-15'), now: parse('2027-01-01') });
    expect(tasks.map(t => t.notification_type)).toEqual(['sow_indoor', 'plant', 'care', 'harvest']);
  });
  it('attribue le type semis en place au semis et à la surveillance de la levée', () => {
    const s = species({ plant_out_months: [3], germination_days: 5, care: 'Éclaircir.', days_to_harvest: 30 });
    const tasks = plannedTasksFor({ species: s, zoneId: 'z', plantDate: parse('2027-03-10'), now: parse('2027-01-01') });
    expect(tasks.map(t => t.notification_type)).toEqual(['sow_outdoor', 'sow_outdoor', 'care', 'harvest']);
  });
});
