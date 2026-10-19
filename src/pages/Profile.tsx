import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useDeleteGarden, useMembers, useSaveProfile, useUpdateGarden } from '../lib/data';
import { supabase } from '../lib/supabase';
import { BottomNav, Btn, Page, Select, useToast } from '../components/ui';
import { Stepper } from '../components/Stepper';
import { CELL_CM } from '../lib/garden';
import { geocode, type Place } from '../lib/weather';
import { CityInput } from '../components/CityInput';

export default function ProfilePage() {
  const { session, profile, garden, gardens, selectGarden, zones } = useApp();
  const save = useSaveProfile(session.user.id);
  const updateGarden = useUpdateGarden();
  const toast = useToast();
  const [first, setFirst] = useState('');
  const [city, setCity] = useState('');
  const [picked, setPicked] = useState<Place | null>(null); // ville choisie dans les suggestions : coordonnées déjà connues
  const [gname, setGname] = useState(garden.name);
  const [w, setW] = useState(garden.terrain_width_cm);
  const [h, setH] = useState(garden.terrain_length_cm);
  useEffect(() => { setFirst(profile?.first_name ?? ''); setCity(profile?.city ?? ''); setPicked(null); }, [profile]);
  useEffect(() => { setGname(garden.name); setW(garden.terrain_width_cm); setH(garden.terrain_length_cm); }, [garden]);

  const minW = Math.max(300, ...zones.map(z => z.x_cm + z.cols * CELL_CM));
  const minH = Math.max(300, ...zones.map(z => z.y_cm + z.rows * CELL_CM));
  const input = 'min-h-12 rounded-2xl border-2 border-trait bg-white px-4 text-base font-bold outline-none focus:border-vert';

  return (
    <Page nav>
      <div className="pt-6 lg:pt-0">
        <h1 className="font-titre text-[31px] font-semibold text-vert">Profil</h1>
        <p className="mt-1 font-bold text-gris">{session.user.email}</p>
      </div>
      <form className="flex flex-col gap-3 rounded-carte bg-white p-4" onSubmit={async e => { e.preventDefault(); const c = city.trim(); let place = null;
          if (c && picked && picked.name === c) place = picked;
          else if (c && c !== profile?.city) { try { place = await geocode(c); } catch { /* hors ligne : on garde la ville sans coordonnées */ } if (!place) { toast('Ville introuvable : météo non activée'); } }
          const keep = c && c === profile?.city && !picked;
          await save.mutateAsync({ first_name: first.trim() || null, city: place?.name ?? (c || null), ...(keep ? {} : { lat: place?.lat ?? null, lon: place?.lon ?? null }) });
          if (place) toast('Profil enregistré · météo de ' + place.name); else if (!c || keep) toast('Profil enregistré'); }}>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5 text-sm font-extrabold">Prénom<input value={first} onChange={e => setFirst(e.target.value)} className={input} /></label>
          <label className="flex flex-col gap-1.5 text-sm font-extrabold">Ville<CityInput value={city} onChange={v => { setCity(v); setPicked(null); }} onPick={p => { setCity(p.name); setPicked(p); }} className={input + ' w-full'} /></label>
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
      <Link to="/alertes" className="flex min-h-14 items-center justify-between rounded-carte bg-white px-4 font-extrabold text-vert">Alertes d’arrosage<span aria-hidden>→</span></Link>
      <Link to="/inviter" className="flex min-h-14 items-center justify-between rounded-carte bg-white px-4 font-extrabold text-vert">Inviter un proche<span aria-hidden>→</span></Link>
      {gardens.length > 1 && (
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">Changer de potager
          <Select label="Changer de potager" value={garden.id} onChange={selectGarden} options={gardens.map(g => ({ value: g.id, label: g.name }))} />
        </label>
      )}
      <Btn variant="contour" onClick={() => supabase.auth.signOut()}>Se déconnecter</Btn>
      <DeleteGarden />
      <BottomNav />
    </Page>
  );
}

/** Suppression du potager : réservée au propriétaire, avec confirmation. */
function DeleteGarden() {
  const { session, garden, zones, plantings } = useApp();
  const members = useMembers(garden.id);
  const del = useDeleteGarden();
  const nav = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const others = (members.data?.length ?? 1) - 1;
  if (members.data?.find(m => m.user_id === session.user.id)?.role !== 'owner') return null;

  async function onDelete() {
    await del.mutateAsync(garden.id);
    toast(`Potager supprimé : ${garden.name}`);
    nav('/', { replace: true });
  }

  return confirm ? (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-alerte-doux p-4 text-[#6B2418]">
      <p className="font-extrabold">Supprimer le potager « {garden.name} » ?</p>
      <p className="text-sm">
        {zones.length} zone{zones.length > 1 ? 's' : ''}, {plantings.length} plantation{plantings.length > 1 ? 's' : ''}, ses tâches et ses alertes seront supprimées.
        {others > 0 ? ` Les ${others} autre${others > 1 ? 's' : ''} membre${others > 1 ? 's' : ''} perdront l’accès.` : ''} Impossible de revenir en arrière.
      </p>
      <div className="flex gap-2"><Btn variant="danger" onClick={onDelete} disabled={del.isPending}>{del.isPending ? 'Suppression…' : 'Supprimer'}</Btn><Btn variant="contour" onClick={() => setConfirm(false)}>Annuler</Btn></div>
      {del.isError && <p className="text-sm font-bold">{(del.error as Error).message}</p>}
    </div>
  ) : (
    <button onClick={() => setConfirm(true)} className="min-h-11 self-center font-extrabold text-alerte">Supprimer ce potager</button>
  );
}
