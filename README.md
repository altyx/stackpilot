# StackPilot

Client mobile (iOS + Android) pour [Portainer CE/BE](https://www.portainer.io/), écrit en
**React Native / Expo** avec TypeScript.

Il parle directement à l'API REST de votre instance Portainer : aucun serveur
intermédiaire, aucune donnée qui sort de votre réseau.

## Fonctionnalités

- Connexion à une instance par **access token** (`ptr_…`) ou par **identifiants** (session JWT)
- Jeton stocké dans le Keychain iOS / Keystore Android (`expo-secure-store`), jamais en clair
- Liste des **environnements** Docker avec état et instantané (conteneurs, images)
- Trois onglets par environnement : **conteneurs**, **images**, **volumes**
- Liste des **conteneurs** groupée par stack, avec recherche et filtres (tous / en cours / arrêtés) et rafraîchissement auto
- **Détail d'un conteneur** : état, santé, réseaux, volumes, politique de redémarrage
- **Actions** : démarrer, arrêter, redémarrer un conteneur, ou **démarrer / arrêter
  une stack entière** (confirmation pour les actions destructrices)
- **Logs** : 200 dernières lignes, démultiplexées depuis le flux Docker
- **Images** et **volumes** marqués utilisés / inutilisés, avec les conteneurs qui les
  référencent, les images sans tag (dangling) et l'espace récupérable
- **Notifications push** quand un conteneur tombe, via le service [`watcher/`](watcher/)
- **Conditions générales d'utilisation** et **politique de confidentialité** consultables depuis la connexion et la liste des environnements, et publiées dans [`docs/legal`](docs/legal)

Les environnements Kubernetes sont détectés et signalés comme non pris en charge.

## Démarrage

```bash
npm install
npm start
```

Puis scannez le QR code avec **Expo Go**, ou lancez `npm run ios` / `npm run android`.

### Générer un access token Portainer

Dans Portainer : **My account › Access tokens › Add access token**. Le jeton est
affiché une seule fois, ne dépend d'aucune session et reste révocable côté serveur.

## Notifications

Une application mobile ne peut pas surveiller un serveur : iOS et Android la
suspendent en arrière-plan. Les alertes viennent donc d'un service séparé,
[`watcher/`](watcher/), qui écoute le flux d'événements Docker de Portainer et
pousse vers cet appareil. Voir [son README](watcher/README.md).

Côté application, trois prérequis :

1. `eas init`, pour obtenir le `projectId` que le service de push exige ;
2. un **dev build** — Expo Go ne reçoit plus les notifications distantes depuis
   le SDK 53 ;
3. un **appareil physique** : APNs ne délivre pas de jeton à un simulateur.

L'écran _Notifications_ (icône cloche, en haut de la liste des environnements)
affiche le jeton de l'appareil à recopier dans la configuration du service.

## Architecture

```
app/                                     routes expo-router (file-based)
  _layout.tsx                            providers + garde d'authentification
  index.tsx                              aiguillage démarrage
  login.tsx                              connexion
  terms.tsx, privacy.tsx                 textes légaux, accessibles sans session
  endpoints/index.tsx                    liste des environnements
  endpoints/[endpointId]/(tabs)/         onglets conteneurs / images / volumes
  endpoints/[endpointId]/containers/     détail d'un conteneur
src/
  api/client.ts                          fetch typé, timeouts, erreurs Portainer
  api/portainer.ts                       routes Portainer + proxy Docker
  api/hooks.ts                           hooks TanStack Query
  api/types.ts                           types Portainer / Docker
  auth/                                  session sécurisée + contexte React
  legal/                                 CGU, confidentialité, identité de l'éditeur
  components/ui.tsx                      composants partagés
  lib/format.ts                          formatage (noms, dates, tailles)
  lib/usage.ts                           calcul utilisé / inutilisé
  lib/stacks.ts                          regroupement par stack
  notifications/                         enregistrement push + navigation au tap
watcher/                                 service serveur qui émet les alertes
  theme.ts                               palette et espacements
fastlane/                                signature, compilation et envoi iOS
```

Toutes les requêtes Docker passent par le proxy Portainer
(`/api/endpoints/{id}/docker/...`) : les droits de l'utilisateur Portainer
s'appliquent donc telles quelles.

## Limites connues

- **Certificats auto-signés** : `fetch` en React Native refuse un certificat non
  approuvé. Utilisez un certificat valide (Let's Encrypt, reverse proxy), ou
  installez l'autorité de certification sur l'appareil.
- Pas de console interactive (`exec`) ni de suivi de logs en temps réel : cela
  demande WebSocket + un terminal, prévus pour une itération ultérieure.
- Le regroupement par stack s'appuie sur les labels `com.docker.compose.project`
  et `com.docker.stack.namespace` portés par les conteneurs, pas sur
  `/api/stacks` : une stack définie mais non déployée n'apparaît donc pas.
- Les actions de stack s'appliquent conteneur par conteneur, sans passer par
  `/api/stacks` : elles fonctionnent donc sur tout groupe affiché, mais **sans
  respecter l'ordre de dépendance** d'un `depends_on`. Sur une stack où l'ordre
  de démarrage compte, démarrez le conteneur concerné individuellement.
  L'action porte toujours sur la stack complète, même si un filtre est actif.
- Pas encore de gestion des réseaux, et pas de suppression (`prune`) des images
  et volumes inutilisés.
- Les jetons de notification sont recopiés à la main dans la configuration du
  service : pas d'enregistrement automatique, donc pas de backend à héberger.
  Le jeton change après une réinstallation de l'application.
- Docker ne renvoie pas de compteur d'utilisation fiable sur `/images/json` ni
  sur `/volumes` : l'app le dérive de la liste des conteneurs, arrêtés compris,
  comme le fait l'interface web de Portainer. Une image référencée uniquement
  par une stack non déployée apparaîtra donc comme inutilisée.
- Le JWT obtenu par identifiants expire côté Portainer (quelques heures) ; il faut
  se reconnecter. L'access token est recommandé pour un usage quotidien.

## Scripts

| Commande                          | Rôle                                                      |
| --------------------------------- | --------------------------------------------------------- |
| `npm start`                       | serveur de développement Expo                             |
| `npm run ios` / `npm run android` | lance sur simulateur / émulateur                          |
| `npm run typecheck`               | vérification TypeScript                                   |
| `npm run legal`                   | publie les textes légaux de `src/legal` dans `docs/legal` |

## Publication

Un workflow GitHub Actions construit et envoie l'application : chaque fusion
sur `main` part en test (TestFlight, piste interne Google Play), chaque tag
`vX.Y.Z` part en production et crée la GitHub Release. Sans service de build
tiers : Gradle pour Android, fastlane pour iOS, avec une signature gérée par
match. Prérequis, secrets et premier envoi : [docs/release.md](docs/release.md).

## Licence

MIT — voir [LICENSE](LICENSE).
