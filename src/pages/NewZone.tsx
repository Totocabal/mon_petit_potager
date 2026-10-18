import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useCreateZone } from '../lib/data';
import { BackHeader, Btn, Page, useToast } from '../components/ui';
import { Stepper } from '../components/Stepper';
import { CELL_CM, findSpot, nf } from '../lib/garden';
import { ZONE_TYPES, type Zone, type ZoneType } from '../lib/types';

const DEFAULTS: Record<ZoneType, { w: number; l: number; sheltered: boolean }> = {
  carre: { w: 120, l: 120, sheltered: false },
  jardiniere: { w: 90, l: 30, sheltered: false },
  parcelle: { w: 600, l: 900, sheltered: false },
  serre: { w: 600, l: 900, sheltered: true }
};

export default function NewZone() {
  const { garden, zones } = useApp();
  const create = useCreateZone();
  const nav = useNavigate();
  const toast = useToast();
  const [type, setType] = useState<ZoneType>('carre');
  const [name, setName] = useState('Carré ' + (zones.filter(z => z.type === 'carre').length + 1));
  const [w, setW] = useState(120);
  const [l, setL] = useState(120);
  const [north, setNorth] = useState<Zone['north_side']>('top');
  const [sheltered, setSheltered] = useState(false);
  const big = ZONE_TYPES.find(t => t.value === type)!.big;
  const step = big ? 150 : 30;
  const cols = Math.max(1, Math.round(w / CELL_CM)), rows = Math.max(1, Math.round(l / CELL_CM));

  function pickType(t: ZoneType) {
    setType(t);
    const d = DEFAULTS[t];
    setW(d.w); setL(d.l); setSheltered(d.sheltered);
    const label = ZONE_TYPES.find(z => z.value === t)!.label;
    const n = zones.filter(z => z.type === t).length + 1;
    setName(label + (t === 'carre' || n > 1 ? ' ' + n : ''));
  }

  async function submit() {
    const spot = findSpot(zones, garden.terrain_width_cm, garden.terrain_length_cm, cols * CELL_CM, rows * CELL_CM);
    if (!spot) { toast('Plus de place sur le terrain : agrandissez-le dans Profil.'); return; }
    const z = await create.mutateAsync({ garden_id: garden.id, name: name.trim() || 'Nouvelle zone', type, x_cm: spot.x, y_cm: spot.y, cols, rows, north_side: north, sheltered });
    toast(z.name + ' créée');
    nav(`/zones/${z.id}`, { replace: true });
  }

  const seg = 'min-h-[42px] flex-1 rounded-2xl text-sm font-extrabold';
  return (
    <Page>
      <BackHeader title="Nouvelle zone" />
      <label className="flex flex-col gap-1.5 text-sm font-extrabold">Nom
        <input value={name} onChange={e => setName(e.target.value)} className="min-h-12 rounded-2xl border-2 border-trait bg-white px-4 text-base font-bold outline-none focus:border-vert" />
      </label>
      <div role="group" aria-label="Type de zone" className="flex gap-1.5 rounded-[20px] bg-white p-1">
        {ZONE_TYPES.map(t => <button key={t.value} aria-pressed={type === t.value} onClick={() => pickType(t.value)} className={`${seg} ${type === t.value ? 'bg-vert text-white' : ''}`}>{t.label}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Stepper label="Largeur" value={w} onChange={setW} step={step} min={30} max={big ? garden.terrain_width_cm - 100 : 360} />
        <Stepper label="Longueur" value={l} onChange={setL} step={step} min={30} max={big ? garden.terrain_length_cm - 100 : 360} />
      </div>
      <div className="rounded-carte bg-white p-4">
        <p className="font-titre text-[22px] font-semibold text-vert">{nf(cols * rows)} cases</p>
        <p className="text-sm">{cols} × {rows} cases de 30 cm{cols > 12 || rows > 12 ? ` · ${Math.ceil(cols / 5) * Math.ceil(rows / 5)} blocs de 1,5 m` : ''}</p>
      </div>
      <div className="flex flex-col gap-1.5 text-sm font-extrabold">Où est le nord ?
        <div role="group" aria-label="Côté nord" className="flex gap-1.5">
          {([['top', 'En haut'], ['right', 'À droite'], ['bottom', 'En bas'], ['left', 'À gauche']] as const).map(([v, label]) =>
            <button key={v} aria-pressed={north === v} onClick={() => setNorth(v)} className={`${seg} ${north === v ? 'bg-vert text-white' : 'bg-white'}`}>{label}</button>)}
        </div>
      </div>
      <button role="switch" aria-checked={sheltered} onClick={() => setSheltered(!sheltered)} className="flex min-h-[60px] items-center gap-3 rounded-[20px] bg-white px-4 text-left">
        <span className="flex flex-1 flex-col"><b>Sous abri</b><span className="text-[13px] text-gris">Serre, tunnel, auvent : la pluie ne compte pas</span></span>
        <span className={`flex h-8 w-[52px] rounded-full p-[3px] ${sheltered ? 'justify-end bg-vert' : 'justify-start bg-[#C4CEC0]'}`}><i className="h-[26px] w-[26px] rounded-full bg-white" /></span>
      </button>
      <p className="text-[13px] text-gris">La zone est placée sur la première place libre du terrain.</p>
      {create.isError && <p className="text-sm font-bold text-alerte">{(create.error as Error).message}</p>}
      <div className="fixed bottom-0 left-1/2 z-20 w-[min(440px,100%)] -translate-x-1/2 bg-gradient-to-t from-fond from-70% to-transparent px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
        <Btn onClick={submit} disabled={create.isPending}>{create.isPending ? 'Création…' : 'Créer la zone'}</Btn>
      </div>
    </Page>
  );
}
