import type { Sky } from '../lib/weather';

const CLOUD = 'M22 52h40a12 12 0 0 0 0-24 16 16 0 0 0-30 4 10 10 0 0 0-10 20z';
const C = 170; // centre du soleil dans le dessin (340 × 340)
const cloud = (x: number, y: number, s: number, fill: string, cls = 'wb-cloud', delay = 0) => (
  <g className={cls} style={{ animationDelay: `${delay}s` }}><path d={CLOUD} transform={`translate(${x} ${y}) scale(${s})`} fill={fill} /></g>
);

/**
 * Décor de l'accueil, en haut à droite : le soleil de la maquette, remplacé par le ciel du jour
 * (nuage, pluie, neige, orage, brouillard). Il est posé derrière le contenu et déborde de l'écran.
 */
export function WeatherBackdrop({ sky }: { sky: Sky | null }) {
  const kind = sky ?? 'soleil';
  let body;
  if (kind === 'soleil' || kind === 'eclaircies') {
    body = (
      <>
        <circle className="wb-pulse" cx={C} cy={C} r="135" fill="#F5E08F" />
        <circle cx={C} cy={C} r="100" fill="#F6CD5E" />
        {kind === 'eclaircies' && cloud(20, 120, 3.0, '#FFFFFF')}
      </>
    );
  } else if (kind === 'nuageux') {
    body = <>{cloud(-10, 70, 3.9, '#C9DDE3', 'wb-cloud-back', 0)}{cloud(30, 105, 3.4, '#FFFFFF')}</>;
  } else if (kind === 'brouillard') {
    body = (
      <>
        <circle cx={C} cy={C} r="135" fill="#DCE8EB" />
        <g fill="#FFFFFF" fillOpacity=".8">
          <rect className="wb-fog" x="20" y="205" width="190" height="16" rx="8" />
          <rect className="wb-fog" x="50" y="240" width="190" height="16" rx="8" style={{ animationDelay: '1.2s' }} />
          <rect className="wb-fog" x="10" y="275" width="190" height="16" rx="8" style={{ animationDelay: '2.4s' }} />
        </g>
      </>
    );
  } else if (kind === 'orage') {
    body = (
      <>
        {cloud(-10, 60, 3.9, '#9DB1B9', 'wb-cloud-back')}{cloud(30, 95, 3.4, '#C4D5DB')}
        <path className="wb-bolt" d="M100 262l-26 34h19l-9 30 34-42h-21l9-22z" fill="#F6C445" />
      </>
    );
  } else {
    const snow = kind === 'neige';
    body = (
      <>
        {cloud(-10, 60, 3.9, snow ? '#DCE8EB' : '#B7CED5', 'wb-cloud-back')}{cloud(30, 95, 3.4, '#FFFFFF')}
        {snow
          ? [70, 105, 140, 175, 210].map((x, i) => <circle key={x} className="wb-flake" cx={x} cy="300" r="5" fill="#FFFFFF" style={{ animationDelay: `${i * 0.5}s` }} />)
          : [70, 105, 140, 175, 210].map((x, i) => <path key={x} className="wb-drop" d={`M${x} 292l-6 16`} stroke="#4E9BC4" strokeWidth="5" strokeLinecap="round" style={{ animationDelay: `${i * 0.26}s` }} />)}
      </>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 340 340" width="340" height="340" className="pointer-events-none absolute -right-[175px] -top-[195px] z-[-1] overflow-visible lg:-right-[120px] lg:-top-[170px]">
      {body}
    </svg>
  );
}
