import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { acceptInvite } from '../lib/data';
import { Btn, Loading, Picto } from '../components/ui';

export const INVITE_KEY = 'potager-invitation';

/** Rejoint un potager grâce au lien d'invitation, puis ouvre ce potager. */
export default function AcceptInvite({ token, onJoined }: { token: string; onJoined: (gardenId: string) => void }) {
  const [error, setError] = useState('');
  const started = useRef(false);
  const qc = useQueryClient();
  const nav = useNavigate();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    acceptInvite(token)
      .then(async gid => {
        try { localStorage.removeItem(INVITE_KEY); } catch { /* ignoré */ }
        await qc.invalidateQueries({ queryKey: ['gardens'] });
        onJoined(gid);
        nav('/', { replace: true });
      })
      .catch(e => { try { localStorage.removeItem(INVITE_KEY); } catch { /* ignoré */ } setError((e as Error).message); });
  }, [token, onJoined, qc, nav]);

  if (!error) return <Loading />;
  return (
    <main className="mx-auto flex min-h-full max-w-[440px] flex-col justify-center gap-5 px-6 py-10 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-vert-doux"><Picto slug="tomate" size={56} /></span>
      <h1 className="font-titre text-2xl font-semibold text-vert">Invitation impossible</h1>
      <p>{error}</p>
      <Btn onClick={() => nav('/', { replace: true })}>Retour à l’accueil</Btn>
    </main>
  );
}
