# Records Tracker

A local-first journey tracker for Android and iOS (Expo SDK 58, React Native 0.88, TypeScript).
You create **record plans**: a name, one of 6 themes, and a trigger that opens a new **step**
on a schedule. Each step is filled from a template (mood, text, to-do list, number, yes/no,
photo), plus any notes, photos, videos and files. The journey shows as a game-style map,
cards or a list. The UI is in English and Arabic (RTL).

There is no account and no server. Everything lives in one folder the user owns.

## Run it

```bash
npm install --legacy-peer-deps
npx expo run:android      # or: npx expo run:ios (on a Mac)
```

This needs a **development build**, not Expo Go: it uses the folder picker, notifications and
other native modules. `npx expo start` then serves JS to the installed build.

Checks:

```bash
npm run typecheck
npx eslint src
npm test                  # trigger, streak, progress and journey logic
```

## Where the data lives

```
record-tracker/
  me.json                     profile: name + any custom fields
  me.backup.json
  <Plan name>/
    plan.json                 the whole plan: triggers, templates, steps, statuses, goals, events
    plan.backup.json
    attachments/<id>.<ext>    photos, videos and files added to steps
```

- **Android:** on first launch the user picks a folder (e.g. Documents) through the system
  folder picker; the app creates `record-tracker` inside it. Picking a folder that already has
  one (or the `record-tracker` folder itself) **restores** it. No storage permission is
  requested; the picker grants access to that folder only.
- **iOS:** the folder is the app's Documents directory, visible in the Files app under
  *On My iPhone › Records Tracker*. To restore, copy a `record-tracker` folder there and tap
  *Check again* in onboarding.
- **Backup:** copy the `record-tracker` folder to Google Drive / iCloud Drive. Every JSON file is
  written twice (backup first, then main), so an interrupted write never leaves both broken.

## Triggers

| Trigger | Opens a new step |
|---|---|
| Daily / Weekly / Monthly / Yearly | at the chosen time (monthly on day 29–31 clamps to the month's last day) |
| Every few hours | every N hours inside an active window, e.g. every 2 h from 08:00 to 22:00 (water) |
| Set times each day | at listed times, e.g. 08:00, 14:00, 20:00 (medicine, meals) |
| Chosen weekdays | e.g. Sun / Tue / Thu (gym days) |
| Every few days | every N days (check-ins, watering plants) |
| Manual | only when the user taps *Add step* (event-driven tracking) |

Plus an end rule (never / after N steps / on a date) and reminders (when a step opens, and an
optional daily nudge).

Changing a trigger adds a new **segment** starting now: existing steps keep their old trigger and
the step that is open keeps running until the new trigger's first boundary. Template edits work the
same way: a step that has been filled keeps a snapshot of the fields it was filled with.

## Code map

| Path | What |
|---|---|
| `src/model/` | Pure logic: types, period generation (`periods.ts`), progress/streaks (`progress.ts`), journey items, presets, labels |
| `src/storage/` | Folder access (`fs.ts`, SAF-aware) and plan/profile/attachment persistence (`repo.ts`) |
| `src/state/app.tsx` | App state: phase, root folder, profile, plans, language |
| `src/notifications.ts` | Local reminders built from each plan's current trigger |
| `src/themes/` | The 6 themes and the icon catalogue/search (Material Community Icons, ~7,400) |
| `src/components/` | Theme picker, trigger/template editors, journey views, island, goals drawer, pin menu |
| `src/app/` | Routes (Expo Router): onboarding, home, profile, new plan, plan journey, step, edit screens |

## App stores, notifications, widgets

**Google Play.** Fine as built. The app never asks for `MANAGE_EXTERNAL_STORAGE` ("All files
access"), which Play rejects for apps that are not file managers; it uses the system folder
picker instead. Photos/videos come through the system photo picker, so no
`READ_MEDIA_IMAGES/VIDEO` permission either (Play's photo/video policy). Those permissions are in
`android.blockedPermissions` in `app.json`. Data safety form: no data collected or shared.

**App Store.** Fine as built. iOS has no shared storage permission at all; the Documents folder plus
`UIFileSharingEnabled` / `LSSupportsOpeningDocumentsInPlace` is the approved way to expose user
files. Camera/photo usage strings are set. Privacy label: *Data Not Collected*. Caveat to tell
users: deleting the app on iOS deletes the folder unless they backed it up.

**Notifications.** Yes, fully local (`expo-notifications`), no server or push service. Daily,
weekly, monthly, yearly, set-times and every-few-hours triggers are repeating schedules;
every-few-days schedules the next 10 dates and tops up each time the app opens. iOS allows at most
64 pending notifications per app, so each plan is capped at 20.

**Widgets.** Possible, not built yet. SDK 58 ships `expo-widgets` (iOS home/lock screen widgets
and Live Activities; Android home-screen widgets opt-in), written with `@expo/ui`. It needs a
development build and an App Group to share data; the app would push a small snapshot (streak,
today's step progress) to the widget after each save.
