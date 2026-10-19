-- Rotation des cultures : nombre d'années avant de replanter la même famille au même endroit (null = pas de contrainte)
alter table public.species
  add column rotation_years int check (rotation_years between 1 and 8);

comment on column public.species.rotation_years is 'Années à attendre avant de replanter la même famille au même endroit ; null = pas de contrainte (vivaces, aromatiques, fleurs)';

update public.species set rotation_years = 3 where slug in ('concombre','courge','courgette','melon','pasteque');                         -- Cucurbitacées
update public.species set rotation_years = 3 where slug in ('tomate','tomate-cerise','aubergine','poivron','piment');                       -- Solanacées
update public.species set rotation_years = 4 where slug = 'pomme-de-terre';
update public.species set rotation_years = 4 where slug in ('chou','chou-fleur','brocoli','kale','chou-rave');                               -- Brassicacées (hernie du chou)
update public.species set rotation_years = 3 where slug in ('navet','radis','roquette','pak-choi');
update public.species set rotation_years = 3 where slug in ('carotte','panais','celeri-rave','persil','fenouil','aneth','coriandre');       -- Apiacées
update public.species set rotation_years = 3 where slug in ('ail','oignon','echalote','poireau');                                           -- Amaryllidacées
update public.species set rotation_years = 3 where slug in ('betterave','blette','epinard');                                                 -- Amaranthacées
update public.species set rotation_years = 2 where slug = 'salade';                                                                          -- Astéracées potagères
update public.species set rotation_years = 3 where slug in ('haricot-nain','haricot-a-rames','petit-pois','feve');                           -- Fabacées
