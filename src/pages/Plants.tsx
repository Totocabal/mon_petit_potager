import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BottomNav, Btn, Icon, Loading, Page, Sheet, Tile } from '../components/ui';
import { SpeciesLinks } from '../components/SpeciesLinks';
import { almanacEntries, type AlmanacActivity, type AlmanacCategory, type AlmanacSort } from '../lib/almanac';
import { cap, MOIS, today } from '../lib/dates';
import { CATEGORIES, DIFFICULTY_LABEL } from '../lib/glossary';
import { isSol } from '../lib/garden';
import { ACTIVITY_LABEL, activeFilters, DEFAULT_FILTERS, groupByCategory, searchPlants, seasonText, SORT_LABEL, type PlantFilters } from '../lib/plants';
import type { Species } from '../lib/types';

const HARVEST_PREVIEW = 8;

/** Plantes : le catalogue en deux vues, « Ce mois-ci » (ex-Almanach) et « Toutes » (ex-Glossaire), avec une recherche et un seul bouton Filtres. */
export default function Plants() {
  const { species, loading, varietiesOf } = useApp();
  const [params, setParams] = useSearchParams();
  const view: 'mois' | 'toutes' = params.get('vue') === 'toutes' ? 'toutes' : 'mois';
  const setView = (v: 'mois' | 'toutes') => setParams(v === 'toutes' ? { vue: 'toutes' } : {}, { replace: true });
  const [q, setQ] = useState('');
  const [month, setMonth] = useState(today().getMonth() + 1);
  const [filters, setFilters] = useState<PlantFilters>(DEFAULT_FILTERS);
  const [sheet, setSheet] = useState(false);
  const [allHarvest, setAllHarvest] = useState(false);
  const active = activeFilters(filters, view);
  const reset = (key?: keyof PlantFilters) => setFilters(f => (key ? { ...f, [key]: DEFAULT_FILTERS[key] } : DEFAULT_FILTERS));

  const found = useMemo(() => searchPlants(species, q), [species, q]);
  const entries = useMemo(() => almanacEntries(found, { month, ...filters }), [found, month, filters]);
  const all = useMemo(() => {
    const list = found.filter(s => !isSol(s) && (filters.category === 'toutes' || (filters.category === 'autres' ? s.category === null : s.category === filters.category)));
    const diff = { facile: 0, moyen: 1, exigeant: 2 } as const;
    return list.sort((a, b) => {
      const names = a.name.localeCompare(b.name, 'fr');
      return filters.sort === 'name-desc' ? -names : filters.sort === 'difficulty' ? (a.difficulty ? diff[a.difficulty] : 3) - (b.difficulty ? diff[b.difficulty] : 3) || names : names;
    });
  }, [found, filters.category, filters.sort]);

  if (loading) return <Loading />;
  const shiftMonth = (d: number) => setMonth(m => ((m - 1 + d + 12) % 12) + 1);
  const harvestShown = allHarvest ? entries.harvest : entries.harvest.slice(0, HARVEST_PREVIEW);

  return (
    <Page nav wide>
      <div className="pt-6 lg:pt-0"><h1 className="font-titre text-[31px] font-semibold text-vert">Plantes</h1></div>

      <div className="flex gap-2.5">
        <label className="flex min-h-[50px] min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-white px-3.5 lg:max-w-md">
          <Icon name="search" size={28} />
          <span className="sr-only">Rechercher une plante</span>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une plante" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
        </label>
        <button type="button" onClick={() => setSheet(true)} aria-label={active.length ? `Filtres : ${active.length} actif${active.length > 1 ? 's' : ''}` : 'Filtres'}
          className="squish relative flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-white text-vert">
          <Icon name="filter" size={30} />
          {active.length > 0 && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#E2553F] text-xs font-extrabold text-white">{active.length}</span>}
        </button>
      </div>

      <div role="group" aria-label="Vue" className="flex rounded-2xl bg-white p-1">
        {([['mois', 'Ce mois-ci'], ['toutes', `Toutes (${found.length})`]] as const).map(([v, label]) =>
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`min-h-10 flex-1 rounded-[14px] text-[14.5px] font-extrabold ${view === v ? 'bg-vert text-white' : 'text-gris'}`}>{label}</button>)}
      </div>

      {active.length > 0 && (
        <div className="-mt-1 flex flex-wrap items-center gap-2">
          {active.map(a => <button key={a.key} type="button" onClick={() => reset(a.key)} aria-label={`Retirer le filtre : ${a.label}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-soleil px-3 text-[13px] font-extrabold text-soleil-encre">{a.label} <span aria-hidden="true">✕</span></button>)}
          {active.length > 1 && <button type="button" onClick={() => reset()} className="min-h-9 text-[13px] font-extrabold text-vert">Tout effacer</button>}
        </div>
      )}

      {view === 'mois' ? (
        <>
          <div className="flex items-center justify-between rounded-carte bg-white p-2">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mois précédent" className="squish flex h-11 w-11 items-center justify-center rounded-2xl bg-vert-doux text-vert"><Chevron left /></button>
            <div className="text-center"><b className="font-titre text-xl font-semibold">{cap(MOIS[month - 1])}</b><p aria-live="polite" className="text-[13px] font-bold text-gris">{entries.total} plante{entries.total > 1 ? 's' : ''}</p></div>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Mois suivant" className="squish flex h-11 w-11 items-center justify-center rounded-2xl bg-vert-doux text-vert"><Chevron /></button>
          </div>
          {entries.total === 0 ? <p className="rounded-carte bg-white p-4 text-gris">Aucune plante ne correspond en {MOIS[month - 1]}. Essayez un autre mois ou retirez un filtre.</p> : <>
            {filters.activity !== 'harvest' && (
              <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
                <h2 className="font-titre text-lg font-semibold">{filters.activity === 'indoor' ? 'À semer sous abri' : filters.activity === 'outdoor' ? 'À semer en place ou planter' : 'À semer ou planter'} <span className="font-corps text-sm font-bold text-gris">· {entries.sow.length}</span></h2>
                {entries.sow.length ? <SpeciesLinks list={entries.sow} /> : <p className="text-gris">Rien à semer ni planter avec ces critères.</p>}
              </section>
            )}
            {(filters.activity === 'all' || filters.activity === 'harvest') && (
              <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
                <h2 className="font-titre text-lg font-semibold">À récolter <span className="font-corps text-sm font-bold text-gris">· {entries.harvest.length}</span></h2>
                {entries.harvest.length ? <SpeciesLinks list={harvestShown} /> : <p className="text-gris">Aucune récolte avec ces critères.</p>}
                {entries.harvest.length > HARVEST_PREVIEW && <button type="button" onClick={() => setAllHarvest(a => !a)} aria-expanded={allHarvest} className="min-h-11 self-center font-extrabold text-vert">{allHarvest ? 'Réduire la liste' : `Voir les ${entries.harvest.length} plantes →`}</button>}
              </section>
            )}
          </>}
        </>
      ) : (
        <>
          {!all.length && <p className="rounded-carte bg-white p-4 text-gris">Aucune plante ne correspond.</p>}
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start">
            {groupByCategory(all).map(g => (
              <section key={g.key} aria-labelledby={'h-' + g.key} className="flex flex-col rounded-carte bg-white px-4 pb-1 pt-3">
                <h2 id={'h-' + g.key} className="text-[12px] font-extrabold uppercase tracking-wider text-gris">{g.label} · {g.list.length}</h2>
                {g.list.map(s => <PlantRow key={s.id} s={s} varieties={varietiesOf(s.id).length} />)}
              </section>
            ))}
          </div>
        </>
      )}


      {sheet && (
        <Sheet title="Filtres" onClose={() => setSheet(false)} reserveSpace={false}>
          <FilterGroup label="Catégorie" value={filters.category} onChange={v => setFilters(f => ({ ...f, category: v as AlmanacCategory }))}
            options={[{ value: 'toutes', label: 'Toutes' }, ...CATEGORIES.map(c => ({ value: c.key, label: c.label })), { value: 'autres', label: 'Autres plantes' }]} />
          {view === 'mois' && <FilterGroup label="À faire" value={filters.activity} onChange={v => setFilters(f => ({ ...f, activity: v as AlmanacActivity }))}
            options={(Object.keys(ACTIVITY_LABEL) as AlmanacActivity[]).map(k => ({ value: k, label: ACTIVITY_LABEL[k] }))} />}
          <FilterGroup label="Trier par" value={filters.sort} onChange={v => setFilters(f => ({ ...f, sort: v as AlmanacSort }))}
            options={(Object.keys(SORT_LABEL) as AlmanacSort[]).map(k => ({ value: k, label: SORT_LABEL[k] }))} />
          <Btn onClick={() => setSheet(false)}>{view === 'mois' ? `Voir ${entries.total} plante${entries.total > 1 ? 's' : ''}` : `Voir ${all.length} plante${all.length > 1 ? 's' : ''}`}</Btn>
          {active.length > 0 && <button type="button" onClick={() => reset()} className="min-h-11 self-center font-extrabold text-vert">Tout effacer</button>}
        </Sheet>
      )}
      <BottomNav />
    </Page>
  );
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-[13px] font-extrabold text-gris">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(o => <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)} className={`min-h-10 rounded-full px-3.5 text-[13.5px] font-extrabold ${value === o.value ? 'bg-vert text-white' : 'bg-fond'}`}>{o.label}</button>)}
      </div>
    </div>
  );
}

function PlantRow({ s, varieties }: { s: Species; varieties: number }) {
  const sub = [s.difficulty ? DIFFICULTY_LABEL[s.difficulty] : s.family, varieties > 0 ? `${varieties} variété${varieties > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ');
  return (
    <Link to={`/glossaire/${s.slug}`} className="squish flex min-h-[60px] items-center gap-3 border-b border-dashed border-trait py-1.5 last:border-0">
      <Tile slug={s.slug} w={44} h={44} size={32} round={14} />
      <span className="flex min-w-0 flex-1 flex-col"><b className="truncate font-extrabold">{s.name}</b><span className="truncate text-xs text-gris">{sub}</span></span>
      <span className="shrink-0 rounded-full bg-vert-doux px-2.5 py-0.5 text-xs font-extrabold text-vert">{seasonText(s)}</span>
    </Link>
  );
}

function Chevron({ left = false }: { left?: boolean }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d={left ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>;
}
