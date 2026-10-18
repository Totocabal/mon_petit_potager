import { useState } from 'react';
import { useApp } from '../lib/app';
import { useAddTask } from '../lib/data';
import { addDays, iso, today } from '../lib/dates';
import { Btn, Sheet, useToast } from './ui';

const input = 'min-h-12 rounded-2xl border-2 border-trait bg-white px-4 text-base font-bold outline-none focus:border-vert';

export function TaskSheet({ onClose, zoneId }: { onClose: () => void; zoneId?: string }) {
  const { garden, zones } = useApp();
  const add = useAddTask(garden.id);
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(iso(today()));
  const [zone, setZone] = useState(zoneId ?? '');
  const quick = [['Aujourd’hui', 0], ['Demain', 1], ['Dans 1 semaine', 7]] as const;
  return (
    <Sheet title="Nouvelle tâche" onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={async e => {
        e.preventDefault();
        if (!title.trim()) return;
        await add.mutateAsync({ title: title.trim(), due_date: due, zone_id: zone || null });
        toast('Tâche ajoutée');
        onClose();
      }}>
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">Quoi ?<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. : mettre du paillage" className={input} /></label>
        <div className="flex gap-2">
          {quick.map(([l, n]) => <button type="button" key={l} onClick={() => setDue(iso(addDays(today(), n)))} aria-pressed={due === iso(addDays(today(), n))} className={`min-h-9 flex-1 rounded-full px-2 text-[13px] font-extrabold ${due === iso(addDays(today(), n)) ? 'bg-vert text-white' : 'bg-fond'}`}>{l}</button>)}
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">Pour le<input type="date" value={due} onChange={e => setDue(e.target.value)} className={input} /></label>
        {zones.length > 0 && <label className="flex flex-col gap-1.5 text-sm font-extrabold">Zone (facultatif)
          <select value={zone} onChange={e => setZone(e.target.value)} className={input}><option value="">Tout le potager</option>{zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>}
        {add.isError && <p className="text-sm font-bold text-alerte">{(add.error as Error).message}</p>}
        <Btn type="submit" disabled={!title.trim() || add.isPending}>Ajouter</Btn>
      </form>
    </Sheet>
  );
}
