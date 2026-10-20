import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BottomNav, Loading, Page } from '../components/ui';
import { cap, MOIS, today } from '../lib/dates';
import { SpeciesLinks } from '../components/SpeciesLinks';
import { isSol } from '../lib/garden';

export default function Calendar() {
  const { species, loading } = useApp();
  const plants = species.filter(s => !isSol(s));
  const now = today().getMonth() + 1;
  const [m, setM] = useState(now);
  const months = Array.from({ length: 12 }, (_, i) => ((now - 1 + i) % 12) + 1);
  const sow = plants.filter(s => s.sow_indoor_months.includes(m) || s.plant_out_months.includes(m));
  const harvest = plants.filter(s => s.harvest_months.includes(m));

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
      <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
        <h2 className="font-titre text-lg font-semibold">À semer ou planter</h2>
        {sow.length ? <SpeciesLinks list={sow} /> : <p className="text-gris">Rien à semer ce mois-ci.</p>}
      </section>
      <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
        <h2 className="font-titre text-lg font-semibold">À récolter</h2>
        {harvest.length ? <SpeciesLinks list={harvest} /> : <p className="text-gris">Pas de récolte de saison ce mois-ci.</p>}
      </section>
      <Link to="/mon-calendrier" className="flex min-h-11 items-center justify-center rounded-2xl bg-vert-doux px-4 py-3 font-extrabold text-vert">Voir Mon Calendrier →</Link>
      <BottomNav />
    </Page>
  );
}
