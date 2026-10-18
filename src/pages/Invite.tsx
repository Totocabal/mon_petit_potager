import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../lib/app';
import { inviteUrl, sendInviteEmail, useCreateInvite, useDeleteInvite, useInvites, useMembers, useRemoveMember } from '../lib/data';
import { BackHeader, Btn, Page, useToast } from '../components/ui';
import { diffDays, parse, today } from '../lib/dates';
import type { Invite } from '../lib/types';

const input = 'min-h-12 rounded-2xl border-2 border-trait bg-white px-4 text-base font-bold outline-none focus:border-vert';
const expires = (i: Invite) => { const n = Math.max(0, diffDays(parse(i.expires_at), today())); return n <= 1 ? 'expire aujourd’hui ou demain' : `expire dans ${n} jours`; };

export default function InvitePage() {
  const { garden, session, profile } = useApp();
  const members = useMembers(garden.id);
  const invites = useInvites(garden.id);
  const create = useCreateInvite(garden.id);
  const del = useDeleteInvite(garden.id);
  const remove = useRemoveMember(garden.id);
  const toast = useToast();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const me = session.user.id;
  const iAmOwner = members.data?.find(m => m.user_id === me)?.role === 'owner';

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setBusy(true); setError('');
    try {
      const inv = await create.mutateAsync(addr);
      await sendInviteEmail(addr, inv.token);
      toast('Invitation envoyée à ' + addr);
      setEmail('');
    } catch (err) { setError((err as Error).message); }
    setBusy(false);
  }
  async function copy() {
    setError('');
    try {
      const inv = await create.mutateAsync(null);
      const url = inviteUrl(inv.token);
      setLink(url);
      try { await navigator.clipboard.writeText(url); toast('Lien copié'); } catch { toast('Copiez le lien ci-dessous'); }
    } catch (err) { setError((err as Error).message); }
  }
  async function resend(i: Invite) {
    try {
      if (i.email) { await sendInviteEmail(i.email, i.token); toast('Invitation renvoyée'); }
      else { const url = inviteUrl(i.token); setLink(url); try { await navigator.clipboard.writeText(url); toast('Lien copié'); } catch { toast('Copiez le lien ci-dessous'); } }
    } catch (err) { setError((err as Error).message); }
  }

  const name = (m: { user_id: string; first_name: string | null }) => (m.user_id === me ? (profile?.first_name ?? 'Vous') + ' (vous)' : m.first_name ?? 'Membre');

  return (
    <Page>
      <BackHeader title="Inviter un proche" kicker={garden.name} />
      <p className="text-[15px] leading-snug text-[#3D4A3F]">Votre proche verra tout le potager, pourra noter un arrosage et recevra les alertes. Un « J’ai arrosé » vaut pour tout le monde.</p>

      <form onSubmit={send} className="flex flex-col gap-2.5 rounded-[24px] bg-white p-4">
        <label className="flex flex-col gap-1.5 text-sm font-extrabold">Adresse e-mail
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@exemple.fr" autoComplete="off" className={input} />
        </label>
        <Btn type="submit" disabled={busy || !email.trim()}>{busy ? 'Envoi…' : 'Envoyer l’invitation'}</Btn>
        <div className="flex items-center gap-2.5 text-[13px] font-bold text-gris"><span className="h-px flex-1 bg-trait" />ou<span className="h-px flex-1 bg-trait" /></div>
        <button type="button" onClick={copy} disabled={create.isPending} className="flex min-h-12 items-center justify-center gap-2 rounded-[18px] border-2 border-vert bg-white font-extrabold text-vert disabled:opacity-50">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
          Copier un lien d’invitation
        </button>
        {link && <input readOnly value={link} onFocus={e => e.currentTarget.select()} aria-label="Lien d’invitation" className="min-h-11 rounded-xl bg-fond px-3 text-xs font-bold text-gris" />}
        <p className="text-center text-xs text-gris">Le lien est valable 7 jours et une seule fois.</p>
        {error && <p className="text-sm font-bold text-alerte">{error}</p>}
      </form>

      <h2 className="font-titre text-xl font-semibold">Membres du potager</h2>
      <div className="rounded-[24px] bg-white px-4 py-1">
        {(members.data ?? []).map(m => (
          <div key={m.user_id} className="flex min-h-[56px] items-center gap-3 border-b border-dashed border-trait last:border-0">
            <span className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${m.role === 'owner' ? 'bg-soleil text-soleil-encre' : 'bg-[#D3EAEE] text-[#1F4D5A]'}`}>{(m.user_id === me ? profile?.first_name ?? 'V' : m.first_name ?? 'M').charAt(0).toUpperCase()}</span>
            <span className="min-w-0 flex-1 truncate font-bold">{name(m)}</span>
            <span className="text-[13px] font-bold text-gris">{m.role === 'owner' ? 'Propriétaire' : 'Membre'}</span>
            {iAmOwner && m.user_id !== me && <button aria-label={`Retirer ${m.first_name ?? 'ce membre'}`} onClick={() => { if (confirm('Retirer ce membre du potager ?')) remove.mutate(m.user_id); }} className="px-1 text-xl text-gris">×</button>}
            {!iAmOwner && m.user_id === me && <button onClick={async () => { if (confirm('Quitter ce potager ?')) { await remove.mutateAsync(me); nav('/', { replace: true }); } }} className="rounded-xl bg-fond px-2.5 py-1.5 text-[13px] font-extrabold text-alerte">Quitter</button>}
          </div>
        ))}
        {(invites.data ?? []).map(i => (
          <div key={i.id} className="flex min-h-[56px] items-center gap-3 border-b border-dashed border-trait last:border-0">
            <span aria-hidden className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-[#A6D785] text-vert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 8l9 6 9-6" /></svg>
            </span>
            <span className="flex min-w-0 flex-1 flex-col"><b className="truncate font-bold">{i.email ?? 'Lien d’invitation'}</b><span className="text-xs text-gris">En attente · {expires(i)}</span></span>
            <button onClick={() => resend(i)} className="min-h-9 rounded-xl bg-vert-doux px-3 text-[13px] font-extrabold text-vert">{i.email ? 'Relancer' : 'Copier'}</button>
            <button aria-label="Annuler l’invitation" onClick={() => del.mutate(i.id)} className="px-1 text-xl text-gris">×</button>
          </div>
        ))}
      </div>
    </Page>
  );
}
