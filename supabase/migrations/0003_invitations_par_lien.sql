-- Une invitation peut être un simple lien (sans adresse e-mail) : valable une fois, 7 jours.
alter table public.garden_invites alter column email drop not null;

create or replace function public.accept_invite(invite_token uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.garden_invites;
begin
  select * into inv from public.garden_invites where token = invite_token and accepted_at is null and expires_at > now();
  if inv.id is null then raise exception 'Invitation invalide ou expirée'; end if;
  if inv.email is not null and lower(inv.email) <> lower(coalesce((select auth.jwt() ->> 'email'), '')) then
    raise exception 'Cette invitation est destinée à une autre adresse';
  end if;
  insert into public.garden_members (garden_id, user_id, role) values (inv.garden_id, (select auth.uid()), 'member') on conflict do nothing;
  update public.garden_invites set accepted_at = now() where id = inv.id;
  return inv.garden_id;
end;
$$;
revoke execute on function public.accept_invite(uuid) from public, anon;
grant execute on function public.accept_invite(uuid) to authenticated;
