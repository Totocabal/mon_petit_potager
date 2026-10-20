import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useTasks } from '../lib/data';
import { monthPlan } from '../lib/calendar';
import { cap, fmt, iso, MOIS, parse, today } from '../lib/dates';
import { isThirsty } from '../lib/garden';
import { BottomNav, Loading, Page, Select, Tile } from '../components/ui';
import { SpeciesLinks } from '../components/SpeciesLinks';

export default function MyCalendar() {
  const { garden, crops, byId, zones, loading, rainFor, varietyById } = useApp();
  const tasks = useTasks(garden.id);
  const now = today();
  const [offset, setOffset] = useState('0');
  const selected = new Date(now.getFullYear(), now.getMonth() + Number(offset), 1);
  const plan = monthPlan({ crops, byId, tasks: tasks.data ?? [], year: selected.getFullYear(), month: selected.getMonth() + 1, now });
  const water = new Map<string, { id: string; name: string; slug: string; zoneId: string }>();
  if (offset === '0') for (const p of crops) {
    const s = byId.get(p.species_id);
    if (!p.removed_at && parse(p.sown_at) <= now && isThirsty(p, s, rainFor(p.zone_id), now)) {
      water.set(`${p.species_id}|${p.zone_id}`, { id: p.id, name: s!.name, slug: s!.slug, zoneId: p.zone_id });
    }
  }
  const zoneName = (id: string | null) => zones.find(z => z.id === id)?.name;
  if (loading) return <Loading />;

  return (
    <Page nav>
      <div className="pt-6 lg:pt-0">
        <h1 className="font-titre text-[31px] font-semibold text-vert">Mon Calendrier</h1>
        <p className="mt-1 font-bold text-gris">Les gestes à prévoir dans {garden.name}.</p>
      </div>
      <Select label="Mois de mon calendrier" value={offset} onChange={setOffset} options={Array.from({ length: 12 }, (_, i) => {
        const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
        return { value: String(i), label: `${cap(MOIS[date.getMonth()])} ${date.getFullYear()}` };
      })} />
      {!plan.cultivated.length && <Link to="/potager" className="rounded-carte bg-vert-doux p-4 font-bold text-vert">Ajoutez des plantes à votre potager pour retrouver ici leurs semis, plantations et récoltes →</Link>}
      {offset === '0' && (
        <CalendarSection title="À arroser aujourd’hui">
          {water.size ? [...water].map(([key, p]) => (
            <Link key={key} to={`/zones/${p.zoneId}`} className="flex min-h-11 items-center gap-3 rounded-2xl bg-eau/10 p-3">
              <Tile slug={p.slug} w={36} h={36} size={30} round={12} />
              <span><b className="block font-extrabold">{p.name}</b><span className="text-sm text-gris">{zoneName(p.zoneId)}</span></span>
            </Link>
          )) : <p className="text-sm text-gris">Aucun arrosage signalé aujourd’hui.</p>}
          <p className="text-xs text-gris">Selon vos alertes et la pluie récente ; les zones sous abri restent à arroser.</p>
        </CalendarSection>
      )}
      <CalendarSection title="Semis sous abri">
        {plan.indoor.length ? <SpeciesLinks list={plan.indoor} /> : <p className="text-sm text-gris">Aucun semis sous abri pour vos espèces ce mois-ci.</p>}
      </CalendarSection>
      <CalendarSection title="Semis en place et plantations">
        {plan.outdoor.length ? <SpeciesLinks list={plan.outdoor} /> : <p className="text-sm text-gris">Aucun semis en place ni plantation pour vos espèces ce mois-ci.</p>}
        <p className="text-xs text-gris">Périodes possibles pour renouveler les espèces de votre potager. Ouvrez une fiche pour les conseils de culture.</p>
      </CalendarSection>
      <CalendarSection title="Récoltes prévues">
        {plan.harvest.length ? plan.harvest.map(h => (
          <Link key={`${h.planting.id}|${h.date}`} to={h.count > 1 ? `/zones/${h.planting.zone_id}` : `/plantes/${h.planting.id}`} className="flex min-h-11 items-center gap-3 rounded-2xl bg-soleil-doux p-3">
            <Tile slug={h.species.slug} w={40} h={40} size={32} round={12} />
            <span className="min-w-0 flex-1">
              <b className="block font-extrabold">{h.species.name}{h.planting.variety_id && varietyById.get(h.planting.variety_id) ? ` · ${varietyById.get(h.planting.variety_id)!.name}` : ''}</b>
              <span className="block text-sm text-gris">{zoneName(h.planting.zone_id)}{h.count > 1 ? ` · ${h.count} emplacements` : ''}</span>
              <span className="text-sm font-bold text-vert">{h.date === iso(now) ? 'Dès maintenant' : `À partir du ${fmt(parse(h.date))}`}</span>
            </span>
          </Link>
        )) : <p className="text-sm text-gris">Aucune récolte prévue pour vos plantations ce mois-ci.</p>}
        <p className="text-xs text-gris">Estimations selon la saison, la date de plantation et le délai de la variété lorsqu’il est renseigné. Vérifiez la maturité sur place.</p>
      </CalendarSection>
      <CalendarSection title="Tâches du mois">
        {tasks.isPending ? <p className="text-sm text-gris">Chargement des tâches…</p> : tasks.isError ? <p className="text-sm text-alerte">Impossible de charger les tâches. Réessayez depuis la page des tâches.</p> : plan.tasks.length ? plan.tasks.map(t => (
          <Link key={t.id} to="/taches" className="flex min-h-11 flex-col justify-center rounded-2xl bg-fond p-3">
            <b className="font-extrabold">{t.title}</b>
            <span className="text-sm text-gris">{t.due_date < iso(now) ? 'En retard · ' : ''}{fmt(parse(t.due_date))}{zoneName(t.zone_id) ? ` · ${zoneName(t.zone_id)}` : ''}</span>
          </Link>
        )) : <p className="text-sm text-gris">Aucune tâche prévue ce mois-ci.</p>}
        <Link to="/taches" className="flex min-h-11 items-center font-extrabold text-vert">Gérer mes tâches →</Link>
      </CalendarSection>
      <Link to="/almanach" className="flex min-h-11 items-center justify-center rounded-2xl bg-vert-doux p-3 font-extrabold text-vert">Explorer toutes les plantes dans l’Almanach →</Link>
      <BottomNav />
    </Page>
  );
}

function CalendarSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4"><h2 className="font-titre text-lg font-semibold">{title}</h2>{children}</section>;
}
