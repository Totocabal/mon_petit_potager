import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useAddPlantings, useCutPlantings, useRemovePlantings, useWater } from '../lib/data';
import { BLOC, de, footprintText, freeRects, isMulti, isReady, isSol, lc, meters, nf, occupancy, plantingsIn, rangPlan, remainingPieces, SPTINT, toSegments, type Grid } from '../lib/garden';
import { cap, iso, today } from '../lib/dates';
import type { Planting, Species, Zone } from '../lib/types';
import { Btn, Note, Picto, Sheet, Tile, useToast } from './ui';

/** Bande horizontale d'espèces à choisir, celles de saison en premier. */
export function SpeciesStrip({ value, onChange, onlySingleCell = false }: { value: string | null; onChange: (id: string) => void; onlySingleCell?: boolean }) {
  const { species } = useApp();
  const m = today().getMonth() + 1;
  const list = useMemo(() => species
    .filter(s => !onlySingleCell || !isMulti(s))
    .slice()
    .sort((a, b) => Number(b.plant_out_months.includes(m) || b.sow_indoor_months.includes(m)) - Number(a.plant_out_months.includes(m) || a.sow_indoor_months.includes(m))), [species, m, onlySingleCell]);
  return (
    <div role="group" aria-label="Espèce" className="no-scrollbar -mr-5 flex gap-2 overflow-x-auto pb-1">
      {list.map(s => (
        <button key={s.id} type="button" aria-pressed={value === s.id} onClick={() => onChange(s.id)}
          className={`flex w-[76px] shrink-0 flex-col items-center gap-1 rounded-[18px] bg-fond px-1 py-1.5 text-xs font-extrabold ${value === s.id ? 'shadow-[inset_0_0_0_3px_#2E6B3F]' : ''}`}>
          <Tile slug={s.slug} w={56} h={44} size={38} round={12} />
          <span className="text-center leading-tight">{s.name}</span>
        </button>
      ))}
    </div>
  );
}

/** Grille de cases d'une petite zone (ou d'un bloc), cliquable. */
export function CellGrid({ zone, grid, x0 = 0, y0 = 0, x1, y1, rowHeaders = false, selectedRow, onRow }: {
  zone: Zone; grid: Grid; x0?: number; y0?: number; x1?: number; y1?: number; rowHeaders?: boolean; selectedRow?: number | null; onRow?: (y: number) => void;
}) {
  const { byId } = useApp();
  const xe = x1 ?? zone.cols, ye = y1 ?? zone.rows;
  const nCols = Math.max(xe - x0, rowHeaders ? BLOC : 0);
  const items: ReactNode[] = [];
  for (let y = y0; y < ye; y++) {
    const col = (x: number) => x - x0 + 1 + (rowHeaders ? 1 : 0);
    if (selectedRow === y) items.push(<span key={'on' + y} aria-hidden="true" className="pointer-events-none -m-0.5 rounded-2xl shadow-[0_0_0_3px_#F6C445]" style={{ gridRow: y - y0 + 1, gridColumn: '1 / -1' }} />);
    if (rowHeaders) {
      const on = selectedRow === y;
      items.push(
        <button key={'h' + y} onClick={() => onRow?.(y)} aria-label={`Remplir le rang ${y + 1}`} style={{ gridRow: y - y0 + 1, gridColumn: 1 }}
          className={`flex h-full min-h-12 w-11 shrink-0 flex-col items-center justify-center rounded-xl font-titre text-[15px] font-semibold leading-none ${on ? 'bg-soleil text-soleil-encre' : 'bg-white text-vert'}`}>
          <span className="font-corps text-[10px] font-extrabold">rang</span>{y + 1}
        </button>
      );
    }
    for (let x = x0; x < xe; x++) {
      const p = grid[y][x];
      const s = p ? byId.get(p.species_id) : null;
      const pos = { gridRow: y - y0 + 1, gridColumn: col(x) };
      if (p && s && isMulti(s)) {
        // Un plant sur plusieurs cases (2 × 1, 3 × 1, 2 × 2…) : une seule grande case à la place des petites
        const ux = p.x + Math.floor((x - p.x) / s.span_w) * s.span_w, uy = p.y + Math.floor((y - p.y) / s.span_h) * s.span_h;
        items.push(<span key={`g${x}-${y}`} aria-hidden="true" className="aspect-square min-w-0" style={pos} />);
        if (x === Math.max(ux, x0) && y === Math.max(uy, y0)) {
          const w = Math.min(ux + s.span_w, xe, p.x + p.w) - x, h = Math.min(uy + s.span_h, ye, p.y + p.h) - y;
          items.push(
            <Link key={`p${x}-${y}`} to={`/plantes/${p.id}`} aria-label={`${s.name}, rang ${uy + 1}, case ${ux + 1}, sur ${footprintText(s)} cases${isReady(p, s) ? ', prête à récolter' : ''}`}
              className={`relative z-10 min-h-0 min-w-0 overflow-hidden rounded-2xl bg-terre-case ${isReady(p, s) ? 'shadow-[inset_0_0_0_3px_#F6C445]' : ''}`}
              style={{ gridRow: `${y - y0 + 1} / span ${h}`, gridColumn: `${col(x)} / span ${w}` }}>
              <Picto slug={s.slug} size={64} className={`absolute inset-0 m-auto ${w >= h ? 'h-[78%] w-auto' : 'h-auto w-[78%]'}`} />
            </Link>
          );
        }
      } else if (p && s) {
        items.push(
          <Link key={`p${x}-${y}`} to={`/plantes/${p.id}`} aria-label={`${s.name}, rang ${y + 1}, case ${x + 1}${isReady(p, s) ? ', prête à récolter' : ''}`}
            className={`flex aspect-square min-w-0 items-center justify-center rounded-2xl ${isSol(s) ? '' : 'bg-terre-case'} ${isReady(p, s) ? 'shadow-[inset_0_0_0_3px_#F6C445]' : ''}`} style={isSol(s) ? { ...pos, background: SPTINT[s.slug] } : pos}>
            <Picto slug={s.slug} size={44} className="h-[72%] w-[72%]" />
          </Link>
        );
      } else {
        items.push(
          <Link key={`p${x}-${y}`} to={`/zones/${zone.id}/planter?x=${x}&y=${y}`} aria-label={`Planter rang ${y + 1}, case ${x + 1}`} style={pos}
            className="flex aspect-square min-w-0 items-center justify-center rounded-2xl border-2 border-dashed border-[#E9C9A6] bg-terre-libre text-[#F6E3CC]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </Link>
        );
      }
    }
  }
  return (
    <div className="rounded-[26px] bg-terre p-2.5 shadow-[inset_0_-6px_0_#A7724A]">
      <div className="grid gap-1.5 p-0.5" style={{ gridTemplateColumns: `${rowHeaders ? '2.75rem ' : ''}repeat(${nCols}, minmax(0, 1fr))` }}>{items}</div>
    </div>
  );
}

/** « J'ai arrosé » pour un ensemble de plantations : zone, bloc ou rang. */
export function WaterButton({ plantings, label, onDone }: { plantings: Planting[]; label: string; onDone?: () => void }) {
  const water = useWater();
  const toast = useToast();
  const { byId } = useApp();
  plantings = plantings.filter(p => !isSol(byId.get(p.species_id)));
  const n = plantings.length;
  if (!n) return null;
  async function go() {
    await water.mutateAsync(plantings);
    toast(`Arrosage noté : ${label}`);
    onDone?.();
  }
  return (
    <div className="flex flex-col gap-1.5">
      <Btn variant="eau" onClick={go} disabled={water.isPending}>{water.isPending ? 'Enregistrement…' : `J’ai arrosé ${label} · ${n} plantation${n > 1 ? 's' : ''}`}</Btn>
      {water.isError && <p className="text-sm font-bold text-alerte">{(water.error as Error).message}</p>}
    </div>
  );
}

/** Jachère, paillage ou remise en culture d'une zone ou d'un bloc : agit sur ses cases libres. */
export function GroundActions({ zone, grid, area, label }: { zone: Zone; grid: Grid; area?: { x0: number; x1: number; y0: number; y1: number }; label: string }) {
  const { species, garden } = useApp();
  const toast = useToast();
  const add = useAddPlantings();
  const remove = useRemovePlantings();
  const a = area ?? { x0: 0, x1: zone.cols, y0: 0, y1: zone.rows };
  const rects = freeRects(grid, a.x0, a.x1, a.y0, a.y1);
  const free = rects.reduce((t, r) => t + r.w * r.h, 0);
  const covers = plantingsIn(grid, a.x0, a.x1, a.y0, a.y1).filter(p => isSol(species.find(s => s.id === p.species_id)));
  const busy = add.isPending || remove.isPending;

  async function cover(slug: 'jachere' | 'paillage') {
    const s = species.find(x => x.slug === slug);
    if (!s || !free) return;
    await add.mutateAsync(rects.map(r => ({ garden_id: garden.id, zone_id: zone.id, species_id: s.id, ...r, sown_at: iso(today()) })));
    toast(`${cap(label)} : ${free} case${free > 1 ? 's' : ''} en ${lc(s.name)}`);
  }
  async function uncover() {
    await remove.mutateAsync(covers);
    toast(`${cap(label)} : remis en culture`);
  }

  if (!free && !covers.length) return null;
  return (
    <div className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
      <b>Sol de {label}</b>
      {free > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {(['jachere', 'paillage'] as const).map(slug => (
            <button key={slug} onClick={() => cover(slug)} disabled={busy} className="flex min-h-14 items-center gap-2 rounded-2xl bg-fond px-3 text-left font-extrabold">
              <Tile slug={slug} w={40} h={40} size={32} round={12} />{slug === 'jachere' ? 'Jachère' : 'Paillage'}
            </button>
          ))}
        </div>
      )}
      {free > 0 && <p className="text-[13px] text-gris">S'applique aux {free} case{free > 1 ? 's' : ''} libre{free > 1 ? 's' : ''} ; les plantes restent en place.</p>}
      {covers.length > 0 && <Btn variant="doux" onClick={uncover} disabled={busy}>Remettre en culture (retirer jachère et paillage)</Btn>}
      {(add.isError || remove.isError) && <p className="text-sm font-bold text-alerte">{((add.error ?? remove.error) as Error).message}</p>}
    </div>
  );
}

const unitOf = (s: Species | undefined) => ({ w: s?.span_w ?? 1, h: s?.span_h ?? 1 });

/** Retire d'un coup tout ce qui occupe une zone ou un bloc (plantes, jachère, paillage), avec confirmation. */
export function ClearArea({ zone, grid, area, label }: { zone: Zone; grid: Grid; area?: { x0: number; x1: number; y0: number; y1: number }; label: string }) {
  const { byId } = useApp();
  const toast = useToast();
  const cut = useCutPlantings();
  const [confirm, setConfirm] = useState(false);
  const a = area ?? { x0: 0, x1: zone.cols, y0: 0, y1: zone.rows };
  const ps = plantingsIn(grid, a.x0, a.x1, a.y0, a.y1);
  const busy = grid.slice(a.y0, a.y1).reduce((t, row) => t + row.slice(a.x0, a.x1).filter(Boolean).length, 0);
  if (!busy) return null;

  async function clearAll() {
    await cut.mutateAsync(ps.map(p => ({ p, keep: remainingPieces(p, a, unitOf(byId.get(p.species_id))) })));
    toast(`${cap(label)} vidé · ${busy} case${busy > 1 ? 's' : ''} libérée${busy > 1 ? 's' : ''}`);
    setConfirm(false);
  }

  return confirm ? (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-alerte-doux p-4 text-[#6B2418]">
      <p className="font-extrabold">Vider {label} ?</p>
      <p className="text-sm">Les plantes, la jachère et le paillage de {busy} case{busy > 1 ? 's' : ''} seront retirés. Les cases redeviennent libres.</p>
      <div className="flex gap-2"><Btn variant="danger" onClick={clearAll} disabled={cut.isPending}>{cut.isPending ? 'Suppression…' : 'Tout retirer'}</Btn><Btn variant="contour" onClick={() => setConfirm(false)}>Annuler</Btn></div>
      {cut.isError && <p className="text-sm font-bold">{(cut.error as Error).message}</p>}
    </div>
  ) : (
    <button onClick={() => setConfirm(true)} className="min-h-11 self-center font-extrabold text-alerte">Vider {label} · {busy} case{busy > 1 ? 's' : ''} occupée{busy > 1 ? 's' : ''}</button>
  );
}

/** Feuille « Remplir le rang » : sur un bloc ou toute la zone. */
export function RangSheet({ zone, y, x0, onClose }: { zone: Zone; y: number; x0: number; onClose: () => void }) {
  const { plantings, rels, byId, species, garden } = useApp();
  const toast = useToast();
  const add = useAddPlantings();
  const clear = useCutPlantings();
  const [confirmClear, setConfirmClear] = useState(false);
  const big = zone.cols > BLOC;
  const [scope, setScope] = useState<'bloc' | 'zone'>(big && x0 >= 0 ? 'bloc' : 'zone');
  const [sp, setSp] = useState<string | null>(() => species.find(s => s.slug === 'ail')?.id ?? species[0]?.id ?? null);
  const grid = useMemo(() => occupancy(zone, plantings.filter(p => p.zone_id === zone.id)), [zone, plantings]);
  const s: Species | undefined = sp ? byId.get(sp) : undefined;
  const xa = scope === 'bloc' ? x0 : 0, xb = scope === 'bloc' ? Math.min(zone.cols, x0 + BLOC) : zone.cols;
  const plan = s ? rangPlan(grid, y, xa, xb, s.id, rels) : null;
  const n = plan?.ok.length ?? 0;
  const msg: [ 'bon' | 'mauvais' | 'neutre', string ] = !plan ? ['neutre', 'Choisissez une espèce.']
    : !n ? ['mauvais', plan.busy === xb - xa ? 'Ce rang est déjà entièrement planté.' : 'Aucune case possible : mauvais voisinage avec ' + plan.bad.map(i => lc(byId.get(i)!.name)).join(', ') + '.']
    : plan.bad.length ? ['neutre', plan.badCells + ' case(s) sautée(s) : trop près de ' + plan.bad.map(i => lc(byId.get(i)!.name)).join(', ') + '.']
    : plan.good.length ? ['bon', 'Bon voisinage avec ' + plan.good.map(i => lc(byId.get(i)!.name)).join(', ') + '.']
    : ['neutre', plan.busy ? plan.busy + ' case(s) déjà plantée(s), laissée(s) telles quelles.' : 'Voisines neutres : rien à signaler.'];

  const inRow = [...new Set(grid[y].slice(xa, xb).filter((p): p is Planting => !!p))];
  const busy = grid[y].slice(xa, xb).filter(Boolean).length;

  async function clearRow() {
    await clear.mutateAsync(inRow.map(p => ({ p, keep: remainingPieces(p, { x0: xa, x1: xb, y0: y, y1: y + 1 }, unitOf(byId.get(p.species_id))) })));
    toast(`Rang ${y + 1} vidé · ${busy} case${busy > 1 ? 's' : ''} libérée${busy > 1 ? 's' : ''}`);
    onClose();
  }

  async function plant() {
    if (!s || !plan || !n) return;
    await add.mutateAsync(toSegments(plan.ok).map(seg => ({ garden_id: garden.id, zone_id: zone.id, species_id: s.id, x: seg.x, y, w: seg.w, h: 1, sown_at: iso(today()) })));
    toast(isSol(s) ? `Rang ${y + 1} : ${n} case${n > 1 ? 's' : ''} en ${lc(s.name)}` : `Rang ${y + 1} : ${n} cases ${de(lc(s.name))} · ${nf(n * s.plants_per_cell)} plants`);
    onClose();
  }

  return (
    <Sheet title={`Remplir le rang ${y + 1}`} onClose={onClose}>
      {big && x0 >= 0 && (
        <div className="flex gap-1.5 rounded-2xl bg-fond p-1">
          {(['bloc', 'zone'] as const).map(k => (
            <button key={k} aria-pressed={scope === k} onClick={() => setScope(k)} className={`min-h-10 flex-1 rounded-xl text-[13px] font-extrabold ${scope === k ? 'bg-vert text-white' : ''}`}>
              {k === 'bloc' ? `Ce bloc · ${Math.min(BLOC, zone.cols - x0)} cases` : `Toute la zone · ${zone.cols} cases`}
            </button>
          ))}
        </div>
      )}
      <WaterButton plantings={inRow} label={`le rang ${y + 1}`} onDone={onClose} />
      <SpeciesStrip value={sp} onChange={setSp} onlySingleCell />
      <Note tone={msg[0]}>{msg[1]}</Note>
      {s && (
        <div className="flex items-baseline justify-between">
          <b className="font-titre text-[19px] font-semibold">{isSol(s) ? `${n} case${n > 1 ? 's' : ''} en ${lc(s.name)}` : `${nf(n * s.plants_per_cell)} plants ${de(lc(s.name))}`}</b>
          <span className="text-[13px] font-bold text-gris">{n} case{n > 1 ? 's' : ''} · {meters(n * 30)}</span>
        </div>
      )}
      <Btn onClick={plant} disabled={!n || add.isPending}>{add.isPending ? 'Enregistrement…' : `${s && isSol(s) ? 'Couvrir' : 'Planter'} ${n} case${n > 1 ? 's' : ''}`}</Btn>
      {add.isError && <p className="text-sm font-bold text-alerte">{(add.error as Error).message}</p>}
      {busy > 0 && (confirmClear ? (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-alerte-doux p-4 text-[#6B2418]">
          <p className="font-extrabold">Retirer ce qui couvre {busy} case{busy > 1 ? 's' : ''} du rang {y + 1} ?</p>
          <div className="flex gap-2"><Btn variant="danger" onClick={clearRow} disabled={clear.isPending}>Vider le rang</Btn><Btn variant="contour" onClick={() => setConfirmClear(false)}>Annuler</Btn></div>
          {clear.isError && <p className="text-sm font-bold text-alerte">{(clear.error as Error).message}</p>}
        </div>
      ) : (
        <button onClick={() => setConfirmClear(true)} className="min-h-11 self-center font-extrabold text-alerte">Vider le rang · {busy} case{busy > 1 ? 's' : ''} occupée{busy > 1 ? 's' : ''}</button>
      ))}
    </Sheet>
  );
}
