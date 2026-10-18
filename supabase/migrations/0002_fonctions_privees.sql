-- Les fonctions d'appartenance quittent le schéma exposé par l'API
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_member(uuid) set schema private;
alter function public.is_owner(uuid) set schema private;
alter function public.add_garden_owner() set schema private;
revoke all on function private.is_member(uuid) from public, anon;
revoke all on function private.is_owner(uuid) from public, anon;
revoke all on function private.add_garden_owner() from public, anon, authenticated;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.is_owner(uuid) to authenticated;
revoke all on function public.accept_invite(uuid) from public, anon;
grant execute on function public.accept_invite(uuid) to authenticated;
