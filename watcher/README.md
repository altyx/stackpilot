# portainer-watcher

Service de surveillance qui écoute le flux d'événements Docker de Portainer et
pousse une notification vers l'application StackPilot quand un conteneur tombe.

Il existe parce qu'**une application mobile ne peut pas faire ce travail**. iOS et
Android suspendent les applications en arrière-plan : elles ne peuvent pas
sonder un serveur en continu, ni être réveillées à la demande. Une alerte fiable
doit venir de l'extérieur.

## Ce qui déclenche une alerte

| Événement Docker | Alerte |
| --- | --- |
| `die` avec un code de sortie ≠ 0 | Arrêt anormal (code N) |
| `health_status: unhealthy` | Passé en unhealthy |
| `oom` | Mémoire épuisée |
| `restart` | Redémarrage |

Un `die` avec le code 0 est **ignoré volontairement** : c'est un arrêt demandé,
typiquement depuis l'application. Sans ce filtre, chaque action volontaire
déclencherait une alerte.

Une même alerte pour un même conteneur n'est pas répétée avant `DEDUPE_SECONDS`,
sinon un conteneur qui boucle sur un redémarrage inonderait le téléphone.

## Configuration

Partez de [`.env.example`](.env.example) :

```bash
cp .env.example .env
```

| Variable | Requis | Rôle |
| --- | --- | --- |
| `PORTAINER_NETWORK` | oui | Réseau Docker que le service rejoint |
| `PORTAINER_URL` | oui | URL de Portainer vue depuis ce réseau, sans `/api` |
| `PORTAINER_TOKEN` | oui | Access token Portainer (`ptr_…`) |
| `ENDPOINT_ID` | oui | Identifiant de l'environnement à surveiller |
| `EXPO_PUSH_TOKENS` | oui | Jetons des appareils, séparés par des virgules |
| `PORTAINER_INSECURE_TLS` | non | Accepte le certificat auto-signé du flux, `0` par défaut |
| `IGNORE_CONTAINERS` | non | Noms de conteneurs à ignorer, séparés par des virgules |
| `DEDUPE_SECONDS` | non | Fenêtre anti-doublon, 120 par défaut |

### Trouver `ENDPOINT_ID`

C'est l'identifiant Portainer de l'**environnement** : ce que la liste
« Environnements » de l'application affiche, et ce que Portainer met dans son
URL. Souvent `1`, mais pas toujours — le compteur avance si un environnement a
été supprimé puis réajouté.

```bash
curl -sk -H "X-API-Key: ptr_xxx" https://VOTRE_PORTAINER/api/endpoints | jq '.[] | {Id, Name}'
```

### Trouver `PORTAINER_NETWORK`

```bash
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' portainer
```

Si la réponse est `bridge`, Portainer tourne sur le réseau par défaut, qui **ne
résout pas les noms de conteneurs**. Rattachez-le à un réseau nommé, ou visez
son port publié sur l'hôte.

### Trouver le jeton d'appareil

Dans l'application : **Environnements → icône cloche → Autoriser les
notifications**, puis *Copier le jeton*.

## Aucun volume n'est nécessaire

Le service ne lit ni n'écrit de fichier : pas de dépendance npm, pas de base, pas
d'état sur disque. Toute sa configuration passe par des variables
d'environnement, et sa fenêtre anti-doublon vit en mémoire. Un redémarrage
repart donc simplement d'une fenêtre vide.

Le `PORTAINER_TOKEN` reste lisible par `docker inspect`. Pour éviter de le voir
apparaître dans un historique de shell, placez-le dans un fichier `.env` à côté
du `compose.yaml` — Compose le charge automatiquement, et ce fichier ne doit pas
être versionné.

## Déploiement

### Option 1 — construire sur le serveur (le plus simple)

Copiez le dossier `watcher/` sur le serveur, puis :

```bash
cp .env.example .env   # puis renseignez-le
docker compose up -d --build
```

Aucun registry, aucune question d'architecture : l'image est construite là où
elle tourne.

### Option 2 — en tant que stack Portainer

Dans Portainer : **Stacks → Add stack → Web editor**, collez le contenu de
`compose.yaml` en remplaçant `build: .` par une image déjà publiée, et
renseignez les variables dans *Environment variables*. Le service apparaît
ensuite comme n'importe quelle autre stack.

### Option 3 — publier sur un registry

Attention à l'architecture : une image construite sur un Mac Apple Silicon est
en `arm64` et **ne démarrera pas** sur un serveur x86. Vérifiez d'abord la cible :

```bash
uname -m
```

`x86_64` correspond à `linux/amd64`, `aarch64` à `linux/arm64`.

Construisez et publiez en une étape, en visant explicitement cette
architecture :

```bash
docker buildx build --platform linux/amd64 -t ghcr.io/VOTRE_COMPTE/portainer-watcher:1.0.0 --push watcher/
```

Pour couvrir les deux architectures d'un coup :
`--platform linux/amd64,linux/arm64`.

L'authentification se fait au préalable, avec un jeton GitHub disposant de la
portée `write:packages` :

```bash
docker login ghcr.io -u VOTRE_COMPTE
```

Sur le serveur, remplacez alors `build: .` par la référence publiée :

```yaml
services:
  portainer-watcher:
    image: ghcr.io/VOTRE_COMPTE/portainer-watcher:1.0.0
    restart: unless-stopped
    environment:
      # …identique
```

Si le paquet est privé, le serveur doit lui aussi s'authentifier
(`docker login ghcr.io`, jeton en `read:packages`).

Docker Hub fonctionne à l'identique, avec `docker login` sans hôte et des
références de la forme `VOTRE_COMPTE/portainer-watcher:1.0.0`.

## Vérifier que ça tourne

```bash
docker compose logs -f portainer-watcher
```

Vous devez voir `Connecté au flux d'événements de l'environnement 1.` Si le flux
est refusé, c'est le jeton Portainer ou l'identifiant d'environnement.

## Comment le service joint Portainer

Il rejoint le **réseau Docker où Portainer tourne déjà** et l'appelle par son
nom de conteneur, sur son port interne :

```
PORTAINER_URL=https://portainer:9443
```

C'est le port interne, pas celui publié sur l'hôte. Aucun port supplémentaire
n'est exposé, et le trafic ne quitte jamais la machine.

### Le certificat

Portainer génère par défaut un **certificat auto-signé**, que Node refuse —
comme le fait l'application mobile. Posez alors :

```
PORTAINER_INSECURE_TLS=1
```

Cette variable n'assouplit la vérification que **pour la connexion à
Portainer**. L'envoi vers Expo, qui lui traverse Internet, reste vérifié dans
tous les cas. C'est pourquoi le service n'utilise pas
`NODE_TLS_REJECT_UNAUTHORIZED`, qui désactiverait la vérification pour tout le
processus, envoi vers Expo compris.

Si votre instance dispose d'un vrai certificat — reverse proxy, ou
`tailscale serve` dans un tailnet — laissez la variable à `0`.

### Si Portainer est sur une autre machine

Le service doit alors joindre un nom que son conteneur ne sait pas forcément
résoudre : le MagicDNS de Tailscale, un DNS interne. Viser l'IP ne règle rien,
puisque le certificat est émis pour un **nom** et que TLS échouerait sur la
non-correspondance.

`extra_hosts` écrit la correspondance dans le `/etc/hosts` du conteneur : le nom
reste utilisé, donc le certificat reste valide, mais il est résolu sans DNS.

```yaml
extra_hosts:
  - "portainer.exemple.ts.net:100.x.y.z"
```

## Limites

- Un seul environnement par instance du service. Pour en surveiller plusieurs,
  lancez plusieurs conteneurs avec des `ENDPOINT_ID` différents.
- Les jetons d'appareil sont fournis par configuration, sans enregistrement
  automatique : c'est ce qui évite d'avoir à héberger un backend. Après une
  réinstallation de l'application, le jeton change et doit être recopié.
- Le service ne conserve rien : les événements survenus pendant une coupure sont
  perdus. Le flux Docker n'a pas de reprise sur curseur.
