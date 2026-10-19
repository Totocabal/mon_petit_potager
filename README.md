# Mon petit potager

App web (mobile d'abord) pour suivre son potager : terrain → zones → blocs de 5 × 5 cases → cases de 30 cm.

Stack : React 18 + Vite + TypeScript, Tailwind, TanStack Query, Supabase (auth par lien magique, Postgres + RLS).

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173. Le fichier `.env.local` contient déjà l'URL et la clé publique du projet Supabase `mon-petit-potager` (région Paris). Ce fichier n'est pas versionné ; `.env.example` montre son format.

## Réglage Supabase à faire une fois

Dans le tableau de bord Supabase › Authentication › URL Configuration :

- **Site URL** : l'adresse de production (par exemple `https://mon-petit-potager.vercel.app`)
- **Redirect URLs** : ajouter `http://localhost:5173/**` et `https://votre-adresse/**` (les deux étoiles sont nécessaires : les invitations renvoient vers `/invitation/…`)
- Facultatif : Authentication › Email Templates › Magic Link, pour personnaliser le texte du message reçu (connexion et invitations).

Sans cela, le lien magique reçu par e-mail renvoie vers une mauvaise adresse.

## Mettre en ligne (Vercel)

1. `git init && git add . && git commit -m "Socle"` puis pousser sur un dépôt GitHub.
2. Sur Vercel : Add New › Project › importer le dépôt (préréglage Vite détecté).
3. Variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` (mêmes valeurs que `.env.local`).
4. Le fichier `vercel.json` fourni renvoie toutes les adresses vers `index.html`, pour que les liens profonds (`/zones/…`) fonctionnent.

## Inviter un proche

Profil › Inviter un proche. Deux façons :

- par e-mail : la personne reçoit un lien de connexion qui l'amène directement au potager ;
- par lien à copier (valable 7 jours, une seule fois) : à envoyer par message.

Le propriétaire peut retirer un membre ; un membre peut quitter le potager. Les envois d'e-mails passent par Supabase Auth, limités à quelques messages par heure tant qu'aucun serveur d'e-mail personnel n'est branché (Authentication › SMTP Settings).

## Base de données

- `supabase/migrations/` : schéma appliqué au projet (tables, RLS, fonctions).
- `supabase/seed_catalogue.sql` : 32 espèces de base ; la migration 0005 en ajoute 28 (60 au total), la 0006 aligne les distances entre plants sur la grille de 30 cm (`spacing_cm` = distance réelle, `inrow_spacing_cm` / `row_spacing_cm` = distances recommandées). La 0007 remplace `span_cells` par l'empreinte d'un plant, `span_w` × `span_h` cases (1 × 1, 2 × 1, 3 × 1, 4 × 1, 2 × 2, 3 × 3…). La 0008 ajoute `kind` ('plante' ou 'sol') et les deux couvertures du sol, Jachère et Paillage : elles se posent comme une plante mais ne sont ni arrosées, ni récoltées, ni comptées comme plants. La 0009 ajoute les fiches détaillées du glossaire (`category`, `difficulty`, `description`, `sowing`, `soil`, `care`, `pests`, `harvest_tips`, profondeur et délai de levée) pour les 60 plantes.

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

## Notifications (rappels d'arrosage, récolte, tâches)

- L'app est une PWA (`public/manifest.webmanifest`, `public/sw.js`). Sur iPhone : l'ajouter à l'écran d'accueil d'abord (page `/installer`), puis activer les alertes.
- Réglages dans **Profil › Alertes d'arrosage** (matin 8 h / soir 19 h, pas d'alerte s'il pleut, espèces suivies, bouton de test).
- Ajouter `VITE_VAPID_PUBLIC_KEY` aux variables d'environnement Vercel (valeur dans `.env.example`).
- Envoi : la fonction `supabase/functions/send-reminders` est appelée chaque heure par `pg_cron` (migration `0004_rappels_push.sql`). Les clés VAPID et le secret du cron sont dans le Vault Supabase, jamais dans le code.

## Étapes suivantes

Les étapes prévues (météo, tâches, générateur de plan, partage, notifications) sont faites. Reste à affiner selon l'usage.
