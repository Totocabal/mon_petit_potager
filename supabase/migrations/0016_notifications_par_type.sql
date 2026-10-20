-- Un choix indépendant par type ; les réglages existants conservent leurs rappels.
alter table public.alert_settings
  add column if not exists notify_water boolean not null default true,
  add column if not exists notify_sow_indoor boolean not null default true,
  add column if not exists notify_sow_outdoor boolean not null default true,
  add column if not exists notify_plant boolean not null default true,
  add column if not exists notify_harvest boolean not null default true,
  add column if not exists notify_care boolean not null default true,
  add column if not exists notify_personal boolean not null default true;

-- Les anciennes tâches restent lisibles : le code reconnaît leur type depuis leur origine et leur titre.
alter table public.tasks
  add column if not exists notification_type text
    check (notification_type in ('sow_indoor', 'sow_outdoor', 'plant', 'harvest', 'care', 'personal'));

comment on column public.tasks.notification_type is
  'Type du rappel associé à la tâche ; null pour les anciennes tâches, reconnues par origine et titre.';
