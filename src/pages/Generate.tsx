import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useAddPlantings } from '../lib/data';
import { BackHeader, Btn, Loading, Note, Page, Tile, useToast } from '../components/ui';
import { footprintText, inSeason, isMulti, isSol, lc, nf, occupancy, plantCount, SPCOLOR } from '../lib/garden';
import { generatePlan, type Area } from '../lib/generator';
import { blockedCells } from '../lib/rotation';
import { MOIS, today } from '../lib/dates';

export default function Generate() {
  const { zoneId } = useParams();
  const [sp] = useSearchParams();
  const { zones, plantings, species, byId, rels, garden, loading, history } = useApp();
  const zone = zones.find(z => z.id === zoneId);
  const add = useAddPlantings();
  const nav = useNavigate();
  const toast = useToast();
  const m = today().getMonth() + 1;
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [seed, setSeed] = useState<number | null>(null);
  const [filter, setFilter] = useState<'saison' | 'toutes'>('saison');
  const [ignoreRot, setIgnoreRot] = useState(false);

  const area: Area | null = zone ? {
    x: Number(sp.get('x') ?? 0), y: Number(sp.get('y') ?? 0),
    w: Math.min(zone.cols, Number(sp.get('w') ?? zone.cols)), h: Math.min(zone.rows, Number(sp.get('h') ?? zone.rows))
  } : null;
  const grid = useMemo(() => (zone ? occupancy(zone, plantings.filter(p => p.zone_id === zone.id)) : []), [zone, plantings]);
  const picks = useMemo(() => Object.entries(weights).map(([id, weight]) => ({ species: byId.get(id)!, weight })).filter(p => p.species), [weights, byId]);

  // Rotation des cultures : par espèce, les cases où la même famille a été cultivée récemment
  const blocked = useMemo(() => {
    const m = new Map<string, Set<number>>();
    if (!zone || ignoreRot) return m;
    for (const p of picks) { const b = blockedCells(history, byId, zone, p.species); if (b.size) m.set(p.species.id, b); }
    return m;
  }, [zone, picks, history, byId, ignoreRot]);
  // cases libres de la zone générée qu'une espèce choisie évite à cause de la rotation
  const avoided = useMemo(() => {
    if (!zone || !blocked.size) return [] as { name: string; n: number }[];
    const out: { name: string; n: number }[] = [];
    for (const p of picks) {
      const b = blocked.get(p.species.id); if (!b) continue;
      let n = 0;
      for (const k of b) { const x = k % zone.cols, y = Math.floor(k / zone.cols); if (!grid[y]?.[x]) n++; }
      if (n) out.push({ name: p.species.name, n });
    }
    return out;
  }, [zone, picks, blocked, grid]);

  const plan = useMemo(() => (zone && area && seed !== null ? generatePlan({ zone, area, existing: grid, picks, rels, seed, blocked }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [zone, grid, picks, rels, seed, sp, blocked]);

  if (loading) return <Loading />;
  if (!zone || !area) return <Page><BackHeader title="Zone introuvable" /></Page>;

  const list = species.filter(s => !isSol(s) && (filter === 'toutes' || inSeason(s, m)));
  const set = (id: string, w: number) => setWeights(prev => { const n = { ...prev }; if (w <= 0) delete n[id]; else n[id] = Math.min(4, w); return n; });
  const offSeason = picks.filter(p => !inSeason(p.species, m));
  const frost = picks.filter(p => p.species.frost_sensitive && m < 5);
  const freeCount = (() => { let n = 0; for (let y = area.y; y < area.y + area.h; y++) for (let x = area.x; x < area.x + area.w; x++) if (!grid[y][x]) n++; return n; })();

  async function validate() {
    if (!plan) return;
    await add.mutateAsync(plan.rects.map(r => ({ garden_id: garden.id, zone_id: zone!.id, species_id: r.species_id, x: r.x, y: r.y, w: r.w, h: r.h })));
    toast(`Plan enregistré : ${plan.placed} cases plantées`);
    nav(-1);
  }

  /* ---------- étape 2 : proposition ---------- */
  if (plan) {
    const rows: number[] = Array.from({ length: area.h }, (_, i) => area.y + i);
    const cols: number[] = Array.from({ length: area.w }, (_, i) => area.x + i);
    const used = [...plan.counts.entries()].sort((a, b) => b[1] - a[1]);
    const plants = plan.rects.reduce((t, r) => t + plantCount(r, byId.get(r.species_id)!), 0);
    return (
      <Page>
        <BackHeader kicker={zone.name} title="Plan proposé" />
        <p className="text-sm font-bold text-gris">{nf(plan.placed)} cases · environ {nf(plants)} plants · nord en haut</p>
        <div className="rounded-carte bg-white p-3">
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${area.w}, minmax(0, 1fr))` }} role="img" aria-label="Aperçu du plan">
            {rows.flatMap(y => cols.map(x => {
              const id = plan.cells[y][x];
              const old = grid[y][x];
              return <span key={x + '-' + y} className="aspect-square rounded-[3px]" style={{ background: old ? '#B9A58C' : id ? SPCOLOR[byId.get(id)!.slug] : '#6A432C', opacity: old ? 0.7 : 1 }} />;
            }))}
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-carte bg-white p-4">
          {used.map(([id, n]) => {
            const s = byId.get(id)!;
            return <div key={id} className="flex items-center gap-3"><Tile slug={s.slug} w={36} h={36} size={28} round={11} /><b className="flex-1 font-extrabold">{s.name}</b><span className="rounded-full px-2.5 py-0.5 text-xs font-extrabold text-white" style={{ background: SPCOLOR[s.slug] }}>{nf(n)} cases</span></div>;
          })}
          {picks.filter(p => !plan.counts.has(p.species.id)).map(p => <p key={p.species.id} className="text-sm text-gris">{p.species.name} : pas assez de place, non placée.</p>)}
        </div>
        {plan.good > 0 && <Note tone="bon">{nf(plan.good)} voisinages favorables entre vos plantes.</Note>}
        {plan.gaps > 0 && <Note tone="neutre">{plan.gaps} case{plan.gaps > 1 ? 's' : ''} laissée{plan.gaps > 1 ? 's' : ''} vide{plan.gaps > 1 ? 's' : ''} pour séparer des espèces qui ne s’entendent pas.</Note>}
        {offSeason.length > 0 && <Note tone="neutre">Hors saison en {MOIS[m - 1]} : {offSeason.map(p => lc(p.species.name)).join(', ')}.</Note>}
        {frost.length > 0 && <Note tone="neutre">Sensible au gel : {frost.map(p => lc(p.species.name)).join(', ')}. Attendez les Saints de glace pour planter.</Note>}
        <Btn onClick={validate} disabled={add.isPending || !plan.rects.length}>{add.isPending ? 'Enregistrement…' : 'Planter ce plan'}</Btn>
        <Btn variant="doux" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>Autre proposition</Btn>
        <Btn variant="contour" onClick={() => setSeed(null)}>Changer les plantes</Btn>
        {add.isError && <p className="text-sm font-bold text-alerte">{(add.error as Error).message}</p>}
      </Page>
    );
  }

  /* ---------- étape 1 : choix des plantes ---------- */
  return (
    <Page>
      <BackHeader kicker={zone.name} title="Générer un plan" />
      <p className="-mt-2 text-sm font-bold text-gris">{nf(freeCount)} cases libres à remplir. Choisissez vos plantes, l’application les range en respectant les bons voisinages.</p>
      <div role="group" aria-label="Filtrer" className="flex gap-2">
        {([['saison', `À planter en ${MOIS[m - 1]}`], ['toutes', 'Toutes']] as const).map(([v, label]) =>
          <button key={v} aria-pressed={filter === v} onClick={() => setFilter(v)} className={`min-h-9 rounded-full px-3.5 text-[13px] font-extrabold ${filter === v ? 'bg-vert text-white' : 'bg-white'}`}>{label}</button>)}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {list.map(s => {
          const w = weights[s.id] ?? 0;
          return (
            <div key={s.id} className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] bg-white px-1.5 py-2 ${w ? 'shadow-[inset_0_0_0_3px_#2E6B3F]' : ''}`}>
              <button aria-pressed={w > 0} onClick={() => set(s.id, w ? 0 : 1)} className="flex flex-col items-center gap-1">
                <Tile slug={s.slug} w={72} h={58} size={50} />
                <b className="text-center text-sm font-extrabold leading-tight">{s.name}</b>
              </button>
              {w > 0 ? (
                <span className="flex items-center gap-1" aria-label={`Quantité de ${s.name}`}>
                  <button aria-label="Moins" onClick={() => set(s.id, w - 1)} className="h-8 w-8 rounded-full bg-vert-doux font-extrabold text-vert">−</button>
                  <b className="w-5 text-center text-sm">{w}</b>
                  <button aria-label="Plus" onClick={() => set(s.id, w + 1)} className="h-8 w-8 rounded-full bg-vert-doux font-extrabold text-vert">+</button>
                </span>
              ) : <span className="text-xs text-gris">{isMulti(s) ? footprintText(s) + ' cases' : s.plants_per_cell + ' par case'}</span>}
            </div>
          );
        })}
      </div>
      <p className="text-[13px] text-gris">Le nombre sous chaque plante règle sa part : 2 prend deux fois plus de place que 1.</p>
      {avoided.length > 0 && (
        <Note tone="neutre">Rotation des cultures : {avoided.map(a => `${lc(a.name)} évitera ${a.n} case${a.n > 1 ? 's' : ''}`).join(', ')} (même famille cultivée récemment).</Note>
      )}
      <label className="flex items-start gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-sm font-bold">
        <input type="checkbox" checked={ignoreRot} onChange={e => setIgnoreRot(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#2E6B3F]" />
        <span>Ignorer la rotation des cultures<span className="block text-xs font-medium text-gris">Autorise une plante à revenir sur une case où sa famille a été cultivée ces dernières années.</span></span>
      </label>
      <Btn disabled={!picks.length || !freeCount} onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>{picks.length ? `Générer avec ${picks.length} plante${picks.length > 1 ? 's' : ''}` : 'Choisissez au moins une plante'}</Btn>
    </Page>
  );
}
