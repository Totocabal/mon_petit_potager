-- Empreinte d'un plant sur la grille : largeur × hauteur en cases (1 × 1, 2 × 1, 3 × 1, 4 × 1, 2 × 2, 3 × 3…)
-- Remplace span_cells (carré 1 ou 2 seulement).
alter table public.species
  add column span_w int not null default 1 check (span_w between 1 and 4),
  add column span_h int not null default 1 check (span_h between 1 and 4);

update public.species set span_w = span_cells, span_h = span_cells;

-- Grandes coureuses (100 cm recommandés) : 3 × 3 cases = 90 cm
-- (la myrtille reste à 2 × 2 : une plantation existe déjà à cette taille)
update public.species set span_w = 3, span_h = 3 where slug in ('courge','pasteque','groseillier');

alter table public.species drop constraint species_spacing_grille;
alter table public.species drop column span_cells;

-- spacing_cm = distance réelle entre deux plants le long du rang
update public.species set spacing_cm = 30 * span_w where span_w * span_h > 1;

alter table public.species
  add constraint species_spacing_grille check (
    (span_w * span_h > 1 and plants_per_cell = 1 and spacing_cm = 30 * span_w)
    or (span_w = 1 and span_h = 1 and abs(spacing_cm - 30 / sqrt(plants_per_cell)) <= 1.6)
  );

comment on column public.species.span_w is 'Largeur (cases de 30 cm) occupée par un plant';
comment on column public.species.span_h is 'Hauteur (cases de 30 cm) occupée par un plant';
