import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { outbox, useOnline, usePendingCount } from '../lib/offline';
import { useToast } from './ui';

/** Envoie les modifications faites hors ligne dès que possible, et affiche l'état du réseau. */
export function OfflineSync() {
  const qc = useQueryClient();
  const toast = useToast();
  const online = useOnline();
  const pending = usePendingCount();

  useEffect(() => {
    let alive = true;
    const sync = () => {
      if (!outbox.pending().length) return;
      void outbox.flush().then(r => {
        if (!alive) return;
        qc.invalidateQueries({ queryKey: ['plantings'] });
        if (r.failed.length) toast(`${r.failed.length} modification${r.failed.length > 1 ? 's' : ''} refusée${r.failed.length > 1 ? 's' : ''} par le serveur`);
        else if (r.sent > 0 && !r.left) toast(`Synchronisé : ${r.sent} modification${r.sent > 1 ? 's' : ''} envoyée${r.sent > 1 ? 's' : ''}`);
      });
    };
    sync();
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(sync, 30_000);
    return () => { alive = false; window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer); };
  }, [qc, toast]);

  if (online && !pending) return null;
  const text = !online
    ? pending ? `Hors ligne · ${pending} modification${pending > 1 ? 's' : ''} à envoyer` : 'Hors ligne · vos données restent consultables'
    : `Envoi de ${pending} modification${pending > 1 ? 's' : ''}…`;
  return (
    <div role="status" className={`fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 px-4 pb-1.5 pt-[calc(6px+env(safe-area-inset-top))] text-center text-[13px] font-extrabold ${online ? 'bg-vert-doux text-vert' : 'bg-soleil text-soleil-encre'}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {online ? <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" /> : <path d="M2 8.8a15 15 0 0 1 4-2.4M22 8.8a15 15 0 0 0-9-4.3M5 12.9a10 10 0 0 1 3.2-2.2M19 12.9a10 10 0 0 0-3.4-2.3M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M2 2l20 20" />}
      </svg>
      {text}
    </div>
  );
}
