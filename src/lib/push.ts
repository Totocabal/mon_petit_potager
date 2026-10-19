import { supabase } from './supabase';
import { isNative } from './native';

export const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported = () => !isNative && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
/** Sur iPhone, les notifications n'existent que si l'app est ajoutée à l'écran d'accueil. */
export const needsInstall = () => !isNative && isIOS() && !isStandalone();

export async function registerWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try { return await navigator.serviceWorker.register('/sw.js'); } catch { return null; }
}

function keyBytes(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Demande l'autorisation, abonne cet appareil et l'enregistre. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Ce navigateur ne gère pas les notifications.');
  if (!VAPID_PUBLIC) throw new Error('Les notifications ne sont pas encore configurées (clé manquante).');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notifications refusées. Autorisez-les dans les réglages du navigateur ou de l’appareil.');
  await registerWorker();
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) as BufferSource }));
  const j = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({ endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth }, { onConflict: 'endpoint' });
  if (error) throw new Error(error.message);
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
  if (error) throw new Error('Envoi impossible : ' + error.message);
  if (!data || (data as { sent?: number }).sent === 0) throw new Error('Aucun appareil n’a reçu la notification. Réactivez les alertes sur cet appareil.');
}
