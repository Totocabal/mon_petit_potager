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

const shortDate = (date: string) => parse(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
function dayName(date: string, t: string, tomorrow: string) {
  if (date === t) return 'Aujourd’hui';
  if (date === tomorrow) return 'Demain';
  return cap(parse(date).toLocaleDateString('fr-FR', { weekday: 'long' }));
}

const Drop = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3c3.2 4 6 7.2 6 11a6 6 0 0 1-12 0c0-3.8 2.8-7 6-11z" /></svg>
);

/** Pictogramme du ciel sur une tuile bleu ciel (plus sombre pour l'orage, dont le nuage est pâle) : il ressort sur le fond blanc et tous les jours s'alignent. */
const SkyTile = ({ sky }: { sky: ReturnType<typeof skyOf> }) => (
  <span className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px]" style={{ background: sky === 'orage' ? '#9DB3BB' : '#D3EAEE' }}><WeatherIcon sky={sky} size={66} /></span>
);

/** « 6 mm · 100 % » : pluie attendue et probabilité. */
function RainLine({ d }: { d: WeatherDay }) {
  const wet = d.rain >= 0.5;
  return (
    <span className={`flex items-center gap-1.5 text-[13px] font-bold tabular-nums ${d.rain >= RAIN_MM ? 'text-eau' : 'text-gris'}`}>
      <Drop />
      {wet ? `${Math.round(d.rain)} mm` : 'Pas de pluie'}
      {d.chance != null && d.chance >= 20 && <span className="font-semibold text-gris">· {d.chance} %</span>}
    </span>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col items-center gap-0.5 rounded-2xl bg-white/70 px-2 py-2.5">
    <span className="text-xs font-bold text-[#2C5A66]">{label}</span>
    <b className="font-titre text-xl font-semibold text-[#1F4D5A]">{value}</b>
  </div>
);

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

      <section aria-label="Maintenant" className="flex flex-col gap-4 rounded-[28px] bg-[#D3EAEE] p-5">
        <div className="flex items-center gap-5">
          <WeatherIcon sky={sky} size={104} animate />
          <div className="flex min-w-0 flex-col leading-none">
            <p className="font-titre text-[54px] font-semibold text-[#1F4D5A]">{temp}°</p>
            <p className="mt-1.5 text-lg font-bold text-[#2C5A66]">{cap(SKY_LABEL[sky])}</p>
          </div>
        </div>
        {today_ && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Mini" value={`${today_.tmin}°`} />
            <Stat label="Maxi" value={`${today_.tmax}°`} />
            <Stat label="Pluie" value={today_.rain >= 0.5 ? `${Math.round(today_.rain)} mm` : '0 mm'} />
          </div>
        )}
        <p className="text-sm font-bold text-[#2C5A66]">{rainWeek >= 1 ? `${rainWeek} mm de pluie attendus cette semaine` : 'Pas de pluie attendue cette semaine'}</p>
      </section>

      <section aria-labelledby="h-prev" className="rounded-carte bg-white px-4 py-1">
        <h2 id="h-prev" className="sr-only">Les 7 prochains jours</h2>
        <ul>
          {week.map(d => {
            const a = tip(d);
            return (
              <li key={d.date} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 border-b border-dashed border-trait py-3.5 last:border-0">
                <SkyTile sky={skyOf(d.code)} />
                <div className="flex min-w-0 flex-col gap-0.5">
                  <b className="text-[17px] font-extrabold leading-tight">{dayName(d.date, t, tomorrow)}</b>
                  <span className="text-[13px] text-gris">{shortDate(d.date)} · {SKY_LABEL[skyOf(d.code)]}</span>
                  <RainLine d={d} />
                </div>
                <div className="flex flex-col items-end leading-tight">
                  <span className="font-titre text-2xl font-semibold">{d.tmax}°</span>
                  <span className="text-sm font-bold text-gris">{d.tmin}°</span>
                </div>
                {a && <p className={`col-span-2 col-start-2 justify-self-start rounded-full px-3 py-1 text-[13px] font-extrabold ${TONE[a.tone]}`}>{a.text}</p>}
              </li>
            );
          })}
        </ul>
      </section>

      {past.length > 0 && (
        <section aria-labelledby="h-past" className="flex flex-col gap-1 rounded-carte bg-white p-4">
          <h2 id="h-past" className="font-titre text-lg font-semibold">Derniers jours</h2>
          <p className="mb-1 text-[13px] text-gris">Une pluie de {RAIN_MM} mm ou plus compte comme un arrosage.</p>
          <ul>
            {past.map(d => (
              <li key={d.date} className="flex min-h-11 items-center justify-between gap-3 border-b border-dashed border-trait last:border-0">
                <span className="font-bold">{dayName(d.date, t, tomorrow)} <span className="font-semibold text-gris">· {shortDate(d.date)}</span></span>
                <span className={`flex items-center gap-1.5 text-sm font-bold tabular-nums ${d.rain >= RAIN_MM ? 'text-eau' : 'text-gris'}`}>
                  <Drop size={14} />{d.rain >= 0.5 ? `${Math.round(d.rain)} mm` : 'Pas de pluie'}{d.rain >= RAIN_MM && <span className="font-semibold">· arrosage compté</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-center text-xs text-gris">Données Open-Meteo, mises à jour toutes les 30 minutes.</p>
    </Page>
  );
}
