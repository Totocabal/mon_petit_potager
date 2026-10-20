import { useMemo, useState } from 'react';
import { useApp } from '../lib/app';
import { useAddPlantings, useAddTasks, useCutPlantings, useWater } from '../lib/data';
import { BLOC, de, isPlanned, isSol, lc, nextPlantDate, nf, plannedTasksFor, rangPlan, remainingPieces, toSegments, varietyFields, type Grid } from '../lib/garden';
import { fmt, iso, parse, today } from '../lib/dates';
import { blockedCells } from '../lib/rotation';
import { buzz } from '../lib/native';
import type { Planting, Variety, Zone } from '../lib/types';
import { VarietyPicker } from './VarietyPicker';
import { Btn, Note, Sheet, useToast } from './ui';
import { SpeciesStrip, WaterSplash, unitOf, type CellSel } from './garden';

type Cell = { x: number; y: number; p: Planting | null };

/** Barre d'actions d'une sélection de cases (appui long dans la grille) : planter, arroser, vider. */
export function SelectionPanel({ zone, grid, sel, byBloc = false }: { zone: Zone; grid: Grid; sel: CellSel; byBloc?: boolean }) {
  const { byId } = useApp();
  const toast = useToast();
  const water = useWater();
  const [mode, setMode] = useState<'plant' | 'clear' | null>(null);
  const [splash, setSplash] = useState(false);

  const cells: Cell[] = useMemo(() => [...sel.cells].map(k => ({ x: k % zone.cols, y: Math.floor(k / zone.cols), p: grid[Math.floor(k / zone.cols)]?.[k % zone.cols] ?? null }))
    .filter(c => c.y < zone.rows).sort((a, b) => a.y - b.y || a.x - b.x), [sel.cells, zone, grid]);
  if (!cells.length) return null;
  const free = cells.filter(c => !c.p);
  const planted = cells.filter(c => c.p);
  const crops = [...new Set(planted.map(c => c.p!).filter(p => !isSol(byId.get(p.species_id)) && !isPlanned(p)))];
  const done = () => { sel.set(new Set()); setMode(null); };
  const n = cells.length;
  const blocs = byBloc ? new Set(cells.map(c => Math.floor(c.y / BLOC) * 1000 + Math.floor(c.x / BLOC))).size : 0;

  async function drink() {
    await water.mutateAsync(crops);
    void buzz();
    toast(`Arrosage noté · ${crops.length} plantation${crops.length > 1 ? 's' : ''}`);
    setSplash(true);
    window.setTimeout(() => setSplash(false), 1700);
    sel.set(new Set());
  }

  const btn = 'squish flex min-h-11 flex-1 items-center justify-center rounded-2xl px-2 text-[14px] font-extrabold disabled:opacity-40';
  return (
    <>
      {splash && <WaterSplash />}
      {mode === 'plant' && <PlantSheet zone={zone} grid={grid} free={free} onClose={() => setMode(null)} onDone={done} />}
      {mode === 'clear' && <ClearSheet zone={zone} cells={planted} onClose={() => setMode(null)} onDone={done} />}
      {!mode && (
        <div role="toolbar" aria-label="Cases sélectionnées" className="sheet-up fixed bottom-[calc(14px+env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[min(408px,calc(100%-24px))] -translate-x-1/2 flex-col gap-2 rounded-[26px] bg-encre p-3 text-white shadow-[0_10px_28px_rgba(0,0,0,.3)] lg:left-[calc(50%+142px)]">
          <div className="flex items-center justify-between gap-2 px-1">
            <b className="font-titre text-[17px] font-semibold">{byBloc ? `${blocs} bloc${blocs > 1 ? 's' : ''} · ${n} cases` : `${n} case${n > 1 ? 's' : ''} sélectionnée${n > 1 ? 's' : ''}`}</b>
            <button onClick={() => sel.set(new Set())} className="min-h-11 px-2 text-[14px] font-extrabold text-white/80">Annuler</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode('plant')} disabled={!free.length} className={`${btn} bg-vert text-white`}>Planter · {free.length}</button>
            <button onClick={drink} disabled={!crops.length || water.isPending} className={`${btn} bg-eau text-white`}>Arroser · {crops.length}</button>
            <button onClick={() => setMode('clear')} disabled={!planted.length} className={`${btn} bg-alerte-doux text-[#6B2418]`}>Vider · {planted.length}</button>
          </div>
          {water.isError && <p className="px-1 text-sm font-bold text-alerte-doux">{(water.error as Error).message}</p>}
        </div>
      )}
    </>
  );
}

function PlantSheet({ zone, grid, free, onClose, onDone }: { zone: Zone; grid: Grid; free: Cell[]; onClose: () => void; onDone: () => void }) {
  const { rels, byId, species, garden, history } = useApp();
  const toast = useToast();
  const add = useAddPlantings();
  const addTasks = useAddTasks(garden.id);
  const [sp, setSpRaw] = useState<string | null>(() => species.find(s => s.slug === 'ail')?.id ?? species[0]?.id ?? null);
  const [variety, setVariety] = useState<Variety | null>(null);
  const [planned, setPlanned] = useState(false);
  const [date, setDate] = useState(() => {
    const first = species.find(s => s.slug === 'ail') ?? species[0];
    return first ? iso(nextPlantDate(first)) : iso(today());
  });
  const setSp = (id: string) => {
    setSpRaw(id);
    setVariety(null);
    const chosen = byId.get(id);
    if (chosen && !isSol(chosen) && planned) setDate(iso(nextPlantDate(chosen)));
  };
  const [ignoreRot, setIgnoreRot] = useState(false);
  const s = sp ? byId.get(sp) : undefined;
  const blocked = useMemo(() => (s ? blockedCells(history, byId, zone, s) : new Set<number>()), [s, history, byId, zone]);

  const plan = useMemo(() => {
    const byRow = new Map<number, number[]>();
    free.forEach(c => byRow.set(c.y, [...(byRow.get(c.y) ?? []), c.x]));
    const ok = new Map<number, number[]>();
    let count = 0, bad = 0, rot = 0;
    const badNames = new Set<string>();
    if (s) for (const [y, xs] of byRow) {
      const rp = rangPlan(grid, y, 0, zone.cols, s.id, rels);
      const okSet = new Set(rp.ok);
      rp.bad.forEach(i => badNames.add(i));
      const keep: number[] = [];
      for (const x of xs) {
        if (!okSet.has(x)) bad++;
        else if (!ignoreRot && blocked.has(y * zone.cols + x)) rot++;
        else keep.push(x);
      }
      if (keep.length) { ok.set(y, keep); count += keep.length; }
    }
    return { ok, count, bad, rot, badNames: [...badNames] };
  }, [free, s, grid, zone, rels, blocked, ignoreRot]);

  const isFuture = !isSol(s) && (planned || date > iso(today())) && planned;
  const tasks = s && !isSol(s) && isFuture ? plannedTasksFor({ species: s, variety, zoneId: zone.id, plantDate: parse(date) }) : [];
  const busy = add.isPending || addTasks.isPending;

  async function plant() {
    if (!s || !plan.count) return;
    const sown = isFuture ? date : iso(today());
    const rows = [...plan.ok].flatMap(([y, xs]) => toSegments(xs).map(seg => ({ garden_id: garden.id, zone_id: zone.id, species_id: s.id, x: seg.x, y, w: seg.w, h: 1, sown_at: sown, ...varietyFields(variety) })));
    const added = await add.mutateAsync(rows);
    if (tasks.length > 0) {
      await addTasks.mutateAsync(tasks.map(t => ({ ...t, planting_id: added.length === 1 ? added[0].id : null })));
    }
    void buzz();
    toast(isSol(s) ? `${plan.count} case${plan.count > 1 ? 's' : ''} en ${lc(s.name)}` : isFuture ? `${plan.count} case${plan.count > 1 ? 's' : ''} ${de(lc(s.name))} prévues · ${tasks.length} tâches ajoutées` : `${plan.count} case${plan.count > 1 ? 's' : ''} ${de(lc(s.name))} · ${nf(plan.count * s.plants_per_cell)} plants`);
    onDone();
  }

  const msg: ['bon' | 'mauvais' | 'neutre', string] = !s ? ['neutre', 'Choisissez une espèce.']
    : !plan.count ? ['mauvais', plan.bad ? 'Aucune case possible : mauvais voisinage avec ' + plan.badNames.map(i => lc(byId.get(i)!.name)).join(', ') + '.' : 'Aucune case : la rotation des cultures les évite. Cochez la case ci-dessous pour planter quand même.']
    : plan.bad ? ['neutre', plan.bad + ' case(s) sautée(s) : trop près de ' + plan.badNames.map(i => lc(byId.get(i)!.name)).join(', ') + '.']
    : ['neutre', free.length + ' case(s) libre(s) sélectionnée(s).'];

  return (
    <Sheet title={`Planter ${free.length} case${free.length > 1 ? 's' : ''}`} onClose={onClose}>
      <SpeciesStrip value={sp} onChange={setSp} onlySingleCell />
      {s && !isSol(s) && (
        <>
          <div role="group" aria-label="État de la plantation" className="grid grid-cols-2 gap-1.5 rounded-2xl bg-fond p-1">
            <button type="button" aria-pressed={!planned} onClick={() => setPlanned(false)} className={`min-h-11 rounded-xl px-2 text-[13px] font-extrabold ${!planned ? 'bg-vert text-white' : 'text-encre'}`}>Déjà en place</button>
            <button type="button" aria-pressed={planned} onClick={() => { setPlanned(true); if (date <= iso(today())) setDate(iso(nextPlantDate(s))); }} className={`min-h-11 rounded-xl px-2 text-[13px] font-extrabold ${planned ? 'bg-vert text-white' : 'text-encre'}`}>Pas encore plantée</button>
          </div>
          {planned && (
            <label className="flex flex-col gap-1 text-sm font-extrabold">Plantation ou semis prévu le
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="min-h-11 rounded-2xl border-2 border-trait bg-white px-3 font-bold" />
            </label>
          )}
          <VarietyPicker speciesId={s.id} value={variety?.id ?? null} onChange={setVariety} />
          {isFuture && tasks.length > 0 && (
            <div className="flex flex-col gap-1 rounded-2xl bg-vert-doux px-3.5 py-2.5 text-[13px] text-encre">
              <b className="font-extrabold text-vert">{tasks.length} tâches ajoutées automatiquement :</b>
              <p className="text-xs leading-snug text-gris">{tasks.map(t => `${fmt(parse(t.due_date))} (${t.title.split(' : ')[0]})`).join(' · ')}</p>
            </div>
          )}
        </>
      )}
      <Note tone={msg[0]}>{msg[1]}</Note>
      {plan.rot > 0 && (
        <label className="flex items-start gap-2.5 rounded-2xl bg-[#F3EDE1] px-3 py-2.5 text-[13px] font-bold text-soleil-encre">
          <input type="checkbox" checked={ignoreRot} onChange={e => setIgnoreRot(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#2E6B3F]" />
          <span>Rotation des cultures : {plan.rot} case{plan.rot > 1 ? 's' : ''} où la même famille a été cultivée récemment {plan.rot > 1 ? 'sont sautées' : 'est sautée'}. <u>Ignorer la rotation</u></span>
        </label>
      )}
      <Btn onClick={plant} disabled={!plan.count || busy}>{busy ? 'Enregistrement…' : `${s && isSol(s) ? 'Couvrir' : isFuture ? 'Prévoir sur' : 'Planter'} ${plan.count} case${plan.count > 1 ? 's' : ''}`}</Btn>
      {(add.isError || addTasks.isError) && <p className="text-sm font-bold text-alerte">{((add.error ?? addTasks.error) as Error).message}</p>}
    </Sheet>
  );
}

function ClearSheet({ zone, cells, onClose, onDone }: { zone: Zone; cells: Cell[]; onClose: () => void; onDone: () => void }) {
  const { byId } = useApp();
  const toast = useToast();
  const cut = useCutPlantings();

  async function clear() {
    // Chaque plantation touchée perd les cases choisies (par segments de rang) ; ce qui reste est conservé
    const byPlanting = new Map<Planting, Map<number, number[]>>();
    cells.forEach(c => { const m = byPlanting.get(c.p!) ?? new Map<number, number[]>(); m.set(c.y, [...(m.get(c.y) ?? []), c.x]); byPlanting.set(c.p!, m); });
    const cuts = [...byPlanting].map(([p, rows]) => {
      let keep = [{ x: p.x, y: p.y, w: p.w, h: p.h }];
      const unit = unitOf(byId.get(p.species_id));
      for (const [y, xs] of rows) for (const seg of toSegments(xs.sort((a, b) => a - b))) keep = keep.flatMap(q => remainingPieces(q, { x0: seg.x, x1: seg.x + seg.w, y0: y, y1: y + 1 }, unit));
      return { p, keep };
    });
    await cut.mutateAsync(cuts);
    void buzz();
    toast(`${cells.length} case${cells.length > 1 ? 's' : ''} libérée${cells.length > 1 ? 's' : ''}`);
    onDone();
  }

  return (
    <Sheet title="Vider la sélection" onClose={onClose}>
      <div className="flex flex-col gap-2.5 rounded-[20px] bg-alerte-doux p-4 text-[#6B2418]">
        <p className="font-extrabold">Retirer ce qui couvre {cells.length} case{cells.length > 1 ? 's' : ''} de {zone.name} ?</p>
        <div className="flex gap-2"><Btn variant="danger" onClick={clear} disabled={cut.isPending}>Vider</Btn><Btn variant="contour" onClick={onClose}>Annuler</Btn></div>
        {cut.isError && <p className="text-sm font-bold text-alerte">{(cut.error as Error).message}</p>}
      </div>
    </Sheet>
  );
}

