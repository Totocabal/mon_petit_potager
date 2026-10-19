import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays, cap, diffDays, fmt, iso, longDate, monthsText, parse, today, whenText } from './dates';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 19, 15, 30)); }); // lundi 19 octobre 2026, 15 h 30
afterEach(() => vi.useRealTimers());

describe('today, iso, parse', () => {
  it('today() est le jour courant à minuit', () => {
    const t = today();
    expect([t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), t.getMinutes()]).toEqual([2026, 9, 19, 0, 0]);
  });
  it('iso et parse sont réciproques', () => {
    expect(iso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(iso(parse('2026-12-31'))).toBe('2026-12-31');
  });
  it('parse ignore l’heure d’un horodatage complet', () => {
    expect(iso(parse('2026-03-08T23:59:59Z'))).toBe('2026-03-08');
  });
});

describe('addDays et diffDays', () => {
  it('passe d’un mois et d’une année à l’autre', () => {
    expect(iso(addDays(parse('2026-01-31'), 1))).toBe('2026-02-01');
    expect(iso(addDays(parse('2026-12-31'), 1))).toBe('2027-01-01');
    expect(iso(addDays(parse('2026-03-01'), -1))).toBe('2026-02-28');
  });
  it('traverse le changement d’heure sans décaler le jour', () => {
    // fin de l'heure d'été en France : dimanche 25 octobre 2026 (journée de 25 h)
    expect(iso(addDays(parse('2026-10-24'), 2))).toBe('2026-10-26');
    expect(diffDays(parse('2026-10-26'), parse('2026-10-24'))).toBe(2);
    // début de l'heure d'été : dimanche 29 mars 2026 (journée de 23 h)
    expect(diffDays(parse('2026-03-30'), parse('2026-03-28'))).toBe(2);
  });
  it('diffDays est négatif quand a précède b', () => {
    expect(diffDays(parse('2026-05-01'), parse('2026-05-04'))).toBe(-3);
  });
});

describe('textes', () => {
  it('cap met la première lettre en majuscule', () => { expect(cap('lundi')).toBe('Lundi'); expect(cap('')).toBe(''); });
  it('fmt et longDate', () => {
    expect(fmt(parse('2026-10-19'))).toBe('19 oct.');
    expect(longDate(parse('2026-10-19'))).toBe('Lundi 19 octobre');
  });
  it('monthsText regroupe les mois consécutifs, y compris autour de décembre', () => {
    expect(monthsText([])).toBe('—');
    expect(monthsText([5])).toBe('mai');
    expect(monthsText([3, 4, 5, 9])).toBe('mars–mai, sept.');
    expect(monthsText([10, 11, 12, 1, 2])).toBe('oct.–févr.');
  });
  it('whenText parle d’aujourd’hui, de demain, du jour de la semaine puis de la date', () => {
    expect(whenText(parse('2026-10-18'))).toBe("aujourd'hui"); // en retard : on dit aujourd'hui
    expect(whenText(parse('2026-10-19'))).toBe("aujourd'hui");
    expect(whenText(parse('2026-10-20'))).toBe('demain');
    expect(whenText(parse('2026-10-23'))).toBe('vendredi');
    expect(whenText(parse('2026-10-26'))).toBe('26 oct.');
  });
});
