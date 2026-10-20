-- Espacements stricts : la grille (cases de 30 cm) respecte les distances recommandées entre plants (inrow_spacing_cm) et entre rangs (row_spacing_cm).
-- Règle : chaque plant dispose d'au moins 75 % de « entre plants × entre rangs » (cases entières), et d'au moins « entre plants » dans les deux sens.
--   plants_per_cell  = plants par case (1 quand le plant occupe une ou plusieurs cases entières)
--   span_w × span_h  = cases occupées par un plant (1 × 1 sauf grandes plantes)
--   spacing_cm       = distance réelle entre deux plants dans la grille (30 / racine(plants par case), ou 30 × la plus petite dimension de l'empreinte)
-- Les plantations déjà posées gardent leurs cases ; seuls les nombres de plants et les nouvelles plantations suivent ces valeurs.
-- Les anciens garde-fous n'admettaient que 1, 4, 9 ou 16 plants par case (grille carrée) et, pour une empreinte, 30 × sa largeur.
-- On accepte 1 à 16 plants par case et, pour une empreinte rectangulaire, 30 × sa plus petite dimension. Ils sont remis après la mise à jour des valeurs.
alter table public.species drop constraint species_plants_per_cell_check, drop constraint species_spacing_grille;

update public.species set plants_per_cell=12, span_w=1, span_h=1, spacing_cm=9 where slug='carotte';
update public.species set plants_per_cell=16, span_w=1, span_h=1, spacing_cm=8 where slug='mache';
update public.species set plants_per_cell=16, span_w=1, span_h=1, spacing_cm=8 where slug='radis';
update public.species set plants_per_cell=16, span_w=1, span_h=1, spacing_cm=8 where slug='roquette';
update public.species set plants_per_cell=4, span_w=1, span_h=1, spacing_cm=15 where slug='ail';
update public.species set plants_per_cell=4, span_w=1, span_h=1, spacing_cm=15 where slug='betterave';
update public.species set plants_per_cell=5, span_w=1, span_h=1, spacing_cm=13 where slug='epinard';
update public.species set plants_per_cell=3, span_w=1, span_h=1, spacing_cm=17 where slug='haricot-nain';
update public.species set plants_per_cell=4, span_w=1, span_h=1, spacing_cm=15 where slug='navet';
update public.species set plants_per_cell=4, span_w=1, span_h=1, spacing_cm=15 where slug='oignon';
update public.species set plants_per_cell=3, span_w=1, span_h=1, spacing_cm=17 where slug='panais';
update public.species set plants_per_cell=6, span_w=1, span_h=1, spacing_cm=12 where slug='petit-pois';
update public.species set plants_per_cell=3, span_w=1, span_h=1, spacing_cm=17 where slug='poireau';
update public.species set plants_per_cell=2, span_w=1, span_h=1, spacing_cm=21 where slug='aneth';
update public.species set plants_per_cell=2, span_w=1, span_h=1, spacing_cm=21 where slug='ciboulette';
update public.species set plants_per_cell=3, span_w=1, span_h=1, spacing_cm=17 where slug='coriandre';
update public.species set plants_per_cell=3, span_w=1, span_h=1, spacing_cm=17 where slug='echalote';
update public.species set plants_per_cell=2, span_w=1, span_h=1, spacing_cm=21 where slug='feve';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='haricot-a-rames';
update public.species set plants_per_cell=2, span_w=1, span_h=1, spacing_cm=21 where slug='pak-choi';
update public.species set plants_per_cell=3, span_w=1, span_h=1, spacing_cm=17 where slug='persil';
update public.species set plants_per_cell=1, span_w=3, span_h=3, spacing_cm=90 where slug='artichaut';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='asperge';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='aubergine';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='basilic';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='blette';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='brocoli';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='capucine';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='celeri-rave';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='chou';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='chou-fleur';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='chou-rave';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='concombre';
update public.species set plants_per_cell=1, span_w=4, span_h=4, spacing_cm=120 where slug='courge';
update public.species set plants_per_cell=1, span_w=3, span_h=3, spacing_cm=90 where slug='courgette';
update public.species set plants_per_cell=1, span_w=2, span_h=1, spacing_cm=30 where slug='fenouil';
update public.species set plants_per_cell=1, span_w=2, span_h=1, spacing_cm=30 where slug='fraise';
update public.species set plants_per_cell=1, span_w=4, span_h=2, spacing_cm=60 where slug='framboisier';
update public.species set plants_per_cell=1, span_w=4, span_h=4, spacing_cm=120 where slug='groseillier';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='kale';
update public.species set plants_per_cell=1, span_w=2, span_h=1, spacing_cm=30 where slug='mais';
update public.species set plants_per_cell=1, span_w=3, span_h=3, spacing_cm=90 where slug='melon';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='menthe';
update public.species set plants_per_cell=1, span_w=4, span_h=4, spacing_cm=120 where slug='myrtille';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='oeillet-d-inde';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='oseille';
update public.species set plants_per_cell=1, span_w=4, span_h=4, spacing_cm=120 where slug='pasteque';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='piment';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='poivron';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='pomme-de-terre';
update public.species set plants_per_cell=1, span_w=3, span_h=3, spacing_cm=90 where slug='rhubarbe';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='romarin';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='salade';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='sauge';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='souci';
update public.species set plants_per_cell=1, span_w=1, span_h=1, spacing_cm=30 where slug='thym';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='tomate';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='tomate-cerise';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='topinambour';
update public.species set plants_per_cell=1, span_w=2, span_h=2, spacing_cm=60 where slug='tournesol';

alter table public.species
  add constraint species_plants_per_cell_check check (plants_per_cell between 1 and 16),
  add constraint species_spacing_grille check (
    (span_w * span_h > 1 and plants_per_cell = 1 and spacing_cm = 30 * least(span_w, span_h))
    or (span_w = 1 and span_h = 1 and abs(spacing_cm - 30 / sqrt(plants_per_cell)) <= 1.6)
  );
