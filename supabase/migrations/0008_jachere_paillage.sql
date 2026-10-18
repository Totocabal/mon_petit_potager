-- Couverture du sol : jachère et paillage se posent comme une plante (cases, rang, bloc, zone entière)
-- mais ne sont ni arrosés, ni récoltés, ni comptés comme plants.
alter table public.species
  add column kind text not null default 'plante' check (kind in ('plante','sol'));

insert into public.species (slug,name,family,height,spacing_cm,plants_per_cell,span_w,span_h,inrow_spacing_cm,row_spacing_cm,water_every_days,exposure,sow_indoor_months,plant_out_months,harvest_months,days_to_harvest,perennial,frost_sensitive,notes,kind) values
  ('jachere','Jachère','Sol','basse',30,1,1,1,30,30,365,'soleil','{}','{}','{}',null,false,false,'Le sol se repose : rien n''est planté et il n''y a pas d''arrosage','sol'),
  ('paillage','Paillage','Sol','basse',30,1,1,1,30,30,365,'soleil','{}','{}','{}',null,false,false,'Paille, BRF ou tonte : protège le sol et garde l''humidité','sol');

-- Un sol n'a jamais d'alerte d'arrosage
create or replace function public.sol_sans_alerte() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.species s where s.id = new.species_id and s.kind = 'sol') then
    new.alerts_enabled := false;
  end if;
  return new;
end $$;

create trigger plantings_sol_sans_alerte before insert or update of species_id on public.plantings
  for each row execute function public.sol_sans_alerte();
