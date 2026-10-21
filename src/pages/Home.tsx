import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useTasks, useToggleTask, useWater } from '../lib/data';
import { TaskSheet } from '../components/TaskSheet';
import { BottomNav, Btn, Icon, Loading, Page, Sheet, Tile, useToast } from '../components/ui';
import { DropBadge } from '../components/garden';
import { ageDays, isReady, isThirsty, needsWater, nf, plantCount } from '../lib/garden';
import { addDays, fmt, longDate, today, iso, parse, diffDays, whenText } from '../lib/dates';
import { RAIN_MM, rainOn, SKY_LABEL, skyOf, type Weather } from '../lib/weather';
import { WeatherIcon } from '../components/WeatherIcon';
import { WeatherBackdrop } from '../components/WeatherBackdrop';
import type { Planting, Task } from '../lib/types';

export default function Home() {
  const { profile, crops, zones, byId, loading, garden, weather, rainFor, varietyById } = useApp();
  const { session } = useApp();
  const tasks = useTasks(garden.id);
  const toggle = useToggleTask(garden.id, session.user.id);
  const [adding, setAdding] = useState(false);
  const [watering, setWatering] = useState(false);
  const [harvesting, setHarvesting] = useState(false);
  const dueTasks = (tasks.data ?? []).filter(t => !t.done_at && diffDays(parse(t.due_date), today()) <= 0);
  const toast = useToast();

  const groups = useMemo(() => {
    const harvest = new Map<string, Planting[]>(), thirsty = new Map<string, Planting[]>();
    for (const p of crops) {
      const s = byId.get(p.species_id); if (!s) continue;
      const key = p.species_id + '|' + p.zone_id;
      if (isReady(p, s)) harvest.set(key, [...(harvest.get(key) ?? []), p]);
      if (p.alerts_enabled && needsWater(p, s, undefined, rainFor(p.zone_id))) thirsty.set(key, [...(thirsty.get(key) ?? []), p]);
    }
    return { harvest: [...harvest.values()], thirsty: [...thirsty.values()] };
  }, [crops, byId, rainFor]);

  // « Mes plantes » : une carte par espèce et par zone (et non par plantation), celles qui demandent un geste d'abord
  const mine = useMemo(() => {
    const by = new Map<string, Planting[]>();
    for (const p of crops) if (byId.has(p.species_id)) by.set(p.species_id + '|' + p.zone_id, [...(by.get(p.species_id + '|' + p.zone_id) ?? []), p]);
    return [...by.values()].map(ps => {
      const s = byId.get(ps[0].species_id)!;
      const rain = rainFor(ps[0].zone_id);
      return {
        key: ps[0].species_id + '|' + ps[0].zone_id, s, zoneId: ps[0].zone_id, ps,
        plants: ps.reduce((t, p) => t + plantCount(p, s), 0),
        thirsty: ps.filter(p => isThirsty(p, s, rain)).length,
        ready: ps.some(p => isReady(p, s)),
        age: Math.min(...ps.map(p => ageDays(p))),
        // La variété s'affiche quand toutes les plantations du groupe ont la même
        variety: new Set(ps.map(p => p.variety_id)).size === 1 && ps[0].variety_id ? varietyById.get(ps[0].variety_id)?.name ?? null : null
      };
    }).sort((a, b) => Number(b.thirsty > 0) - Number(a.thirsty > 0) || Number(b.ready) - Number(a.ready) || a.age - b.age);
  }, [crops, byId, rainFor, varietyById]);

  if (loading) return <Loading />;
  const zoneName = (id: string) => zones.find(z => z.id === id)?.name ?? '';
  const todayDay = weather?.days.find(d => d.date === iso(today()));
  const todaySky = weather ? skyOf(weather.current?.code ?? todayDay?.code ?? 0) : null;
  const recent = mine.slice(0, 12);

  return (
    <Page nav wide>
      <WeatherBackdrop sky={todaySky} />
      <div className="flex items-start justify-between gap-3 pt-6 lg:pt-0">
        <div className="min-w-0">
          <p className="font-bold text-gris">{longDate(today())}</p>
          <h1 className="mt-1 font-titre text-[31px] font-semibold text-vert">Bonjour{profile?.first_name ? ' ' + profile.first_name : ''} !</h1>
          <p className="font-bold text-gris">{garden.name}</p>
        </div>
        <Link to="/alertes" aria-label={groups.thirsty.length ? `Alertes d’arrosage : ${groups.thirsty.length} à arroser` : 'Alertes d’arrosage'} className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-white text-vert shadow-[0_4px_12px_rgba(46,107,63,0.12)]">
          <Icon name="bell" size={32} />
          {groups.thirsty.length > 0 && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#E2553F]" />}
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:items-start lg:gap-6">
      <div className="flex flex-col gap-4 lg:gap-5">
      {weather ? <WeatherCard weather={weather} thirsty={groups.thirsty.length} /> : !profile?.lat && <Link to="/profil" className="rounded-carte bg-white p-4 font-bold text-vert">Ajoutez votre ville pour voir la météo et éviter d’arroser sous la pluie →</Link>}

      <TodayCard
        thirsty={groups.thirsty} harvest={groups.harvest} tasks={dueTasks} zoneName={zoneName}
        onWater={() => setWatering(true)} onHarvest={() => setHarvesting(true)}
        onTask={async id => { await toggle.mutateAsync({ id, done: true }); toast('Tâche terminée'); }} onAdd={() => setAdding(true)} />
      </div>

      <div className="flex flex-col gap-4 lg:gap-5 lg:rounded-[28px] lg:bg-white lg:p-6">

      <div className="flex items-baseline justify-between"><h2 className="font-titre text-xl font-semibold">Mes plantes</h2><Link to="/potager" className="font-extrabold text-vert">Tout voir</Link></div>
      {recent.length ? (
        <div className="no-scrollbar -mr-4 flex gap-3 overflow-x-auto pb-1 lg:mr-0 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] lg:gap-3.5 lg:overflow-visible lg:pb-0">
          {recent.map(g => (
            <Link key={g.key} to={g.ps.length === 1 ? `/plantes/${g.ps[0].id}` : `/zones/${g.zoneId}`}
              aria-label={`${g.s.name}, ${zoneName(g.zoneId)}, ${nf(g.plants)} plant${g.plants > 1 ? 's' : ''}${g.thirsty ? ', à arroser' : ''}${g.ready ? ', à récolter' : ''}`}
              className={`squish relative flex w-[124px] shrink-0 flex-col items-center gap-0.5 rounded-carte bg-white p-2.5 lg:w-auto lg:bg-fond lg:px-2.5 lg:py-3.5 ${g.ready ? 'shadow-[inset_0_0_0_3px_#F6C445]' : ''}`}>
              <span className="relative"><Tile slug={g.s.slug} w={88} h={72} size={58} round={18} />{g.thirsty > 0 && <DropBadge size={20} className="!-right-1.5 !-top-1.5" />}</span>
              <b className="mt-1 text-center text-sm font-extrabold leading-tight">{g.s.name}</b>
              {g.variety && <span className="max-w-full truncate text-[11px] font-extrabold text-vert">{g.variety}</span>}
              <span className="max-w-full truncate rounded-full bg-vert-doux px-2 py-0.5 text-[11px] font-extrabold text-vert">{zoneName(g.zoneId)}</span>
              <span className="text-xs font-bold text-gris">{nf(g.plants)} plant{g.plants > 1 ? 's' : ''}</span>
              <span className="text-center text-[11px] leading-tight text-gris">{g.thirsty ? <b className="text-eau">à arroser</b> : g.ready ? <b className="text-[#8A6A00]">à récolter</b> : g.age < 0 ? `Prévue le ${fmt(parse(g.ps[0].sown_at))}` : g.ps.length > 1 ? `${g.ps.length} emplacements` : `Jour ${g.age}`}</span>
            </Link>
          ))}
        </div>
      ) : (
        <Link to="/potager" className="rounded-carte bg-white p-4 font-bold text-vert">Commencez par créer une zone et y planter quelque chose →</Link>
      )}
      </div>
      </div>
      {adding && <TaskSheet onClose={() => setAdding(false)} />}
      {watering && <WaterSheet groups={groups.thirsty} zoneName={zoneName} onClose={() => setWatering(false)} onDone={n => { setWatering(false); toast(`Arrosage noté · ${n} plante${n > 1 ? 's' : ''}`); }} />}
      {harvesting && <HarvestSheet groups={groups.harvest} zoneName={zoneName} onClose={() => setHarvesting(false)} />}
      <BottomNav />
    </Page>
  );
}

const MAX_TASKS = 3;

/** « Aujourd’hui » : les gestes regroupés (un bouton pour tout arroser, un résumé des récoltes), puis les tâches du jour. */
function TodayCard({ thirsty, harvest, tasks, zoneName, onWater, onHarvest, onTask, onAdd }: {
  thirsty: Planting[][]; harvest: Planting[][]; tasks: Task[]; zoneName: (id: string) => string;
  onWater: () => void; onHarvest: () => void; onTask: (id: string) => Promise<void>; onAdd: () => void;
}) {
  const nWater = thirsty.reduce((t, g) => t + g.length, 0), nHarvest = harvest.reduce((t, g) => t + g.length, 0);
  const shown = tasks.slice(0, MAX_TASKS);
  const gestures = (nWater ? 1 : 0) + (nHarvest ? 1 : 0) + tasks.length;
  const where = (gs: Planting[][]) => [...new Set(gs.map(g => zoneName(g[0].zone_id)))].slice(0, 3).join(', ');
  return (
    <section aria-labelledby="h-today" className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><h2 id="h-today" className="font-titre text-xl font-semibold">Aujourd’hui</h2>{gestures > 0 && <span className="rounded-full bg-vert-doux px-2.5 py-0.5 text-xs font-extrabold text-vert">{gestures} geste{gestures > 1 ? 's' : ''}</span>}</div>
      <div className="flex flex-col rounded-carte bg-white px-4 py-2">
        {nWater > 0 && (
          <div className="flex flex-col gap-2.5 border-b border-dashed border-trait py-2.5">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ciel text-eau"><Icon name="drop" /></span>
              <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">Arroser</b><span className="truncate text-[13px] text-gris">{nWater} plante{nWater > 1 ? 's' : ''} · {where(thirsty)}</span></span>
            </div>
            <Btn variant="eau" onClick={onWater} className="!min-h-11 !text-[15px]">Tout arroser · {nWater} plante{nWater > 1 ? 's' : ''}</Btn>
          </div>
        )}
        {nHarvest > 0 && (
          <button type="button" onClick={onHarvest} className="squish flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait text-left">
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-soleil-doux text-soleil-encre"><Icon name="basket" /></span>
            <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">Récolter</b><span className="truncate text-[13px] text-gris">{nHarvest} plante{nHarvest > 1 ? 's' : ''} prête{nHarvest > 1 ? 's' : ''}</span></span>
            <span className="font-extrabold text-vert">Voir →</span>
          </button>
        )}
        {shown.map(t => (
          <div key={t.id} className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait py-1.5 last:border-0">
            <button aria-label={`Terminer : ${t.title}`} onClick={() => onTask(t.id)} className="flex h-11 w-11 shrink-0 items-center justify-center"><span className="h-8 w-8 rounded-full border-2 border-vert" /></button>
            <span className="flex min-w-0 flex-1 flex-col"><b className="font-extrabold">{t.title}</b><span className={`truncate text-[13px] ${diffDays(parse(t.due_date), today()) < 0 ? 'font-extrabold text-alerte' : 'text-gris'}`}>{diffDays(parse(t.due_date), today()) < 0 ? 'En retard' : whenText(parse(t.due_date))}{t.zone_id && zoneName(t.zone_id) ? ' · ' + zoneName(t.zone_id) : ''}</span></span>
          </div>
        ))}
        {gestures === 0 && <p className="py-4 text-gris">Rien à faire aujourd’hui. Profitez-en pour regarder pousser.</p>}
        {tasks.length > MAX_TASKS && <Link to="/taches" className="flex min-h-11 items-center justify-center font-extrabold text-vert">+ {tasks.length - MAX_TASKS} autre{tasks.length - MAX_TASKS > 1 ? 's' : ''} tâche{tasks.length - MAX_TASKS > 1 ? 's' : ''}</Link>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onAdd} className="squish flex min-h-11 items-center gap-1.5 rounded-2xl bg-vert-doux px-3 font-extrabold text-vert"><Icon name="plus" size={22} />Tâche</button>
        <Link to="/mon-calendrier" className="flex min-h-11 items-center font-extrabold text-vert">Tout le calendrier →</Link>
      </div>
    </section>
  );
}

/** « Tout arroser » : la liste des plantes à arroser, à décocher au besoin, validée d’un seul bouton. */
function WaterSheet({ groups, zoneName, onClose, onDone }: { groups: Planting[][]; zoneName: (id: string) => string; onClose: () => void; onDone: (n: number) => void }) {
  const { byId, varietyById } = useApp();
  const water = useWater();
  const [off, setOff] = useState<Set<string>>(new Set());
  const keyOf = (g: Planting[]) => g[0].species_id + '|' + g[0].zone_id;
  const chosen = groups.filter(g => !off.has(keyOf(g))).flat();
  const flip = (k: string) => setOff(prev => { const n = new Set(prev); if (!n.delete(k)) n.add(k); return n; });
  return (
    <Sheet title={`À arroser · ${groups.reduce((t, g) => t + g.length, 0)} plantes`} onClose={onClose} reserveSpace={false}>
      <p className="-mt-1 text-[13px] text-gris">Décochez celles que vous avez déjà arrosées.</p>
      <ul className="flex flex-col">
        {groups.map(g => {
          const s = byId.get(g[0].species_id)!, k = keyOf(g), on = !off.has(k);
          const v = g[0].variety_id ? varietyById.get(g[0].variety_id)?.name : null;
          return (
            <li key={k}>
              <button type="button" role="checkbox" aria-checked={on} onClick={() => flip(k)} className="flex min-h-[58px] w-full items-center gap-3 border-b border-dashed border-trait text-left last:border-0">
                <Tile slug={s.slug} w={40} h={40} size={32} round={12} />
                <span className="flex min-w-0 flex-1 flex-col"><b className="truncate font-extrabold">{s.name}{v ? ` (${v})` : ''}{g.length > 1 ? ` · ${g.length}` : ''}</b><span className="truncate text-[13px] text-gris">{zoneName(g[0].zone_id)}</span></span>
                <span aria-hidden="true" className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-extrabold ${on ? 'border-vert bg-vert text-white' : 'border-vert text-transparent'}`}>✓</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Btn variant="eau" disabled={!chosen.length || water.isPending} onClick={async () => { await water.mutateAsync(chosen); onDone(chosen.length); }}>
        {water.isPending ? 'Enregistrement…' : chosen.length ? `J’ai arrosé ${chosen.length} plante${chosen.length > 1 ? 's' : ''}` : 'Rien à arroser'}
      </Btn>
      {water.isError && <p className="text-sm font-bold text-alerte">{(water.error as Error).message}</p>}
    </Sheet>
  );
}

/** Les plantes prêtes à être récoltées, chacune avec un lien vers sa plantation ou sa zone. */
function HarvestSheet({ groups, zoneName, onClose }: { groups: Planting[][]; zoneName: (id: string) => string; onClose: () => void }) {
  const { byId } = useApp();
  return (
    <Sheet title={`À récolter · ${groups.reduce((t, g) => t + g.length, 0)} plantes`} onClose={onClose} reserveSpace={false}>
      <ul className="flex flex-col">
        {groups.map(g => {
          const s = byId.get(g[0].species_id)!;
          return (
            <li key={g[0].id}>
              <Link to={g.length > 1 ? `/zones/${g[0].zone_id}` : `/plantes/${g[0].id}`} onClick={onClose} className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait last:border-0">
                <Tile slug={s.slug} w={40} h={40} size={32} round={12} />
                <span className="flex min-w-0 flex-1 flex-col"><b className="truncate font-extrabold">{s.name}{g.length > 1 ? ` · ${g.length}` : ''}</b><span className="truncate text-[13px] text-gris">{zoneName(g[0].zone_id)}</span></span>
                <span className="rounded-full bg-soleil px-2.5 py-0.5 text-xs font-extrabold text-soleil-encre">Prête</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Sheet>
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
    <Link to="/meteo" aria-label="Voir les prévisions météo" className="flex items-center gap-4 rounded-[28px] bg-[#D3EAEE] px-5 py-[18px]">
      <WeatherIcon sky={sky} animate />
      <div className="flex min-w-0 flex-col gap-1 leading-[normal]">
        <p className="font-titre text-[28px] font-semibold text-[#1F4D5A]">{temp}° <span className="text-base font-medium">{SKY_LABEL[sky]}</span></p>
        <p className="text-sm text-[#2C5A66]">{line}</p>
        {pill && <p className="mt-1 self-start rounded-full bg-white px-3 py-[5px] text-[13px] font-extrabold text-vert">{pill}</p>}
      </div>
      <span aria-hidden="true" className="ml-auto self-center pl-1 text-xl font-extrabold text-[#1F4D5A]">›</span>
    </Link>
  );
}
