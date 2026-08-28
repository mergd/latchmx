# LatchMX

Personal ButterflyMX client. First cut: one slider per door. Splash unlock is later.

```bash
bun install
bun run web
```

Then `i` for the iOS simulator.

Sign in with ButterflyMX (OAuth code) to load real doors. Keep `BMX_CLIENT_SECRET` in `.env` for local `bun run web` and on the Worker — never in the iOS binary. Native token exchange goes through `BMX_PROXY_ORIGIN` (default `https://bmx.fldr.zip`).

## Demo and app review

Select **Try demo** on the sign-in screen. No account is required. The original
Marlowe demo building supports simulated unlocks, arranging and hiding doors,
layout reset, and local guest invites with a duration, label, inviter, and note.

On Keys, create an invite and select **Preview invite** to try the guest flow.
Use **Back to invites** to copy or revoke it. Demo links only work on the device
and browser where they were created. They expire like real invites but never
grant building access. They do not use the Worker or ButterflyMX APIs.

**Exit demo** returns to the real session. Demo layout, account, and invite state
are separate from resident credentials and preferences. Demo mode persists
across app restarts and browser reloads.

Run `bun run test` for the store, session-isolation, layout, and native-control
tests. Each native mock suite runs in its own process.

Draft review instructions, not yet submitted:

> On the sign-in screen, tap Try demo. No credentials are needed for this mode.
> Tap a door to simulate unlocking, or use Arrange sections to reorder and hide
> doors. Open Keys to create an invite, then Preview invite to see the guest
> experience. Back to invites lets you copy or revoke the demo invite. Demo
> links work only on the same device, and no real doors are operated. Live
> building access requires an existing authorized ButterflyMX resident account.

## Web (Cloudflare)

Static Expo export + a Worker that proxies `/api/bmx` and `/api/accounts` (and injects the OAuth client secret).

```bash
bun run deploy
```

Pushes to `main` deploy via GitHub Actions. Local `bun run web` still uses Expo’s server routes.
