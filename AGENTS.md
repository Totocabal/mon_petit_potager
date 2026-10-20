# Mon petit potager — consignes pour les IA (et les humains) qui travaillent sur le dépôt

Application de suivi de potager : terrain → zones → blocs de 5 × 5 cases → cases de 30 cm. Web (Vercel) + Android/iOS (Capacitor), Supabase (Postgres, RLS, Storage). L'utilisateur parle français : **interface, commentaires, messages de commit et réponses en français.**

Le fichier `README.md` décrit la mise en route et le modèle de données ; celui-ci décrit la façon de travailler ensemble.

## Avant de commencer

1. `git pull --rebase origin main`, puis `git log -10 --format='%h %an %s'` : d'autres modèles poussent sur `main` ; ne vous fiez pas à votre mémoire de l'état du code.
2. Relisez les fichiers que vous allez modifier juste avant de les modifier.
3. Ne touchez qu'à ce que la demande implique. Pas de refonte au passage.

## Vérifier (obligatoire avant tout commit)

```bash
npx tsc --noEmit      # types, mode strict
npx vitest run        # tests (Europe/Paris forcé, dates simulées)
npm run build         # construit le site
```

La CI (`.github/workflows/ci.yml`) rejoue les trois. Si vous changez une règle (arrosage, rotation, rappels, grille), **ajoutez ou adaptez un test** à côté (`src/lib/*.test.ts`, fixtures dans `src/test/fixtures.ts`).

## Coordination entre modèles

- **Une branche par modèle et par sujet**, puis une pull request vers `main` (`claude/<sujet>`, `codex/<sujet>`…). L'utilisateur relit et fusionne. Ne poussez directement sur `main` que si l'utilisateur l'a demandé.
- **Le dossier du projet est partagé : n'y changez pas de branche.** Un autre modèle peut y être en train de travailler (un `git checkout` ou un `git reset` lui retire ses fichiers sous les pieds, et un commit part sur la mauvaise branche). Pour travailler sur une autre branche, créez un dossier à part : `git worktree add ../potager-<sujet> -b <branche> origin/main`, puis supprimez-le (`git worktree remove`) quand c'est fini. Avant de commiter, vérifiez `git branch --show-current`.
- **Un seul modèle par fichier à la fois.** Avant de gros changements dans `src/components/garden.tsx`, `src/lib/garden.ts`, `src/lib/data.ts`, `src/pages/Zone.tsx` ou `src/pages/SpeciesSheet.tsx`, vérifiez qu'aucune branche ouverte ne les touche (`git branch -r`, `gh pr list`).
- **Commits petits, un sujet chacun**, message à l'indicatif ou nominal, en français, une ligne. Ne commitez jamais `.claude/`, `.env*`, `node_modules`, `dist`, `android/app/build`.
- **Ne commitez/poussez que sur demande de l'utilisateur** (il dit « commit et push »). En cas de doute, demandez.
- Laissez une trace : en fin de travail, dites ce qui est fait, ce qui ne l'est pas, et ce qui n'a pas pu être vérifié.

## Base de données (Supabase, projet `kfdusbzchhbzshznlvmb`, Paris)

- Toute modification de schéma ou de données du catalogue passe par un fichier `supabase/migrations/NNNN_nom.sql`. **Prochain numéro libre : 0015** — vérifiez `ls supabase/migrations` et la branche des autres avant de le prendre ; en cas de doute, ajoutez la date au nom (`0015_20261021_nom.sql`).
- Les migrations sont **additives** : pas de `drop`/`delete` sans accord explicite. Écrire en SQL idempotent quand c'est possible.
- Appliquer une migration sur le projet réel (outil MCP Supabase) **uniquement après accord de l'utilisateur**, et dans le même temps que le fichier est versionné. Vérifiez ensuite le résultat par une requête.
- Les règles RLS protègent les données : ne les contournez pas. Les clés `sb_secret_*`/service_role ne vont **jamais** dans le code, dans un commit ni dans le chat.
- `species` : le catalogue partagé (60 plantes + 2 sols `kind='sol'` : Jachère, Paillage). Les sols ne s'arrosent pas, ne se récoltent pas et ne comptent pas comme plants.

## Android / APK

- Construction : JDK 21 obligatoire (Gradle ne supporte pas Java 25/26).
  ```bash
  export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  export ANDROID_HOME=$HOME/Library/Android/sdk
  npm run android:publish      # construit l'APK de test et l'envoie dans le bucket Supabase « apk »
  ```
- Le lien de téléchargement est **toujours le même** : `https://kfdusbzchhbzshznlvmb.supabase.co/storage/v1/object/public/apk/mon-petit-potager-debug.apk`. Un seul modèle publie à la fois, sinon on s'écrase. Après un changement visible dans l'app, republier et redonner le lien.
- La publication lit `SUPABASE_SECRET_KEY` dans `.env.local` (fichier non versionné, ajouté par l'utilisateur). Ne la demandez pas dans le chat.
- Après `npm install`/mise à jour de Vite, **redémarrez le serveur de développement** : un ancien processus avec les nouveaux modules donne des erreurs trompeuses.

## Architecture (où ranger quoi)

```
src/lib/        règles et accès aux données, sans React sauf data.ts/app.tsx/offline.ts
                garden.ts (grille, voisinages, arrosage, récolte) · rotation.ts · reminders.ts · generator.ts
                data.ts (requêtes Supabase) · outbox.ts + offline.ts (mode hors ligne) · weather.ts · native.ts (Capacitor)
src/components/ ui.tsx (Btn, Sheet, Select, Page, Toast…) · garden.tsx (CellGrid, sélection, arrosage)
src/pages/      une page par route (App.tsx déclare les routes)
supabase/       migrations, fonction send-reminders
```

- La logique métier va dans `src/lib` et se teste (Vitest, environnement node). Les composants restent minces.
- Réutilisez les composants existants (`Select`, `Sheet`, `Btn`, `Stepper`, `Note`, `Picto`/`Tile`) au lieu d'en créer de nouveaux ; pas de `<select>` natif.
- Couleurs et polices : tokens Tailwind (`vert`, `terre`, `eau`, `soleil`, `alerte`, `fond`, `encre`, `gris`, `trait` ; `font-titre`, `font-corps`). Pas de couleur codée en dur si un token existe.
- Mobile d'abord (375 px), puis bureau (`lg:`). Zones tactiles ≥ 44 px. Respecter `prefers-reduced-motion` (déjà géré globalement dans `index.css`).
- Accessibilité : `aria-label` sur les boutons-icônes et les cases (voir `CellGrid`), rôles `listbox`/`dialog` là où il y en a.

## Pièges connus (déjà rencontrés, ne les reproduisez pas)

- **Fond de page** : la couleur de fond doit être sur `html` uniquement. Sur `body` aussi, un calque à `z-index` négatif (fond météo) disparaît.
- **`transform`/`translate` sur `<main>`** (ou tout ancêtre de la barre du bas) fait de lui le repère des éléments `position: fixed` : la barre du bas se décale. L'animation d'apparition d'une page est donc un **fondu seul**. Dans une `Sheet` ou un menu, préférez les propriétés CSS `translate`/`scale` aux `transform` Tailwind quand vous animez.
- **Menus flottants dans une `Sheet`** : la feuille a un `transform`, donc un `fixed` à l'intérieur se positionne par rapport à elle. Utilisez un portail vers `document.body` (voir `Select`).
- **Mode hors ligne** : les écritures sur les plantations (arroser, planter, vider, retirer) passent par la file `outbox.ts` ; leurs identifiants sont créés côté appareil (`crypto.randomUUID()`) pour qu'un renvoi ne crée pas de doublon. Pour ajouter une nouvelle écriture hors ligne : nouveau type d'`Op` + `applyOp` (idempotent) + `run` + tests dans `outbox.test.ts`. Les autres écritures (zones, tâches, profil) restent en ligne et échouent avec un message clair.
- **Règle d'arrosage** : une seule définition (`isThirsty` / `needsWater` dans `garden.ts`), partagée par l'accueil, les cartes et les rappels. Ne la recopiez pas.
- **Rappels** : `reminders.ts` planifie 7 jours ; une zone sous abri ne profite pas de la pluie. Une journée de pluie ne supprime pas à elle seule un rappel (bug déjà corrigé, test en place).
- **Steppers** : bornes multiples du pas (`stepper.ts`), sinon « + » peut diminuer la valeur.
- **Fenêtre de test Vite** : après une mise à jour de dépendances, `__WS_TOKEN__ is not defined` ou « Invalid hook call » = serveur de développement à relancer.
- **Dates** : passez par les helpers de `src/lib/dates.ts` (`parse`, `iso`, `today`, `diffDays`…), qui travaillent en jours entiers à l'heure locale ; `new Date('YYYY-MM-DD')` est interprété en UTC et décale d'un jour. Les tests tournent en Europe/Paris avec l'heure simulée.

## Ce qu'il ne faut pas faire sans demander

- Changer de version majeure (React 19, React Router 7, Tailwind 4, Vite 8, Vitest 5, TypeScript 7).
- Supprimer des données, des tables, des plantes du catalogue, ou publier sur Google Play / l'App Store.
- Modifier la connexion (lien magique, Google), les rappels natifs ou les règles RLS.
- Ajouter une dépendance : elle alourdit l'APK et le site ; justifiez-la.
