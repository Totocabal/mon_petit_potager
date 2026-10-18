import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BottomNav, Loading, Page, Picto } from '../components/ui';
import { CELL_CM, isReady, meters, nf, plantCount, SPCOLOR } from '../lib/garden';

export default function Terrain() {
  const { garden, zones, plantings, byId, loading } = useApp();
  const T = { w: garden.terrain_width_cm, h: garden.terrain_length_cm };
  const k = 100 / Math.max(T.w, T.h);

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
    <Page nav>
      <div className="pt-6">
        <h1 className="font-titre text-[31px] font-semibold text-vert">{garden.name}</h1>
        <p className="mt-1 font-bold text-gris">{meters(T.w)} × {meters(T.h)} · {zones.length} zone{zones.length > 1 ? 's' : ''} · {nf(cases)} cases · {nf(totalPlants)} plants</p>
      </div>

      <div className="relative w-full rounded-[22px] bg-[#DCEBCD] shadow-[inset_0_0_0_1px_rgba(46,107,63,.18)]" style={{ aspectRatio: `${T.w} / ${T.h}` }}>
        {zones.map(z => {
          const st = stats.get(z.id)!;
          const dom = st.top[0] ? byId.get(st.top[0]) : null;
          return (
            <Link key={z.id} to={`/zones/${z.id}`} aria-label={z.name}
              className="absolute overflow-hidden rounded-md bg-terre"
              style={{ left: `${z.x_cm * k}%`, top: `${z.y_cm * k}%`, width: `max(${z.cols * CELL_CM * k}%, 14px)`, height: `max(${z.rows * CELL_CM * k}%, 14px)`,
                boxShadow: z.sheltered ? 'inset 0 0 0 2px #3F7DA0' : st.ready ? 'inset 0 0 0 2px #F6C445' : 'none' }}>
              {dom && st.used / st.total > 0.15 && <span className="absolute inset-[22%] rounded-sm" style={{ background: SPCOLOR[dom.slug] }} />}
            </Link>
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
      <BottomNav />
    </Page>
  );
}
