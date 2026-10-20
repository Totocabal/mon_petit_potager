import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useAddPlantings, useAddTasks } from '../lib/data';
import { BackHeader, Btn, Note, Page, Sheet, Tile, useToast } from '../components/ui';
import { rotationHits, rotationMessage } from '../lib/rotation';
import { footprintText, inSeason, isMulti, isSol, lc, neighbors, nextPlantDate, nf, occupancy, plannedTasksFor, spacingWarning, tooClose, varietyFields } from '../lib/garden';
import { VarietyPicker } from '../components/VarietyPicker';
import type { Variety } from '../lib/types';
import { fmt, iso, MOIS, monthsText, parse, today } from '../lib/dates';

export default function AddPlant() {
  const { zoneId } = useParams();
  const [sp] = useSearchParams();
  const x = Number(sp.get('x') ?? 0), y = Number(sp.get('y') ?? 0);
  const { zones, plantings, species, byId, bySlug, rels, garden, history } = useApp();
  const zone = zones.find(z => z.id === zoneId);
  const grid = useMemo(() => (zone ? occupancy(zone, plantings.filter(p => p.zone_id === zone.id)) : []), [zone, plantings]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'saison' | 'toutes'>('saison');
  const [pick, setPickRaw] = useState<string | null>(() => bySlug.get(sp.get('espece') ?? '')?.id ?? null);
  const [variety, setVariety] = useState<Variety | null>(null);
  const [planned, setPlanned] = useState(false);
  const [date, setDate] = useState(iso(today()));
  const add = useAddPlantings();
  const addTasks = useAddTasks(garden.id);
  const nav = useNavigate();
  const toast = useToast();
  const m = today().getMonth() + 1;

  const setPick = (id: string | null) => {
    setPickRaw(id);
    setVariety(null);
    const chosen = id ? byId.get(id) : undefined;
    if (chosen && !isSol(chosen) && !inSeason(chosen, m)) {
      setPlanned(true);
      setDate(iso(nextPlantDate(chosen)));
    } else {
      setPlanned(false);
      setDate(iso(today()));
    }
  };

  if (!zone) return <Page><BackHeader title="Zone introuvable" /></Page>;

  const list = species.filter(s => (q ? s.name.toLowerCase().includes(q.toLowerCase()) : filter === 'toutes' || isSol(s) || inSeason(s, m)));
  const s = pick ? byId.get(pick) : undefined;
  const sw = s?.span_w ?? 1, sh = s?.span_h ?? 1;
  const fits = !!s && x + sw <= zone.cols && y + sh <= zone.rows && (() => { for (let dy = 0; dy < sh; dy++) for (let dx = 0; dx < sw; dx++) if (grid[y + dy][x + dx]) return false; return true; })();
  const nb = s ? neighbors(grid, { x, y, w: sw, h: sh }, s.id, rels) : { good: [], bad: [] };
  const close = s && fits ? tooClose(grid, { x, y, w: sw, h: sh }, s, byId) : new Map<string, { gap: number; need: number }>();
  const rotation = s && fits ? rotationMessage(s, rotationHits(history, byId, zone.id, { x, y, w: sw, h: sh }, s)) : '';
  const dist: string[] = [];
  const tight = s ? spacingWarning(s) : null;
  if (tight) dist.push(tight);
  close.forEach((v, id) => dist.push(`Trop près de ${lc(byId.get(id)!.name)} : ${v.gap} cm entre les plants, on recommande ${v.need} cm.`));
  const check: ['bon' | 'mauvais' | 'neutre', string] = !s ? ['neutre', '']
    : !fits ? ['mauvais', `${s.name} prend ${footprintText(s)} cases : pas assez de place à partir de cette case.`]
    : nb.bad.length ? ['mauvais', 'Mauvais voisinage avec ' + nb.bad.map(i => lc(byId.get(i)!.name)).join(', ') + '. Choisissez une autre case.']
    : nb.good.length ? ['bon', 'Bon voisinage : ' + nb.good.map(i => lc(byId.get(i)!.name)).join(', ') + '.']
    : ['neutre', 'Voisines neutres : rien à signaler.'];

  const isFuture = planned || date > iso(today());
  const tasks = s && !isSol(s) && isFuture ? plannedTasksFor({ species: s, variety, zoneId: zone.id, plantDate: parse(date) }) : [];
  const busy = add.isPending || addTasks.isPending;

  async function plant() {
    if (!s) return;
    const added = await add.mutateAsync([{ garden_id: garden.id, zone_id: zone!.id, species_id: s.id, x, y, w: sw, h: sh, sown_at: date, ...varietyFields(variety) }]);
    if (tasks.length > 0) {
      await addTasks.mutateAsync(tasks.map(t => ({ ...t, planting_id: added[0]?.id ?? null })));
    }
    toast(isSol(s) ? `${s.name} · rang ${y + 1}, case ${x + 1}` : isFuture ? `${s.name} prévue · ${tasks.length} tâches ajoutées` : `${s.name} plantée · rang ${y + 1}, case ${x + 1}`);
    nav(-1);
  }

  return (
    <Page>
      <BackHeader kicker={zone.name} title="Ajouter une plante" />
      <p className="-mt-2 text-sm font-bold text-gris">Rang {y + 1}, case {x + 1}</p>
      <label className="flex min-h-[50px] items-center gap-2.5 rounded-2xl bg-white px-3.5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#55625A" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
        <span className="sr-only">Rechercher une plante</span>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={`Rechercher parmi ${species.length} plantes`} className="min-w-0 flex-1 bg-transparent text-base outline-none" />
      </label>
      <div role="group" aria-label="Filtrer" className="flex gap-2">
        {([['saison', `À planter en ${MOIS[m - 1]}`], ['toutes', 'Toutes']] as const).map(([v, label]) =>
          <button key={v} aria-pressed={filter === v} onClick={() => { setFilter(v); setQ(''); }} className={`min-h-9 rounded-full px-3.5 text-[13px] font-extrabold ${filter === v ? 'bg-vert text-white' : 'bg-white'}`}>{label}</button>)}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {list.map(sp => (
          <button key={sp.id} aria-pressed={pick === sp.id} onClick={() => setPick(sp.id)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] bg-white px-1.5 py-2 ${pick === sp.id ? 'shadow-[inset_0_0_0_3px_#2E6B3F]' : ''}`}>
            <Tile slug={sp.slug} w={72} h={58} size={50} />
            <b className="text-center text-sm font-extrabold leading-tight">{sp.name}</b>
            <span className="text-xs text-gris">{isSol(sp) ? 'Sol' : isMulti(sp) ? footprintText(sp) + ' cases' : sp.plants_per_cell + ' par case'}</span>
          </button>
        ))}
        {!list.length && <p className="col-span-3 text-gris">Aucune plante ne correspond. Essayez « Toutes ».</p>}
      </div>
      {s && (
        <Sheet title={s.name} onClose={() => setPick(null)}>
          {isSol(s) ? <p className="text-sm font-bold text-gris">{s.notes}</p> : (
          <>
          <p className="text-sm">Semis ou plantation : {monthsText(s.plant_out_months.length ? s.plant_out_months : s.sow_indoor_months)} · arrosage {s.water_every_days === 1 ? 'tous les jours' : `tous les ${s.water_every_days} j`} · récolte {monthsText(s.harvest_months)}</p>
          <p className="text-sm font-bold text-gris">{isMulti(s) ? `1 plant sur ${footprintText(s)} cases` : `${nf(s.plants_per_cell)} plant${s.plants_per_cell > 1 ? 's' : ''} dans la case`}</p>
          <div role="group" aria-label="État de la plantation" className="grid grid-cols-2 gap-1.5 rounded-2xl bg-fond p-1">
            <button type="button" aria-pressed={!isFuture} onClick={() => { setPlanned(false); setDate(iso(today())); }} className={`min-h-11 rounded-xl px-2 text-[13px] font-extrabold ${!isFuture ? 'bg-vert text-white' : 'text-encre'}`}>Déjà en place</button>
            <button type="button" aria-pressed={isFuture} onClick={() => { setPlanned(true); if (date <= iso(today())) setDate(iso(nextPlantDate(s))); }} className={`min-h-11 rounded-xl px-2 text-[13px] font-extrabold ${isFuture ? 'bg-vert text-white' : 'text-encre'}`}>Pas encore plantée</button>
          </div>
          <label className="flex flex-col gap-1 text-sm font-extrabold">{isFuture ? 'Plantation ou semis prévu le' : 'Planté le'}
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setPlanned(e.target.value > iso(today())); }} className="min-h-11 rounded-2xl border-2 border-trait bg-white px-3 font-bold" />
          </label>
          <VarietyPicker speciesId={s.id} value={variety?.id ?? null} onChange={setVariety} />
          {isFuture && tasks.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-2xl bg-vert-doux px-3.5 py-3 text-[13px] text-encre">
              <b className="font-extrabold text-vert">{tasks.length} tâches ajoutées automatiquement au bon moment :</b>
              <ul className="flex flex-col gap-1">
                {tasks.map((t, i) => (
                  <li key={i} className="leading-snug"><b className="font-extrabold">{fmt(parse(t.due_date))}</b> · {t.title}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm font-bold text-gris">Distances recommandées : {s.inrow_spacing_cm} cm entre plants, {s.row_spacing_cm} cm entre rangs.</p>
          </>
          )}
          {!isSol(s) && <Note tone={check[0]}>{check[1]}</Note>}
          {rotation && <Note tone="mauvais">{rotation} Vous pouvez planter quand même.</Note>}
          {dist.length > 0 && <Note tone="neutre">Attention : {dist.join(' ')}</Note>}
          <Btn onClick={plant} disabled={!fits || nb.bad.length > 0 || busy}>{busy ? 'Enregistrement…' : isSol(s) ? 'Couvrir la case' : isFuture ? 'Prévoir sur cette case' : rotation ? 'Planter quand même' : 'Planter'}</Btn>
          {(add.isError || addTasks.isError) && <p className="text-sm font-bold text-alerte">{((add.error ?? addTasks.error) as Error).message}</p>}
          {!isSol(s) && <Link to={`/glossaire/${s.slug}`} className="self-center text-sm font-extrabold text-vert">Voir la fiche complète →</Link>}
        </Sheet>
      )}
    </Page>
  );
}
