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
- `useLocalSearchParams` ne renvoie que les paramètres de la **route courante**.
  Un écran enfant d'un navigateur imbriqué ne voit donc pas les segments
  dynamiques de sa route parente : `[endpointId]` est rediffusé par
  `src/api/EndpointContext.tsx` depuis le layout `(tabs)`, qui porte le segment.

## Vérifications avant commit
```bash
npm run typecheck
npx expo export --platform ios --output-dir /tmp/stackpilot-export-check
```
