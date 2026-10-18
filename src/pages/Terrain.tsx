import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useUpdateZone } from '../lib/data';
import { BottomNav, Loading, Page, Picto, useToast } from '../components/ui';
import { CELL_CM, isReady, meters, nf, plantCount, SPCOLOR, zoneFits, zoneSize } from '../lib/garden';
import type { Zone } from '../lib/types';

const SNAP_CM = 10;
type Drag = { id: string; sx: number; sy: number; ox: number; oy: number; x: number; y: number; scale: number; ok: boolean };

export default function Terrain() {
  const { garden, zones, plantings, byId, loading } = useApp();
  const T = { w: garden.terrain_width_cm, h: garden.terrain_length_cm };
  const updateZone = useUpdateZone();
  const toast = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [drag, setDragState] = useState<Drag | null>(null);
  // dernière valeur connue, lue par les gestionnaires : le rendu React peut avoir un événement de retard
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => { dragRef.current = d; setDragState(d); };
  // positions enregistrées mais pas encore revenues du serveur : évite un retour en arrière à l'écran
  const [saved, setSaved] = useState<Record<string, { x: number; y: number }>>({});
  useEffect(() => {
    setSaved(prev => {
      const next = Object.fromEntries(Object.entries(prev).filter(([id, v]) => { const z = zones.find(q => q.id === id); return z && (z.x_cm !== v.x || z.y_cm !== v.y); }));
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [zones]);
  const rest = (z: Zone) => saved[z.id] ?? { x: z.x_cm, y: z.y_cm };
  const at = (z: Zone) => (drag?.id === z.id ? { x: drag.x, y: drag.y } : rest(z));

  async function commit(z: Zone, x: number, y: number) {
    if (x === rest(z).x && y === rest(z).y) return;
    setSaved(o => ({ ...o, [z.id]: { x, y } }));
    try { await updateZone.mutateAsync({ z, patch: { x_cm: x, y_cm: y } }); }
    catch { setSaved(o => { const n = { ...o }; delete n[z.id]; return n; }); toast('Déplacement impossible, réessayez'); }
  }
  const clamp = (v: number, max: number) => Math.min(Math.max(0, Math.round(v / SNAP_CM) * SNAP_CM), Math.max(0, max));
  function onDown(e: React.PointerEvent, z: Zone) {
    if (!editing || !mapRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const cur = at(z);
    setDrag({ id: z.id, sx: e.clientX, sy: e.clientY, ox: cur.x, oy: cur.y, x: cur.x, y: cur.y, scale: T.w / mapRef.current.getBoundingClientRect().width, ok: true });
  }
  function onMove(e: React.PointerEvent, z: Zone) {
    const drag = dragRef.current;
    if (!drag || drag.id !== z.id) return;
    const s = zoneSize(z);
    const x = clamp(drag.ox + (e.clientX - drag.sx) * drag.scale, T.w - s.w), y = clamp(drag.oy + (e.clientY - drag.sy) * drag.scale, T.h - s.h);
    setDrag({ ...drag, x, y, ok: zoneFits(zones, z, x, y, T) });
  }
  function onUp(z: Zone) {
    const d = dragRef.current;
    if (!d || d.id !== z.id) return;
    setDrag(null);
    if (d.ok) commit(z, d.x, d.y); else toast('Cette place est prise par une autre zone');
  }
  function onKey(e: React.KeyboardEvent, z: Zone) {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!editing || !d) return;
    e.preventDefault();
    const cur = rest(z), x = cur.x + d[0] * CELL_CM, y = cur.y + d[1] * CELL_CM;
    if (zoneFits(zones, z, x, y, T)) commit(z, x, y); else toast('Impossible d’aller plus loin : bord ou autre zone');
  }

  const stats = useMemo(() => new Map(zones.map(z => {
    const ps = plantings.filter(p => p.zone_id === z.id);
    const used = ps.reduce((t, p) => t + p.w * p.h, 0);
    const by = new Map<string, number>();
    ps.forEach(p => by.set(p.species_id, (by.get(p.species_id) ?? 0) + p.w * p.h));
    const top = [...by.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    const ready = ps.some(p => { const s = byId.get(p.species_id); return s ? isReady(p, s) : false; });
    return [z.id, { used, total: z.cols * z.rows, top, ready }];
  })), [zones, plantings, byId]);

  if (loading) return <Loading />;
  const totalPlants = plantings.reduce((t, p) => { const s = byId.get(p.species_id); return t + (s ? plantCount(p, s) : 0); }, 0);
  const cases = zones.reduce((t, z) => t + z.cols * z.rows, 0);

  return (
    <Page nav wide>
      <div className="flex items-start justify-between gap-3 pt-6 lg:pt-0">
        <div className="min-w-0">
          <h1 className="font-titre text-[31px] font-semibold text-vert">{garden.name}</h1>
          <p className="mt-1 font-bold text-gris">{meters(T.w)} × {meters(T.h)} · {zones.length} zone{zones.length > 1 ? 's' : ''} · {nf(cases)} cases · {nf(totalPlants)} plants</p>
        </div>
        {zones.length > 0 && <button aria-pressed={editing} onClick={() => { setEditing(e => !e); setDrag(null); }} className={`mt-1 min-h-11 shrink-0 rounded-2xl px-4 font-extrabold ${editing ? 'bg-vert text-white' : 'bg-white text-vert'}`}>{editing ? 'Terminé' : 'Organiser'}</button>}
      </div>
      {editing && <p className="-mt-2 text-sm font-bold text-gris">Glissez une zone pour la déplacer. Au clavier : touchez une zone puis les flèches (30 cm par appui).</p>}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div ref={mapRef} className="relative w-full rounded-[22px] bg-[#DCEBCD] shadow-[inset_0_0_0_1px_rgba(46,107,63,.18)]" style={{ aspectRatio: `${T.w} / ${T.h}` }}>
        {zones.map(z => {
          const st = stats.get(z.id)!;
          const dom = st.top[0] ? byId.get(st.top[0]) : null;
          const pos = at(z), size = zoneSize(z);
          const dragging = drag?.id === z.id;
          const style = { left: `${(pos.x / T.w) * 100}%`, top: `${(pos.y / T.h) * 100}%`, width: `max(${(size.w / T.w) * 100}%, 14px)`, height: `max(${(size.h / T.h) * 100}%, 14px)`,
            boxShadow: dragging ? (drag.ok ? '0 0 0 3px #2E6B3F, 0 8px 18px rgba(0,0,0,.25)' : '0 0 0 3px #B8402C, 0 8px 18px rgba(0,0,0,.25)') : z.sheltered ? 'inset 0 0 0 2px #3F7DA0' : st.ready ? 'inset 0 0 0 2px #F6C445' : 'none' };
          const inner = (
            <>
              {dom && st.used / st.total > 0.15 && <span className="absolute inset-[22%] rounded-sm" style={{ background: SPCOLOR[dom.slug] }} />}
              {editing && <span className="absolute inset-x-0 top-0 truncate bg-black/35 px-1 text-[10px] font-extrabold leading-4 text-white">{z.name}</span>}
            </>
          );
          return editing ? (
            <div key={z.id} role="button" tabIndex={0} aria-label={`Déplacer ${z.name}`}
              onPointerDown={e => onDown(e, z)} onPointerMove={e => onMove(e, z)} onPointerUp={() => onUp(z)} onPointerCancel={() => setDrag(null)} onKeyDown={e => onKey(e, z)}
              className={`absolute touch-none select-none overflow-hidden rounded-md bg-terre ${dragging ? 'z-10 cursor-grabbing' : 'cursor-grab'} ${dragging && !drag.ok ? 'opacity-80' : ''}`}
              style={style}>{inner}</div>
          ) : (
            <Link key={z.id} to={`/zones/${z.id}`} aria-label={z.name} className="absolute overflow-hidden rounded-md bg-terre" style={style}>{inner}</Link>
          );
        })}
        <span className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white font-titre text-[13px] font-semibold">N</span>
        {!zones.length && <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-bold text-gris">Votre terrain est vide. Ajoutez une première zone.</p>}
      </div>

      <div className="rounded-carte bg-white px-4 py-1">
        {zones.map(z => {
          const st = stats.get(z.id)!;
          return (
            <Link key={z.id} to={`/zones/${z.id}`} className="flex min-h-[60px] items-center gap-3 border-b border-dashed border-trait py-1.5 last:border-0">
              <span className="h-9 w-2.5 shrink-0 rounded" style={{ background: z.sheltered ? '#3F7DA0' : st.ready ? '#F6C445' : '#C08B5C' }} />
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="font-extrabold">{z.name}</b>
                <span className="text-xs text-gris">{meters(z.cols * CELL_CM)} × {meters(z.rows * CELL_CM)} · {nf(st.total)} cases · {Math.round((st.used / st.total) * 100)} % planté{z.sheltered ? ' · sous abri' : ''}</span>
              </span>
              <span className="flex gap-0.5">{st.top.slice(0, 3).map(id => <Picto key={id} slug={byId.get(id)?.slug ?? 'salade'} size={24} />)}</span>
            </Link>
          );
        })}
        <Link to="/potager/nouvelle-zone" className="flex min-h-[56px] items-center gap-3 font-extrabold text-vert">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-vert-doux">+</span>Nouvelle zone
        </Link>
      </div>
      </div>
      <BottomNav />
    </Page>
  );
}
