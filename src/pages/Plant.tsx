import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useUpdatePlanting, useWater } from '../lib/data';
import { BackHeader, Btn, Page, Tile, useToast } from '../components/ui';
import { Pests } from './SpeciesSheet';
import { VarietyPicker } from '../components/VarietyPicker';
import { ageDays, everyDays, varietyFields, isReady, isSol, lc, needsWater, neighbors, nextWater, nf, occupancy, placeText, plantCount, stage, stageNames } from '../lib/garden';
import { cap, fmt, iso, monthsText, parse, today, whenText } from '../lib/dates';

export default function PlantPage() {
  const { plantingId } = useParams();
  const { plantings, zones, byId, rels, rainFor, varietyById } = useApp();
  const p = plantings.find(x => x.id === plantingId);
  const zone = p ? zones.find(z => z.id === p.zone_id) : undefined;
  const s = p ? byId.get(p.species_id) : undefined;
  const water = useWater();
  const update = useUpdatePlanting();
  const nav = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const grid = useMemo(() => (zone ? occupancy(zone, plantings.filter(x => x.zone_id === zone.id)) : []), [zone, plantings]);

  if (!p || !s || !zone) return <Page><BackHeader title="Plante introuvable" /><p>Elle a peut-être été retirée.</p></Page>;

  if (isSol(s)) {
    return (
      <Page>
        <BackHeader kicker={zone.name} title={s.name} />
        <div className="flex items-center gap-4">
          <Tile slug={s.slug} w={104} h={104} size={84} round={28} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="text-sm font-bold text-gris">Posé le {fmt(parse(p.sown_at))} · jour {ageDays(p)}</p>
            <p className="text-sm font-bold text-gris">{cap(placeText(p))} · {nf(p.w * p.h)} case{p.w * p.h > 1 ? 's' : ''}</p>
          </div>
        </div>
        {s.notes && <p className="rounded-2xl bg-soleil-doux px-3 py-2.5 text-sm font-bold text-soleil-encre">{s.notes}</p>}
        <Btn variant="danger" onClick={() => remove(false)} disabled={update.isPending}>Retirer {lc(s.name)} · remettre en culture</Btn>
      </Page>
    );
  }

  const ready = isReady(p, s), st = stage(p, s), names = stageNames(s);
  const wateredToday = p.last_watered_at === iso(today());
  const nb = neighbors(grid, p, s.id, rels, p.id);

  async function onWater() {
    await water.mutateAsync([p!]);
    toast(`Arrosage noté · prochain ${whenText(nextWater({ ...p!, last_watered_at: iso(today()) }, s!))}`);
  }
  async function remove(harvest: boolean) {
    await update.mutateAsync({ p: p!, patch: { removed_at: new Date().toISOString() } });
    toast(harvest ? `${s!.name} récoltée, les cases sont libres` : 'Plantation retirée');
    nav(-1);
  }

  return (
    <Page>
      <BackHeader kicker={zone.name} title={s.name} />
      <div className="flex items-center gap-4">
        <Tile slug={s.slug} w={104} h={104} size={84} round={28} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className={`self-start rounded-full px-3 py-1 text-[13px] font-extrabold ${ready ? 'bg-soleil text-soleil-encre' : 'bg-vert-doux text-vert'}`}>{ready ? 'À récolter' : st === 0 ? 'Jeune semis' : 'En croissance'}</span>
          {p.variety_id && varietyById.get(p.variety_id) && <p className="font-titre text-base font-semibold text-vert">{varietyById.get(p.variety_id)!.name}</p>}
          <p className="text-sm font-bold text-gris">Semée le {fmt(parse(p.sown_at))} · jour {ageDays(p)}</p>
          <p className="text-sm font-bold text-gris">{cap(placeText(p))} · {nf(plantCount(p, s))} plants</p>
        </div>
      </div>
      <div className="rounded-carte bg-white p-4"><VarietyPicker speciesId={s.id} value={p.variety_id} onChange={async v => { await update.mutateAsync({ p, patch: varietyFields(v) }); toast(v ? `Variété : ${v.name}` : 'Variété retirée'); }} /></div>
      <div className="grid grid-cols-3 gap-2.5">
        {[['Arrosage', everyDays(p, s) === 1 ? 'Tous les jours' : `Tous les ${everyDays(p, s)} j`], ['Exposition', s.exposure === 'soleil' ? 'Plein soleil' : 'Mi-ombre'], ['Récolte', monthsText(s.harvest_months)]].map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 rounded-[20px] bg-white p-3"><span className="text-xs font-bold text-gris">{k}</span><b className="font-titre font-semibold">{v}</b></div>
        ))}
      </div>
      <div className="flex flex-col gap-3 rounded-carte bg-white p-4">
        <h2 className="font-titre text-lg font-semibold">Sa croissance</h2>
        <div className="grid grid-cols-4 gap-1">
          {names.map((n, i) => (
            <div key={n} className={`flex flex-col items-center gap-1.5 text-center text-xs font-bold ${i <= st ? 'text-vert' : 'text-gris'}`}>
              <i className={`block h-[18px] w-[18px] rounded-full ${i <= st ? 'bg-vert' : 'bg-trait'} ${i === st ? 'shadow-[0_0_0_5px_#E1EFD6]' : ''}`} />{n}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
        <div className="flex items-baseline justify-between"><h2 className="font-titre text-lg font-semibold">Arrosage</h2>
          <span className="text-sm font-extrabold text-eau">{needsWater(p, s, undefined, rainFor(p.zone_id)) ? 'À arroser' : 'Prochain : ' + whenText(nextWater(p, s, rainFor(p.zone_id)))}</span></div>
        <Btn variant={wateredToday ? 'eau' : 'plein'} onClick={onWater} disabled={water.isPending || wateredToday}>{wateredToday ? 'Arrosée aujourd’hui' : 'J’ai arrosé'}</Btn>
      </div>
      <div className="flex flex-col gap-2 rounded-carte bg-white p-4">
        <h2 className="font-titre text-lg font-semibold">Ses voisines</h2>
        {nb.good.length > 0 && <p className="text-sm"><b className="text-vert">Bonnes voisines :</b> {nb.good.map(i => lc(byId.get(i)!.name)).join(', ')}</p>}
        {nb.bad.length > 0 && <p className="text-sm"><b className="text-alerte">À éloigner :</b> {nb.bad.map(i => lc(byId.get(i)!.name)).join(', ')}</p>}
        {!nb.good.length && !nb.bad.length && <p className="text-sm text-gris">Pas de voisine qui l’aide ou la gêne.</p>}
        {s.notes && <p className="rounded-2xl bg-soleil-doux px-3 py-2.5 text-sm font-bold text-soleil-encre">{s.notes}</p>}
      </div>
      <Pests key={s.id} pests={s.pests} treatment={s.pests_treatment} />
      <Link to={`/glossaire/${s.slug}`} className="flex min-h-14 items-center justify-between rounded-carte bg-white px-4 font-extrabold text-vert">Fiche complète : {lc(s.name)}<span aria-hidden>→</span></Link>
      {ready && <Btn variant="doux" onClick={() => remove(true)} disabled={update.isPending}>Récolte terminée, libérer les cases</Btn>}
      {confirm ? (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-alerte-doux p-4 text-[#6B2418]">
          <p className="font-extrabold">Retirer cette plantation ({placeText(p)}) ?</p>
          <div className="flex gap-2"><Btn variant="danger" onClick={() => remove(false)}>Retirer</Btn><Btn variant="contour" onClick={() => setConfirm(false)}>Annuler</Btn></div>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)} className="min-h-11 self-center font-extrabold text-alerte">Retirer la plantation</button>
      )}
    </Page>
  );
}
