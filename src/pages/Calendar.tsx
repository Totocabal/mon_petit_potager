import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BottomNav, Loading, Page, Select } from '../components/ui';
import { cap, MOIS, today } from '../lib/dates';
import { SpeciesLinks } from '../components/SpeciesLinks';
import { CATEGORIES } from '../lib/glossary';
import { almanacEntries, type AlmanacActivity, type AlmanacCategory, type AlmanacSort } from '../lib/almanac';

export default function Calendar() {
  const { species, loading } = useApp();
  const now = today().getMonth() + 1;
  const [m, setM] = useState(now);
  const [category, setCategory] = useState<AlmanacCategory>('toutes');
  const [activity, setActivity] = useState<AlmanacActivity>('all');
  const [sort, setSort] = useState<AlmanacSort>('name');
  const filtered = category !== 'toutes' || activity !== 'all' || sort !== 'name';
  const reset = () => { setCategory('toutes'); setActivity('all'); setSort('name'); };
  const months = Array.from({ length: 12 }, (_, i) => ((now - 1 + i) % 12) + 1);
  const { sow, harvest, total } = almanacEntries(species, { month: m, category, activity, sort });

  if (loading) return <Loading />;

  return (
    <Page nav>
      <div className="pt-6 lg:pt-0">
        <h1 className="font-titre text-[31px] font-semibold text-vert">Almanach</h1>
        <p className="mt-1 font-bold text-gris">Que faire au potager en {MOIS[m - 1]} ?</p>
      </div>
      <div role="group" aria-label="Mois" className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pb-1 lg:mr-0 lg:flex-wrap lg:overflow-visible">
        {months.map(x => <button key={x} aria-pressed={x === m} onClick={() => setM(x)} className={`min-h-11 shrink-0 rounded-full px-3.5 text-[13px] font-extrabold ${x === m ? 'bg-vert text-white' : 'bg-white'}`}>{cap(MOIS[x - 1])}</button>)}
      </div>
      <section aria-label="Filtres et tri de l’Almanach" className="flex flex-col gap-3 rounded-carte bg-white p-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-extrabold text-gris">Catégorie
            <Select label="Catégorie de plantes" value={category} onChange={v => setCategory(v as AlmanacCategory)} options={[{ value: 'toutes', label: 'Toutes' }, ...CATEGORIES.map(c => ({ value: c.key, label: c.label })), { value: 'autres', label: 'Autres plantes' }]} />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-xs font-extrabold text-gris">À faire
            <Select label="Activité au potager" value={activity} onChange={v => setActivity(v as AlmanacActivity)} options={[{ value: 'all', label: 'Tout' }, { value: 'indoor', label: 'Semis sous abri' }, { value: 'outdoor', label: 'Semis en place et plantations' }, { value: 'harvest', label: 'Récoltes' }]} />
          </label>
        </div>
        <label className="flex min-w-0 flex-col gap-1.5 text-xs font-extrabold text-gris">Trier par
          <Select label="Trier les plantes" value={sort} onChange={v => setSort(v as AlmanacSort)} options={[{ value: 'name', label: 'Nom : A → Z' }, { value: 'name-desc', label: 'Nom : Z → A' }, { value: 'difficulty', label: 'Les plus faciles d’abord' }]} />
        </label>
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-sm font-bold text-gris">{total} plante{total > 1 ? 's' : ''} en {MOIS[m - 1]}</p>
          {filtered && <button type="button" onClick={reset} className="min-h-11 text-sm font-extrabold text-vert">Réinitialiser</button>}
        </div>
      </section>
      {total === 0 ? <p className="rounded-carte bg-white p-4 text-gris">Aucune plante ne correspond à ces critères en {MOIS[m - 1]}. Essayez un autre mois ou élargissez les filtres.</p> : <>
        {activity !== 'harvest' && <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
          <h2 className="font-titre text-lg font-semibold">{activity === 'indoor' ? 'À semer sous abri' : activity === 'outdoor' ? 'À semer en place ou planter' : 'À semer ou planter'} <span className="font-corps text-sm font-bold text-gris">· {sow.length}</span></h2>
          {sow.length ? <SpeciesLinks list={sow} /> : <p className="text-gris">Aucun semis ni plantation avec ces critères.</p>}
        </section>}
        {(activity === 'all' || activity === 'harvest') && <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
          <h2 className="font-titre text-lg font-semibold">À récolter <span className="font-corps text-sm font-bold text-gris">· {harvest.length}</span></h2>
          {harvest.length ? <SpeciesLinks list={harvest} /> : <p className="text-gris">Aucune récolte avec ces critères.</p>}
        </section>}
      </>}
      <Link to="/mon-calendrier" className="flex min-h-11 items-center justify-center rounded-2xl bg-vert-doux px-4 py-3 font-extrabold text-vert">Voir Mon Calendrier →</Link>
      <BottomNav />
    </Page>
  );
}
