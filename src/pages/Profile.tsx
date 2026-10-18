import { useEffect, useState } from 'react';
import { useApp } from '../lib/app';
import { useSaveProfile, useUpdateGarden } from '../lib/data';
import { supabase } from '../lib/supabase';
import { BottomNav, Btn, Page, useToast } from '../components/ui';
import { Stepper } from '../components/Stepper';
import { CELL_CM } from '../lib/garden';

export default function ProfilePage() {
  const { session, profile, garden, gardens, selectGarden, zones } = useApp();
  const save = useSaveProfile(session.user.id);
  const updateGarden = useUpdateGarden();
  const toast = useToast();
  const [first, setFirst] = useState('');
  const [city, setCity] = useState('');
  const [gname, setGname] = useState(garden.name);
  const [w, setW] = useState(garden.terrain_width_cm);
  const [h, setH] = useState(garden.terrain_length_cm);
  useEffect(() => { setFirst(profile?.first_name ?? ''); setCity(profile?.city ?? ''); }, [profile]);
  useEffect(() => { setGname(garden.name); setW(garden.terrain_width_cm); setH(garden.terrain_length_cm); }, [garden]);

  const minW = Math.max(300, ...zones.map(z => z.x_cm + z.cols * CELL_CM));
  const minH = Math.max(300, ...zones.map(z => z.y_cm + z.rows * CELL_CM));
  const input = 'min-h-12 rounded-2xl border-2 border-trait bg-white px-4 text-base font-bold outline-none focus:border-vert';

  return (
    <Page nav>
      <div className="pt-6">
        <h1 className="font-titre text-[31px] font-semibold text-vert">Profil</h1>
        <p className="mt-1 font-bold text-gris">{session.user.email}</p>
      </div>
      <form className="flex flex-col gap-3 rounded-carte bg-white p-4" onSubmit={async e => { e.preventDefault(); await save.mutateAsync({ first_name: first.trim() || null, city: city.trim() || null }); toast('Profil enregistré'); }}>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5 text-sm font-extrabold">Prénom<input value={first} onChange={e => setFirst(e.target.value)} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm font-extrabold">Ville<input value={city} onChange={e => setCity(e.target.value)} className={input} /></label>
        </div>
        <Btn type="submit" variant="doux" disabled={save.isPending}>Enregistrer</Btn>
      </form>

      <h2 className="font-titre text-xl font-semibold">Mon potager</h2>
      <form className="flex flex-col gap-3 rounded-carte bg-white p-4" onSubmit={async e => { e.preventDefault(); await updateGarden.mutateAsync({ id: garden.id, name: gname.trim() || garden.name, terrain_width_cm: w, terrain_length_cm: h }); toast('Potager enregistré'); }}>
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">Nom<input value={gname} onChange={e => setGname(e.target.value)} className={input} /></label>
        <div className="grid grid-cols-2 gap-2.5">
          <Stepper label="Largeur du terrain" value={w} onChange={setW} step={100} min={minW} max={10000} />
          <Stepper label="Longueur du terrain" value={h} onChange={setH} step={100} min={minH} max={10000} />
        </div>
        <Btn type="submit" variant="doux" disabled={updateGarden.isPending}>Enregistrer</Btn>
        {updateGarden.isError && <p className="text-sm font-bold text-alerte">{(updateGarden.error as Error).message}</p>}
      </form>
      {gardens.length > 1 && (
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">Changer de potager
          <select value={garden.id} onChange={e => selectGarden(e.target.value)} className={input}>{gardens.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
        </label>
      )}
      <Btn variant="contour" onClick={() => supabase.auth.signOut()}>Se déconnecter</Btn>
      <BottomNav />
    </Page>
  );
}
