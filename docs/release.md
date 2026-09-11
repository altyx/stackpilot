# Publication sur les stores

Le workflow [`mobile-release.yml`](../.github/workflows/mobile-release.yml)
construit l'application sur GitHub Actions et l'envoie aux stores. Il ne
dépend d'aucun service de build tiers : la compilation iOS se fait avec
`xcodebuild` sur un runner macOS, la compilation Android avec Gradle sur un
runner Linux, et les envois passent par les API d'Apple et de Google.

## Déclencheurs

| Événement | Destination |
| --- | --- |
| Fusion sur `main` | **Test** : TestFlight et piste interne Google Play |
| *Run workflow* manuel, choix `beta` | idem |
| *Run workflow* manuel, choix `production` | **Production** : App Store Connect et piste production Google Play, en brouillon |

Pour iOS, test et production sont **le même envoi** : un build arrive dans
App Store Connect, apparaît dans TestFlight, et c'est depuis la console Apple
qu'on le soumet à l'App Store. Un build de production n'est donc utile que si
`main` a avancé depuis le dernier build de test ; sinon, soumettez directement
le build TestFlight existant.

Pour Android, le build de test est publié aux testeurs de la piste interne ;
le build de production est déposé **en brouillon** sur la piste production,
et rien n'est publié sans un lancement depuis la console.

Tant que les secrets d'une plateforme manquent, son job est **ignoré avec un
avertissement**, sans faire échouer le workflow. On peut donc fusionner sur
`main` avant d'avoir les comptes.

## Numéro de build

Les stores exigent un numéro de build strictement croissant à chaque envoi.
Le workflow utilise son compteur d'exécutions (`run_number`), transmis à
[`app.config.ts`](../app.config.ts) par `BUILD_NUMBER`, qui le pose dans
`ios.buildNumber` et `android.versionCode`. Les deux destinations partagent ce
compteur parce qu'elles vivent dans le même fichier de workflow : les séparer
en deux fichiers donnerait deux compteurs, et un envoi de production pourrait
porter un numéro inférieur à un envoi de test.

La **version** visible par l'utilisateur (`1.0.0`) reste dans `app.json`, à
incrémenter à la main.

## Secrets iOS

À définir dans *Settings → Secrets and variables → Actions* du dépôt.

| Secret | Contenu |
| --- | --- |
| `APPLE_TEAM_ID` | Identifiant d'équipe, dans *Membership details* du compte développeur |
| `ASC_KEY_ID` | Identifiant de la clé API App Store Connect |
| `ASC_ISSUER_ID` | *Issuer ID*, affiché sur la même page que les clés |
| `ASC_API_KEY_P8_BASE64` | Le fichier `.p8` de la clé, encodé en base64 |

La clé se crée dans App Store Connect : *Users and Access → Integrations →
App Store Connect API → Team Keys*. Donnez-lui le rôle **Admin** : la
signature est confiée à Apple (*cloud signing*), et c'est ce rôle qui permet
à Xcode de créer le certificat de distribution et le profil. Apple ne laisse
télécharger le `.p8` **qu'une seule fois** : conservez-le dans un gestionnaire
de mots de passe.

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```

Avant le premier envoi, dans le compte développeur :

1. déclarer l'identifiant `app.stackpilot` dans *Certificates, Identifiers &
   Profiles → Identifiers*, avec la capacité **Push Notifications** ;
2. créer l'application dans App Store Connect avec cet identifiant.

## Secrets Android

| Secret | Contenu |
| --- | --- |
| `ANDROID_UPLOAD_KEYSTORE_BASE64` | Le keystore de la clé d'envoi, encodé en base64 |
| `ANDROID_UPLOAD_KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `ANDROID_UPLOAD_KEY_ALIAS` | Alias de la clé |
| `ANDROID_UPLOAD_KEY_PASSWORD` | Mot de passe de la clé |
| `PLAY_SERVICE_ACCOUNT_JSON` | Le fichier JSON du compte de service, tel quel |

### Clé d'envoi

Avec Play App Signing, activé par défaut pour toute nouvelle application,
Google détient la clé qui signe ce que les utilisateurs installent. Celle-ci
ne sert qu'à authentifier vos envois, et Google peut la remplacer si elle est
perdue.

```bash
keytool -genkeypair -v -keystore upload.jks -alias stackpilot -keyalg RSA -keysize 2048 -validity 10000
```

```bash
base64 -i upload.jks | pbcopy
```

Conservez `upload.jks` et ses mots de passe hors du dépôt.

### Compte de service

1. Dans Google Cloud, créer un compte de service et lui générer une clé JSON.
2. Dans la Play Console, *Users and permissions → Invite new users*, inviter
   l'adresse du compte de service et lui donner, sur l'application, les
   permissions de gestion des releases (*Release to production, exclude
   devices, and use Play App Signing* et *Release apps to testing tracks*).

### Premier envoi à la main

L'API de Google Play **refuse le tout premier envoi** d'une application : il
faut créer l'application dans la console et y déposer un premier bundle
manuellement. Le workflow conserve chaque bundle en artefact
(`android-aab-<numéro>`) précisément pour ça : téléchargez-le depuis la page
du run et déposez-le sur la piste interne. Les envois suivants passent par
l'API.

## Ce qui a été vérifié, et ce qui ne l'a pas été

Vérifié en local, sur ce dépôt :

- `app.config.ts` pose bien `BUILD_NUMBER` dans les deux plateformes et refuse
  une valeur non entière ;
- le plugin [`withAndroidReleaseSigning`](../plugins/withAndroidReleaseSigning.js)
  produit un `build.gradle` qui signe la release avec la clé d'envoi quand
  elle est fournie, et avec la clé de debug sinon ; un bundle de release a été
  construit et sa signature contrôlée dans les deux cas ;
- le projet iOS généré compile en Release, sans signature.

Non vérifié, faute de comptes : la signature iOS confiée à Apple, l'envoi vers
App Store Connect, et l'envoi vers Google Play. Ces étapes suivent la
documentation d'Apple et de Google, mais le premier run réel demandera sans
doute un ajustement. Les journaux `xcodebuild` sont conservés en artefact
quand le job iOS échoue.

## Dépannage

- **iOS ignoré / Android ignoré** dans le job *Préparation* : un secret manque.
- **`No profiles for 'app.stackpilot' were found`** : la clé API n'a pas le
  rôle Admin, ou l'identifiant n'est pas déclaré dans le compte développeur.
- **Le bundle est signé avec la clé de debug** : les secrets Android sont
  définis mais le plugin n'a pas modifié `build.gradle` ; vérifier que
  `./plugins/withAndroidReleaseSigning` figure dans `app.json`.
- **`Package not found`** à l'envoi Google Play : le premier envoi manuel n'a
  pas été fait, ou le compte de service n'a pas accès à l'application.
- **Numéro de build déjà utilisé** : un run a été relancé (*Re-run*), ce qui
  réutilise le même `run_number`. Déclencher un nouveau run à la place.
