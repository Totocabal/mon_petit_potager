/**
 * Valeur suivante d'un compteur + / − : elle reste dans les bornes et ne va jamais dans le mauvais sens.
 * Une valeur déjà hors bornes ne bouge pas avec le bouton qui l'éloignerait encore, et revient avec l'autre.
 */
export function stepValue(value: number, dir: 1 | -1, step: number, min: number, max: number): number {
  return dir === 1 ? Math.max(value, Math.min(max, value + step)) : Math.min(value, Math.max(min, value - step));
}

/** Le bouton peut-il encore faire bouger la valeur ? */
export const canStep = (value: number, dir: 1 | -1, min: number, max: number) => (dir === 1 ? value < max : value > min);

/** Ramène une taille à un multiple du pas, dans les bornes. */
export const clampSize = (v: number, step: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));

/**
 * Pas et bornes de la création d'une zone (cm). Petites zones : cases de 30 cm, 3,60 m au plus.
 * Grandes zones (parcelle, serre) : blocs de 1,50 m, jusqu'à la taille du terrain moins une allée de 1 m ;
 * les bornes sont des multiples du pas, sinon le compteur tombe sur des valeurs décalées (30, 180, 330…).
 */
export function zoneLimits(big: boolean, terrainW: number, terrainL: number) {
  const step = big ? 150 : 30;
  const floor = (v: number) => Math.max(step, Math.floor(v / step) * step);
  return { step, min: step, maxW: big ? floor(terrainW - 100) : 360, maxL: big ? floor(terrainL - 100) : 360 };
}
