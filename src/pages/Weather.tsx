import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { BackHeader, Page } from '../components/ui';
import { WeatherIcon } from '../components/WeatherIcon';
import { RAIN_MM, SKY_LABEL, skyOf, type WeatherDay } from '../lib/weather';
import { cap, iso, parse, today, addDays } from '../lib/dates';

/** Conseil de jardinier pour une journée, d'après la pluie et les températures. */
function tip(d: WeatherDay): { text: string; tone: 'eau' | 'froid' | 'chaud' } | null {
  if (d.tmin <= 0) return { text: 'Gel possible : protégez les plants sensibles', tone: 'froid' };
  if (d.rain >= RAIN_MM) return { text: 'Pas d’arrosage : la pluie suffit', tone: 'eau' };
  if (d.tmax >= 30) return { text: 'Forte chaleur : arrosez le soir', tone: 'chaud' };
  return null;
}
const TONE = { eau: 'bg-[#D3EAEE] text-[#1F4D5A]', froid: 'bg-[#E3E9F6] text-[#2A3A6B]', chaud: 'bg-soleil-doux text-soleil-encre' };

function dayLabel(date: string, t: string, tomorrow: string) {
  if (date === t) return 'Aujourd’hui';
  if (date === tomorrow) return 'Demain';
  return cap(parse(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }));
}

/** Prévisions sur 7 jours, ouvertes depuis la carte météo de l'accueil. */
export default function WeatherPage() {
  const { weather, profile } = useApp();
  const t = iso(today()), tomorrow = iso(addDays(today(), 1));

  if (!weather) {
    return (
      <Page>
        <BackHeader title="Météo" />
        <Link to="/profil" className="rounded-carte bg-white p-4 font-bold text-vert">Ajoutez votre ville pour voir la météo →</Link>
      </Page>
    );
  }

  const today_ = weather.days.find(d => d.date === t);
  const coming = weather.days.filter(d => d.date >= t);
  const past = weather.days.filter(d => d.date < t).slice().reverse();
  const code = weather.current?.code ?? today_?.code ?? 0;
  const temp = weather.current?.temp ?? today_?.tmax;
  const sky = skyOf(code);
  const week = coming.slice(0, 7);
  const rainWeek = Math.round(week.reduce((s, d) => s + d.rain, 0));

  return (
    <Page>
      <BackHeader kicker={profile?.city ?? undefined} title="Prévisions météo" />
      <div className="flex items-center gap-4 rounded-[28px] bg-[#D3EAEE] px-5 py-[18px]">
        <WeatherIcon sky={sky} animate />
        <div className="flex min-w-0 flex-col gap-1 leading-[normal]">
          <p className="font-titre text-[34px] font-semibold text-[#1F4D5A]">{temp}° <span className="text-base font-medium">{SKY_LABEL[sky]}</span></p>
          {today_ && <p className="text-sm text-[#2C5A66]">Aujourd’hui : {today_.tmin}° / {today_.tmax}°{today_.rain >= 0.5 ? ` · ${Math.round(today_.rain)} mm de pluie` : ''}</p>}
          <p className="text-sm font-bold text-[#2C5A66]">{rainWeek >= 1 ? `${rainWeek} mm de pluie attendus cette semaine` : 'Pas de pluie attendue cette semaine'}</p>
        </div>
      </div>

      <section aria-labelledby="h-prev" className="flex flex-col rounded-carte bg-white px-4 py-1">
        <h2 id="h-prev" className="sr-only">Les 7 prochains jours</h2>
        {week.map(d => {
          const k = skyOf(d.code), a = tip(d);
          return (
            <div key={d.date} className="flex flex-col gap-1.5 border-b border-dashed border-trait py-3 last:border-0">
              <div className="flex items-center gap-3">
                <WeatherIcon sky={k} size={46} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <b className="font-extrabold">{dayLabel(d.date, t, tomorrow)}</b>
                  <span className="text-[13px] text-gris">{SKY_LABEL[k]}{d.rain >= 0.5 ? ` · ${Math.round(d.rain)} mm` : ''}{d.chance != null && d.chance >= 20 ? ` · ${d.chance} % de pluie` : ''}</span>
                </div>
                <span className="font-titre text-lg font-semibold">{d.tmax}° <span className="text-sm font-medium text-gris">{d.tmin}°</span></span>
              </div>
              {a && <p className={`self-start rounded-full px-3 py-1 text-[13px] font-extrabold ${TONE[a.tone]}`}>{a.text}</p>}
            </div>
          );
        })}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="h-past" className="flex flex-col gap-2 rounded-carte bg-white p-4">
          <h2 id="h-past" className="font-titre text-lg font-semibold">Derniers jours</h2>
          <p className="text-[13px] text-gris">La pluie comptée comme arrosage à partir de {RAIN_MM} mm.</p>
          {past.map(d => (
            <div key={d.date} className="flex items-center justify-between text-sm">
              <span className="font-bold">{dayLabel(d.date, t, tomorrow)}</span>
              <span className={d.rain >= RAIN_MM ? 'font-extrabold text-eau' : 'text-gris'}>{d.rain >= 0.5 ? `${Math.round(d.rain)} mm` : 'pas de pluie'}{d.rain >= RAIN_MM ? ' · arrosage compté' : ''}</span>
            </div>
          ))}
        </section>
      )}
      <p className="text-center text-xs text-gris">Données Open-Meteo, mises à jour toutes les 30 minutes.</p>
    </Page>
  );
}
