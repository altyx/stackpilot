# StackPilot — notes pour agents

## Stack

Expo SDK 57 / React Native 0.86 / React 19 / TypeScript, expo-router (file-based),
TanStack Query, expo-secure-store.

**Expo évolue vite** : consulter https://docs.expo.dev/versions/v57.0.0/ avant
d'écrire du code touchant aux modules Expo.

## Conventions

- Toutes les couleurs et espacements viennent de `src/theme.ts` — pas de valeur en dur.
- L'accès réseau passe exclusivement par `src/api/client.ts` (timeouts + erreurs typées).
- Les routes sous `app/` restent minces : la logique vit dans `src/`.
- L'UI et les messages d'erreur sont en français.
- `react-dom` est épinglé via `overrides` dans `package.json` pour aligner son peer
  `react` sur la version imposée par Expo — ne pas retirer sans revérifier `npm install`.
- Les dossiers `ios/` et `android/` ne sont pas versionnés : ils sont regénérés
  par `expo prebuild`, en local comme en CI. Toute modification native passe par
  un plugin de config dans `plugins/`, jamais par une édition directe.
- La signature iOS en CI passe par fastlane match (`fastlane/`, voir
  `docs/release.md`). La lane `build` règle la signature du projet tout juste
  généré, le temps du build : ce n'est pas une modification native à porter
  dans un plugin. Ne pas revenir à la signature automatique de Xcode, qui
  échoue dès le deuxième run sur un runner éphémère.
- Les textes légaux s'écrivent dans `src/legal` et décrivent le comportement
  réel de l'app (stockage, réseau, notifications) : toute évolution de ce
  comportement doit s'y refléter. `docs/legal` en est une copie générée par
  `npm run legal`, jamais éditée à la main.
- `useLocalSearchParams` ne renvoie que les paramètres de la **route courante**.
  Un écran enfant d'un navigateur imbriqué ne voit donc pas les segments
  dynamiques de sa route parente. Les écrans d'un environnement sont pour cette
  raison des enfants directs du menu `app/(drawer)`, sans layout intermédiaire
  sous `[endpointId]` : chacun lit son segment via `useEndpointParam`.
- Navigation : les écrans principaux vivent sous le menu latéral
  `app/(drawer)`, dont le contenu est `src/navigation/AppDrawerContent.tsx`.
  Les écrans de détail restent dans la pile racine, par-dessus le menu, avec
  un bouton retour. L'environnement visé par le menu est celui du dernier écran
  focalisé (`src/navigation/CurrentEndpoint.tsx`), persisté par instance.
- Les écrans annexes (`app/notifications.tsx`, `app/changelog.tsx`,
  `app/terms.tsx`, `app/privacy.tsx`) vivent dans la pile racine et s'ouvrent
  depuis les réglages, avec un bouton retour. Les textes légaux servent aussi
  l'écran de connexion, hors session.
- `src/changelog.ts` est embarqué dans le binaire : son entrée de tête doit
  porter la version d'`app.json`. `npm run changelog` le vérifie, et le workflow
  de publication refuse de compiler sinon. C'est aussi la source des notes
  publiées (GitHub Release, TestFlight, Google Play), via
  `npm run changelog -- --notes`.
- Publier, c'est bumper `expo.version` dans `app.json` : la voir changer sur
  `main` fait partir la production, et le workflow crée alors le tag `vX.Y.Z` et
  la GitHub Release une fois les envois réussis (voir `docs/release.md`). Ne
  bumper la version que dans une PR de release, avec sa note de changelog.
- Les réglages de l'application vivent dans `src/settings` et sont persistés
  dans le trousseau, faute d'autre stockage embarqué. Toute nouvelle préférence
  conservée sur l'appareil doit apparaître dans `src/legal/privacy.ts`.

## Vérifications avant commit

```bash
npm run typecheck
npx expo export --platform ios --output-dir /tmp/stackpilot-export-check
npm run legal -- --check
npm run changelog
```
