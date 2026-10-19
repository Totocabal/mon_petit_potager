import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BottomNav, Loading, Page, Tile } from '../components/ui';
import { CATEGORIES, DIFFICULTY_LABEL } from '../lib/glossary';
import { isSol } from '../lib/garden';
import type { Species, SpeciesCategory } from '../lib/types';

/** Glossaire : toutes les plantes du catalogue, par famille, avec accès à leur fiche. */
export default function Glossary() {
  const { species, loading } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<SpeciesCategory | 'toutes'>('toutes');
  const plants = useMemo(() => species.filter(s => !isSol(s)).sort((a, b) => a.name.localeCompare(b.name, 'fr')), [species]);
  const norm = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const found = useMemo(() => plants.filter(s => (cat === 'toutes' || s.category === cat) && (!q.trim() || norm(s.name + ' ' + s.family).includes(norm(q.trim())))), [plants, cat, q]);

  if (loading) return <Loading />;

  const groups = CATEGORIES.map(c => ({ ...c, list: found.filter(s => s.category === c.key) })).filter(g => g.list.length);
  const grid = 'grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6';

  return (
    <Page nav wide>
      <div className="pt-6 lg:pt-0">
        <h1 className="font-titre text-[31px] font-semibold text-vert">Glossaire</h1>
        <p className="mt-1 font-bold text-gris">{plants.length} plantes : semis, entretien, récolte et voisines.</p>
      </div>
      <label className="flex min-h-[50px] items-center gap-2.5 rounded-2xl bg-white px-3.5 lg:max-w-md">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#55625A" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
        <span className="sr-only">Rechercher une plante</span>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher une plante ou une famille" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
      </label>
      <div role="group" aria-label="Famille" className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pb-1 lg:mr-0 lg:flex-wrap lg:overflow-visible">
        {([['toutes', 'Toutes'], ...CATEGORIES.map(c => [c.key, c.label] as const)] as const).map(([k, label]) =>
          <button key={k} aria-pressed={cat === k} onClick={() => setCat(k)} className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13px] font-extrabold ${cat === k ? 'bg-vert text-white' : 'bg-white'}`}>{label}</button>)}
      </div>

      {!found.length && <p className="rounded-carte bg-white p-4 text-gris">Aucune plante ne correspond.</p>}
      {groups.map(g => (
        <section key={g.key} aria-labelledby={'h-' + g.key} className="flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <h2 id={'h-' + g.key} className="font-titre text-xl font-semibold">{g.label}</h2>
            <span className="text-[13px] font-bold text-gris">{g.hint}</span>
          </div>
          <div className={grid}>{g.list.map(s => <PlantCard key={s.id} s={s} />)}</div>
        </section>
      ))}
      <BottomNav />
    </Page>
  );
}

function PlantCard({ s }: { s: Species }) {
  return (
    <Link to={`/glossaire/${s.slug}`} className="flex min-w-0 flex-col items-center gap-1 rounded-[20px] bg-white px-1.5 py-2.5">
      <Tile slug={s.slug} w={72} h={58} size={50} />
      <b className="text-center text-sm font-extrabold leading-tight">{s.name}</b>
      <span className="text-xs text-gris">{s.difficulty ? DIFFICULTY_LABEL[s.difficulty] : s.family}</span>
    </Link>
  );
}
