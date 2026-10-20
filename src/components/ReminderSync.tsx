import { useEffect, useState } from 'react';
import { useApp } from '../lib/app';
import { useAlertSettings, useTasks } from '../lib/data';
import { planReminders } from '../lib/reminders';
import { remindersEnabled, scheduleReminders } from '../lib/localReminders';

/** Reprogramme les rappels du téléphone quand les plantes, les tâches, la météo ou les réglages changent (et à l'ouverture de l'app). */
export function ReminderSync() {
  const { session, garden, crops, byId, zones, weather } = useApp();
  const tasks = useTasks(garden.id);
  const settings = useAlertSettings(session.user.id);
  const [enabled, setEnabled] = useState(remindersEnabled);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const sync = () => setEnabled(remindersEnabled());
    const wake = () => { if (document.visibilityState === 'visible') setTick(t => t + 1); };
    window.addEventListener('rappels-change', sync);
    document.addEventListener('visibilitychange', wake);
    return () => { window.removeEventListener('rappels-change', sync); document.removeEventListener('visibilitychange', wake); };
  }, []);

  useEffect(() => {
    if (!enabled || !settings.data || tasks.isLoading) return;
    const id = window.setTimeout(() => {
      const plan = planReminders({ crops, byId, zones, tasks: tasks.data ?? [], weather, hour: settings.data!.reminder_hour, skipIfRain: settings.data!.skip_if_rain, preferences: settings.data! });
      scheduleReminders(plan).catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(id);
  }, [enabled, crops, byId, zones, tasks.data, tasks.isLoading, weather, settings.data, tick]);

  return null;
}
