export const DAY = 864e5;
export const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function iso(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function parse(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / DAY);
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmt = (d: Date) => d.getDate() + ' ' + MOIS_COURT[d.getMonth()];
export const longDate = (d: Date) => cap(JOURS[d.getDay()]) + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];

export function monthsText(ms: number[]): string {
  if (!ms.length) return '—';
  const runs: number[][] = [];
  let cur = [ms[0]];
  for (const m of ms.slice(1)) {
    if (m === (cur[cur.length - 1] % 12) + 1) cur.push(m);
    else { runs.push(cur); cur = [m]; }
  }
  runs.push(cur);
  return runs.map(r => (r.length === 1 ? MOIS_COURT[r[0] - 1] : MOIS_COURT[r[0] - 1] + '–' + MOIS_COURT[r[r.length - 1] - 1])).join(', ');
}

export function whenText(d: Date): string {
  const n = diffDays(d, today());
  if (n <= 0) return "aujourd'hui";
  if (n === 1) return 'demain';
  if (n < 7) return JOURS[d.getDay()];
  return fmt(d);
}
