import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useDeleteZone } from '../lib/data';
import { BackHeader, Btn, Loading, Page, Tile, useToast } from '../components/ui';
import { CellGrid, RangSheet } from '../components/garden';
import { BLOC, blocInfo, blocName, CELL_CM, isBig, meters, nf, occupancy, SPCOLOR } from '../lib/garden';
import type { Zone } from '../lib/types';

export default function ZonePage() {
  const { zoneId } = useParams();
  const { zones, plantings, byId, garden, loading } = useApp();
  const zone = zones.find(z => z.id === zoneId);
  const ps = useMemo(() => plantings.filter(p => p.zone_id === zoneId), [plantings, zoneId]);
  const grid = useMemo(() => (zone ? occupancy(zone, ps) : []), [zone, ps]);
  const [rang, setRang] = useState<number | null>(null);
  const [rowPick, setRowPick] = useState(0);

  if (loading) return <Loading />;
  if (!zone) return <Page><BackHeader title="Zone introuvable" /></Page>;

  const used = ps.reduce((t, p) => t + p.w * p.h, 0), total = zone.cols * zone.rows;
  const head = (
    <>
      <BackHeader kicker={garden.name + ' ›'} title={zone.name} />
      <p className="text-sm font-bold text-gris">{meters(zone.cols * CELL_CM)} × {meters(zone.rows * CELL_CM)} · {nf(total)} cases · {Math.round((used / total) * 100)} % planté{zone.sheltered ? ' · sous abri' : ''}</p>
    </>
  );

  if (!isBig(zone)) {
    return (
      <Page>
        {head}
        <p className="text-center text-[11px] font-extrabold tracking-wider text-gris">NORD</p>
        <CellGrid zone={zone} grid={grid} />
        <div className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
          <b>Remplir un rang d’un coup</b>
          <div className="flex gap-2">
            <label htmlFor="rang" className="sr-only">Rang</label>
            <select id="rang" value={rowPick} onChange={e => setRowPick(+e.target.value)} className="min-h-12 flex-1 rounded-2xl border-2 border-trait bg-white px-3 font-bold">
              {Array.from({ length: zone.rows }, (_, i) => <option key={i} value={i}>Rang {i + 1}</option>)}
            </select>
            <button onClick={() => setRang(rowPick)} className="min-h-12 rounded-2xl bg-vert px-4 font-titre font-semibold text-white">Choisir l’espèce</button>
          </div>
        </div>
        <Link to={`/zones/${zone.id}/generer`} className="flex min-h-12 items-center justify-center rounded-[20px] bg-vert-doux px-4 font-titre text-[17px] font-semibold text-vert">Générer un plan automatique</Link>
        {rang !== null && <RangSheet zone={zone} y={rang} x0={-1} onClose={() => setRang(null)} />}
        <DeleteZone zone={zone} plants={ps.length} />
      </Page>
    );
  }

  const bc = Math.ceil(zone.cols / BLOC), br = Math.ceil(zone.rows / BLOC);
  const tiles = [];
  for (let by = 0; by < br; by++) for (let bx = 0; bx < bc; bx++) {
    const b = blocInfo(zone, grid, bx, by, byId);
    const s = b.dom ? byId.get(b.dom) : null;
    tiles.push(
      <Link key={bx + '-' + by} to={`/zones/${zone.id}/blocs/${bx}/${by}`} aria-label={`Bloc ${blocName(bx, by)} : ${s ? s.name : 'libre'}${b.ready ? ', à récolter' : ''}`}
        className="relative aspect-square rounded-[4px]" style={{ background: s ? SPCOLOR[s.slug] : '#6A432C', boxShadow: b.ready ? 'inset 0 0 0 2px #F6C445' : 'none' }}>
        {s && b.free > 0 && <span className="absolute bottom-0 right-0 h-[40%] w-[40%] rounded-tl-[3px] bg-terre-libre" />}
      </Link>
    );
  }
  const counts = new Map<string, number>();
  ps.forEach(p => counts.set(p.species_id, (counts.get(p.species_id) ?? 0) + p.w * p.h));
  return (
    <Page>
      {head}
      <div className="flex items-baseline justify-between text-xs"><span className="font-extrabold tracking-wider text-gris">NORD</span><span className="font-bold">1 carreau = 1 bloc de 5 × 5 cases (1,5 m)</span></div>
      <div className="rounded-[22px] bg-terre p-2 shadow-[inset_0_-5px_0_#A7724A]">
        <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${bc}, minmax(0, 1fr))` }}>{tiles}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id, n]) => {
          const s = byId.get(id)!;
          return <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-bold"><Tile slug={s.slug} w={26} h={26} size={22} round={999} />{s.name} · {nf(n)}</span>;
        })}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-2 pr-3 text-sm font-bold"><span className="h-4 w-4 rounded bg-terre-libre" />Libre · {nf(total - used)}</span>
      </div>
      <p className="text-[13px] text-gris">Touchez un bloc pour voir ses cases. Contour jaune : à récolter. Coin brun : cases libres dans le bloc.</p>
      <DeleteZone zone={zone} plants={ps.length} />
    </Page>
  );
}

function DeleteZone({ zone, plants }: { zone: Zone; plants: number }) {
  const del = useDeleteZone();
  const nav = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);

  async function onDelete() {
    await del.mutateAsync(zone);
    toast(`Zone supprimée : ${zone.name}`);
    nav('/potager', { replace: true });
  }

  return confirm ? (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-alerte-doux p-4 text-[#6B2418]">
      <p className="font-extrabold">Supprimer la zone « {zone.name} » ?</p>
      <p className="text-sm">{plants ? `Ses ${plants} plantation${plants > 1 ? 's' : ''} et ses tâches seront aussi supprimées.` : 'Ses tâches seront aussi supprimées.'} Impossible de revenir en arrière.</p>
      <div className="flex gap-2"><Btn variant="danger" onClick={onDelete} disabled={del.isPending}>Supprimer</Btn><Btn variant="contour" onClick={() => setConfirm(false)}>Annuler</Btn></div>
    </div>
  ) : (
    <button onClick={() => setConfirm(true)} className="min-h-11 self-center font-extrabold text-alerte">Supprimer la zone</button>
  );
}
