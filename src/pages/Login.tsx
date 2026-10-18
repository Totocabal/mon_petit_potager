import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Btn, Picto } from '../components/ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } });
    if (error) { setError(error.message); setState('error'); } else setState('sent');
  }

  return (
    <main className="mx-auto flex min-h-full max-w-[440px] flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-vert"><Picto slug="tomate" size={68} /></span>
        <h1 className="font-titre text-[34px] font-semibold text-vert">Mon petit potager</h1>
        <p className="text-gris">Suivez vos plantes, sachez quoi faire chaque jour, n’oubliez plus d’arroser.</p>
      </div>
      {state === 'sent' ? (
        <div className="rounded-carte bg-white p-5 text-center">
          <p className="font-titre text-xl font-semibold text-vert">Regardez vos e-mails</p>
          <p className="mt-2 text-sm">Un lien de connexion a été envoyé à <strong>{email}</strong>. Ouvrez-le sur cet appareil.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <label htmlFor="email" className="text-sm font-extrabold">Votre adresse e-mail</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@exemple.fr"
            className="min-h-12 rounded-2xl border-2 border-trait px-4 text-base font-bold outline-none focus:border-vert" />
          {state === 'error' && <p className="text-sm font-bold text-alerte">{error}</p>}
          <Btn type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Envoi…' : 'Recevoir un lien de connexion'}</Btn>
          <p className="text-center text-xs text-gris">Pas de mot de passe : un lien suffit.</p>
        </form>
      )}
    </main>
  );
}
