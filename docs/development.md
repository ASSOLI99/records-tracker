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

The tests cover trigger periods, trigger changes, end rules, streaks, progress and journey
ordering (`src/model/__tests__`).

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
