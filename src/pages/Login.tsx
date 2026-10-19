import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Btn, Picto } from '../components/ui';
import { isNative } from '../lib/native';

export default function Login({ invite = false }: { invite?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    // Dans l'app native, le lien d'email ouvrirait le navigateur : on se connecte avec le code
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: isNative ? {} : { emailRedirectTo: window.location.origin } });
    if (error) { setError(error.message); setState('error'); } else { setCode(''); setError(''); setState('sent'); }
  }

  async function google() {
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) { setError(error.message); setState('error'); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true); setError('');
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
    if (error) setError(error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid') ? 'Code incorrect ou expiré. Vérifiez-le ou demandez-en un nouveau.' : error.message);
    setChecking(false);
  }

  return (
    <main className="mx-auto flex min-h-full max-w-[440px] flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-vert"><Picto slug="tomate" size={68} /></span>
        <h1 className="font-titre text-[34px] font-semibold text-vert">Mon petit potager</h1>
        {invite && <p className="rounded-2xl bg-vert-doux px-4 py-2 text-sm font-bold text-vert-fonce">Vous êtes invité à rejoindre un potager. Connectez-vous pour y accéder.</p>}
        <p className="text-gris">Suivez vos plantes, sachez quoi faire chaque jour, n’oubliez plus d’arroser.</p>
      </div>
      {state === 'sent' ? (
        <form onSubmit={verify} className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <p className="text-center font-titre text-xl font-semibold text-vert">Regardez vos e-mails</p>
          <p className="text-center text-sm">Un code de connexion a été envoyé à <strong>{email}</strong>. Saisissez-le ci-dessous{isNative ? '.' : ', ou ouvrez le lien de l’e-mail sur cet appareil.'}</p>
          <label htmlFor="code" className="sr-only">Code reçu par e-mail</label>
          <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="123456"
            className="min-h-14 rounded-2xl border-2 border-trait px-4 text-center font-titre text-2xl font-semibold tracking-[0.3em] outline-none focus:border-vert" />
          {error && <p className="text-sm font-bold text-alerte">{error}</p>}
          <Btn type="submit" disabled={checking || code.length < 6}>{checking ? 'Vérification…' : 'Me connecter'}</Btn>
          <button type="button" onClick={() => { setState('idle'); setError(''); }} className="min-h-11 text-sm font-extrabold text-vert">Changer d’adresse ou renvoyer un code</button>
        </form>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-carte bg-white p-5">
          <label htmlFor="email" className="text-sm font-extrabold">Votre adresse e-mail</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="prenom@exemple.fr"
            className="min-h-12 rounded-2xl border-2 border-trait px-4 text-base font-bold outline-none focus:border-vert" />
          {state === 'error' && <p className="text-sm font-bold text-alerte">{error}</p>}
          <Btn type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Envoi…' : isNative ? 'Recevoir un code de connexion' : 'Recevoir un lien de connexion'}</Btn>
          <p className="text-center text-xs text-gris">Pas de mot de passe : un code ou un lien suffit.</p>
          {!isNative && (
            <>
              <div className="flex items-center gap-3 text-xs font-bold text-gris"><span className="h-px flex-1 bg-trait" />ou<span className="h-px flex-1 bg-trait" /></div>
              <button type="button" onClick={google} className="flex min-h-12 items-center justify-center gap-3 rounded-2xl border-2 border-trait bg-white px-4 text-base font-extrabold">
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
                Continuer avec Google
              </button>
            </>
          )}
        </form>
      )}
    </main>
  );
}
