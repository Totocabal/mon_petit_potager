import { describe, expect, it } from 'vitest';
import { weatherAlerts, weatherReminderParts, type ForecastDay } from '../../supabase/functions/_shared/weather-alerts';
import { byId, planting, species } from '../test/fixtures';
const day: ForecastDay = { date: '2026-10-21', tmin: 8, tmax: 18, code: 3 };
const kinds = (patch: Partial<ForecastDay>) => weatherAlerts({ ...day, ...patch }).map(a => a.kind);
const tomato = species({ id: 't', frost_sensitive: true });
const base = { days: [{ ...day, date: '2026-10-22', tmin: -2, code: 73 }], date: day.date, tomorrow: '2026-10-22', crops: [planting({ species_id: 't', sown_at: '2026-10-01' })], byId: byId(tomato) };
describe('risques météo du potager', () => {
  it('respecte les seuils sans arrondir avant de décider', () => {
    expect(kinds({ tmin: 0 })).toEqual(['frost']);
    expect(kinds({ tmin: 0.1, tmax: 29.9 })).toEqual([]);
    expect(kinds({ tmax: 30 })).toEqual(['heat']);
    expect(kinds({ tmin: null, tmax: null, code: null })).toEqual([]);
  });
  it.each([71, 73, 75, 77, 85, 86])('reconnaît la neige WMO %i', code => expect(kinds({ code })).toEqual(['snow']));
  it.each([95, 96, 99])('reconnaît les orages WMO %i', code => expect(kinds({ code })).toEqual(['storm']));
  it.each([0, 3, 45, 48, 56, 57, 61, 67, 80, 82, 90, 100])('n’invente pas de neige ou d’orage pour %i', code => expect(kinds({ code })).toEqual([]));
  it('cumule les risques même quand il pleut', () => expect(kinds({ tmin: -2, code: 73 })).toEqual(['frost', 'snow']));
  it('annonce demain, ignore le passé et le reste de la semaine', () => {
    const parts = weatherReminderParts({ ...base, days: [base.days[0], { ...base.days[0], date: '2026-10-20' }, { ...base.days[0], date: '2026-10-23' }] });
    expect(parts).toHaveLength(2);
    expect(parts.every(p => p.includes('demain'))).toBe(true);
  });
  it('respecte chaque préférence et conserve les autres', () => {
    const parts = weatherReminderParts({ ...base, preferences: { notify_frost: false } });
    expect(parts).toHaveLength(1); expect(parts[0]).toContain('Neige');
    expect(weatherReminderParts({ ...base, preferences: { notify_frost: false, notify_snow: false } })).toEqual([]);
  });
  it('le gel tient compte des plantes sensibles', () => {
    expect(weatherReminderParts({ ...base, byId: byId(species({ id: 't', frost_sensitive: false })) })).toHaveLength(1);
  });
  it('ignore les sols, les plantes inconnues, le potager vide et les plantations futures', () => {
    expect(weatherReminderParts({ ...base, byId: byId(species({ id: 't', kind: 'sol' })) })).toEqual([]);
    expect(weatherReminderParts({ ...base, byId: new Map() })).toEqual([]);
    expect(weatherReminderParts({ ...base, crops: [] })).toEqual([]);
    expect(weatherReminderParts({ ...base, crops: [planting({ species_id: 't', sown_at: '2026-10-23' })] })).toEqual([]);
  });
  it('aucune alerte sans prévisions', () => expect(weatherReminderParts({ ...base, days: [] })).toEqual([]));
});
