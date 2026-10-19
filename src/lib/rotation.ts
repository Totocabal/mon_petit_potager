import { addDays, diffDays, parse, today } from './dates';
import type { Planting, Species, Zone } from './types';

/** Une culture de la même famille arrêtée trop récemment à cet endroit. */
export type RotationHit = { species: Species; end: Date; until: Date };

const yearsMs = (n: number) => Math.round(n * 365.25);
const ended = (p: Planting) => (p.removed_at ? parse(p.removed_at.slice(0, 10)) : null);

/** La culture précédente et la nouvelle sont toutes deux soumises à la rotation et de la même famille. */
const sameRotation = (a: Species | undefined, b: Species) => !!a && a.kind !== 'sol' && a.rotation_years != null && a.family === b.family;

/** Plantations arrêtées (historique) qui gênent la plantation de `s` sur `rect` : même famille, moins de N années. */
export function rotationHits(history: Planting[], byId: Map<string, Species>, zoneId: string, rect: { x: number; y: number; w: number; h: number }, s: Species, now = today()): RotationHit[] {
  if (s.rotation_years == null || s.kind === 'sol') return [];
  const n = s.rotation_years;
  const out: RotationHit[] = [];
  for (const p of history) {
    if (p.zone_id !== zoneId) continue;
    const end = ended(p);
    if (!end) continue;
    if (p.x >= rect.x + rect.w || p.x + p.w <= rect.x || p.y >= rect.y + rect.h || p.y + p.h <= rect.y) continue;
    const prev = byId.get(p.species_id);
    if (!sameRotation(prev, s)) continue;
    const until = addDays(end, yearsMs(Math.max(n, prev!.rotation_years!)));
    if (until > now) out.push({ species: prev!, end, until });
  }
  return out;
}

/** Cases de la zone (y * colonnes + x) où `s` ne devrait pas être planté avant la fin de la rotation. */
export function blockedCells(history: Planting[], byId: Map<string, Species>, zone: Pick<Zone, 'id' | 'cols' | 'rows'>, s: Species, now = today()): Set<number> {
  const out = new Set<number>();
  if (s.rotation_years == null || s.kind === 'sol') return out;
  for (const p of history) {
    if (p.zone_id !== zone.id) continue;
    const end = ended(p);
    if (!end) continue;
    const prev = byId.get(p.species_id);
    if (!sameRotation(prev, s)) continue;
    if (addDays(end, yearsMs(Math.max(s.rotation_years, prev!.rotation_years!))) <= now) continue;
    for (let y = p.y; y < Math.min(zone.rows, p.y + p.h); y++) for (let x = p.x; x < Math.min(zone.cols, p.x + p.w); x++) out.add(y * zone.cols + x);
  }
  return out;
}

const plural = (n: number, w: string) => `${n} ${w}${n > 1 && !w.endsWith('s') ? 's' : ''}`;
/** « il y a 8 mois », « il y a 1 an et 2 mois » */
export function agoText(end: Date, now = today()): string {
  const months = Math.max(0, Math.round(diffDays(now, end) / 30.44));
  if (months < 1) return 'ce mois-ci';
  if (months < 12) return `il y a ${months} mois`;
  const y = Math.floor(months / 12), m = months % 12;
  return `il y a ${plural(y, 'an')}${m ? ` et ${m} mois` : ''}`;
}

/** Message d'avertissement pour une plantation prévue : ce qui a été cultivé ici et à partir de quand c'est conseillé. */
export function rotationMessage(s: Species, hits: RotationHit[]): string {
  if (!hits.length) return '';
  const names = [...new Set(hits.map(h => h.species.name.toLowerCase()))];
  const last = hits.reduce((a, h) => (h.end > a.end ? h : a));
  const until = hits.reduce((a, h) => (h.until > a ? h.until : a), hits[0].until);
  const when = until.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `Rotation des cultures : ${s.family.toLowerCase()} déjà cultivées ici (${names.join(', ')}, ${agoText(last.end)}). On conseille de ne pas replanter cette famille au même endroit avant ${when}.`;
}
