import type { Sky } from '../lib/weather';

const FACE = (
  <>
    <circle cx="40" cy="42" r="2" fill="#3A2320" />
    <circle cx="50" cy="42" r="2" fill="#3A2320" />
    <path d="M42 47q3 3 6 0" stroke="#3A2320" strokeWidth="2" fill="none" strokeLinecap="round" />
  </>
);
const CLOUD = <path d="M22 52h40a12 12 0 0 0 0-24 16 16 0 0 0-30 4 10 10 0 0 0-10 20z" fill="#FFFFFF" />;
const SUN = <circle cx="30" cy="24" r="16" fill="#F6C445" />;

/** Petite météo illustrée, dans le style des plantes (visage souriant). */
export function WeatherIcon({ sky, size = 76 }: { sky: Sky; size?: number }) {
  let body;
  if (sky === 'soleil') {
    body = (
      <>
        <g stroke="#F6C445" strokeWidth="3" strokeLinecap="round"><path d="M40 4v6M40 54v6M12 32H6M74 32h-6M20 12l4 4M60 12l-4 4M20 52l4-4M60 52l-4-4" /></g>
        <circle cx="40" cy="32" r="18" fill="#F6C445" />
        <circle cx="34" cy="30" r="2" fill="#3A2320" /><circle cx="46" cy="30" r="2" fill="#3A2320" />
        <path d="M36 36q4 4 8 0" stroke="#3A2320" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    );
  } else if (sky === 'eclaircies') {
    body = <>{SUN}{CLOUD}{FACE}</>;
  } else if (sky === 'nuageux' || sky === 'brouillard') {
    body = (
      <>
        <path d="M14 40h30a9 9 0 0 0 0-18 12 12 0 0 0-22 3 8 8 0 0 0-8 15z" fill="#B7CED5" />
        {CLOUD}{FACE}
        {sky === 'brouillard' && <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round"><path d="M16 58h34M28 62h30" /></g>}
      </>
    );
  } else {
    const drops = sky === 'neige'
      ? <g fill="#FFFFFF"><circle cx="30" cy="58" r="2.4" /><circle cx="42" cy="61" r="2.4" /><circle cx="54" cy="58" r="2.4" /></g>
      : <g stroke="#4E9BC4" strokeWidth="3" strokeLinecap="round"><path d="M30 55l-2 6M42 55l-2 6M54 55l-2 6" /></g>;
    body = (
      <>
        {sky === 'averses' && SUN}
        <path d="M22 52h40a12 12 0 0 0 0-24 16 16 0 0 0-30 4 10 10 0 0 0-10 20z" fill={sky === 'orage' ? '#C4D5DB' : '#FFFFFF'} />
        {FACE}
        {sky === 'orage' ? <path d="M46 50l-9 11h6l-3 7 12-13h-7l3-5z" fill="#F6C445" /> : drops}
      </>
    );
  }
  return <svg aria-hidden="true" viewBox="0 0 80 70" width={size} height={Math.round(size * 0.875)} className="shrink-0">{body}</svg>;
}
