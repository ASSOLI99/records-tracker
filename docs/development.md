# Records Tracker — Development notes

**English** · [العربية](development.ar.md) · [← Back to README](../README.md)

## Run

```bash
npm install --legacy-peer-deps
```

```bash
npx expo run:android
```

This needs a **development build**, not Expo Go: the app uses the folder picker, notifications,
the Cairo font and other native modules. For iOS, run `npx expo run:ios` on a Mac.

## Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

The tests cover trigger periods, trigger changes, end rules, streaks, progress, journey ordering,
backup archives and the widget (`src/model/__tests__`), plus backup export and restore against an
in-memory file system (`src/storage/__tests__`).

## Releases

Every tag that starts with `v` builds a release APK on GitHub Actions
([`.github/workflows/android.yml`](../.github/workflows/android.yml)) and publishes it to
[GitHub Releases](https://github.com/ASSOLI99/records-tracker/releases).

1. Bump `expo.version` and `expo.android.versionCode` in `app.json`, and `version` in `package.json`.
2. Merge to `main`, then tag and push:

```bash
git tag v1.1.0
```

```bash
git push origin v1.1.0
```

Pull requests and pushes that change native config build the same APK as a workflow artifact,
without publishing a release.

**Signing.** Without secrets the APK is signed with the debug key from the generated project. That
is fine for sideloading, and every CI build uses the same key, so updates install over each other.
For a release key, add these repository secrets:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the `.jks` file, base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | the key alias |
| `ANDROID_KEY_PASSWORD` | the key password |

Switching from the debug key to a release key means people must uninstall once (after a backup),
because Android only installs updates signed with the same key.

## Widget

The Android home-screen widget is built with [`expo-widgets`](https://docs.expo.dev/versions/v58.0.0/sdk/widgets/)
and `@expo/ui` (Jetpack Compose components rendered through Glance).

- `src/widgets/TodayWidget.tsx` holds the layout. The `'widget'` directive turns it into a string
  that runs in the widget's own JS runtime, so inside it use only its arguments, `@expo/ui`
  components and modifiers, and plain JavaScript. It is also bundled alone at build time, so it must
  not import app modules.
- `src/model/widget.ts` decides what the widget shows (unit-tested), and `src/widgets/sync.ts`
  pushes it when plans change and when the app goes to the background.
- `plugins/with-android-widgets.js` applies only the Android half of the expo-widgets config plugin.
  The iOS half would add a widget extension and an App Group, which need a SwiftUI layout and Apple
  signing first.

## Build a standalone APK locally (Windows)

```bash
npx expo prebuild --platform android
```

```bash
cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a -Pexpo.useLegacyPackaging=true
```

The APK is written to `android/app/build/outputs/apk/release/`.

- **Windows path limit:** React Native's native (CMake) build breaks on Windows paths longer than
  260 characters.
  1. Build from a short folder such as `C:\rt`.
  2. If the release build still fails, add
     `externalNativeBuild { cmake { buildStagingDirectory = file("C:/c") } }` inside `android { }`
     in `android/app/build.gradle`.

  `android/` is generated, so re-add the line after each prebuild.
- `-Pexpo.useLegacyPackaging=true` compresses the native libraries (about 31 MB down to 17 MB for
  an arm64 APK).
- A local release build is signed with the debug key. That's fine for sideloading; the Play Store
  needs an upload key and an `.aab` build.

## Code map

| Path | What |
|---|---|
| `src/model/` | Pure logic: types, trigger periods (`periods.ts`), progress and streaks (`progress.ts`), journey items, presets, labels |
| `src/storage/` | Folder access (`fs.ts`, aware of Android's folder-picker URIs) and plan, profile and attachment persistence (`repo.ts`) |
| `src/state/app.tsx` | App state: setup phase, root folder, profile, plans, language |
| `src/i18n/` | English and Arabic strings, bidi isolation, date formatting |
| `src/ui/` | UI kit, theming, `useDir()` direction, sheets and dialogs, pickers |
| `src/themes/` | The 6 themes and the icon catalogue and search |
| `src/components/` | Theme picker, trigger and template editors, journey views, status island, goals drawer, pin menu |
| `src/app/` | Routes (Expo Router): onboarding, home, about me, new plan, journey, step, edit screens |
| `src/widgets/` | The Android home-screen widget layout and the code that keeps it updated |
| `plugins/` | Local config plugins (Android-only widgets) |
| `src/notifications.ts` | Local reminders built from each plan's current trigger |
| `assets/fonts/` | Cairo, 6 weights (SIL Open Font License, `Cairo-OFL.txt`) |

## Design decisions

- **Direction follows the language, not the native RTL flag.** Screens and sheets set Yoga's
  `direction` from `useDir()`, so switching language applies at once. The native flag is still
  updated so system UI matches after the next launch.
- **Bidi-safe strings.** Inserted values are wrapped in Unicode isolates, and Arabic sentences with
  inserted values start with a right-to-left mark.
- **Android storage uses the Storage Access Framework.** Writes there don't reliably truncate
  existing files, and files can't be renamed, so JSON is always written to fresh files: backup first,
  then main.
- **Trigger changes add a segment from "now".** Template changes add a version. Filled steps keep a
  snapshot of their fields.

## App stores, notifications, widgets

- **Google Play:** fine as built. The app never requests `MANAGE_EXTERNAL_STORAGE` or
  `READ_MEDIA_*`. It uses the system folder picker and photo picker, and those permissions are
  blocked in `app.json`. The release manifest has no storage, media or overlay permissions.
  Data-safety form: no data collected or shared.
- **App Store:** fine as built. iOS has no storage permission at all; the Documents folder exposed
  in Files is the supported approach. Camera and photo usage strings are set. Privacy label:
  *Data Not Collected*. There's no login, so review can't be blocked by a login problem.
- **Notifications:** yes, fully local. Each plan is capped at 20 scheduled notifications, because
  iOS allows 64 per app.
- **Widgets:** possible but not built yet. SDK 58's `expo-widgets` covers iOS home and lock-screen
  widgets and Android home-screen widgets. It needs a development build and an App Group; the app
  would push the streak and today's progress to the widget.
