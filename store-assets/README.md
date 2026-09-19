# LatchMX store artwork

Store-ready exports live in `final/`:

- `app-store/`: 1290 x 2796 PNG screenshots
- `play-store/`: 1080 x 1920 PNG screenshots and a 1024 x 500 feature graphic

The app UI in every composition comes from the existing clean demo screenshots in
`source/`. Grok-generated architectural images in `grok/output/` are decorative
backgrounds only; the prompts are checked in beside them.

To rebuild the final compositions:

```sh
node store-assets/render-store-assets.mjs
```

To regenerate one background with an API key supplied through the environment:

```sh
store-assets/grok/generate-one.sh entrance
```
