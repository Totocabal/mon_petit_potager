import { useState } from 'react';
import { useApp } from '../lib/app';
import { BottomNav, Page, Tile } from '../components/ui';
import { cap, MOIS, today } from '../lib/dates';
import type { Species } from '../lib/types';

function Chips({ list }: { list: Species[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(s => <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-fond py-1 pl-1 pr-3 text-sm font-bold"><Tile slug={s.slug} w={30} h={30} size={26} round={999} />{s.name}</span>)}
    </div>
  );
}

export default function Calendar() {
  const { species, plantings, byId } = useApp();
  const now = today().getMonth() + 1;
  const [m, setM] = useState(now);
  const months = Array.from({ length: 12 }, (_, i) => ((now - 1 + i) % 12) + 1);
  const sow = species.filter(s => s.sow_indoor_months.includes(m) || s.plant_out_months.includes(m));
  const mineIds = new Set(plantings.map(p => p.species_id).filter(id => byId.get(id)?.harvest_months.includes(m)));
  const mine = [...mineIds].map(id => byId.get(id)!).filter(Boolean);
  const other = species.filter(s => s.harvest_months.includes(m) && !mineIds.has(s.id));

  return (
    <Page nav>
      <div className="pt-6 lg:pt-0">
        <h1 className="font-titre text-[31px] font-semibold text-vert">Calendrier</h1>
        <p className="mt-1 font-bold text-gris">Que faire au potager en {MOIS[m - 1]} ?</p>
      </div>
      <div role="group" aria-label="Mois" className="no-scrollbar -mr-4 flex gap-2 overflow-x-auto pb-1 lg:mr-0 lg:flex-wrap lg:overflow-visible">
        {months.map(x => <button key={x} aria-pressed={x === m} onClick={() => setM(x)} className={`min-h-9 shrink-0 rounded-full px-3.5 text-[13px] font-extrabold ${x === m ? 'bg-vert text-white' : 'bg-white'}`}>{cap(MOIS[x - 1])}</button>)}
      </div>
      <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
        <h2 className="font-titre text-lg font-semibold">À semer ou planter</h2>
        {sow.length ? <Chips list={sow} /> : <p className="text-gris">Rien à semer ce mois-ci.</p>}
      </section>
      <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
        <h2 className="font-titre text-lg font-semibold">À récolter</h2>
        {mine.length > 0 && <><p className="text-[13px] font-extrabold text-gris">Dans votre potager</p><Chips list={mine} /></>}
        {other.length > 0 && <><p className="text-[13px] font-extrabold text-gris">De saison ailleurs</p><Chips list={other.slice(0, 10)} /></>}
      </section>
      <BottomNav />
    </Page>
  );
}
