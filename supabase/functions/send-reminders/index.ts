import { weatherReminderParts, type ForecastDay } from '../_shared/weather-alerts.ts';
import { notificationEnabled, taskNotificationEnabled } from '../_shared/notification-types.ts';
// Rappels du potager : arrosage, récolte, tâches du jour. Appelée chaque heure par pg_cron ;
// n'envoie qu'aux personnes dont l'heure de rappel (8 h ou 19 h, heure de Paris) est la bonne.
// Appelée par une personne connectée avec { "test": true }, elle envoie une notification de test.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const TZ = 'Europe/Paris';
const RAIN_MM = 3;
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

const secret = async (name: string): Promise<string> => {
  const { data, error } = await admin.rpc('reminder_secret', { secret_name: name });
  if (error || !data) throw new Error('Secret manquant : ' + name);
  return data as string;
};

function parisNow() {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, ...o }).format(new Date());
  return { date: f({ year: 'numeric', month: '2-digit', day: '2-digit' }), hour: Number(f({ hour: '2-digit', hour12: false })) % 24 };
}
const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 864e5;
const addIso = (iso: string, n: number) => new Date((day(iso) + n) * 864e5).toISOString().slice(0, 10);

type Species = { id: string; name: string; water_every_days: number; harvest_months: number[]; days_to_harvest: number | null; kind: string; frost_sensitive: boolean };
type Planting = { id: string; garden_id: string; zone_id: string; species_id: string; sown_at: string; last_watered_at: string | null; water_every_days: number | null; days_to_harvest: number | null; alerts_enabled: boolean };

type Forecast = { rain: string | null; days: ForecastDay[] };
/** Cache limité à cet envoi : un nouvel appel recharge les prévisions. */
async function forecast(lat: number | null, lon: number | null, today: string, cache: Map<string, Forecast>): Promise<Forecast> {
  if (lat == null || lon == null) return { rain: null, days: [] };
  const key = `${lat},${lon}`;
  if (cache.has(key)) return cache.get(key)!;
  let res: Forecast = { rain: null, days: [] };
  try {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,weather_code&past_days=3&forecast_days=2&timezone=auto`);
    if (!r.ok) throw new Error('Météo indisponible');
    const d = (await r.json()).daily;
    res = {
      rain: (d.time as string[]).filter((t, i) => t <= today && (d.precipitation_sum[i] ?? 0) >= RAIN_MM).sort().pop() ?? null,
      days: (d.time as string[]).map((date, i) => ({ date, tmax: d.temperature_2m_max[i] ?? null, tmin: d.temperature_2m_min[i] ?? null, code: d.weather_code[i] ?? null }))
    };
  } catch { /* Pas de météo : les rappels habituels restent disponibles. */ }
  cache.set(key, res);
  return res;
}

const list = (names: string[]) => (names.length <= 3 ? names.join(', ') : names.slice(0, 3).join(', ') + ` et ${names.length - 3} autre${names.length - 3 > 1 ? 's' : ''}`);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  const body = await req.json().catch(() => ({}));
  const cronSecret = req.headers.get('x-cron-secret');
  const isCron = !!cronSecret && cronSecret === (await secret('cron_secret'));
  let onlyUser: string | null = null;
  if (!isCron) {
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /i, '');
    const { data } = await admin.auth.getUser(jwt);
    if (!data.user) return json({ error: 'Non autorisé' }, 401);
    onlyUser = data.user.id;
  }
  webpush.setVapidDetails(await secret('vapid_subject'), await secret('vapid_public'), await secret('vapid_private'));

  const now = parisNow();
  const hour: number = isCron && typeof body.hour === 'number' ? body.hour : now.hour;
  const dry = isCron && body.dry === true;
  const forceAll = isCron && body.force === true;

  let subsQ = admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth');
  if (onlyUser) subsQ = subsQ.eq('user_id', onlyUser);
  const { data: subs } = await subsQ;
  const byUser = new Map<string, NonNullable<typeof subs>>();
  for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  if (!byUser.size) return json({ sent: 0, note: 'Aucun appareil abonné' });

  const ids = [...byUser.keys()];
  const [{ data: settings }, { data: profiles }, { data: members }, { data: speciesRows }] = await Promise.all([
    admin.from('alert_settings').select('*').in('user_id', ids),
    admin.from('profiles').select('id, lat, lon').in('id', ids),
    admin.from('garden_members').select('user_id, garden_id').in('user_id', ids),
    admin.from('species').select('id, name, water_every_days, harvest_months, days_to_harvest, kind, frost_sensitive'),
  ]);
  const species = new Map((speciesRows as Species[]).map(s => [s.id, s]));
  const month = +now.date.slice(5, 7);
  const out: { user: string; garden: string; title: string; body: string }[] = [];
  let sent = 0, removed = 0;
  const weatherCache = new Map<string, Forecast>();

  for (const uid of ids) {
    const st = settings?.find(s => s.user_id === uid) ?? { enabled: true, skip_if_rain: true, reminder_hour: 19 };
    const messages: { garden: string; title: string; body: string; tag: string }[] = [];

    if (onlyUser) {
      messages.push({ garden: '', title: 'Mon petit potager', body: 'Les alertes fonctionnent sur cet appareil. À bientôt au jardin !', tag: 'potager-test' });
    } else {
      if (!st.enabled || (st.reminder_hour !== hour && !forceAll)) continue;
      const gids = (members ?? []).filter(m => m.user_id === uid).map(m => m.garden_id);
      if (!gids.length) continue;
      const prof = profiles?.find(p => p.id === uid);
      const weather = await forecast(prof?.lat ?? null, prof?.lon ?? null, now.date, weatherCache);
      const rain = st.skip_if_rain ? weather.rain : null;
      const [{ data: gardens }, { data: zones }, { data: plantings }, { data: tasks }] = await Promise.all([
        admin.from('gardens').select('id, name').in('id', gids),
        admin.from('zones').select('id, sheltered').in('garden_id', gids),
        admin.from('plantings').select('id, garden_id, zone_id, species_id, sown_at, last_watered_at, water_every_days, days_to_harvest, alerts_enabled').in('garden_id', gids).is('removed_at', null),
        admin.from('tasks').select('garden_id, title, origin, notification_type').in('garden_id', gids).is('done_at', null).lte('due_date', now.date),
      ]);
      for (const g of gardens ?? []) {
        const ps = ((plantings ?? []) as Planting[]).filter(p => p.garden_id === g.id);
        const water = new Set<string>(), harvest = new Set<string>();
        for (const p of ps) {
          const s = species.get(p.species_id); if (!s) continue;
          if (notificationEnabled(st, 'water') && p.alerts_enabled) {
            const sheltered = zones?.find(z => z.id === p.zone_id)?.sheltered;
            let last = (p.last_watered_at ?? p.sown_at).slice(0, 10);
            if (rain && !sheltered && rain > last) last = rain;
            if (addIso(last, p.water_every_days ?? s.water_every_days) <= now.date) water.add(s.name);
          }
          if (notificationEnabled(st, 'harvest') && s.harvest_months.includes(month) && ((p.days_to_harvest ?? s.days_to_harvest) == null || day(now.date) - day(p.sown_at.slice(0, 10)) >= (p.days_to_harvest ?? s.days_to_harvest)!)) harvest.add(s.name);
        }
        const todo = (tasks ?? []).filter(t => t.garden_id === g.id && taskNotificationEnabled(st, t));
        const parts = weatherReminderParts({ days: weather.days, date: now.date, tomorrow: addIso(now.date, 1), preferences: st, crops: ps, byId: species });
        if (water.size) parts.push('À arroser : ' + list([...water]));
        if (harvest.size) parts.push('À récolter : ' + list([...harvest]));
        if (todo.length) parts.push(todo.length === 1 ? 'Tâche : ' + todo[0].title : `${todo.length} tâches du jour`);
        if (parts.length) messages.push({ garden: g.name, title: gids.length > 1 ? `Mon petit potager · ${g.name}` : 'Mon petit potager', body: parts.join(' · '), tag: 'potager-' + g.id });
      }
    }

    for (const m of messages) {
      out.push({ user: uid, garden: m.garden, title: m.title, body: m.body });
      if (dry) continue;
      for (const s of byUser.get(uid)!) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: m.title, body: m.body, tag: m.tag, url: '/' }), { TTL: 6 * 3600 });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) { await admin.from('push_subscriptions').delete().eq('id', s.id); removed++; }
        }
      }
    }
  }
  return json({ hour, sent, removed, messages: dry ? out : out.length });
});
