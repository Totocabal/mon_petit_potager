import type { CSSProperties } from 'react';
import type { Sky } from '../lib/weather';

const FACE = (
  <>
    <ellipse cx="36" cy="46" rx="3" ry="1.7" fill="#F7A39A" /><ellipse cx="54" cy="46" rx="3" ry="1.7" fill="#F7A39A" />
    <circle cx="40" cy="42" r="2" fill="#3A2320" />
    <circle cx="50" cy="42" r="2" fill="#3A2320" />
    <path d="M42 47q3 3 6 0" stroke="#3A2320" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>
);
const CLOUD_PATH = 'M22 52h40a12 12 0 0 0 0-24 16 16 0 0 0-30 4 10 10 0 0 0-10 20z';
const SUN = <circle className="wi-sun" cx="30" cy="24" r="16" fill="#F6C445" />;
const delay = (s: number): CSSProperties => ({ animationDelay: `${s}s` });

/** Nuage de face avec son visage : tout bouge ensemble quand l'icône est animée. */
const Cloud = () => <g className="wi-cloud"><path d={CLOUD_PATH} fill="#FFFFFF" />{FACE}</g>;

/** Petite météo illustrée, dans le style des plantes (visage souriant). Avec `animate` : soleil qui rayonne, pluie qui tombe… */
export function WeatherIcon({ sky, size = 76, animate = false }: { sky: Sky; size?: number; animate?: boolean }) {
  let body;
  if (sky === 'soleil') {
    body = (
      <>
        <g className="wi-rays" stroke="#F6C445" strokeWidth="3" strokeLinecap="round"><path d="M40 4v6M40 54v6M12 32H6M74 32h-6M20 12l4 4M60 12l-4 4M20 52l4-4M60 52l-4-4" /></g>
        <g className="wi-sun">
          <circle cx="40" cy="32" r="18" fill="#F6C445" />
          <ellipse cx="30" cy="34" rx="3" ry="1.7" fill="#F7A39A" /><ellipse cx="50" cy="34" rx="3" ry="1.7" fill="#F7A39A" />
          <circle cx="34" cy="30" r="2" fill="#3A2320" /><circle cx="46" cy="30" r="2" fill="#3A2320" />
          <path d="M36 36q4 4 8 0" stroke="#3A2320" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      </>
    );
  } else if (sky === 'eclaircies') {
    body = <>{SUN}<Cloud /></>;
  } else if (sky === 'nuageux' || sky === 'brouillard') {
    body = (
      <>
        <path className="wi-cloud-back" d="M14 40h30a9 9 0 0 0 0-18 12 12 0 0 0-22 3 8 8 0 0 0-8 15z" fill="#FFFFFF" />
        <Cloud />
        {sky === 'brouillard' && <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"><path className="wi-fog" d="M16 58h34" /><path className="wi-fog" d="M28 62h30" style={delay(1.2)} /></g>}
      </>
    );
  } else {
    const drops = sky === 'neige'
      ? <g fill="#FFFFFF"><circle className="wi-flake" cx="30" cy="57" r="2.4" /><circle className="wi-flake" cx="42" cy="58" r="2.4" style={delay(0.8)} /><circle className="wi-flake" cx="54" cy="57" r="2.4" style={delay(1.6)} /></g>
      : <g stroke="#4E9BC4" strokeWidth="3" strokeLinecap="round"><path className="wi-drop" d="M30 55l-2 6" /><path className="wi-drop" d="M42 55l-2 6" style={delay(0.35)} /><path className="wi-drop" d="M54 55l-2 6" style={delay(0.7)} /></g>;
    body = (
      <>
        {sky === 'averses' && SUN}
        <Cloud />
        {sky === 'orage' ? <path className="wi-bolt" d="M46 47l-8 9h6l-3 7 11-12h-7l3-4z" fill="#F6C445" /> : drops}
      </>
    );
  }
  return <svg aria-hidden="true" viewBox="0 0 80 64" width={size} height={Math.round(size * 0.8)} className={`shrink-0 ${animate ? 'wi-anim' : ''}`}>{body}</svg>;
}
