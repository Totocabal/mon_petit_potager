import { describe, expect, it } from 'vitest';
import { canStep, clampSize, stepValue, zoneLimits } from './stepper';

describe('stepValue', () => {
  it('avance et recule d’un pas', () => {
    expect(stepValue(120, 1, 30, 30, 360)).toBe(150);
    expect(stepValue(120, -1, 30, 30, 360)).toBe(90);
  });
  it('s’arrête aux bornes', () => {
    expect(stepValue(350, 1, 30, 30, 360)).toBe(360);
    expect(stepValue(360, 1, 30, 30, 360)).toBe(360);
    expect(stepValue(40, -1, 30, 30, 360)).toBe(30);
  });
  it('+ n’a jamais pour effet de diminuer la valeur, et − de l’augmenter', () => {
    // ancien défaut : 900 cm sur un terrain de 800 cm (max 700) ; « + » le ramenait à 700
    expect(stepValue(900, 1, 150, 30, 700)).toBe(900);
    expect(stepValue(20, -1, 30, 30, 360)).toBe(20);
  });
  it('une valeur hors bornes revient dans les bornes avec l’autre bouton', () => {
    expect(stepValue(900, -1, 150, 150, 600)).toBe(750);
    expect(stepValue(750, -1, 150, 150, 600)).toBe(600);
    expect(stepValue(100, 1, 150, 150, 600)).toBe(250);
  });
  it('propriété : pour toute valeur et toute borne, + ne diminue pas et − n’augmente pas', () => {
    for (let v = -50; v <= 1200; v += 37) for (const [min, max] of [[30, 360], [150, 600], [100, 10000]]) for (const step of [30, 100, 150]) {
      expect(stepValue(v, 1, step, min, max)).toBeGreaterThanOrEqual(v);
      expect(stepValue(v, -1, step, min, max)).toBeLessThanOrEqual(v);
    }
  });
});

describe('canStep', () => {
  it('désactive le bouton quand la borne est atteinte', () => {
    expect(canStep(360, 1, 30, 360)).toBe(false); expect(canStep(330, 1, 30, 360)).toBe(true);
    expect(canStep(30, -1, 30, 360)).toBe(false); expect(canStep(60, -1, 30, 360)).toBe(true);
    expect(canStep(900, 1, 30, 700)).toBe(false); expect(canStep(900, -1, 30, 700)).toBe(true);
  });
});

describe('clampSize', () => {
  it('arrondit au pas, dans les bornes', () => {
    expect(clampSize(600, 150, 150, 600)).toBe(600);
    expect(clampSize(900, 150, 150, 600)).toBe(600);
    expect(clampSize(100, 150, 150, 600)).toBe(150);
    expect(clampSize(125, 30, 30, 360)).toBe(120);
  });
});

describe('zoneLimits', () => {
  it('petites zones : cases de 30 cm, 3,60 m au plus', () => {
    expect(zoneLimits(false, 1200, 800)).toEqual({ step: 30, min: 30, maxW: 360, maxL: 360 });
  });
  it('grandes zones : blocs de 1,50 m et bornes multiples du pas, une allée de 1 m en moins', () => {
    expect(zoneLimits(true, 1200, 800)).toEqual({ step: 150, min: 150, maxW: 1050, maxL: 600 });
    const l = zoneLimits(true, 1000, 1000);
    expect(l.maxW % 150).toBe(0); expect(l.maxL % 150).toBe(0);
  });
  it('un terrain minuscule garde au moins un bloc', () => {
    expect(zoneLimits(true, 200, 200).maxW).toBe(150);
  });
  it('depuis les tailles par défaut, + et − parcourent des multiples du pas sans sauter ni reculer', () => {
    // parcelle 6 m × 9 m sur un terrain de 12 m × 8 m : la longueur par défaut dépasse la limite
    const lim = zoneLimits(true, 1200, 800);
    let l = clampSize(900, lim.step, lim.min, lim.maxL);
    expect(l).toBe(600);
    expect(stepValue(l, 1, lim.step, lim.min, lim.maxL)).toBe(600);
    l = stepValue(l, -1, lim.step, lim.min, lim.maxL); expect(l).toBe(450);
    l = stepValue(l, -1, lim.step, lim.min, lim.maxL); l = stepValue(l, -1, lim.step, lim.min, lim.maxL); expect(l).toBe(150);
    expect(canStep(l, -1, lim.min, lim.maxL)).toBe(false);
    expect(stepValue(l, 1, lim.step, lim.min, lim.maxL)).toBe(300); // plus de « 30 → 180 → 330 »
  });
});
