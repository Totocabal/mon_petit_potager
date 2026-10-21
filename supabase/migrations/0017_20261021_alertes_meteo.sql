-- Préférences météo partagées ; aucune modification des droits ni des tâches.
alter table public.alert_settings
  add column if not exists notify_frost boolean not null default true,
  add column if not exists notify_snow boolean not null default true,
  add column if not exists notify_heat boolean not null default true,
  add column if not exists notify_storm boolean not null default true;
