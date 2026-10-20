@AGENTS.md

Précisions propres à Claude Code :

- L'utilisateur demande en général « commit et push » ; sans cette demande, ne commitez pas. Terminez le message par le lien de l'APK quand il a été republié.
- Publiez l'APK (`npm run android:publish`) après chaque changement visible dans l'app, et vérifiez que le lien donné correspond à la construction.
- Pour vérifier une page dans le navigateur, une maquette temporaire (page `harness.html` + `src/harness.tsx`, qui exporte provisoirement `Ctx` de `src/lib/app.tsx`) évite de se connecter ; **supprimez-la et restaurez `app.tsx` avant de commiter.**
