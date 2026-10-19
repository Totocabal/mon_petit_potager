import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useAlertSettings, useSaveAlertSettings, useSetSpeciesAlerts } from '../lib/data';
import { BackHeader, Btn, Note, Page, Tile, useToast } from '../components/ui';
import { isNative } from '../lib/native';
import { currentSubscription, disablePush, enablePush, needsInstall, pushSupported, sendTestPush, VAPID_PUBLIC } from '../lib/push';
import { everyDays, lc, nextWater } from '../lib/garden';
import { whenText } from '../lib/dates';

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange}
      className={`flex h-8 w-[54px] shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-45 ${on ? 'justify-end bg-vert' : 'justify-start bg-[#C9D3C4]'}`}>
      <span className="h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]" />
    </button>
  );
}

export default function Alerts() {
  const { session, garden, crops, byId, rainFor } = useApp();
  const settings = useAlertSettings(session.user.id);
  const save = useSaveAlertSettings(session.user.id);
  const setSpecies = useSetSpeciesAlerts(garden.id);
  const toast = useToast();
  const [device, setDevice] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const st = settings.data;
  const install = needsInstall();
  const supported = pushSupported();

  useEffect(() => { currentSubscription().then(s => setDevice(!!s)).catch(() => setDevice(false)); }, []);

  const rows = useMemo(() => {
    const m = new Map<string, { id: string; on: boolean; every: number; next: Date }>();
    for (const p of crops) {
      const s = byId.get(p.species_id); if (!s) continue;
      const next = nextWater(p, s, rainFor(p.zone_id));
      const cur = m.get(s.id);
      if (!cur) m.set(s.id, { id: s.id, on: p.alerts_enabled, every: everyDays(p, s), next });
      else { cur.on = cur.on && p.alerts_enabled; if (next < cur.next) cur.next = next; }
    }
    return [...m.values()].sort((a, b) => byId.get(a.id)!.name.localeCompare(byId.get(b.id)!.name, 'fr'));
  }, [crops, byId, rainFor]);

  const active = !!st?.enabled && device === true;
  const hour = st?.reminder_hour ?? 19;
  const thirsty = rows.filter(r => r.on).slice(0, 2).map(r => byId.get(r.id)!.name);

  async function toggleAll() {
    setBusy(true); setError('');
    try {
      if (active) { await disablePush(); await save.mutateAsync({ enabled: false }); setDevice(false); toast('Alertes désactivées'); }
      else { await enablePush(); await save.mutateAsync({ enabled: true }); setDevice(true); toast('Alertes activées sur cet appareil'); }
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  async function test() {
    setBusy(true); setError('');
    try { await sendTestPush(); toast('Notification envoyée'); } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  return (
    <Page>
      <BackHeader title="Alertes d’arrosage" kicker="On vous prévient quand vos plantes ont soif" />

      {install && <Note tone="neutre">Sur iPhone, les alertes demandent d’ajouter l’app à l’écran d’accueil. <Link to="/installer" className="font-extrabold underline">Voir comment faire</Link></Note>}
      {isNative && <Note tone="neutre">Les rappels d’arrosage ne sont pas encore disponibles dans l’app : ils fonctionnent sur le site web.</Note>}
      {!install && !supported && !isNative && <Note tone="neutre">Ce navigateur ne gère pas les notifications. Essayez avec Chrome, Edge, Firefox ou Safari récent.</Note>}
      {!VAPID_PUBLIC && !isNative && <Note tone="mauvais">Les notifications ne sont pas encore configurées : la clé VITE_VAPID_PUBLIC_KEY manque.</Note>}

      <div className="rounded-[24px] bg-white px-[18px] py-1">
        <div className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-vert-doux text-vert"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></svg></span>
          <span className="flex flex-1 flex-col"><b className="font-extrabold">Activer les alertes</b><span className="text-[13px] text-gris">Sur cet appareil</span></span>
          <Switch on={active} label="Activer les alertes" onChange={toggleAll} disabled={busy || install || !supported || !VAPID_PUBLIC || device === null} />
        </div>
        <div className="flex min-h-16 items-center gap-3">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D3EAEE] text-[#2C5A66]"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 15h10a4 4 0 0 0 0-8 6 6 0 0 0-11 2 3 3 0 0 0 1 6z" /><path d="M9 18l-1 2M13 18l-1 2M17 18l-1 2" /></svg></span>
          <span className="flex flex-1 flex-col"><b className="font-extrabold">Pas d’alerte s’il pleut</b><span className="text-[13px] text-gris">La nature s’occupe de l’arrosage</span></span>
          <Switch on={st?.skip_if_rain ?? true} label="Pas d’alerte s’il pleut" onChange={() => save.mutate({ skip_if_rain: !(st?.skip_if_rain ?? true) })} disabled={!st} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-titre text-lg font-semibold">Heure du rappel</h2>
        <div role="group" aria-label="Heure du rappel" className="flex gap-2 rounded-[20px] bg-white p-[5px]">
          {([[8, 'Matin · 8 h'], [19, 'Soir · 19 h']] as const).map(([h, label]) => (
            <button key={h} aria-pressed={hour === h} onClick={() => save.mutate({ reminder_hour: h })} className={`min-h-11 flex-1 rounded-2xl text-sm font-extrabold ${hour === h ? 'bg-vert text-white' : 'text-[#3D4A3F]'}`}>{label}</button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-titre text-lg font-semibold">Par plante</h2>
          <div className="rounded-[24px] bg-white px-4 py-0.5">
            {rows.map(r => {
              const s = byId.get(r.id)!;
              return (
                <div key={r.id} className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait last:border-0">
                  <Tile slug={s.slug} w={40} h={40} size={34} round={14} />
                  <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[15px] font-extrabold">{s.name}</b>
                    <span className="text-[13px] text-gris">{r.every === 1 ? 'Tous les jours' : `Tous les ${r.every} jours`} · {active && r.on ? `${whenText(r.next)} ${hour} h` : 'en pause'}</span></span>
                  <Switch on={r.on} label={`Alertes pour ${lc(s.name)}`} onChange={() => setSpecies.mutate({ speciesId: r.id, on: !r.on })} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <p className="ml-2 text-xs font-extrabold uppercase tracking-wider text-gris">Aperçu de l’alerte</p>
        <div className="flex items-center gap-3 rounded-[22px] bg-white/90 px-3.5 py-3 shadow-[0_10px_28px_rgba(35,64,43,0.18)]">
          <span aria-hidden className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-vert text-white"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-8" /><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z" /><path d="M12 10c0-3 2-5 6-5 0 3-2 5-6 5z" /></svg></span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="flex justify-between text-xs font-bold text-gris"><span>Mon petit potager</span><span>{hour === 8 ? '08:00' : '19:00'}</span></span>
            <span className="text-[15px] font-extrabold">{thirsty.length ? `À arroser : ${thirsty.join(', ')}` : 'À arroser : vos plantes'}</span>
            <span className="text-[13px] text-[#3D4A3F]">Un petit verre d’eau pour elles ?</span>
          </span>
        </div>
      </div>

      {active && <Btn variant="doux" onClick={test} disabled={busy}>Envoyer une notification de test</Btn>}
      {error && <p className="text-sm font-bold text-alerte">{error}</p>}
      {!isNative && <Link to="/installer" className="text-center text-sm font-extrabold text-vert">Installer l’app sur l’écran d’accueil</Link>}
    </Page>
  );
}
