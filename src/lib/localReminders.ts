import { Capacitor } from '@capacitor/core';
import type { Reminder } from './reminders';

/** Rappels programmés sur le téléphone (app Android et iOS) : l'état « activé » est propre à l'appareil. */
const KEY = 'rappels-natifs';
const CHANNEL = 'rappels';
const FIRST_ID = 1000;
const TEST_ID = 999;

export const remindersEnabled = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
export function setRemindersEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* stockage indisponible */ }
  window.dispatchEvent(new Event('rappels-change'));
}

const plugin = async () => (await import('@capacitor/local-notifications')).LocalNotifications;

export async function remindersPermission(): Promise<boolean> {
  return (await (await plugin()).checkPermissions()).display === 'granted';
}
export async function requestRemindersPermission(): Promise<boolean> {
  return (await (await plugin()).requestPermissions()).display === 'granted';
}

async function ensureChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  await (await plugin()).createChannel({ id: CHANNEL, name: 'Rappels d’arrosage', description: 'Arrosage, récolte et tâches du jour', importance: 4, visibility: 1 });
}

/** Remplace tous les rappels programmés par ceux de la liste (heure approximative : pas de réglage « alarmes exactes » à demander). */
export async function scheduleReminders(list: Reminder[]) {
  const LN = await plugin();
  const { notifications } = await LN.getPending();
  const mine = notifications.filter(n => n.id !== TEST_ID);
  if (mine.length) await LN.cancel({ notifications: mine });
  if (!list.length) return;
  await ensureChannel();
  await LN.schedule({ notifications: list.map((r, i) => ({ id: FIRST_ID + i, title: r.title, body: r.body, channelId: CHANNEL, isExactNotification: false, schedule: { at: r.at, allowWhileIdle: true } })) });
}

export async function cancelReminders() {
  const LN = await plugin();
  const { notifications } = await LN.getPending();
  if (notifications.length) await LN.cancel({ notifications });
}

/** Notification de test, dans quelques secondes. */
export async function testReminder() {
  const LN = await plugin();
  await ensureChannel();
  await LN.schedule({ notifications: [{ id: TEST_ID, title: 'Mon petit potager', body: 'Les rappels fonctionnent sur ce téléphone. À bientôt au jardin !', channelId: CHANNEL, isExactNotification: false, schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true } }] });
}
