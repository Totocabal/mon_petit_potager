-- Rappels push : lecture des secrets (Vault) réservée au service, et tâche planifiée chaque heure.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.reminder_secret(secret_name text) returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name
$$;
revoke execute on function public.reminder_secret(text) from public, anon, authenticated;
grant execute on function public.reminder_secret(text) to service_role;

-- Les secrets 'cron_secret', 'vapid_public', 'vapid_private' et 'vapid_subject' sont créés à part (vault.create_secret), jamais dans le dépôt.
select cron.schedule('rappels-potager', '0 * * * *', $job$
  select net.http_post(
    url := 'https://kfdusbzchhbzshznlvmb.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
    body := '{}'::jsonb
  )
$job$);
