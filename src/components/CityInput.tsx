import { useEffect, useId, useRef, useState } from 'react';
import { searchPlaces, type PlaceHit } from '../lib/weather';

/** Champ « Ville » avec suggestions pendant la saisie. Choisir une suggestion donne aussi les coordonnées exactes (utile pour les homonymes). */
export function CityInput({ value, onChange, onPick, className = '' }: { value: string; onChange: (v: string) => void; onPick: (p: PlaceHit) => void; className?: string }) {
  const [hits, setHits] = useState<PlaceHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef(false); // seule une saisie lance une recherche, pas la valeur reçue du profil
  const id = useId();

  useEffect(() => {
    if (!typed.current) return;
    if (value.trim().length < 2) { setHits([]); setOpen(false); return; }
    const ctl = new AbortController();
    const t = window.setTimeout(() => {
      searchPlaces(value, ctl.signal).then(r => { setHits(r); setActive(-1); setOpen(r.length > 0); }).catch(() => { /* hors ligne ou annulé : pas de suggestions */ });
    }, 300);
    return () => { window.clearTimeout(t); ctl.abort(); };
  }, [value]);

  function pick(h: PlaceHit) { typed.current = false; setOpen(false); setHits([]); onPick(h); }

  function keys(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(hits.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(hits[active]); }
    else if (e.key === 'Escape') setOpen(false);
  }

  return (
    <div className="relative">
      <input value={value} onChange={e => { typed.current = true; onChange(e.target.value); }} onKeyDown={keys} onBlur={() => window.setTimeout(() => setOpen(false), 120)} onFocus={() => hits.length && setOpen(true)}
        role="combobox" aria-expanded={open} aria-controls={id} aria-autocomplete="list" aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined} autoComplete="off" autoCapitalize="words" enterKeyHint="search" placeholder="Ex. : Lyon" className={className} />
      {open && (
        <ul id={id} role="listbox" aria-label="Villes proposées" className="menu-in absolute left-0 right-0 top-[calc(100%+6px)] z-30 flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-[20px] bg-white p-1.5 shadow-[0_12px_32px_rgba(35,64,43,.28),0_0_0_1px_#D5E3CB]">
          {hits.map((h, i) => (
            <li key={h.id} id={`${id}-${i}`} role="option" aria-selected={i === active}
              onPointerDown={e => { e.preventDefault(); pick(h); }}
              className={`flex min-h-12 cursor-pointer flex-col justify-center rounded-2xl px-3.5 py-1.5 ${i === active ? 'bg-vert-doux' : 'active:bg-fond'}`}>
              <b className="truncate text-base font-extrabold">{h.name}</b>
              {h.detail && <span className="truncate text-[13px] font-bold text-gris">{h.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
