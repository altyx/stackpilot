# portainer-watcher

A monitoring service that listens to Portainer's Docker event stream and pushes
a notification to the StackPilot app when a container goes down.

It exists because **a mobile app cannot do this job**. iOS and Android suspend
apps in the background: they can neither poll a server continuously nor be
woken up on demand. A reliable alert has to come from the outside.

## What triggers an alert

| Docker event                | Alert                      |
| --------------------------- | -------------------------- |
| `die` with an exit code ≠ 0 | Exited abnormally (code N) |
| `health_status: unhealthy`  | Became unhealthy           |
| `oom`                       | Out of memory (OOM)        |
| `restart`                   | Restarted                  |

A `die` with code 0 is **deliberately ignored**: it is a requested stop,
typically from the app. Without this filter, every intentional action would
trigger an alert.

The same alert for the same container is not repeated within
`DEDUPE_SECONDS`, otherwise a container stuck in a restart loop would flood the
phone.

## Configuration

Start from [`.env.example`](.env.example):

```bash
cp .env.example .env
```

| Variable                 | Required | Purpose                                                      |
| ------------------------ | -------- | ------------------------------------------------------------ |
| `PORTAINER_NETWORK`      | yes      | Docker network the service joins                             |
| `PORTAINER_URL`          | yes      | Portainer URL as seen from that network, without `/api`      |
| `PORTAINER_TOKEN`        | yes      | Portainer access token (`ptr_…`)                             |
| `ENDPOINT_ID`            | yes      | Id of the environment to watch                               |
| `EXPO_PUSH_TOKENS`       | yes      | Device tokens, comma-separated                               |
| `PORTAINER_INSECURE_TLS` | no       | Accepts the stream's self-signed certificate, `0` by default |
| `IGNORE_CONTAINERS`      | no       | Container names to ignore, comma-separated                   |
| `DEDUPE_SECONDS`         | no       | De-duplication window, 120 by default                        |

### Finding `ENDPOINT_ID`

It is Portainer's id for the **environment**: the one the app's _Environments_
list shows, and the one Portainer puts in its URL. Often `1`, but not always —
the counter moves on when an environment is removed and added again.

```bash
curl -sk -H "X-API-Key: ptr_xxx" https://YOUR_PORTAINER/api/endpoints | jq '.[] | {Id, Name}'
```

### Finding `PORTAINER_NETWORK`

```bash
docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' portainer
```

If the answer is `bridge`, Portainer runs on the default network, which **does
not resolve container names**. Attach it to a named network, or target its
port published on the host.

### Finding the device token

In the app: **Settings → Alerts for your containers → Allow notifications**,
then _Copy token_.

## No volume needed

The service reads and writes no file: no npm dependency, no database, no state
on disk. All its configuration goes through environment variables, and its
de-duplication window lives in memory. A restart simply starts again with an
empty window.

`PORTAINER_TOKEN` stays readable through `docker inspect`. To keep it out of
your shell history, put it in a `.env` file next to `compose.yaml` — Compose
loads it automatically, and that file must not be committed.

## Deployment

### Option 1 — build on the server (simplest)

Copy the `watcher/` folder to the server, then:

```bash
cp .env.example .env   # then fill it in
docker compose up -d --build
```

No registry, no architecture question: the image is built where it runs.

### Option 2 — as a Portainer stack

In Portainer: **Stacks → Add stack → Web editor**, paste the content of
`compose.yaml`, replacing `build: .` with an already published image, and fill
in the variables under _Environment variables_. The service then shows up like
any other stack.

### Option 3 — publish to a registry

Mind the architecture: an image built on an Apple Silicon Mac is `arm64` and
**will not start** on an x86 server. Check the target first:

```bash
uname -m
```

`x86_64` matches `linux/amd64`, `aarch64` matches `linux/arm64`.

Build and publish in one step, explicitly targeting that architecture:

```bash
docker buildx build --platform linux/amd64 -t ghcr.io/YOUR_ACCOUNT/portainer-watcher:1.0.0 --push watcher/
```

To cover both architectures at once: `--platform linux/amd64,linux/arm64`.

Authenticate beforehand, with a GitHub token that has the `write:packages`
scope:

```bash
docker login ghcr.io -u YOUR_ACCOUNT
```

On the server, then replace `build: .` with the published reference:

```yaml
services:
  portainer-watcher:
    image: ghcr.io/YOUR_ACCOUNT/portainer-watcher:1.0.0
    restart: unless-stopped
    environment:
      # …unchanged
```

If the package is private, the server must authenticate too
(`docker login ghcr.io`, token with `read:packages`).

Docker Hub works the same way, with `docker login` without a host and
references of the form `YOUR_ACCOUNT/portainer-watcher:1.0.0`.

## Checking that it runs

```bash
docker compose logs -f portainer-watcher
```

You should see `Connected to the event stream of environment 1.` If the stream
is refused, check the Portainer token or the environment id.

## How the service reaches Portainer

It joins the **Docker network Portainer already runs on** and calls it by its
container name, on its internal port:

```
PORTAINER_URL=https://portainer:9443
```

That is the internal port, not the one published on the host. No extra port is
exposed, and the traffic never leaves the machine.

### The certificate

By default Portainer generates a **self-signed certificate**, which Node
rejects — as the mobile app does. In that case, set:

```
PORTAINER_INSECURE_TLS=1
```

This variable only relaxes verification **for the connection to Portainer**.
The push to Expo, which crosses the Internet, is always verified. That is why
the service does not use `NODE_TLS_REJECT_UNAUTHORIZED`, which would disable
verification for the whole process, the push to Expo included.

If your instance has a real certificate — reverse proxy, or `tailscale serve`
in a tailnet — keep the variable at `0`.

### If Portainer runs on another machine

The service then has to reach a name its container may not be able to resolve:
Tailscale's MagicDNS, an internal DNS. Targeting the IP does not help, since
the certificate is issued for a **name** and TLS would fail on the mismatch.

`extra_hosts` writes the mapping into the container's `/etc/hosts`: the name is
still used, so the certificate stays valid, but it is resolved without DNS.

```yaml
extra_hosts:
  - 'portainer.example.ts.net:100.x.y.z'
```

## Limitations

- One environment per service instance. To watch several, run several
  containers with different `ENDPOINT_ID` values.
- Device tokens come from the configuration, with no automatic registration:
  that is what avoids hosting a backend. After the app is reinstalled, its
  token changes and must be copied again.
- The service keeps nothing: events that occur during an outage are lost. The
  Docker stream cannot resume from a cursor.
