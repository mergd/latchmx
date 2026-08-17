# Latch

Personal ButterflyMX client. First cut: one slider per door. Splash unlock is later.

```bash
bun install
bun run web
```

Then `i` for the iOS simulator. Demo doors work with no credentials.

Live unlock needs ButterflyMX OAuth in `.env` (see `.env.example`). Production credentials are partner-gated; sandbox will not open your real building.

## Web (Cloudflare)

Static Expo export + a Worker that proxies `/api/bmx` and `/api/accounts` (and injects the OAuth client secret).

```bash
bun run deploy
```

Pushes to `main` deploy via GitHub Actions. Local `bun run web` still uses Expo’s server routes.
