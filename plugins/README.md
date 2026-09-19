# iOS scene lifecycle

`with-ios-scene-lifecycle.cjs` registers one window scene and moves React Native window creation from application launch to `SceneDelegate`. iOS 27 rejects apps built with the iOS 27 SDK that still use the legacy application-only lifecycle.

The Swift template is appended to the generated AppDelegate so it is compiled without adding a separate Xcode source entry. Keep the AppDelegate's window reference for Expo modules, forward scene transitions to Expo subscribers, pass cold-start links through React Native launch options, and forward warm links to the existing AppDelegate handlers.

The plugin is idempotent and fails if Expo's legacy startup template changes. Review it when upgrading Expo rather than silently skipping the migration.

Verification:

- Run `bun run test`, `bun run lint`, and `bun run typecheck`.
- Regenerate iOS using Expo prebuild and inspect the resulting scene manifest and AppDelegate.
- Build Release against the current SDK and cold-launch on the matching iOS simulator/device; compilation and App Store validation alone do not prove startup works.
- Check custom-scheme cold/warm links, universal links, and foreground/background transitions before publishing a new binary.
