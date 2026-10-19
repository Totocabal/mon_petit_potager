import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BackHeader, Loading, Page } from '../components/ui';
import { CellGrid, ClearArea, GroundActions, RangSheet, WaterButton } from '../components/garden';
import { BLOC, blocName, meters, occupancy, plantingsIn, range } from '../lib/garden';

export default function BlocPage() {
  const params = useParams();
  const bx = Number(params.bx), by = Number(params.by);
  const { zones, plantings, loading } = useApp();
  const zone = zones.find(z => z.id === params.zoneId);
  const grid = useMemo(() => (zone ? occupancy(zone, plantings.filter(p => p.zone_id === zone.id)) : []), [zone, plantings]);
  const [rang, setRang] = useState<number | null>(null);

  if (loading) return <Loading />;
  if (!zone) return <Page><BackHeader title="Bloc introuvable" /></Page>;

  const bc = Math.ceil(zone.cols / BLOC), br = Math.ceil(zone.rows / BLOC);
  const x0 = bx * BLOC, x1 = Math.min(zone.cols, x0 + BLOC), y0 = by * BLOC, y1 = Math.min(zone.rows, y0 + BLOC);
  const nav = (dx: number, dy: number, label: string, ch: string) => {
    const nx = bx + dx, ny = by + dy, ok = nx >= 0 && ny >= 0 && nx < bc && ny < br;
    return ok
      ? <Link aria-label={label} to={`/zones/${zone.id}/blocs/${nx}/${ny}`} replace className="flex h-[30px] w-9 items-center justify-center rounded-[10px] bg-white font-extrabold text-vert">{ch}</Link>
      : <span aria-hidden="true" className="flex h-[30px] w-9 items-center justify-center rounded-[10px] bg-white font-extrabold text-vert opacity-30">{ch}</span>;
  };

  return (
    <Page>
      <BackHeader kicker={zone.name + ' ›'} title={'Bloc ' + blocName(bx, by)}
        right={<div className="grid grid-cols-2 gap-1">{nav(0, -1, 'Bloc au nord', '↑')}{nav(1, 0, 'Bloc à l’est', '→')}{nav(-1, 0, 'Bloc à l’ouest', '←')}{nav(0, 1, 'Bloc au sud', '↓')}</div>} />
      <p className="text-sm font-bold text-gris">Rangs {range(y0 + 1, y1)} · cases {range(x0 + 1, x1)} · {meters((x1 - x0) * 30)} × {meters((y1 - y0) * 30)}</p>
      <CellGrid zone={zone} grid={grid} x0={x0} x1={x1} y0={y0} y1={y1} rowHeaders selectedRow={rang} onRow={setRang} />
      <p className="text-[13px] text-gris">Touchez le numéro d’un rang pour le remplir d’un coup, ou une case libre pour y planter.</p>
      <GroundActions zone={zone} grid={grid} area={{ x0, x1, y0, y1 }} label={'le bloc ' + blocName(bx, by)} />
      <WaterButton plantings={plantingsIn(grid, x0, x1, y0, y1)} label={'le bloc ' + blocName(bx, by)} />
      <ClearArea zone={zone} grid={grid} area={{ x0, x1, y0, y1 }} label={'le bloc ' + blocName(bx, by)} />
      <Link to={`/zones/${zone.id}/generer?x=${x0}&y=${y0}&w=${x1 - x0}&h=${y1 - y0}`} className="flex min-h-12 items-center justify-center rounded-[20px] bg-vert-doux px-4 font-titre text-[17px] font-semibold text-vert">Générer un plan pour ce bloc</Link>
      {rang !== null && <RangSheet key={rang} zone={zone} y={rang} x0={x0} onClose={() => setRang(null)} />}
    </Page>
  );
}
