import { NOTIFICATION_TYPES, TASK_REMINDER_TYPES, WEATHER_NOTIFICATION_TYPES, notificationEnabled, type NotificationType } from '../../supabase/functions/_shared/notification-types';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../lib/app';
import { useAlertSettings, useSaveAlertSettings, useSetSpeciesAlerts } from '../lib/data';
import { BackHeader, Btn, Icon, NOTIFICATION_ICONS, Note, Page, Tile, useToast } from '../components/ui';
import { isNative } from '../lib/native';
import { cancelReminders, remindersEnabled, remindersPermission, requestRemindersPermission, setRemindersEnabled, testReminder } from '../lib/localReminders';
import { currentSubscription, disablePush, enablePush, needsInstall, pushSupported, sendTestPush, VAPID_PUBLIC } from '../lib/push';
import { everyDays, lc, nextWater } from '../lib/garden';
import { whenText } from '../lib/dates';

function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange}
      className="flex h-11 w-[54px] shrink-0 items-center disabled:opacity-45">
      <span className={`flex h-8 w-full items-center rounded-full p-1 transition-colors ${on ? 'justify-end bg-vert' : 'justify-start bg-trait'}`}><span className="h-6 w-6 rounded-full bg-white shadow-sm" /></span>
    </button>
  );
}

export default function Alerts() {
  const { session, garden, crops, byId, rainFor, profile } = useApp();
  const settings = useAlertSettings(session.user.id);
  const save = useSaveAlertSettings(session.user.id);
  const setSpecies = useSetSpeciesAlerts(garden.id);
  const toast = useToast();
  const [device, setDevice] = useState<boolean | null>(isNative ? false : null);
  const [nativeOn, setNativeOn] = useState(remindersEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const st = settings.data;
  const install = needsInstall();
  const supported = pushSupported();

  useEffect(() => { if (!isNative) currentSubscription().then(s => setDevice(!!s)).catch(() => setDevice(false)); }, []);
  // Dans l'app : les rappels ne comptent que si le téléphone a aussi autorisé les notifications
  useEffect(() => { if (isNative && nativeOn) remindersPermission().then(ok => { if (!ok) { setRemindersEnabled(false); setNativeOn(false); } }).catch(() => undefined); }, [nativeOn]);

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

  const active = isNative ? nativeOn : !!st?.enabled && device === true;
  const hour = st?.reminder_hour ?? 19;
  const thirsty = rows.filter(r => r.on).slice(0, 2).map(r => byId.get(r.id)!.name);

  const enabledTypes = NOTIFICATION_TYPES.filter(t => notificationEnabled(st, t.key));
  const waterEnabled = notificationEnabled(st, 'water');
  const previewType = enabledTypes[0];
  const preview = previewType?.key === 'water' ? (thirsty.length ? `À arroser : ${thirsty.join(', ')}` : previewType.example) : previewType?.example ?? 'Tous les types de rappels sont en pause';

  async function toggleType(kind: NotificationType) {
    setError('');
    try {
      await save.mutateAsync({ [`notify_${kind}`]: !notificationEnabled(st, kind) });
    } catch (e) { setError((e as Error).message); }
  }

  async function toggleAll() {
    setBusy(true); setError('');
    try {
      if (isNative) {
        if (active) { setRemindersEnabled(false); setNativeOn(false); await cancelReminders(); toast('Rappels désactivés'); }
        else {
          if (!(await requestRemindersPermission())) throw new Error('Notifications refusées. Autorisez-les pour « Mon petit potager » dans les réglages du téléphone.');
          setRemindersEnabled(true); setNativeOn(true); toast('Rappels activés sur ce téléphone');
        }
      } else if (active) { await disablePush(); await save.mutateAsync({ enabled: false }); setDevice(false); toast('Alertes désactivées'); }
      else { await enablePush(); await save.mutateAsync({ enabled: true }); setDevice(true); toast('Alertes activées sur cet appareil'); }
    } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }
  async function test() {
    setBusy(true); setError('');
    try { if (isNative) { await testReminder(); toast('Notification de test dans quelques secondes'); } else { await sendTestPush(); toast('Notification envoyée'); } } catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  return (
    <Page>
      <BackHeader title="Notifications" kicker="Choisissez les rappels qui vous sont utiles" />

      {install && <Note tone="neutre">Sur iPhone, les alertes demandent d’ajouter l’app à l’écran d’accueil. <Link to="/installer" className="font-extrabold underline">Voir comment faire</Link></Note>}
      {isNative && <Note tone="neutre">Les rappels sont programmés sur ce téléphone pour les 7 prochains jours et se mettent à jour à chaque ouverture de l’app. Pensez à l’ouvrir au moins une fois par semaine.</Note>}
      {!install && !supported && !isNative && <Note tone="neutre">Ce navigateur ne gère pas les notifications. Essayez avec Chrome, Edge, Firefox ou Safari récent.</Note>}
      {!VAPID_PUBLIC && !isNative && <Note tone="mauvais">Les notifications ne sont pas encore configurées : la clé VITE_VAPID_PUBLIC_KEY manque.</Note>}

      <div className="rounded-[24px] bg-white px-[18px] py-1">
        <div className="flex min-h-[58px] items-center gap-3 border-b border-dashed border-trait">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-vert-doux text-vert"><Icon name="bell" size={28} /></span>
          <span className="flex flex-1 flex-col"><b className="font-extrabold">Activer les alertes</b><span className="text-[13px] text-gris">Sur cet appareil</span></span>
          <Switch on={active} label="Activer les alertes" onChange={toggleAll} disabled={busy || save.isPending || (!isNative && (install || !supported || !VAPID_PUBLIC || device === null))} />
        </div>
        <div className="flex min-h-16 items-center gap-3">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#D3EAEE] text-[#2C5A66]"><Icon name="rain" size={28} /></span>
          <span className="flex flex-1 flex-col"><b className="font-extrabold">Pas d’alerte s’il pleut</b><span className="text-[13px] text-gris">La nature s’occupe de l’arrosage</span></span>
          <Switch on={st?.skip_if_rain ?? true} label="Pas d’alerte s’il pleut" onChange={() => save.mutate({ skip_if_rain: !(st?.skip_if_rain ?? true) })} disabled={!st || save.isPending || !waterEnabled} />
        </div>
      </div>

      <section className="flex flex-col gap-2" aria-labelledby="notification-types-title">
        <h2 id="notification-types-title" className="font-titre text-lg font-semibold">Quels rappels recevoir ?</h2>
        <p className="text-sm text-gris">Choisissez chaque type indépendamment. Ces préférences sont partagées entre vos appareils.</p>
        <div className="rounded-carte bg-white px-4">
          {TASK_REMINDER_TYPES.map(type => (
            <div key={type.key} className="flex min-h-[72px] items-center gap-3 border-b border-dashed border-trait py-2 last:border-0">
              <Icon name={NOTIFICATION_ICONS[type.key]} size={32} /><span className="flex min-w-0 flex-1 flex-col"><b className="text-[15px] font-extrabold">{type.label}</b><span className="text-[13px] text-gris">{type.detail}</span></span>
              <Switch on={notificationEnabled(st, type.key)} label={`Notifications : ${type.label}`} onChange={() => { void toggleType(type.key); }} disabled={!st || save.isPending || busy} />
            </div>
          ))}
        </div>
        {!enabledTypes.length && <Note tone="neutre">Tous les types sont en pause. Activez au moins un type pour recevoir des rappels.</Note>}
      </section>

      <section className="flex flex-col gap-2" aria-labelledby="weather-types-title">
        <h2 id="weather-types-title" className="font-titre text-lg font-semibold">Risques météo</h2>
        <p className="text-sm text-gris">Les risques d’aujourd’hui et de demain accompagnent votre rappel, à l’heure choisie, selon les plantes de votre potager. Les préférences sont partagées entre vos appareils.</p>
        {(profile?.lat == null || profile?.lon == null) && <Note tone="neutre"><Link to="/profil" className="font-extrabold underline">Ajoutez votre ville</Link> pour recevoir les conseils météo.</Note>}
        <div className="rounded-carte bg-white px-4">
          {WEATHER_NOTIFICATION_TYPES.map(type => <div key={type.key} className="flex min-h-[72px] items-center gap-3 border-b border-dashed border-trait py-2 last:border-0">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${type.key === 'frost' || type.key === 'snow' ? 'bg-ciel' : 'bg-soleil-doux'}`}><Icon name={NOTIFICATION_ICONS[type.key]} size={40} /></span><span className="flex min-w-0 flex-1 flex-col"><b className="text-[15px] font-extrabold">{type.label}</b><span className="text-[13px] text-gris">{type.detail}</span></span>
            <Switch on={notificationEnabled(st, type.key)} label={`Notifications : ${type.label}`} onChange={() => { void toggleType(type.key); }} disabled={!st || save.isPending || busy} />
          </div>)}
        </div>
        <p className="text-xs text-gris">Conseils pour le potager, pas des vigilances officielles. Dans l’app, les prévisions utilisées pour les rappels sont renouvelées à chaque ouverture.</p>
      </section>

      <div className="flex flex-col gap-2">
        <h2 className="font-titre text-lg font-semibold">Heure du rappel</h2>
        <div role="group" aria-label="Heure du rappel" className="flex gap-2 rounded-[20px] bg-white p-[5px]">
          {([[8, 'Matin · 8 h'], [19, 'Soir · 19 h']] as const).map(([h, label]) => (
            <button key={h} aria-pressed={hour === h} disabled={!st || save.isPending} onClick={() => save.mutate({ reminder_hour: h })} className={`min-h-11 flex-1 rounded-2xl text-sm font-extrabold ${hour === h ? 'bg-vert text-white' : 'text-[#3D4A3F]'}`}>{label}</button>
          ))}
        </div>
      </div>

      {waterEnabled && rows.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="font-titre text-lg font-semibold">Arrosage par plante</h2>
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
          <span aria-hidden className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-vert-doux"><Icon name="garden" size={34} /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="flex justify-between text-xs font-bold text-gris"><span>Mon petit potager</span><span>{hour === 8 ? '08:00' : '19:00'}</span></span>
            <span className="text-[15px] font-extrabold">{preview}</span>
            <span className="text-[13px] text-[#3D4A3F]">{previewType?.key === 'water' ? 'Un petit verre d’eau pour elles ?' : 'Exemple selon vos types de rappels activés'}</span>
          </span>
        </div>
      </div>

      {active && <Btn variant="doux" onClick={test} disabled={busy}>Envoyer une notification de test</Btn>}
      {save.isError && !error && <p role="alert" className="text-sm font-bold text-alerte">Réglages non enregistrés : {(save.error as Error).message}</p>}
      {error && <p role="alert" className="text-sm font-bold text-alerte">{error}</p>}
      {!isNative && <Link to="/installer" className="text-center text-sm font-extrabold text-vert">Installer l’app sur l’écran d’accueil</Link>}
    </Page>
  );
}
