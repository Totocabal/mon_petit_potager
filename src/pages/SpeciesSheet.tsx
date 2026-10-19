import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BackHeader, Page, Tile } from '../components/ui';
import { categoryLabel, DIFFICULTY_LABEL } from '../lib/glossary';
import { footprintText, isMulti, isSol, lc, rel } from '../lib/garden';
import { MOIS, today } from '../lib/dates';
import type { Species } from '../lib/types';

const LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const HEIGHT = { basse: 'Basse', moyenne: 'Moyenne', haute: 'Haute' } as const;

/** Fiche détaillée d'une plante : en un coup d'œil, calendrier, conseils et voisines. */
export default function SpeciesSheet() {
  const { slug } = useParams();
  const { bySlug, species, rels, crops, zones, loading } = useApp();
  const s = slug ? bySlug.get(slug) : undefined;

  const neighbours = useMemo(() => {
    if (!s) return { good: [], bad: [] };
    const out = { good: [] as { o: Species; why: string | null }[], bad: [] as { o: Species; why: string | null }[] };
    for (const o of species) {
      if (o.id === s.id || isSol(o)) continue;
      const c = rel(rels, s.id, o.id);
      if (c?.relation === 'good') out.good.push({ o, why: c.reason });
      if (c?.relation === 'bad') out.bad.push({ o, why: c.reason });
    }
    return out;
  }, [s, species, rels]);

  if (loading) return null;
  if (!s || isSol(s)) return <Page><BackHeader title="Plante introuvable" /><Link to="/glossaire" className="font-extrabold text-vert">Retour au glossaire →</Link></Page>;

  const mine = crops.filter(p => p.species_id === s.id);
  const where = [...new Set(mine.map(p => zones.find(z => z.id === p.zone_id)?.name).filter(Boolean))] as string[];
  const month = today().getMonth() + 1;
  const facts: [string, string][] = [
    ['Exposition', s.exposure === 'soleil' ? 'Plein soleil' : 'Mi-ombre'],
    ['Arrosage', s.water_every_days === 1 ? 'Tous les jours' : `Tous les ${s.water_every_days} j`],
    ['Hauteur', HEIGHT[s.height]],
    ['Distances', `${s.inrow_spacing_cm} cm entre plants, ${s.row_spacing_cm} cm entre rangs`],
    ['Dans la grille', isMulti(s) ? `1 plant sur ${footprintText(s)} cases` : `${s.plants_per_cell} plant${s.plants_per_cell > 1 ? 's' : ''} par case`],
  ];
  if (s.sow_depth_cm != null) facts.push(['Profondeur', `${String(s.sow_depth_cm).replace('.', ',')} cm`]);
  if (s.germination_days != null) facts.push(['Levée', `${s.germination_days} jours`]);
  if (s.days_to_harvest != null) facts.push(['Jusqu’à la récolte', `${s.days_to_harvest} jours`]);

  return (
    <Page>
      <BackHeader kicker={categoryLabel(s.category)} title={s.name} />
      <div className="flex items-center gap-4">
        <Tile slug={s.slug} w={104} h={104} size={84} round={28} />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            {s.difficulty && <Badge>{DIFFICULTY_LABEL[s.difficulty]}</Badge>}
            {s.perennial && <Badge>Vivace</Badge>}
            {s.frost_sensitive && <Badge tone="froid">Craint le gel</Badge>}
            <Badge>{s.family}</Badge>
          </div>
          {s.description && <p className="text-[15px] font-bold">{s.description}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-0.5 rounded-[20px] bg-white p-3"><span className="text-xs font-bold text-gris">{k}</span><b className="font-titre text-[15px] font-semibold leading-snug">{v}</b></div>
        ))}
      </div>

      <section className="flex flex-col gap-3 rounded-carte bg-white p-4" aria-labelledby="h-cal">
        <h2 id="h-cal" className="font-titre text-lg font-semibold">Calendrier</h2>
        <MonthRow label="Semis sous abri" months={s.sow_indoor_months} month={month} color="bg-eau" />
        <MonthRow label="Plantation ou semis en place" months={s.plant_out_months} month={month} color="bg-vert" />
        <MonthRow label="Récolte" months={s.harvest_months} month={month} color="bg-soleil" />
        <p className="text-xs text-gris">Les mois à repérer sont colorés ; le mois en cours est entouré.</p>
      </section>

      <Block title="Semis et plantation">{s.sowing}</Block>
      <Block title="Sol et exposition">{s.soil}</Block>
      <Block title="Entretien">{s.care}</Block>
      <Block title="Ravageurs et maladies">{s.pests}</Block>
      <Block title="Récolte et conservation">{s.harvest_tips}</Block>
      {s.rotation_years != null && <Block title="Rotation">{`Famille des ${s.family}. Ne replantez pas une plante de cette famille au même endroit avant ${s.rotation_years} ans, pour limiter maladies et épuisement du sol. L’application vous prévient et évite ces cases quand elle génère un plan.`}</Block>}
      {s.notes && <p className="rounded-2xl bg-soleil-doux px-3 py-2.5 text-sm font-bold text-soleil-encre">{s.notes}</p>}

      {(neighbours.good.length > 0 || neighbours.bad.length > 0) && (
        <section className="flex flex-col gap-3 rounded-carte bg-white p-4" aria-labelledby="h-voisines">
          <h2 id="h-voisines" className="font-titre text-lg font-semibold">Ses voisines</h2>
          <Neigh title="Bonnes voisines" tone="text-vert" list={neighbours.good} />
          <Neigh title="À éloigner" tone="text-alerte" list={neighbours.bad} />
        </section>
      )}

      <div className="rounded-carte bg-vert-doux p-4 text-sm font-bold text-vert-fonce">
        {mine.length ? `Dans votre potager : ${mine.length} plantation${mine.length > 1 ? 's' : ''} (${where.join(', ')}).` : `Vous n’en cultivez pas encore : ${lc(s.name)} se plante depuis la page d’une zone.`}
      </div>
      <Link to="/glossaire" className="self-center py-2 font-extrabold text-vert">← Tout le glossaire</Link>
    </Page>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone?: 'froid' }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${tone === 'froid' ? 'bg-[#D3EAEE] text-[#1F4D5A]' : 'bg-vert-doux text-vert'}`}>{children}</span>;
}

function Block({ title, children }: { title: string; children: string | null }) {
  if (!children) return null;
  return (
    <section className="flex flex-col gap-1.5 rounded-carte bg-white p-4">
      <h2 className="font-titre text-lg font-semibold">{title}</h2>
      <p className="text-[15px] leading-relaxed">{children}</p>
    </section>
  );
}

function MonthRow({ label, months, month, color }: { label: string; months: number[]; month: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-extrabold">{label}{months.length === 0 && <span className="font-bold text-gris"> · sans objet</span>}</span>
      <div className="grid grid-cols-12 gap-0.5" role="img" aria-label={months.length ? `${label} : ${months.map(m => MOIS[m - 1]).join(', ')}` : `${label} : sans objet`}>
        {LETTERS.map((l, i) => {
          const on = months.includes(i + 1);
          return <span key={i} className={`flex h-7 items-center justify-center rounded-md text-[11px] font-extrabold ${on ? color + ' text-white' : 'bg-fond text-gris'} ${i + 1 === month ? 'shadow-[0_0_0_2px_#23402B]' : ''}`}>{l}</span>;
        })}
      </div>
    </div>
  );
}

function Neigh({ title, tone, list }: { title: string; tone: string; list: { o: Species; why: string | null }[] }) {
  if (!list.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <b className={`text-sm ${tone}`}>{title}</b>
      <ul className="flex flex-col gap-1.5">
        {list.map(({ o, why }) => (
          <li key={o.id}>
            <Link to={`/glossaire/${o.slug}`} className="flex items-center gap-2.5">
              <Tile slug={o.slug} w={36} h={36} size={28} round={12} />
              <span className="flex min-w-0 flex-col"><b className="text-sm font-extrabold">{o.name}</b>{why && <span className="text-xs text-gris">{why}</span>}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
