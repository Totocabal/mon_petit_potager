# Mon petit potager

App web (mobile d'abord) pour suivre son potager : terrain → zones → blocs de 5 × 5 cases → cases de 30 cm.

Stack : React 18 + Vite + TypeScript, Tailwind, TanStack Query, Supabase (auth par lien magique, Postgres + RLS).

## Lancer en local

```bash
cp .env.example .env.local
npm install
npm run dev
```

Puis ouvrir http://localhost:5173. Avant le premier lancement : `cp .env.example .env.local` (le fichier contient l’URL et la clé publique du projet Supabase `mon-petit-potager`, région Paris).

## Réglage Supabase à faire une fois

Dans le tableau de bord Supabase › Authentication › URL Configuration :

- **Site URL** : l'adresse de production (par exemple `https://mon-petit-potager.vercel.app`)
- **Redirect URLs** : ajouter `http://localhost:5173` et l'adresse de production

Sans cela, le lien magique reçu par e-mail renvoie vers une mauvaise adresse.

## Mettre en ligne (Vercel)

1. `git init && git add . && git commit -m "Socle"` puis pousser sur un dépôt GitHub.
2. Sur Vercel : Add New › Project › importer le dépôt (préréglage Vite détecté).
3. Variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (mêmes valeurs que `.env.local`).
4. Le fichier `vercel.json` fourni renvoie toutes les adresses vers `index.html`, pour que les liens profonds (`/zones/…`) fonctionnent.

## Base de données

- `supabase/migrations/` : schéma appliqué au projet (tables, RLS, fonctions).
- `supabase/seed_catalogue.sql` : les 32 espèces et 122 voisinages.

Une plantation est un **rectangle de cases** d'une même espèce (`x, y, w, h`) : un rang entier de 80 cases = une seule ligne en base.

## Organisation du code

```
src/
  lib/        supabase.ts, data.ts (requêtes), garden.ts (règles : grille, voisinages, rangs, récolte), dates.ts, types.ts
  components/ ui.tsx (boutons, feuilles, navigation), garden.tsx (grille de cases, remplissage de rang), Stepper.tsx
  pages/      Login, Onboarding, Home, Terrain, Zone, Bloc, NewZone, AddPlant, Plant, Calendar, Profile
public/pictos/  les 32 pictos SVG
```

## Fait dans cette étape (socle + potager)

- Connexion par lien magique, création du premier potager (nom, taille du terrain)
- Terrain à l'échelle avec ses zones, création de zone (carré, jardinière, parcelle, serre) placée automatiquement
- Petite zone : grille de cases ; grande zone : blocs de 1,5 m, puis bloc de 5 × 5 cases
- Planter une case (avec contrôle des voisins) ou remplir un rang d'un coup (bloc ou zone entière)
- Fiche plante : stade, arrosage (« J'ai arrosé » + journal), voisines, récolte, retrait
- Accueil (à arroser, à récolter), calendrier par mois, profil

## Étapes suivantes

1. Météo (Open-Meteo) et règle pluie
2. Tâches manuelles et automatiques
3. Générateur de plan pour les petites zones
4. Partage du potager (invitations) et notifications push (PWA, Edge Function + pg_cron)
# mon_petit_potager
