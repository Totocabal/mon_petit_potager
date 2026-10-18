-- Distances entre plants : la grille (cases de 30 cm) doit respecter les distances recommandées.
--   spacing_cm        = distance réelle entre deux plants dans la grille (dérivée de plants_per_cell / span_cells)
--   inrow_spacing_cm  = distance recommandée entre deux plants d'un même rang
--   row_spacing_cm    = distance recommandée entre deux rangs

-- Grandes plantes (≥ 50 cm recommandés) : 1 plant sur 2 × 2 cases = 60 cm
update public.species
   set plants_per_cell = 1, span_cells = 2
 where slug in ('tomate','tomate-cerise','aubergine','chou','brocoli','chou-fleur','kale','romarin');

-- Plantes de 25 à 30 cm : 1 plant par case (au lieu de 4)
update public.species
   set plants_per_cell = 1
 where slug in ('salade','blette','basilic','oeillet-d-inde');

-- spacing_cm = distance réelle de la grille (courge, pastèque, etc. étaient notés à 100 cm alors que la grille donne 60)
update public.species set spacing_cm = 60 where span_cells = 2;
update public.species set spacing_cm = 30 where slug in ('salade','blette','basilic','oeillet-d-inde');

alter table public.species
  add constraint species_spacing_grille check (
    (span_cells = 2 and plants_per_cell = 1 and spacing_cm = 60)
    or (span_cells = 1 and abs(spacing_cm - 30 / sqrt(plants_per_cell)) <= 1.6)
  );

comment on column public.species.spacing_cm is 'Distance réelle (cm) entre deux plants dans la grille de cases de 30 cm';
comment on column public.species.inrow_spacing_cm is 'Distance recommandée (cm) entre deux plants d''un même rang';
comment on column public.species.row_spacing_cm is 'Distance recommandée (cm) entre deux rangs';
