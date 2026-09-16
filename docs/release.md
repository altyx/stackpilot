# Publication sur les stores

Le workflow [`mobile-release.yml`](../.github/workflows/mobile-release.yml)
construit l'application sur GitHub Actions et l'envoie aux stores. Il ne
dépend d'aucun service de build tiers : la compilation iOS se fait avec
fastlane, qui pilote `xcodebuild`, sur un runner macOS, la compilation Android
avec Gradle sur un runner Linux, et les envois passent par les API d'Apple et
de Google.

## Déclencheurs

| Événement | Destination |
| --- | --- |
| Fusion sur `main` | **Test** : TestFlight et piste interne Google Play |
| *Run workflow* manuel | idem |
| Fusion sur `main` qui **change `expo.version`** | **Production**, et le tag `vX.Y.Z` est créé par le workflow |
| Tag `vX.Y.Z` poussé à la main | **Production** (reprise d'une publication interrompue) |

C'est donc le **numéro de version** qui décide, pas un geste séparé : tant que
`expo.version` ne bouge pas, chaque fusion produit un build de test de plus,
sous la même version, avec un numéro de build neuf. Voir « Publier une
version » plus bas.

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

## Deux numéros, deux rôles

`expo.version` dans `app.json` est la **version marketing** — celle que les
stores affichent, `CFBundleShortVersionString` côté iOS et `versionName` côté
Android. Elle est écrite à la main, dans une PR de release, et c'est la seule
chose qui déclenche une publication.

Le **numéro de build** est le compteur d'exécutions du workflow, posé par
[`app.config.ts`](../app.config.ts) en `ios.buildNumber` et
`android.versionCode`. Il croît à chaque run, y compris entre deux versions
marketing identiques : d'où les `0.1.0 (12)`, `0.1.0 (13)` qui se succèdent
dans TestFlight entre deux releases. Les stores exigent qu'il croisse
strictement, jamais qu'il corresponde à quoi que ce soit.

Le `version` de `package.json` ne sert à rien ici : seul `app.json` compte.

## Publier une version

Une publication tient dans une **PR de release**, qui ne fait que deux choses :

1. Ajouter l'entrée de la version en tête de
   [`src/changelog.ts`](../src/changelog.ts) — c'est le texte que liront les
   utilisateurs, dans l'app comme sur les stores.
2. Porter `expo.version` à ce même numéro dans `app.json`.

Les deux vont ensemble : `npm run changelog` échoue si l'un avance sans
l'autre, et le workflow lance ce contrôle avant de compiler. Il vérifie aussi
qu'aucun champ « À COMPLÉTER » ne reste dans les mentions légales
([`src/legal`](../src/legal)), affichées dans l'app.

À la fusion, le workflow compile, envoie aux stores, puis crée le tag `vX.Y.Z`
et la **GitHub Release** correspondante, avec les notes du changelog, le rappel
du build et du commit, la liste des commits et le bundle Android en pièce
jointe. Le tag naît avec la release, donc **après** des envois réussis : il
n'existe pas de tag qui prétende publié ce qui n'est pas parti.

Reste à terminer dans les consoles : soumettre le build à l'App Store, lancer
le déploiement du brouillon Google Play. Le tag atteste ce qui a été **envoyé**,
pas ce qui est en ligne.

Si la production échoue avant la création du tag, corrigez, puis relancez la
publication en poussant le tag à la main :

```bash
git tag v1.0.0 && git push origin v1.0.0
```

Ne relancez pas le run : un *Re-run* garde le même numéro de build, que les
stores refuseront. Et si le tag existe déjà, une nouvelle fusion sur cette même
version est refusée dès la préparation : il faut alors bumper à nouveau.

## Notes de version

`src/changelog.ts` est la source unique : l'app les affiche dans Réglages ›
Nouveautés, et le workflow les reprend pour le corps de la GitHub Release, le
« What to Test » de TestFlight et le « Nouveautés » de Google Play.

```bash
npm run changelog -- --notes            # ce qui partira
npm run changelog -- --notes --max=500  # tronqué comme pour Google Play
```

Google Play limite ces notes à **500 caractères par langue** et n'accepte que
les langues déclarées sur la fiche du store. Le workflow écrit
`whatsnew-fr-FR` : si la fiche Google Play n'a pas le français, changez
`PLAY_NOTES_LANGUAGE` dans le job Android, sans quoi l'envoi échoue.

Les notes de l'App Store, elles, se saisissent dans App Store Connect au moment
de soumettre le build : Apple ne les accepte pas d'un envoi TestFlight.

## Textes légaux

Les CGU et la politique de confidentialité s'écrivent dans
[`src/legal`](../src/legal) : c'est ce que l'app affiche. `npm run legal` en
publie une copie Markdown dans [`docs/legal`](legal), et le workflow échoue
dès la préparation si cette copie n'est plus à jour. Après toute modification
de `src/legal`, régénérer et committer les deux ensemble.

Les stores demandent l'adresse publique de la politique de confidentialité :

```
https://github.com/altyx/stackpilot/blob/main/docs/legal/privacy.md
```

Elle pointe sur `main` : le fichier doit y être fusionné avant de la déclarer,
et ne doit plus changer de chemin ensuite.

## Retrouver le commit d'un build

L'application affiche, sous la liste des environnements, une ligne du type
`StackPilot 1.0.0 (57) · a1d8e36` : version et numéro de build lus dans le
binaire, commit gravé à la compilation par [`app.config.ts`](../app.config.ts).
C'est la ligne à demander à un testeur. Les builds de test n'ont pas de tag ;
cette ligne suffit à les retrouver.

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

## iOS

### Signature

La signature passe par [fastlane match](https://docs.fastlane.tools/actions/match/).
Le certificat de distribution, sa clé privée et le profil App Store sont
stockés chiffrés dans un dépôt privé, `altyx/stackpilot-certificates`, déclaré
dans [`fastlane/Matchfile`](../fastlane/Matchfile). La CI les lit en lecture
seule, avec une clé de déploiement, et ne crée jamais rien chez Apple.

La signature automatique de Xcode ne convient pas ici : sur un runner
éphémère, elle crée un certificat de développement à chaque run, dont la clé
privée disparaît avec la machine, et le run suivant échoue.

Les lanes du [`Fastfile`](../fastlane/Fastfile) :

| Lane | Lancée par | Rôle |
| --- | --- | --- |
| `certificates` | vous, sur un Mac | crée ou renouvelle le certificat et le profil |
| `build` | le workflow | installe la signature, compile et exporte l'IPA |
| `upload` | le workflow | envoie l'IPA à App Store Connect |

`build` et `upload` sont deux étapes séparées du workflow : les scripts npm
exécutés pendant la compilation n'ont pas accès à la clé App Store Connect.

Apple réserve la création des certificats et des profils de distribution aux
rôles *Account Holder* et *Admin*. D'où **deux clés API** :

- une clé **Admin**, qui reste sur votre Mac et ne sert qu'à `certificates` ;
- une clé **App Manager**, dans les secrets GitHub, qui ne sert qu'à envoyer
  les builds.

### Secrets iOS

À définir dans *Settings → Secrets and variables → Actions* du dépôt.

| Secret | Contenu |
| --- | --- |
| `ASC_KEY_ID` | Identifiant de la clé API **App Manager** |
| `ASC_ISSUER_ID` | *Issuer ID*, affiché au-dessus de la liste des clés |
| `ASC_API_KEY_P8_BASE64` | Le `.p8` de cette clé, encodé en base64 |
| `MATCH_PASSWORD` | La phrase de passe choisie au premier lancement de `certificates` |
| `MATCH_DEPLOY_KEY` | La clé SSH privée de déploiement du dépôt des certificats, lignes `BEGIN` et `END` comprises |

```bash
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```

### Mise en service

Une seule fois, dans cet ordre :

1. **Accès à l'API** : App Store Connect › *Users and Access* ›
   *Integrations* › *Request Access*, depuis le compte *Account Holder*.
   Apple examine la demande au cas par cas : à lancer en premier.
2. **Accords** : accepter dans App Store Connect l'accord de licence en
   attente, sans quoi les envois sont refusés.
3. **Identifiant** : *Certificates, Identifiers & Profiles › Identifiers*,
   App ID explicite `app.stackpilot` avec la capacité **Push Notifications**.
4. **Fiche de l'app** : App Store Connect › *Apps* › *New App*, avec cet
   identifiant.
5. **Clés API** : *Integrations › Team Keys*, une clé Admin et une clé App
   Manager. Chaque `.p8` ne se télécharge **qu'une seule fois** : conservez-les
   dans un gestionnaire de mots de passe.
6. **Clé de déploiement** : générer une paire de clés, puis ajouter la partie
   publique (`.pub`) dans *Settings › Deploy keys* du dépôt des certificats,
   **sans** cocher *Allow write access*. La partie privée devient
   `MATCH_DEPLOY_KEY`.

   ```bash
   ssh-keygen -t ed25519 -N "" -C "stackpilot-ci" -f stackpilot_match_deploy
   ```

7. **Certificat et profil** : depuis la racine de ce dépôt, avec la clé Admin.
   La Ruby livrée avec macOS est trop ancienne (fastlane exige 3.1 ou plus) :
   installer celle de Homebrew (`brew install ruby`) et placer
   `/opt/homebrew/opt/ruby/bin` en tête du `PATH`.

   ```bash
   bundle install
   ```

   ```bash
   ASC_KEY_ID=XXXXXXXXXX ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx ASC_KEY_PATH=~/AuthKey_XXXXXXXXXX.p8 bundle exec fastlane ios certificates
   ```

   match demande une phrase de passe pour chiffrer le dépôt (c'est
   `MATCH_PASSWORD`), éventuellement le mot de passe de session du Mac pour
   ranger le certificat dans le trousseau, puis pousse le tout dans le dépôt
   des certificats.
8. **Secrets** : renseigner les cinq secrets ci-dessus.
9. **TestFlight** : App Store Connect › *TestFlight* › *Internal Testing*,
   créer un groupe, s'y ajouter et activer la distribution automatique. Le
   workflow n'attend pas la fin du traitement par Apple : c'est ce groupe qui
   reçoit chaque nouveau build.

### Renouvellement

Le certificat de distribution expire au bout d'un an, et les builds échouent
ensuite. Relancer alors `certificates` (étape 7) : la lane remplace le
certificat expiré et régénère le profil. Les secrets GitHub ne changent pas.

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
- le projet iOS généré compile en Release, sans signature ;
- le `Fastfile` se charge avec fastlane 2.240 et Ruby 4.0, et ses lanes
  s'arrêtent sur un message clair quand une variable manque ;
- match en lecture seule, sur un dépôt vide : clone par clé de déploiement,
  branche `main`, déchiffrement avec `MATCH_PASSWORD`, puis refus attendu
  faute de certificat, sans aucune connexion à Apple ;
- sur un projet fraîchement généré par `expo prebuild`, la signature de
  distribution ne s'applique qu'à la cible de l'app en Release, et une archive
  n'échoue que sur l'absence du profil, sans erreur venant des Pods ;
- l'`Info.plist` généré déclare `ITSAppUsesNonExemptEncryption` à `false` ;
- Xcode 26.4 accepte la méthode d'export `app-store` que transmet fastlane,
  avec un simple avertissement de dépréciation.

Non vérifié, faute de comptes : la création du certificat par match, la
signature réelle, l'envoi vers App Store Connect, et l'envoi vers Google Play.
Ces étapes suivent la documentation d'Apple, de fastlane et de Google, mais le
premier run réel demandera peut-être un ajustement. Les journaux de
compilation iOS sont conservés en artefact quand le job échoue.

## Dépannage

- **iOS ignoré / Android ignoré** dans le job *Préparation* : un secret manque.
- **`Permission denied (publickey)`** au clonage des certificats : la clé
  publique n'est pas dans les *Deploy keys* du dépôt des certificats, ou
  `MATCH_DEPLOY_KEY` est incomplet.
- **`Invalid password passed via 'MATCH_PASSWORD'`** : le secret ne correspond
  pas à la phrase de passe choisie au premier lancement de `certificates`.
- **`No code signing identity found and cannot create a new one because you
  enabled readonly`** : `certificates` n'a pas encore été lancée, ou l'a été
  sur un autre dépôt ou une autre branche que ceux du `Matchfile`.
- **`Couldn't find app 'app.stackpilot'`** à l'envoi : la fiche App Store
  Connect n'existe pas, ou utilise un autre identifiant.
- **Envoi refusé pour droits insuffisants** : la clé des secrets n'a pas le
  rôle App Manager.
- **Build bloqué en « Missing Compliance »** dans TestFlight :
  `ios.config.usesNonExemptEncryption` a disparu de `app.json`.
- **Le bundle est signé avec la clé de debug** : les secrets Android sont
  définis mais le plugin n'a pas modifié `build.gradle` ; vérifier que
  `./plugins/withAndroidReleaseSigning` figure dans `app.json`.
- **`Package not found`** à l'envoi Google Play : le premier envoi manuel n'a
  pas été fait, ou le compte de service n'a pas accès à l'application.
- **Numéro de build déjà utilisé** : un run a été relancé (*Re-run*), ce qui
  réutilise le même `run_number`. Pour un test, refaire une fusion ; pour une
  production, supprimer le tag et retaguer.
- **`Le tag vX.Y.Z ne correspond pas à la version`** : `app.json` n'a pas été
  bumpé avant le tag. Supprimer le tag, bumper, fusionner, retaguer.
- **`Des champs « À COMPLÉTER » restent dans src/legal`** : les mentions
  légales de [`src/legal/publisher.ts`](../src/legal/publisher.ts) n'ont pas
  été renseignées. Les compléter, fusionner, puis retaguer.
- **`Textes légaux publiés à régénérer`** dans le job *Préparation* :
  `src/legal` a changé sans que `docs/legal` suive. Lancer `npm run legal` et
  committer le résultat.
