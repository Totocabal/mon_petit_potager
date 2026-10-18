import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useAddPlantings } from '../lib/data';
import { BackHeader, Btn, Note, Page, Sheet, Tile, useToast } from '../components/ui';
import { footprintText, inSeason, isMulti, lc, neighbors, nf, occupancy, pitchCm, spacingOk, tooClose } from '../lib/garden';
import { iso, MOIS, monthsText, today } from '../lib/dates';

export default function AddPlant() {
  const { zoneId } = useParams();
  const [sp] = useSearchParams();
  const x = Number(sp.get('x') ?? 0), y = Number(sp.get('y') ?? 0);
  const { zones, plantings, species, byId, rels, garden } = useApp();
  const zone = zones.find(z => z.id === zoneId);
  const grid = useMemo(() => (zone ? occupancy(zone, plantings.filter(p => p.zone_id === zone.id)) : []), [zone, plantings]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'saison' | 'toutes'>('saison');
  const [pick, setPick] = useState<string | null>(null);
  const [date, setDate] = useState(iso(today()));
  const add = useAddPlantings();
  const nav = useNavigate();
  const toast = useToast();
  const m = today().getMonth() + 1;

  if (!zone) return <Page><BackHeader title="Zone introuvable" /></Page>;

  const list = species.filter(s => (q ? s.name.toLowerCase().includes(q.toLowerCase()) : filter === 'toutes' || inSeason(s, m)));
  const s = pick ? byId.get(pick) : undefined;
  const sw = s?.span_w ?? 1, sh = s?.span_h ?? 1;
  const fits = !!s && x + sw <= zone.cols && y + sh <= zone.rows && (() => { for (let dy = 0; dy < sh; dy++) for (let dx = 0; dx < sw; dx++) if (grid[y + dy][x + dx]) return false; return true; })();
  const nb = s ? neighbors(grid, { x, y, w: sw, h: sh }, s.id, rels) : { good: [], bad: [] };
  const close = s && fits ? tooClose(grid, { x, y, w: sw, h: sh }, s, byId) : new Map<string, { gap: number; need: number }>();
  const dist: string[] = [];
  if (s && !spacingOk(s)) dist.push(`Dans la grille, ${lc(s.name)} est à ${Math.round(pitchCm(s))} cm de la plante voisine du même rang ; on recommande ${s.inrow_spacing_cm} cm.`);
  close.forEach((v, id) => dist.push(`Trop près de ${lc(byId.get(id)!.name)} : ${v.gap} cm entre les plants, on recommande ${v.need} cm.`));
  const check: ['bon' | 'mauvais' | 'neutre', string] = !s ? ['neutre', '']
    : !fits ? ['mauvais', `${s.name} prend ${footprintText(s)} cases : pas assez de place à partir de cette case.`]
    : nb.bad.length ? ['mauvais', 'Mauvais voisinage avec ' + nb.bad.map(i => lc(byId.get(i)!.name)).join(', ') + '. Choisissez une autre case.']
    : nb.good.length ? ['bon', 'Bon voisinage : ' + nb.good.map(i => lc(byId.get(i)!.name)).join(', ') + '.']
    : ['neutre', 'Voisines neutres : rien à signaler.'];

  async function plant() {
    if (!s) return;
    await add.mutateAsync([{ garden_id: garden.id, zone_id: zone!.id, species_id: s.id, x, y, w: sw, h: sh, sown_at: date }]);
    toast(`${s.name} plantée · rang ${y + 1}, case ${x + 1}`);
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
            <span className="text-xs text-gris">{isMulti(sp) ? footprintText(sp) + ' cases' : sp.plants_per_cell + ' par case'}</span>
          </button>
        ))}
        {!list.length && <p className="col-span-3 text-gris">Aucune plante ne correspond. Essayez « Toutes ».</p>}
      </div>
      {s && (
        <Sheet title={s.name} onClose={() => setPick(null)}>
          <p className="text-sm">Semis ou plantation : {monthsText(s.plant_out_months.length ? s.plant_out_months : s.sow_indoor_months)} · arrosage {s.water_every_days === 1 ? 'tous les jours' : `tous les ${s.water_every_days} j`} · récolte {monthsText(s.harvest_months)}</p>
          <p className="text-sm font-bold text-gris">{isMulti(s) ? `1 plant sur ${footprintText(s)} cases` : `${nf(s.plants_per_cell)} plant${s.plants_per_cell > 1 ? 's' : ''} dans la case`}</p>
          <label className="flex flex-col gap-1 text-sm font-extrabold">Planté le
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="min-h-11 rounded-2xl border-2 border-trait bg-white px-3 font-bold" />
          </label>
          <p className="text-sm font-bold text-gris">Distances recommandées : {s.inrow_spacing_cm} cm entre plants, {s.row_spacing_cm} cm entre rangs.</p>
          <Note tone={check[0]}>{check[1]}</Note>
          {dist.length > 0 && <Note tone="neutre">Attention : {dist.join(' ')}</Note>}
          <Btn onClick={plant} disabled={!fits || nb.bad.length > 0 || add.isPending}>{add.isPending ? 'Plantation…' : 'Planter'}</Btn>
          {add.isError && <p className="text-sm font-bold text-alerte">{(add.error as Error).message}</p>}
        </Sheet>
      )}
    </Page>
  );
}
