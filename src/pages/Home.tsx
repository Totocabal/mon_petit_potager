import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useWater } from '../lib/data';
import { BottomNav, Loading, Page, Tile, useToast } from '../components/ui';
import { ageDays, isReady, lc, needsWater } from '../lib/garden';
import { longDate, today } from '../lib/dates';
import type { Planting } from '../lib/types';

export default function Home() {
  const { profile, plantings, zones, byId, loading, garden } = useApp();
  const water = useWater();
  const toast = useToast();

  const groups = useMemo(() => {
    const harvest = new Map<string, Planting[]>(), thirsty = new Map<string, Planting[]>();
    for (const p of plantings) {
      const s = byId.get(p.species_id); if (!s) continue;
      const key = p.species_id + '|' + p.zone_id;
      if (isReady(p, s)) harvest.set(key, [...(harvest.get(key) ?? []), p]);
      if (p.alerts_enabled && needsWater(p, s)) thirsty.set(key, [...(thirsty.get(key) ?? []), p]);
    }
    return { harvest: [...harvest.values()], thirsty: [...thirsty.values()] };
  }, [plantings, byId]);

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
        {!groups.thirsty.length && !groups.harvest.length && <p className="py-4 text-gris">Rien à faire aujourd’hui. Profitez-en pour regarder pousser.</p>}
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
      <BottomNav />
    </Page>
  );
}
