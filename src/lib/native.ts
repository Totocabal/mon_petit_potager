import { Capacitor } from '@capacitor/core';

/** Vrai dans l'app Android ou iOS (Capacitor), faux sur le site web. */
export const isNative = Capacitor.isNativePlatform();

/** Adresse publique du site : liens d'invitation et de connexion. Dans l'app native, `window.location` ne convient pas. */
export const siteUrl = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '') || window.location.origin;

/** Réglages propres à l'app native : bouton retour d'Android. */
export async function initNative() {
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', () => {
    if ((window.history.state?.idx ?? 0) > 0) window.history.back();
    else App.exitApp();
  });
}
