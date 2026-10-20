import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BackHeader, Btn, Page, Sheet, Tile } from '../components/ui';
import { VarietyDetails } from '../components/VarietyPicker';
import { categoryLabel, DIFFICULTY_LABEL } from '../lib/glossary';
import { footprintText, isMulti, isSol, lc, rel } from '../lib/garden';
import { MOIS, today } from '../lib/dates';
import type { Species, Variety } from '../lib/types';

const LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const HEIGHT = { basse: 'Basse', moyenne: 'Moyenne', haute: 'Haute' } as const;

/** Fiche détaillée d'une plante : en un coup d'œil, calendrier, conseils et voisines. */
export default function SpeciesSheet() {
  const { slug } = useParams();
  const { bySlug, species, rels, crops, zones, loading, varietiesOf } = useApp();
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
  if (!s || isSol(s)) return <Page><BackHeader title="Plante introuvable" /><Link to="/almanach?vue=toutes" className="font-extrabold text-vert">Retour aux plantes →</Link></Page>;

  const mine = crops.filter(p => p.species_id === s.id);
  const varieties = varietiesOf(s.id);
  const counts = new Map<string, number>();
  mine.forEach(p => { if (p.variety_id) counts.set(p.variety_id, (counts.get(p.variety_id) ?? 0) + 1); });
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
        <Tile slug={s.slug} w={104} h={104} size={84} round={28} hop />
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
      <Pests key={s.id} pests={s.pests} treatment={s.pests_treatment} />
      <Block title="Récolte et conservation">{s.harvest_tips}</Block>
      <Varieties key={s.id} varieties={varieties} species={s} counts={counts} />
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
      <Link to="/almanach?vue=toutes" className="self-center py-2 font-extrabold text-vert">← Toutes les plantes</Link>
    </Page>
  );
}

/** Présentation compacte des variétés ; les détails s’ouvrent dans le même volet que les ravageurs. */
function Varieties({ varieties, species, counts }: { varieties: Variety[]; species: Species; counts: Map<string, number> }) {
  const [open, setOpen] = useState(false);
  if (!varieties.length) return null;

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4" aria-labelledby="h-var">
        <h2 id="h-var" className="font-titre text-lg font-semibold">Variétés <span className="font-corps text-sm font-bold text-gris">· {varieties.length}</span></h2>
        <div className="flex flex-wrap gap-1.5">
          {varieties.map(v => (
            <span key={v.id} className="rounded-full bg-vert-doux px-2.5 py-0.5 text-xs font-extrabold text-vert">{v.name}</span>
          ))}
        </div>
        <Btn variant="doux" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          Découvrir les variétés
        </Btn>
      </section>

      {open && (
        <Sheet title="Variétés" onClose={() => setOpen(false)} reserveSpace={false}>
          <p className="text-[13px] text-gris">Choisissez-en une en plantant : le délai de récolte s’adapte à la variété.</p>
          <ul className="flex flex-col gap-3">
            {varieties.map(v => (
              <li key={v.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2"><b className="font-titre text-base font-semibold">{v.name}</b>{counts.get(v.id) ? <span className="text-xs font-extrabold text-vert">chez vous · {counts.get(v.id)}</span> : null}</div>
                <VarietyDetails v={v} species={species} />
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone?: 'froid' }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${tone === 'froid' ? 'bg-[#D3EAEE] text-[#1F4D5A]' : 'bg-vert-doux text-vert'}`}>{children}</span>;
}

/** « Mildiou : bouillie bordelaise… Pucerons : savon noir… » : une ligne par ravageur ou maladie, avec son remède. */
export const treatmentItems = (text: string): { label: string | null; body: string }[] =>
  text.split(/(?<=\.)\s+(?=[A-ZÀ-ÖØ-Þ])/).map(part => {
    const i = part.indexOf(' : ');
    return i > 0 && i < 40 ? { label: part.slice(0, i), body: part.slice(i + 3) } : { label: null, body: part };
  });

const SYMPTOMS: Record<string, string> = {
  'Acariens': 'Feuillage piqueté de jaune qui bronze par temps chaud, fines toiles sous les feuilles',
  'Aleurodes': 'Nuage de minuscules mouches blanches qui s’envolent dès qu’on touche les feuilles',
  'Altises': 'Feuilles criblées de nombreux petits trous ronds, petits insectes noirs sauteurs',
  'Altises et mouche du chou': 'Feuilles criblées de petits trous ronds ou jeunes plants qui flétrissent',
  'Botrytis': 'Duvet grisâtre et pourriture molle sur les fruits ou les feuilles',
  'Bruches': 'Petits trous ronds bien nets dans les graines récoltées ou les cosses',
  'Cercosporiose': 'Petites taches rondes grises bordées de rouge ou de brun sur les feuilles',
  'Chancre': 'Taches brun-roux à noires au collet et sur le haut de la racine',
  'Chenilles (piéride, noctuelle)': 'Feuilles dévorées, chenilles vertes ou grises et petits œufs sous les feuilles',
  'Cochenilles': 'Petits boucliers bruns ou amas cotonneux collés sur les tiges',
  'Corbeaux': 'Graines déterrées et jeunes plantules arrachées juste après le semis',
  'Criocère': 'Petits coléoptères rouge et noir et larves grises qui dévorent les tiges',
  'Doryphores': 'Insectes rayés jaune et noir ou larves rouge orangé qui dévorent les feuilles',
  'Drageons': 'Rejets qui repoussent à distance du pied et envahissent les cultures voisines',
  'Hernie': 'Plant qui flétrit au soleil, racines gonflées de renflements difformes',
  'Limaces': 'Feuilles ou jeunes pousses trouées la nuit, avec traces de bave brillantes',
  'Limaces sur les jeunes plants': 'Jeunes plants grignotés ou coupés la nuit, traces de bave au sol',
  'Limaces sur les jeunes pousses': 'Jeunes pousses trouées ou rongées au ras du sol au printemps',
  'Mildiou': 'Taches brunes sur les feuilles et les tiges, fruits qui brunissent par temps humide',
  'Mineuse': 'Plages claires ou galeries sinueuses creusées dans l’épaisseur des feuilles',
  'Montée à graines': 'La plante file en hauteur et fleurit prématurément, feuilles plus coriaces',
  'Mouche': 'Turions déformés ou tiges qui jaunissent et sèchent (galeries à l’intérieur)',
  'Mouche de l\'oignon': 'Feuilles centrales qui jaunissent et ramollissent, asticots dans le bulbe',
  'Mouche de la carotte': 'Galeries brunes dans la racine, feuillage qui rougit puis jaunit',
  'Mouche du chou': 'Jeunes plants qui flétrissent et prennent une teinte gris-bleuté (larves aux racines)',
  'Mouche du céleri': 'Taches claires boursouflées (galeries) dans l’épaisseur des feuilles',
  'Mouche mineuse': 'Fûts fendus et déformés, stries de piqûres alignées sur les feuilles',
  'Noctuelles': 'Grosses chenilles grises ou vertes qui rongent feuilles, collet ou fruits la nuit',
  'Nématodes': 'Croissance ralentie, racines fourchues, déformées ou porteuses de petites galles',
  'Oiseaux': 'Graines déterrées, jeunes pousses pincées ou fruits picorés à maturité',
  'Oïdium': 'Feutrage blanc poudreux (comme de la farine) sur les feuilles et les tiges',
  'Piéride': 'Feuilles dévorées par des chenilles vertes, petits œufs jaunes sous les feuilles',
  'Pourriture': 'Collet ou base des tiges qui noircit et ramollit en sol trop humide',
  'Pourriture apicale': 'Tache noire et sèche au sommet (au bout) du fruit (« cul noir »)',
  'Pourriture blanche': 'Feutrage blanc cotonneux au collet et sur le bulbe, feuilles qui jaunissent',
  'Pourriture des racines': 'Feuillage qui jaunit et dépérit alors que la terre reste humide',
  'Pourriture du collet': 'Base du bulbe molle et brunâtre en fin de culture ou au stockage',
  'Pourriture grise': 'Duvet grisâtre et fruits qui ramollissent par temps humide',
  'Pucerons': 'Colonies de petits insectes sous les feuilles et sur les tiges, feuilles recroquevillées ou collantes',
  'Pucerons cendrés': 'Colonies d’insectes gris farineux qui enroulent et déforment les feuilles',
  'Pucerons noirs': 'Amas de petits insectes noirs au sommet des tiges et sous les jeunes feuilles',
  'Pucerons verts': 'Petits insectes verts groupés sur les jeunes pousses et les boutons floraux',
  'Pyrale': 'Tiges percées qui cassent ou épis rongés par une chenille claire',
  'Rouille': 'Petites pustules ou taches orangées à brunes sur les feuilles',
  'Rouille et septoriose': 'Taches orangées ou brunes qui dessèchent progressivement le feuillage',
  'Taupins': 'Jeunes plants qui flétrissent ou tubercules percés de petites galeries rondes',
  'Teigne': 'Galeries dans les feuilles puis au cœur du fût, petites chenilles vert pâle',
  'Tenthrède': 'Fausses-chenilles vertes mouchetées de noir qui dévorent le bord des feuilles',
  'Tordeuse': 'Cosses contenant de petites chenilles jaunâtres et des grains rongés',
  'Ver du framboisier': 'Petits vers blanc crème à l’intérieur des fruits mûrs',
};

export const symptomFor = (label: string): string => SYMPTOMS[label] ?? label;

export function Pests({ pests, treatment }: { pests: string | null; treatment: string | null }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [showAll, setShowAll] = useState(false);

  if (!treatment) return <Block title="Ravageurs et maladies">{pests}</Block>;

  const items = treatmentItems(treatment);
  const labeled = items.map((t, i) => ({ ...t, index: i, symptom: t.label ? symptomFor(t.label) : null })).filter((t): t is { label: string; body: string; index: number; symptom: string } => t.label !== null);
  const extras = items.filter(t => t.label === null);

  function toggleSymptom(idx: number) {
    setShowAll(false);
    setSelected(cur => (cur.includes(idx) ? cur.filter(x => x !== idx) : [...cur, idx]));
  }

  function toggleAll() {
    if (showAll) {
      setShowAll(false);
    } else {
      setSelected([]);
      setShowAll(true);
    }
  }

  const visible = showAll ? labeled : labeled.filter(t => selected.includes(t.index));

  return (
    <>
      <section className="flex flex-col gap-2.5 rounded-carte bg-white p-4">
        <h2 className="font-titre text-lg font-semibold">Ravageurs et maladies</h2>
        <div className="flex flex-wrap gap-1.5">
          {labeled.map(t => (
            <span key={t.index} className="rounded-full bg-vert-doux px-2.5 py-0.5 text-xs font-extrabold text-vert">
              {t.label}
            </span>
          ))}
        </div>
        <Btn variant="doux" onClick={() => setOpen(true)}>
          Identifier un symptôme & traitements
        </Btn>
      </section>

      {open && (
        <Sheet title="Ravageurs et maladies" onClose={() => setOpen(false)} reserveSpace={false}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold text-gris">Quels symptômes observez-vous ?</p>
            <button
              type="button"
              onClick={toggleAll}
              className="min-h-11 px-1 text-xs font-extrabold text-vert underline-offset-2 hover:underline"
            >
              {showAll ? 'Masquer tout' : `Tout voir (${labeled.length})`}
            </button>
          </div>

          <div className="flex flex-col gap-1.5" role="group" aria-label="Symptômes observés">
            {labeled.map(t => {
              const on = selected.includes(t.index);
              return (
                <button
                  key={t.index}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSymptom(t.index)}
                  className={`squish flex items-start gap-2.5 rounded-2xl border-2 px-3 py-2.5 text-left text-[14px] font-bold leading-snug transition-colors ${
                    on ? 'border-vert bg-vert-doux text-vert-fonce' : 'border-trait bg-fond/60 text-encre hover:border-vert/40'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                      on ? 'border-vert bg-vert text-white' : 'border-gris/50 bg-white'
                    }`}
                  >
                    {on && '✓'}
                  </span>
                  <span className="flex-1">{t.symptom}</span>
                </button>
              );
            })}
          </div>

          {visible.length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              <p className="text-xs font-extrabold text-vert">
                {showAll
                  ? 'Tous les ravageurs, maladies et traitements'
                  : visible.length === 1
                    ? 'Diagnostic et traitement'
                    : `Diagnostics identifiés (${visible.length})`}
              </p>
              <ul className="flex flex-col gap-2">
                {visible.map(t => (
                  <li key={t.index} className="flex flex-col gap-1 rounded-2xl bg-vert-doux/70 px-3.5 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-[14px] font-extrabold text-vert">{t.label}</b>
                      {!showAll && <span className="rounded-full bg-vert px-2 py-0.5 text-[11px] font-extrabold text-white">Identifié</span>}
                    </div>
                    {showAll && <span className="text-xs font-bold text-gris">Symptôme : {t.symptom.charAt(0).toLowerCase() + t.symptom.slice(1)}.</span>}
                    <span className="text-[15px] leading-snug"><b className="font-extrabold text-vert-fonce">Traitement : </b>{t.body}</span>
                  </li>
                ))}
                {extras.map((e, i) => (
                  <li key={'extra-' + i} className="rounded-2xl bg-vert-doux/40 px-3.5 py-2 text-[14px] font-bold text-vert-fonce">
                    {e.body}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gris">Le préventif passe avant tout : aérer, pailler, arroser au pied. Lisez la notice de chaque produit et traitez le soir, hors floraison.</p>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
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
