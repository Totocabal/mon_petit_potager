import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

/** Vrai dans l'app Android ou iOS (Capacitor), faux sur le site web. */
export const isNative = Capacitor.isNativePlatform();

/** Adresse publique du site : liens d'invitation et de connexion. Dans l'app native, `window.location` ne convient pas. */
export const siteUrl = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '') || window.location.origin;

/** Adresse que le lien de connexion de l'e-mail ouvre dans l'app (à autoriser dans les Redirect URLs de Supabase). */
export const AUTH_SCHEME = 'fr.monpetitpotager.app://';
export const AUTH_CALLBACK = AUTH_SCHEME + 'login-callback';

/** Ouvre une session à partir du lien de connexion reçu par e-mail (jetons dans le fragment, ou code). */
async function handleAuthUrl(url: string | undefined) {
  if (!url?.startsWith(AUTH_SCHEME)) return;
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  const p = new URLSearchParams(hash || query);
  const access = p.get('access_token'), refresh = p.get('refresh_token'), code = new URLSearchParams(query).get('code');
  try {
    if (access && refresh) await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    else if (code) await supabase.auth.exchangeCodeForSession(code);
  } catch { /* lien expiré ou déjà utilisé : l'écran de connexion reste affiché */ }
}

/** Réglages propres à l'app native : bouton retour d'Android, lien de connexion. */
export async function initNative() {
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    if ((window.history.state?.idx ?? 0) > 0) window.history.back();
    else App.exitApp();
  });
  App.addListener('appUrlOpen', ({ url }) => { void handleAuthUrl(url); });
  void handleAuthUrl((await App.getLaunchUrl())?.url);
}
