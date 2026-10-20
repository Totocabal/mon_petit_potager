import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useAddPlantings, useCutPlantings, useDeleteZone, useRemovePlantings } from '../lib/data';
import { freeRects, isSol, lc, plantingsIn, remainingPieces, type Grid } from '../lib/garden';
import { cap, iso, today } from '../lib/dates';
import { CELL_CM, meters, nf } from '../lib/garden';
import type { Zone } from '../lib/types';
import { Btn, Sheet, Tile, useToast } from './ui';
import { unitOf } from './garden';

function Row({ icon, title, sub, danger = false, to, onClick }: { icon: ReactNode; title: string; sub?: string; danger?: boolean; to?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-xl ${danger ? 'bg-alerte-doux' : 'bg-vert-doux'}`}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col"><b className={`font-extrabold ${danger ? 'text-alerte' : ''}`}>{title}</b>{sub && <span className="text-[13px] leading-snug text-gris">{sub}</span>}</span>
      <span aria-hidden="true" className="text-2xl font-bold text-[#9AA79C]">›</span>
    </>
  );
  const cls = 'squish flex min-h-[62px] w-full items-center gap-3.5 border-b border-dashed border-trait py-1.5 text-left last:border-0';
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

const Label = ({ children, danger = false }: { children: ReactNode; danger?: boolean }) => <p className={`mt-3 text-xs font-extrabold uppercase tracking-wider ${danger ? 'text-alerte' : 'text-gris'}`}>{children}</p>;

/** « Plus d'actions » d'une zone : un menu en quatre groupes (planter, sol, zone, danger) ; vider et supprimer demandent confirmation. */
export function ZoneMenu({ zone, grid, onClose, onRename, onResize }: { zone: Zone; grid: Grid; onClose: () => void; onRename: () => void; onResize: () => void }) {
  const { species, garden, byId } = useApp();
  const toast = useToast();
  const nav = useNavigate();
  const add = useAddPlantings();
  const remove = useRemovePlantings();
  const cut = useCutPlantings();
  const del = useDeleteZone();
  const [confirm, setConfirm] = useState<'vider' | 'supprimer' | null>(null);

  const area = { x0: 0, x1: zone.cols, y0: 0, y1: zone.rows };
  const ps = plantingsIn(grid, area.x0, area.x1, area.y0, area.y1);
  const rects = freeRects(grid, area.x0, area.x1, area.y0, area.y1);
  const free = rects.reduce((t, r) => t + r.w * r.h, 0);
  const total = zone.cols * zone.rows;
  const busyCells = total - free;
  const covers = ps.filter(p => isSol(species.find(s => s.id === p.species_id)));
  const names = [...new Set(ps.map(p => byId.get(p.species_id)?.name).filter(Boolean))] as string[];
  const busy = add.isPending || remove.isPending || cut.isPending || del.isPending;
  const error = (add.error ?? remove.error ?? cut.error ?? del.error) as Error | null;

  async function cover(slug: 'jachere' | 'paillage') {
    const s = species.find(x => x.slug === slug);
    if (!s || !free) return;
    await add.mutateAsync(rects.map(r => ({ garden_id: garden.id, zone_id: zone.id, species_id: s.id, ...r, sown_at: iso(today()) })));
    toast(`${cap(zone.name)} : ${free} case${free > 1 ? 's' : ''} en ${lc(s.name)}`);
    onClose();
  }
  async function uncover() {
    await remove.mutateAsync(covers);
    toast(`${cap(zone.name)} : remis en culture`);
    onClose();
  }
  async function clearAll() {
    await cut.mutateAsync(ps.map(p => ({ p, keep: remainingPieces(p, area, unitOf(byId.get(p.species_id))) })));
    toast(`${cap(zone.name)} vidé · ${busyCells} case${busyCells > 1 ? 's' : ''} libérée${busyCells > 1 ? 's' : ''}`);
    onClose();
  }
  async function deleteZone() {
    await del.mutateAsync(zone);
    toast(`Zone supprimée : ${zone.name}`);
    nav('/potager', { replace: true });
  }

  if (confirm) {
    const vider = confirm === 'vider';
    return (
      <Sheet title={vider ? 'Vider la zone ?' : 'Supprimer la zone ?'} onClose={() => setConfirm(null)} reserveSpace={false}>
        <div className="flex flex-col items-center gap-2 text-center">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-alerte-doux text-3xl">{vider ? '🧹' : '🗑️'}</span>
          {vider ? (
            <>
              <p>Les <b>{nf(busyCells)} case{busyCells > 1 ? 's' : ''} occupée{busyCells > 1 ? 's' : ''}</b> sont libérées{names.length ? ' : ' + names.map(lc).join(', ') : ''}.</p>
              <p className="text-[13px] text-gris">L’historique est conservé : il sert à la rotation des cultures. Cette action ne peut pas être annulée.</p>
            </>
          ) : (
            <>
              <p>La zone « {zone.name} » disparaît{ps.length ? ', avec ses ' + ps.length + ' plantation' + (ps.length > 1 ? 's' : '') : ''} et ses tâches.</p>
              <p className="text-[13px] text-gris">Cette action ne peut pas être annulée.</p>
            </>
          )}
        </div>
        <Btn variant="danger" onClick={vider ? clearAll : deleteZone} disabled={busy}>{busy ? 'En cours…' : vider ? 'Vider la zone' : 'Supprimer la zone'}</Btn>
        <Btn variant="contour" onClick={() => setConfirm(null)}>Annuler</Btn>
        {error && <p className="text-sm font-bold text-alerte">{error.message}</p>}
      </Sheet>
    );
  }

  return (
    <Sheet title={zone.name} onClose={onClose} reserveSpace={false} tall>
      <p className="-mt-2 text-[13px] font-bold text-gris">{meters(zone.cols * CELL_CM)} × {meters(zone.rows * CELL_CM)} · {nf(total)} cases · {nf(free)} libre{free > 1 ? 's' : ''}</p>
      {free > 0 && (
        <>
          <Label>Planter</Label>
          <Row icon="✨" title="Générer un plan automatique" sub={`Propose des plantes compatibles pour les ${nf(free)} case${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}`} to={`/zones/${zone.id}/generer`} />
          <Label>Couvrir les cases libres</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {([['jachere', 'Jachère', 'Laisser reposer'], ['paillage', 'Paillage', 'Protéger le sol']] as const).map(([slug, name, hint]) => (
              <button key={slug} type="button" onClick={() => cover(slug)} disabled={busy} className="squish flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-[20px] bg-vert-doux p-3 text-center disabled:opacity-50">
                <Tile slug={slug} w={44} h={40} size={36} round={12} /><b className="font-extrabold">{name}</b><span className="text-xs text-gris">{hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
      {covers.length > 0 && (<><Label>Sol</Label><Row icon="🌱" title="Remettre en culture" sub="Retire la jachère et le paillage" onClick={uncover} /></>)}
      <Label>La zone</Label>
      <Row icon="✏️" title="Renommer" onClick={onRename} />
      <Row icon="📐" title="Modifier la taille" sub="Agrandir vers l’est et le sud" onClick={onResize} />
      <Label danger>Zone de danger</Label>
      {busyCells > 0 && <Row danger icon="🧹" title="Vider la zone" sub={`Libère les ${nf(busyCells)} case${busyCells > 1 ? 's' : ''} occupée${busyCells > 1 ? 's' : ''}`} onClick={() => setConfirm('vider')} />}
      <Row danger icon="🗑️" title="Supprimer la zone" sub="Supprime la zone et toutes ses plantations" onClick={() => setConfirm('supprimer')} />
      {error && <p className="text-sm font-bold text-alerte">{error.message}</p>}
    </Sheet>
  );
}
