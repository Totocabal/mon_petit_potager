create extension if not exists pgcrypto;

-- Catalogue (lecture pour tous)
create table public.species (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  family text not null,
  height text not null check (height in ('basse','moyenne','haute')),
  spacing_cm int not null,
  plants_per_cell int not null check (plants_per_cell in (1,4,9,16)),
  span_cells int not null default 1 check (span_cells in (1,2)),
  inrow_spacing_cm int not null,
  row_spacing_cm int not null,
  water_every_days int not null,
  exposure text not null check (exposure in ('soleil','mi-ombre')),
  sow_indoor_months int[] not null default '{}',
  plant_out_months int[] not null default '{}',
  harvest_months int[] not null default '{}',
  days_to_harvest int,
  perennial boolean not null default false,
  frost_sensitive boolean not null default false,
  notes text
);
create table public.species_companions (
  species_a uuid references public.species(id) on delete cascade,
  species_b uuid references public.species(id) on delete cascade,
  relation text not null check (relation in ('good','bad')),
  reason text,
  primary key (species_a, species_b),
  check (species_a <> species_b)
);

-- Utilisateurs et potagers
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text, city text, lat double precision, lon double precision,
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now()
);
create table public.gardens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  terrain_width_cm int not null default 1000 check (terrain_width_cm between 300 and 10000),
  terrain_length_cm int not null default 1000 check (terrain_length_cm between 300 and 10000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.garden_members (
  garden_id uuid not null references public.gardens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (garden_id, user_id)
);
create index garden_members_user_idx on public.garden_members(user_id);
create table public.garden_invites (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz
);
create index garden_invites_garden_idx on public.garden_invites(garden_id);

-- Zones, plantations (rectangles de cases de 30 cm)
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  name text not null,
  type text not null default 'carre' check (type in ('carre','jardiniere','parcelle','serre')),
  x_cm int not null default 0, y_cm int not null default 0,
  cols int not null check (cols between 1 and 400),
  rows int not null check (rows between 1 and 400),
  north_side text not null default 'top' check (north_side in ('top','right','bottom','left')),
  sheltered boolean not null default false,
  created_at timestamptz not null default now()
);
create index zones_garden_idx on public.zones(garden_id);
create table public.plantings (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  species_id uuid not null references public.species(id),
  x int not null check (x >= 0), y int not null check (y >= 0),
  w int not null default 1 check (w >= 1), h int not null default 1 check (h >= 1),
  sown_at date not null default current_date,
  last_watered_at date,
  water_every_days int,
  alerts_enabled boolean not null default true,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);
create index plantings_zone_active_idx on public.plantings(zone_id) where removed_at is null;
create index plantings_garden_idx on public.plantings(garden_id);
create index plantings_species_idx on public.plantings(species_id);
create table public.watering_logs (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  planting_id uuid not null references public.plantings(id) on delete cascade,
  watered_at timestamptz not null default now(),
  watered_by uuid default auth.uid() references auth.users(id),
  source text not null default 'manuel' check (source in ('manuel','pluie'))
);
create index watering_logs_planting_idx on public.watering_logs(planting_id);
create index watering_logs_garden_idx on public.watering_logs(garden_id);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  garden_id uuid not null references public.gardens(id) on delete cascade,
  planting_id uuid references public.plantings(id) on delete cascade,
  zone_id uuid references public.zones(id) on delete cascade,
  title text not null, detail text,
  due_date date not null default current_date,
  done_at timestamptz, done_by uuid references auth.users(id),
  origin text not null default 'manuel' check (origin in ('auto','manuel'))
);
create index tasks_garden_idx on public.tasks(garden_id);
create index tasks_planting_idx on public.tasks(planting_id);
create index tasks_zone_idx on public.tasks(zone_id);
create table public.alert_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  skip_if_rain boolean not null default true,
  reminder_hour int not null default 19 check (reminder_hour in (8,19))
);
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique, p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- Fonctions d'appartenance (déplacées dans le schéma private par 0002)
create function public.is_member(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.garden_members m where m.garden_id = g and m.user_id = (select auth.uid()));
$$;
create function public.is_owner(g uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.garden_members m where m.garden_id = g and m.user_id = (select auth.uid()) and m.role = 'owner');
$$;

-- Le créateur d'un potager en devient propriétaire
create function public.add_garden_owner() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.garden_members (garden_id, user_id, role) values (new.id, new.created_by, 'owner');
  return new;
end;
$$;
create trigger gardens_add_owner after insert on public.gardens for each row execute function public.add_garden_owner();

-- Accepter une invitation (adresse e-mail vérifiée)
create function public.accept_invite(invite_token uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare inv public.garden_invites;
begin
  select * into inv from public.garden_invites where token = invite_token and accepted_at is null and expires_at > now();
  if inv.id is null then raise exception 'Invitation invalide ou expirée'; end if;
  if lower(inv.email) <> lower(coalesce((select auth.jwt() ->> 'email'), '')) then raise exception 'Cette invitation est destinée à une autre adresse'; end if;
  insert into public.garden_members (garden_id, user_id, role) values (inv.garden_id, (select auth.uid()), 'member') on conflict do nothing;
  update public.garden_invites set accepted_at = now() where id = inv.id;
  return inv.garden_id;
end;
$$;

-- RLS : chaque donnée d'un potager n'est visible que de ses membres
alter table public.species enable row level security;
alter table public.species_companions enable row level security;
alter table public.profiles enable row level security;
alter table public.gardens enable row level security;
alter table public.garden_members enable row level security;
alter table public.garden_invites enable row level security;
alter table public.zones enable row level security;
alter table public.plantings enable row level security;
alter table public.watering_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.alert_settings enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "catalogue lisible" on public.species for select to anon, authenticated using (true);
create policy "associations lisibles" on public.species_companions for select to anon, authenticated using (true);
create policy "profil perso" on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profils des co-jardiniers" on public.profiles for select to authenticated using (exists (select 1 from public.garden_members a join public.garden_members b on a.garden_id = b.garden_id where a.user_id = (select auth.uid()) and b.user_id = profiles.id));
create policy "voir ses potagers" on public.gardens for select to authenticated using (public.is_member(id) or created_by = (select auth.uid()));
create policy "créer un potager" on public.gardens for insert to authenticated with check (created_by = (select auth.uid()));
create policy "modifier son potager" on public.gardens for update to authenticated using (public.is_owner(id)) with check (public.is_owner(id));
create policy "supprimer son potager" on public.gardens for delete to authenticated using (public.is_owner(id));
create policy "voir les membres" on public.garden_members for select to authenticated using (public.is_member(garden_id));
create policy "quitter ou retirer" on public.garden_members for delete to authenticated using (user_id = (select auth.uid()) or public.is_owner(garden_id));
create policy "invitations du potager" on public.garden_invites for all to authenticated using (public.is_member(garden_id)) with check (public.is_member(garden_id));
create policy "zones du potager" on public.zones for all to authenticated using (public.is_member(garden_id)) with check (public.is_member(garden_id));
create policy "plantations du potager" on public.plantings for all to authenticated using (public.is_member(garden_id))
  with check (public.is_member(garden_id) and exists (select 1 from public.zones z where z.id = zone_id and z.garden_id = plantings.garden_id));
create policy "arrosages du potager" on public.watering_logs for all to authenticated using (public.is_member(garden_id)) with check (public.is_member(garden_id));
create policy "tâches du potager" on public.tasks for all to authenticated using (public.is_member(garden_id)) with check (public.is_member(garden_id));
create policy "réglages perso" on public.alert_settings for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "abonnements perso" on public.push_subscriptions for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
