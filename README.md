# Latch

Personal ButterflyMX client. First cut: one slider per door. Splash unlock is later.

```bash
bun install
bun run web
```

Then `i` for the iOS simulator.

Sign in with ButterflyMX (OAuth code) to load real doors. Local `.env` only needs `BMX_CLIENT_ID` for `bun run web`; production injects the client secret on the Worker.

## Web (Cloudflare)

Static Expo export + a Worker that proxies `/api/bmx` and `/api/accounts` (and injects the OAuth client secret).

```bash
bun run deploy
```

Pushes to `main` deploy via GitHub Actions. Local `bun run web` still uses Expo’s server routes.
