# Latch

Personal ButterflyMX client. First cut: one slider per door. Splash unlock is later.

```bash
bun install
bun run web
```

Then `i` for the iOS simulator.

Sign in with ButterflyMX (OAuth code) to load real doors. Keep `BMX_CLIENT_SECRET` in `.env` for local `bun run web` and on the Worker — never in the iOS binary. Native token exchange goes through `BMX_PROXY_ORIGIN` (default `https://bmx.fldr.zip`).

## Web (Cloudflare)

Static Expo export + a Worker that proxies `/api/bmx` and `/api/accounts` (and injects the OAuth client secret).

```bash
bun run deploy
```

Pushes to `main` deploy via GitHub Actions. Local `bun run web` still uses Expo’s server routes.
