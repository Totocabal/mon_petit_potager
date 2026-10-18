import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useTasks, useToggleTask, useWater } from '../lib/data';
import { TaskSheet } from '../components/TaskSheet';
import { BottomNav, Loading, Page, Tile, useToast } from '../components/ui';
import { ageDays, isReady, lc, needsWater } from '../lib/garden';
import { addDays, longDate, today, iso, parse, diffDays, whenText } from '../lib/dates';
import { RAIN_MM, rainOn, SKY_LABEL, skyOf, type Weather } from '../lib/weather';
import { WeatherIcon } from '../components/WeatherIcon';
import type { Planting } from '../lib/types';

export default function Home() {
  const { profile, plantings, zones, byId, loading, garden, weather, rainFor } = useApp();
  const water = useWater();
  const { session } = useApp();
  const tasks = useTasks(garden.id);
  const toggle = useToggleTask(garden.id, session.user.id);
  const [adding, setAdding] = useState(false);
  const dueTasks = (tasks.data ?? []).filter(t => !t.done_at && diffDays(parse(t.due_date), today()) <= 0);
  const toast = useToast();

  const groups = useMemo(() => {
    const harvest = new Map<string, Planting[]>(), thirsty = new Map<string, Planting[]>();
    for (const p of plantings) {
      const s = byId.get(p.species_id); if (!s) continue;
      const key = p.species_id + '|' + p.zone_id;
      if (isReady(p, s)) harvest.set(key, [...(harvest.get(key) ?? []), p]);
      if (p.alerts_enabled && needsWater(p, s, undefined, rainFor(p.zone_id))) thirsty.set(key, [...(thirsty.get(key) ?? []), p]);
    }
    return { harvest: [...harvest.values()], thirsty: [...thirsty.values()] };
  }, [plantings, byId, rainFor]);

  if (loading) return <Loading />;
  const zoneName = (id: string) => zones.find(z => z.id === id)?.name ?? '';
  const recent = plantings.slice().sort((a, b) => ageDays(a) - ageDays(b)).slice(0, 10);

  return (
    <Page nav>
      <div className="pt-6">
        <p className="font-bold text-gris">{longDate(today())}</p>
        <h1 className="mt-1 font-titre text-[31px] font-semibold text-vert">Bonjour{profile?.first_name ? ' ' + profile.first_name : ''} !</h1>
        <p className="font-bold text-gris">{garden.name}</p>
      </div>

      {weather ? <WeatherCard weather={weather} thirsty={groups.thirsty.length} /> : !profile?.lat && <Link to="/profil" className="rounded-carte bg-white p-4 font-bold text-vert">Ajoutez votre ville pour voir la météo et éviter d’arroser sous la pluie →</Link>}

      <h2 className="font-titre text-xl font-semibold">Aujourd’hui au jardin</h2>
      <div className="rounded-carte bg-white px-4 py-1">
        {groups.thirsty.map(ps => {
          const s = byId.get(ps[0].species_id)!;
          return (
            <div key={'w' + ps[0].id} className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait last:border-0">
              <Tile slug={s.slug} w={40} h={40} size={32} round={12} />
              <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">Arroser : {lc(s.name)}</b><span className="text-[13px] text-gris">{zoneName(ps[0].zone_id)}</span></span>
              <button onClick={async () => { await water.mutateAsync(ps); toast(`Arrosage noté : ${lc(s.name)}`); }} className="min-h-10 rounded-xl bg-ciel px-3 text-[13px] font-extrabold text-ciel-encre">C’est fait</button>
            </div>
          );
        })}
        {groups.harvest.map(ps => {
          const s = byId.get(ps[0].species_id)!;
          return (
            <Link key={'h' + ps[0].id} to={`/plantes/${ps[0].id}`} className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait last:border-0">
              <Tile slug={s.slug} w={40} h={40} size={32} round={12} />
              <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">Récolter : {lc(s.name)}</b><span className="text-[13px] text-gris">{zoneName(ps[0].zone_id)}</span></span>
              <span className="rounded-full bg-soleil px-2.5 py-0.5 text-xs font-extrabold text-soleil-encre">Prête</span>
            </Link>
          );
        })}
        {dueTasks.map(t => (
          <div key={t.id} className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait last:border-0">
            <button aria-label={`Terminer : ${t.title}`} onClick={async () => { await toggle.mutateAsync({ id: t.id, done: true }); toast('Tâche terminée'); }} className="h-10 w-10 shrink-0 rounded-full border-2 border-vert" />
            <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">{t.title}</b><span className="text-[13px] text-gris">{diffDays(parse(t.due_date), today()) < 0 ? 'En retard' : whenText(parse(t.due_date))}{zoneName(t.zone_id!) ? ' · ' + zoneName(t.zone_id!) : ''}</span></span>
          </div>
        ))}
        {!groups.thirsty.length && !groups.harvest.length && !dueTasks.length && <p className="py-4 text-gris">Rien à faire aujourd’hui. Profitez-en pour regarder pousser.</p>}
      </div>

      <div className="flex gap-2.5">
        <button onClick={() => setAdding(true)} className="min-h-11 flex-1 rounded-2xl bg-vert-doux font-extrabold text-vert">+ Tâche</button>
        <Link to="/taches" className="flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-white font-extrabold text-vert">Toutes les tâches</Link>
      </div>

      <div className="flex items-baseline justify-between"><h2 className="font-titre text-xl font-semibold">Mes plantes</h2><Link to="/potager" className="font-extrabold text-vert">Tout voir</Link></div>
      {recent.length ? (
        <div className="no-scrollbar -mr-4 flex gap-3 overflow-x-auto pb-1">
          {recent.map(p => {
            const s = byId.get(p.species_id)!;
            return (
              <Link key={p.id} to={`/plantes/${p.id}`} className="flex w-[108px] shrink-0 flex-col items-center gap-1 rounded-carte bg-white p-2.5">
                <Tile slug={s.slug} w={88} h={72} size={58} round={18} />
                <b className="text-center text-sm font-extrabold">{s.name}</b>
                <span className="text-xs text-gris">Jour {ageDays(p)}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <Link to="/potager" className="rounded-carte bg-white p-4 font-bold text-vert">Commencez par créer une zone et y planter quelque chose →</Link>
      )}
      {adding && <TaskSheet onClose={() => setAdding(false)} />}
      <BottomNav />
    </Page>
  );
}

function WeatherCard({ weather, thirsty }: { weather: Weather; thirsty: number }) {
  const t = iso(today());
  const tomorrow = iso(addDays(today(), 1));
  const day = weather.days.find(d => d.date === t);
  if (!day) return null;
  const code = weather.current?.code ?? day.code;
  const temp = weather.current?.temp ?? day.tmax;
  const sky = skyOf(code);
  const rainToday = rainOn(weather, t), rainTomorrow = rainOn(weather, tomorrow);
  const line = rainToday >= 0.5 ? `Pluie prévue aujourd’hui (${Math.round(rainToday)} mm)` : rainTomorrow >= 0.5 ? `Pluie prévue demain (${Math.round(rainTomorrow)} mm)` : `Pas de pluie prévue · ${day.tmin}° / ${day.tmax}°`;
  const pill = rainToday >= RAIN_MM ? 'Pas d’arrosage aujourd’hui' : thirsty > 0 ? `${thirsty} à arroser aujourd’hui` : null;
  return (
    <div className="flex items-center gap-4 rounded-[28px] bg-[#D3EAEE] px-5 py-[18px]">
      <WeatherIcon sky={sky} />
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-titre text-[28px] font-semibold leading-tight text-[#1F4D5A]">{temp}° <span className="text-base font-medium">{SKY_LABEL[sky]}</span></p>
        <p className="text-sm text-[#2C5A66]">{line}</p>
        {pill && <p className="mt-1 self-start rounded-full bg-white px-3 py-[5px] text-[13px] font-extrabold text-vert">{pill}</p>}
      </div>
    </div>
  );
}
