import { useApp } from '../lib/app';
import { nf } from '../lib/garden';
import type { Species, Variety } from '../lib/types';
import { Select } from './ui';

/** Ce qui distingue une variété : particularités, délai de récolte (comparé à l'espèce) et conseils. */
export function VarietyDetails({ v, species }: { v: Variety; species?: Pick<Species, 'days_to_harvest'> | null }) {
  const base = species?.days_to_harvest ?? null;
  const diff = v.days_to_harvest != null && base != null ? v.days_to_harvest - base : null;
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl bg-vert-doux/60 px-3 py-2.5">
      {v.traits.length > 0 && <div className="flex flex-wrap gap-1.5">{v.traits.map(t => <span key={t} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold text-vert">{t}</span>)}</div>}
      {v.days_to_harvest != null && (
        <p className="text-[13px] font-bold">
          Récolte environ {nf(v.days_to_harvest)} jours après la plantation
          {diff != null && diff !== 0 && <span className={diff < 0 ? 'text-vert' : 'text-gris'}> ({diff < 0 ? `${nf(-diff)} j plus tôt` : `${nf(diff)} j plus tard`} que l’espèce)</span>}.
        </p>
      )}
      {v.notes && <p className="text-[13px] leading-snug">{v.notes}</p>}
    </div>
  );
}

/** Choix facultatif de la variété d'une espèce ; rien à afficher si l'espèce n'a pas de variété connue. */
export function VarietyPicker({ speciesId, value, onChange }: { speciesId: string; value: string | null; onChange: (v: Variety | null) => void }) {
  const { varietiesOf, varietyById, byId } = useApp();
  const list = varietiesOf(speciesId);
  if (!list.length) return null;
  const cur = value ? varietyById.get(value) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-extrabold">Variété <span className="font-bold text-gris">(facultatif)</span></span>
      <Select label="Variété" value={value ?? ''} onChange={id => onChange(id ? varietyById.get(id) ?? null : null)}
        options={[{ value: '', label: 'Variété non précisée' }, ...list.map(v => ({ value: v.id, label: v.name }))]} />
      {cur && <VarietyDetails v={cur} species={byId.get(speciesId)} />}
    </div>
  );
}
