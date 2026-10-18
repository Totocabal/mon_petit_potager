import { useState } from 'react';
import { useCreateGarden } from '../lib/data';
import { Btn, Picto } from '../components/ui';
import { Stepper } from '../components/Stepper';


export default function Onboarding({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState('Mon potager');
  const [w, setW] = useState(1000);
  const [h, setH] = useState(1000);
  const create = useCreateGarden();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const g = await create.mutateAsync({ name: name.trim() || 'Mon potager', terrain_width_cm: w, terrain_length_cm: h });
    onCreated(g.id);
  }

  return (
    <main className="mx-auto flex min-h-full max-w-[440px] flex-col gap-5 px-5 py-10">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-vert"><Picto slug="carotte" size={42} /></span>
        <h1 className="font-titre text-[28px] font-semibold text-vert">Créons votre potager</h1>
      </div>
      <p className="text-gris">Donnez-lui un nom et la taille du terrain. Vous ajouterez ensuite vos zones : carrés, parcelles, serre.</p>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">Nom
          <input value={name} onChange={e => setName(e.target.value)} className="min-h-12 rounded-2xl border-2 border-trait bg-white px-4 text-base font-bold outline-none focus:border-vert" />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <Stepper label="Largeur" value={w} onChange={setW} step={100} min={300} max={10000} />
          <Stepper label="Longueur" value={h} onChange={setH} step={100} min={300} max={10000} />
        </div>
        <p className="text-sm text-gris">Un petit jardin de ville : 5 × 5 m. Un grand potager : jusqu’à 100 × 100 m.</p>
        {create.isError && <p className="text-sm font-bold text-alerte">{(create.error as Error).message}</p>}
        <Btn type="submit" disabled={create.isPending}>{create.isPending ? 'Création…' : 'Créer mon potager'}</Btn>
      </form>
    </main>
  );
}
