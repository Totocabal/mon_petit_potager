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

## Applications Android et iOS

L'app mobile est le site emballé avec [Capacitor](https://capacitorjs.com) : un seul code pour le web, l'APK et iOS (`android/` et `ios/` sont les projets natifs, `assets/` les images sources de l'icône et de l'écran de démarrage, `capacitor.config.ts` la configuration).

Identifiant : `fr.monpetitpotager.app`. Après toute modification du code web : `npm run mobile:sync`.

### Réglages à faire une fois

1. **Lien de connexion qui rouvre l'app** : dans Supabase, *Authentication → URL Configuration → Redirect URLs*, ajoutez `fr.monpetitpotager.app://**`. Sans cela, le lien de l'e-mail ouvre le site dans le navigateur au lieu de l'app. Aucun changement du modèle d'e-mail n'est nécessaire.
2. **Adresse du site** : renseignez `VITE_SITE_URL` (voir `.env.example`) avec l'adresse publique du site, utilisée pour les liens d'invitation. Sans elle, les liens créés dans l'app sont inutilisables.
3. **Notifications** : les rappels d'arrosage (notifications web) ne fonctionnent pas encore dans l'app, seulement sur le site. Les notifications natives (Firebase pour Android, Apple pour iOS) sont à ajouter.

### Android (APK)

Prérequis : Android Studio et un JDK 21 (`brew install openjdk@21`). Gradle ne fonctionne pas encore avec Java 25 et 26.

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
npm run android:debug
```

L'APK de test est dans `android/app/build/outputs/apk/debug/app-debug.apk`. Il s'installe en le copiant sur le téléphone (autoriser les sources inconnues) ou avec `adb install -r`.

Pour publier sur Google Play, il faut un APK/AAB **signé** : créez une clé (`keytool -genkey -v -keystore potager.jks -alias potager -keyalg RSA -keysize 2048 -validity 10000`), gardez-la précieusement hors du dépôt, puis *Build → Generate Signed Bundle* dans Android Studio (`npm run android:open`).

### iOS

Prérequis : un Mac avec **Xcode** (App Store). Le projet utilise Swift Package Manager : pas besoin de CocoaPods.

```bash
npm run ios:open
```

Dans Xcode : choisissez votre équipe (*Signing & Capabilities*), puis lancez sur un simulateur ou un iPhone. Pour l'installer sur un iPhone de façon durable, publier sur TestFlight ou l'App Store, il faut un compte Apple Developer payant.

### Icône et écran de démarrage

Les images sources sont dans `assets/`. Pour les régénérer après modification : `npx @capacitor/assets generate --android --ios` (outil à installer à la demande, il n'est pas dans les dépendances).

### Connexion Google

Sur le site web, le bouton « Continuer avec Google » passe par Supabase. Réglages à faire une fois :

1. Google Cloud (*APIs & Services → Credentials*) : un identifiant OAuth de type **Application Web**, avec l'URI de redirection autorisée `https://kfdusbzchhbzshznlvmb.supabase.co/auth/v1/callback`.
2. Supabase (*Authentication → Providers → Google*) : activer le fournisseur et y saisir l'identifiant client et le secret.
3. Supabase (*Authentication → URL Configuration*) : ajouter l'adresse du site dans les *Redirect URLs*.

Le bouton n'est pas encore proposé dans l'app Android et iOS : cela demande une connexion Google native (identifiants Android et iOS dédiés).
