# Demo Portainer

A fake Portainer API serving a fictional homelab: 20 containers in 7 stacks,
images with available updates, unused volumes, a second and third environment.
It answers every route StackPilot calls, with the shapes of
[`src/api/types.ts`](../src/api/types.ts), and nothing else.

It serves two purposes:

- the store screenshots in [`docs/screenshot`](../docs/screenshot);
- the account App Store and Google Play reviewers sign in with.

## What it does

- **Sign-in** by username and password or by access token (see below). Every
  other request without valid credentials gets a 401, like a real instance.
- **Actions** really change the demo, in memory: start, stop, restart, pause,
  kill, delete a container, delete or prune images and volumes, edit a stack's
  variables, redeploy, recreate. Docker's refusals are reproduced (deleting an
  image or volume in use, a running container without force).
- **Reset**: everything comes back every `DEMO_RESET_MINUTES`, so the next
  reviewer finds the homelab whole. A restart resets it too.

Only the `homelab` environment has content; the two others show their counts
but are empty.

## Configuration

| Variable             | Default               | Purpose                        |
| -------------------- | --------------------- | ------------------------------ |
| `PORT`               | `9000`                | Listening port                 |
| `DEMO_USERNAME`      | `demo`                | Username for password sign-in  |
| `DEMO_PASSWORD`      | `stackpilot-demo`     | Password for password sign-in  |
| `DEMO_API_KEY`       | `ptr_stackpilot-demo` | Access token for token sign-in |
| `DEMO_RESET_MINUTES` | `30`                  | Delay between two state resets |

The defaults are public: override them on a hosted instance if you'd rather
not have anyone browse it. The data is fictional either way.

## Running it

Locally, against a simulator or a debug build:

```bash
node demo/server.mjs
```

With Docker:

```bash
docker build -t stackpilot-demo demo
docker run -d --name stackpilot-demo -p 9000:9000 \
  -e DEMO_PASSWORD=change-me -e DEMO_API_KEY=ptr_change-me stackpilot-demo
```

## Hosting it for store review

The reviewers run the **release** build, which only talks HTTPS with a
certificate the system trusts: cleartext HTTP is blocked on Android and by App
Transport Security on iOS, and a self-signed certificate is rejected. The demo
itself speaks plain HTTP, so put it behind something that terminates TLS with a
public certificate, for instance:

- a VPS behind Caddy or Traefik (Let's Encrypt), e.g. `demo.example.com`;
- a Cloudflare Tunnel to the container;
- a container platform that provides HTTPS (Fly.io, Render, Railway…).

The instance must stay up for the whole review, and for later updates: keep it
running rather than starting it per submission.

Then fill in the store forms:

- **App Store Connect** → App Review Information: tick _Sign-in required_,
  enter the username and password, and put the instance URL in the notes
  ("Enter https://demo.example.com as the Portainer URL, then sign in with the
  credentials above").
- **Google Play Console** → App content → App access: _All or some
  functionality is restricted_, add instructions with the URL, the username
  and the password.
