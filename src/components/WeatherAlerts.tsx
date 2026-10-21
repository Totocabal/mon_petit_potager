import { Link } from 'react-router-dom';
import { weatherAlerts, type WeatherAlert } from '../../supabase/functions/_shared/weather-alerts';
import { addDays, iso, today, whenText, parse } from '../lib/dates';
import type { Weather } from '../lib/weather';
import { Icon, NOTIFICATION_ICONS } from './ui';

export function WeatherAlertAdvice({ alert }: { alert: WeatherAlert }) {
  return <div className={`flex items-center gap-2 rounded-2xl p-2.5 text-sm ${alert.kind === 'heat' || alert.kind === 'storm' ? 'bg-soleil-doux text-soleil-encre' : 'bg-ciel text-ciel-encre'}`}>
    <Icon name={NOTIFICATION_ICONS[alert.kind]} size={36} />
    <p className="min-w-0"><b className="font-extrabold">{alert.label}</b><span className="block">{alert.advice}</span></p>
  </div>;
}

/** Les risques des deux prochains jours restent visibles même si les notifications sont désactivées. */
export function WeatherAlerts({ weather }: { weather: Weather }) {
  const first = iso(today()), last = iso(addDays(today(), 1));
  const days = weather.days.filter(d => d.date >= first && d.date <= last).map(day => ({ day, alerts: weatherAlerts(day) })).filter(d => d.alerts.length);
  if (!days.length) return null;
  return <section aria-labelledby="weather-alerts-title" className="flex flex-col gap-3 rounded-carte bg-white p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="weather-alerts-title" className="font-titre text-lg font-semibold">À protéger au potager</h2><Link to="/meteo" className="inline-flex min-h-11 items-center font-extrabold text-vert">Prévisions →</Link></div>
    {days.map(({ day, alerts }) => <div key={day.date} className="flex flex-col gap-2"><p className="text-sm font-extrabold">{whenText(parse(day.date))}</p>{alerts.map(alert => <WeatherAlertAdvice key={alert.kind} alert={alert} />)}</div>)}
  </section>;
}
