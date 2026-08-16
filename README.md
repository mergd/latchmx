# Latch

Personal ButterflyMX client. First cut: one slider per door. Splash unlock is later.

```bash
bun install
bun run web
```

Then `i` for the iOS simulator. Demo doors work with no credentials.

Live unlock needs ButterflyMX OAuth in `.env` (see `.env.example`). Production credentials are partner-gated; sandbox will not open your real building.
