import { notificationEnabled, type NotificationPreferences, type WeatherNotificationType } from './notification-types.ts';

export type ForecastDay = { date: string; tmin: number | null; tmax: number | null; code: number | null };
export type WeatherAlert = { kind: WeatherNotificationType; label: string; advice: string };

/** Seuils de conseil pour le potager ; ce ne sont pas des vigilances officielles. Plusieurs risques peuvent se cumuler. */
export function weatherAlerts(day: ForecastDay): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  if (day.tmin != null && Number.isFinite(day.tmin) && day.tmin <= 0) alerts.push({ kind: 'frost', label: 'Gel possible', advice: 'Protégez les plants sensibles avec un voile d’hivernage.' });
  if (day.code != null && [71, 73, 75, 77, 85, 86].includes(day.code)) alerts.push({ kind: 'snow', label: 'Neige prévue', advice: 'Protégez les jeunes plants et vérifiez les abris.' });
  if (day.tmax != null && Number.isFinite(day.tmax) && day.tmax >= 30) alerts.push({ kind: 'heat', label: 'Forte chaleur', advice: 'Prévoyez de l’ombre et vérifiez l’humidité du sol le soir.' });
  if (day.code != null && [95, 96, 99].includes(day.code)) alerts.push({ kind: 'storm', label: 'Orage prévu', advice: 'Vérifiez les tuteurs et mettez les pots fragiles à l’abri.' });
  return alerts;
}

type Crop = { species_id: string; sown_at: string };
type Species = { kind?: string; frost_sensitive: boolean };

/** Réutilisé par les rappels natifs et web. Les sols et plantations futures ne déclenchent pas de rappel météo. */
export function weatherReminderParts(o: {
  days: ForecastDay[]; date: string; tomorrow: string; preferences?: Partial<NotificationPreferences>;
  crops: Crop[]; byId: Map<string, Species>;
}): string[] {
  const parts: string[] = [];
  for (const day of o.days.filter(d => d.date === o.date || d.date === o.tomorrow)) {
    const planted = o.crops.filter(p => p.sown_at.slice(0, 10) <= day.date && o.byId.has(p.species_id) && o.byId.get(p.species_id)?.kind !== 'sol');
    if (!planted.length) continue;
    for (const alert of weatherAlerts(day)) {
      if (!notificationEnabled(o.preferences, alert.kind)) continue;
      if (alert.kind === 'frost' && !planted.some(p => o.byId.get(p.species_id)?.frost_sensitive)) continue;
      parts.push(`${alert.label} ${day.date === o.date ? 'aujourd’hui' : 'demain'} : ${alert.advice}`);
    }
  }
  return parts;
}
