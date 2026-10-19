import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BLOC, blocInfo, blocName, SPCOLOR, type Grid } from '../lib/garden';
import type { Zone } from '../lib/types';

const MAX_PX = 68;

/** Plan réduit de la parcelle : un carreau par bloc, coloré par sa plante dominante ; le bloc affiché est cerclé. Chaque carreau ouvre son bloc. */
export function ZoneMiniMap({ zone, grid, bx, by }: { zone: Zone; grid: Grid; bx: number; by: number }) {
  const { byId } = useApp();
  const bc = Math.ceil(zone.cols / BLOC), br = Math.ceil(zone.rows / BLOC);
  if (bc * br < 2) return null;
  const w = bc >= br ? MAX_PX : Math.round((MAX_PX * bc) / br), h = bc >= br ? Math.round((MAX_PX * br) / bc) : MAX_PX;
  const tiles = [];
  for (let y = 0; y < br; y++) for (let x = 0; x < bc; x++) {
    const info = blocInfo(zone, grid, x, y, byId);
    const s = info.dom ? byId.get(info.dom) : null;
    const here = x === bx && y === by;
    tiles.push(
      <Link key={x + '-' + y} to={`/zones/${zone.id}/blocs/${x}/${y}`} replace aria-label={`Bloc ${blocName(x, y)}${s ? ' : ' + s.name : ' : libre'}`} aria-current={here ? 'page' : undefined}
        className="rounded-[2px]" style={{ background: s ? SPCOLOR[s.slug] : '#6A432C', ...(here ? { position: 'relative', zIndex: 1, boxShadow: '0 0 0 1.5px #FFFFFF, 0 0 0 3px #23402B' } : {}) }} />
    );
  }
  return (
    <nav aria-label="Où je suis dans la parcelle" className="shrink-0 rounded-xl bg-terre p-1.5 shadow-[inset_0_-3px_0_#A7724A]">
      <div className="grid gap-[2px]" style={{ width: w, height: h, gridTemplateColumns: `repeat(${bc}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${br}, minmax(0, 1fr))` }}>{tiles}</div>
    </nav>
  );
}
