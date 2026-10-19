import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BLOC, blocInfo, blocName, SPCOLOR, thirstyIn, type Grid } from '../lib/garden';
import type { Planting, Zone } from '../lib/types';
import { DropBadge } from './garden';

/**
 * Plan d'une grande zone, case par case : chaque plantation est un bloc de couleur cerclé de blanc (deux plantations voisines de même
 * espèce restent distinctes), le quadrillage pointillé montre les blocs de 5 × 5 cases, et chaque bloc, nommé (A1, B2…), ouvre sa page.
 */
export function BigZoneMap({ zone, grid, plantings }: { zone: Zone; grid: Grid; plantings: Planting[] }) {
  const { byId, rainFor } = useApp();
  const rain = rainFor(zone.id);
  const bc = Math.ceil(zone.cols / BLOC), br = Math.ceil(zone.rows / BLOC);
  const lines: number[][] = [];
  for (let x = BLOC; x < zone.cols; x += BLOC) lines.push([x, 0, x, zone.rows]);
  for (let y = BLOC; y < zone.rows; y += BLOC) lines.push([0, y, zone.cols, y]);
  const links = [];
  for (let by = 0; by < br; by++) for (let bx = 0; bx < bc; bx++) {
    const b = blocInfo(zone, grid, bx, by, byId);
    const s = b.dom ? byId.get(b.dom) : null;
    const x0 = bx * BLOC, y0 = by * BLOC, w = Math.min(BLOC, zone.cols - x0), h = Math.min(BLOC, zone.rows - y0);
    const dry = thirstyIn(grid, x0, x0 + w, y0, y0 + h, byId, rain).length;
    links.push(
      <Link key={bx + '-' + by} to={`/zones/${zone.id}/blocs/${bx}/${by}`} aria-label={`Bloc ${blocName(bx, by)} : ${s ? s.name : 'libre'}${b.ready ? ', à récolter' : ''}${dry ? ', à arroser' : ''}`}
        className="squish absolute rounded-[3px]"
        style={{ left: `${(x0 / zone.cols) * 100}%`, top: `${(y0 / zone.rows) * 100}%`, width: `${(w / zone.cols) * 100}%`, height: `${(h / zone.rows) * 100}%`, boxShadow: b.ready ? 'inset 0 0 0 3px #F6C445' : 'none' }}>
        <span className="absolute left-1 top-0.5 text-[10px] font-extrabold leading-none text-white [text-shadow:0_1px_2px_rgba(0,0,0,.7)]">{blocName(bx, by)}</span>
        {dry > 0 && <DropBadge size={14} className="!-right-[3px] !-top-[3px]" />}
      </Link>
    );
  }
  return (
    <div className="rounded-[22px] bg-terre p-2 shadow-[inset_0_-5px_0_#A7724A]">
      <div className="relative overflow-visible rounded-[10px] bg-terre-libre" style={{ aspectRatio: `${zone.cols} / ${zone.rows}` }}>
        <svg aria-hidden="true" viewBox={`0 0 ${zone.cols} ${zone.rows}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-hidden rounded-[10px]">
          {plantings.map(p => {
            const s = byId.get(p.species_id);
            return <rect key={p.id} x={p.x} y={p.y} width={p.w} height={p.h} fill={(s && SPCOLOR[s.slug]) || '#8CC66B'} stroke="#FFFFFF" strokeWidth={2} vectorEffect="non-scaling-stroke" />;
          })}
          {lines.map((l, i) => <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="#23402B" strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />)}
        </svg>
        {links}
      </div>
    </div>
  );
}
