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
        </form>
      )}
    </main>
  );
}
