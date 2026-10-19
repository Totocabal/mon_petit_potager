import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RAIN_MM, describe as describeCode, lastRainyDay, rainOn, rainSoon, skyOf, type Weather } from './weather';
import { iso } from './dates';

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 19, 12)); });
afterEach(() => vi.useRealTimers());

const day = (date: string, rain: number) => ({ date, rain, tmax: 15, tmin: 8, code: 3, chance: null });
const w: Weather = { days: [day('2026-10-16', 4), day('2026-10-17', 0), day('2026-10-18', 2.9), day('2026-10-19', 0.5), day('2026-10-20', 6), day('2026-10-21', 1)] };

describe('skyOf', () => {
  it.each([
    [0, 'soleil'], [1, 'eclaircies'], [2, 'eclaircies'], [3, 'nuageux'], [45, 'brouillard'], [48, 'brouillard'],
    [53, 'pluie'], [61, 'pluie'], [67, 'pluie'], [71, 'neige'], [77, 'neige'], [80, 'averses'], [82, 'averses'], [85, 'neige'], [95, 'orage'], [99, 'orage']
  ])('code %i -> %s', (code, sky) => expect(skyOf(code)).toBe(sky));
  it('describe donne un libellé pour chaque famille de codes', () => {
    expect(describeCode(0).label).toBe('Ensoleillé');
    expect(describeCode(61).label).toBe('Pluie');
    expect(describeCode(95).label).toBe('Orage');
  });
});

describe('pluie', () => {
  it('rainOn lit la pluie d’un jour, 0 sans données', () => {
    expect(rainOn(w, '2026-10-20')).toBe(6);
    expect(rainOn(w, '2030-01-01')).toBe(0);
    expect(rainOn(undefined, '2026-10-20')).toBe(0);
  });
  it('lastRainyDay ignore le futur et les pluies sous le seuil', () => {
    expect(RAIN_MM).toBe(3);
    expect(iso(lastRainyDay(w)!)).toBe('2026-10-16'); // 18 : 2,9 mm < seuil ; 20 : demain, pas encore tombée
    expect(lastRainyDay({ days: [day('2026-10-18', 1)] })).toBeNull();
    expect(lastRainyDay(undefined)).toBeNull();
  });
  it('rainSoon additionne aujourd’hui et demain', () => {
    expect(rainSoon(w)).toBeCloseTo(6.5);
    expect(rainSoon(undefined)).toBe(0);
  });
});
