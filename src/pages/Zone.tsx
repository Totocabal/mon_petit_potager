import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useDeleteZone, useUpdateZone } from '../lib/data';
import { BackHeader, Btn, Loading, Page, Sheet, Tile, useToast } from '../components/ui';
import { CellGrid, ClearArea, DropBadge, GroundActions, RangSheet, useCellSel, WaterButton } from '../components/garden';
import { SelectionPanel } from '../components/CellSelection';
import { BLOC, blocInfo, blocName, CELL_CM, isBig, isSol, isThirsty, meters, nf, occupancy, SPCOLOR, thirstyIn, zoneGround } from '../lib/garden';
import type { Zone } from '../lib/types';

export default function ZonePage() {
  const { zoneId } = useParams();
  const { zones, plantings, byId, garden, loading, rainFor } = useApp();
  const zone = zones.find(z => z.id === zoneId);
  const ps = useMemo(() => plantings.filter(p => p.zone_id === zoneId), [plantings, zoneId]);
  const grid = useMemo(() => (zone ? occupancy(zone, ps) : []), [zone, ps]);
  const ground = useMemo(() => (zone ? zoneGround(zone, ps, byId) : null), [zone, ps, byId]);
  const [rang, setRang] = useState<number | null>(null);
  const sel = useCellSel();
  const [rowPick, setRowPick] = useState(0);
  const [renaming, setRenaming] = useState(false);

  if (loading) return <Loading />;
  if (!zone) return <Page><BackHeader title="Zone introuvable" /></Page>;

  const used = ps.reduce((t, p) => t + p.w * p.h, 0), total = zone.cols * zone.rows;
  const rain = rainFor(zone.id);
  const thirsty = ps.filter(p => isThirsty(p, byId.get(p.species_id), rain)).length;
  const planted = ps.reduce((t, p) => t + (isSol(byId.get(p.species_id)) ? 0 : p.w * p.h), 0);
  const head = (
    <>
      <BackHeader kicker={garden.name + ' ›'} title={zone.name}
        right={<button onClick={() => setRenaming(true)} aria-label="Renommer la zone" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-vert shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13 7l4 4" /></svg>
        </button>} />
      <p className="text-sm font-bold text-gris">{meters(zone.cols * CELL_CM)} × {meters(zone.rows * CELL_CM)} · {nf(total)} cases · {Math.round((planted / total) * 100)} % planté{zone.sheltered ? ' · sous abri' : ''}{ground ? ' · ' + (ground === 'jachere' ? 'en jachère' : 'paillée') : ''}</p>
      {thirsty > 0 && <p className="flex items-center gap-2 text-sm font-extrabold text-eau"><span className="relative inline-block h-[18px] w-[18px]"><DropBadge className="!-right-0 !-top-0" /></span>{thirsty} {thirsty > 1 ? 'plantations à arroser' : 'plantation à arroser'}</p>}
    </>
  );

  if (!isBig(zone)) {
    return (
      <Page>
        {head}
        <p className="text-center text-[11px] font-extrabold tracking-wider text-gris">NORD</p>
        <CellGrid zone={zone} grid={grid} sel={sel} rowHeaders={zone.cols <= 8} selectedRow={rang} onRow={setRang} />
        <p className="-mt-2 text-[13px] text-gris">Appui long sur une case{zone.cols <= 8 ? ' ou sur un numéro de rang' : ''} : sélectionner plusieurs cases (glissez pour en ajouter).{zone.cols <= 8 ? ' Touchez un numéro de rang pour le remplir d’un coup.' : ''}</p>
        {zone.cols > 8 && <div className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
          <b>Remplir un rang d’un coup</b>
          <div className="flex gap-2">
            <label htmlFor="rang" className="sr-only">Rang</label>
            <select id="rang" value={rowPick} onChange={e => setRowPick(+e.target.value)} className="min-h-12 flex-1 rounded-2xl border-2 border-trait bg-white px-3 font-bold">
              {Array.from({ length: zone.rows }, (_, i) => <option key={i} value={i}>Rang {i + 1}</option>)}
            </select>
            <button onClick={() => setRang(rowPick)} className="min-h-12 rounded-2xl bg-vert px-4 font-titre font-semibold text-white">Choisir l’espèce</button>
          </div>
        </div>}
        <Link to={`/zones/${zone.id}/generer`} className="flex min-h-12 items-center justify-center rounded-[20px] bg-vert-doux px-4 font-titre text-[17px] font-semibold text-vert">Générer un plan automatique</Link>
        <SelectionPanel zone={zone} grid={grid} sel={sel} />
        {rang !== null && <RangSheet zone={zone} y={rang} x0={-1} onClose={() => setRang(null)} />}
        <GroundActions zone={zone} grid={grid} label={'la zone ' + zone.name} />
        <WaterButton plantings={ps} label={'la zone ' + zone.name} />
        <ClearArea zone={zone} grid={grid} label={'la zone ' + zone.name} />
        <DeleteZone zone={zone} plants={ps.length} />
        {renaming && <RenameZone zone={zone} onClose={() => setRenaming(false)} />}
      </Page>
    );
  }

  const bc = Math.ceil(zone.cols / BLOC), br = Math.ceil(zone.rows / BLOC);
  const tiles = [];
  for (let by = 0; by < br; by++) for (let bx = 0; bx < bc; bx++) {
    const b = blocInfo(zone, grid, bx, by, byId);
    const s = b.dom ? byId.get(b.dom) : null;
    const dry = thirstyIn(grid, bx * BLOC, (bx + 1) * BLOC, by * BLOC, (by + 1) * BLOC, byId, rain).length;
    tiles.push(
      <Link key={bx + '-' + by} to={`/zones/${zone.id}/blocs/${bx}/${by}`} aria-label={`Bloc ${blocName(bx, by)} : ${s ? s.name : 'libre'}${b.ready ? ', à récolter' : ''}${dry ? ', à arroser' : ''}`}
        className="relative aspect-square rounded-[4px]" style={{ background: s ? SPCOLOR[s.slug] : '#6A432C', boxShadow: b.ready ? 'inset 0 0 0 2px #F6C445' : 'none' }}>
        {s && b.free > 0 && <span className="absolute bottom-0 right-0 h-[40%] w-[40%] rounded-tl-[3px] bg-terre-libre" />}
        {dry > 0 && <DropBadge size={14} className="!-right-[3px] !-top-[3px]" />}
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
      <p className="text-[13px] text-gris">Touchez un bloc pour voir ses cases. Contour jaune : à récolter. Goutte bleue : à arroser. Coin brun : cases libres dans le bloc.</p>
      <GroundActions zone={zone} grid={grid} label={'la zone ' + zone.name} />
      <WaterButton plantings={ps} label={'la zone ' + zone.name} />
      <ClearArea zone={zone} grid={grid} label={'la zone ' + zone.name} />
      <DeleteZone zone={zone} plants={ps.length} />
      {renaming && <RenameZone zone={zone} onClose={() => setRenaming(false)} />}
    </Page>
  );
}

function RenameZone({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const update = useUpdateZone();
  const toast = useToast();
  const [name, setName] = useState(zone.name);
  const clean = name.trim();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!clean || clean === zone.name) return onClose();
    await update.mutateAsync({ z: zone, patch: { name: clean } });
    toast('Zone renommée : ' + clean);
    onClose();
  }

  return (
    <Sheet title="Renommer la zone" onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-3">
        <label htmlFor="zone-name" className="sr-only">Nom de la zone</label>
        <input id="zone-name" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={60} className="min-h-12 rounded-2xl border-2 border-trait bg-white px-4 text-base font-bold outline-none focus:border-vert" />
        <Btn type="submit" disabled={!clean || update.isPending}>{update.isPending ? 'Enregistrement…' : 'Enregistrer'}</Btn>
        {update.isError && <p className="text-sm font-bold text-alerte">{(update.error as Error).message}</p>}
      </form>
    </Sheet>
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
