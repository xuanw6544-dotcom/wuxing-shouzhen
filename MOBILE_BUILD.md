# Android APK Build

The game remains a static web app. Capacitor wraps the same local files for Android without changing game rules.

## Requirements

- Node.js and npm
- Android Studio with Android SDK and a device/emulator
- JDK 21, as required by the current Capacitor Android project

## First setup

```powershell
npm install
npx cap add android
```

## Build a debug APK

```powershell
npm run mobile:build
```

The APK is generated under `android/app/build/outputs/apk/debug/`.
Version 1.1.0 uses versionCode 2. `configure-android.cjs` applies these values.
Only runtime files are copied into `www`; local tools, caches and other projects are excluded.
GitHub Pages builds and deploys the same `www` runtime on pushes to `main`.

For a local web preview after preparing assets:

```powershell
node scripts/serve-game.cjs
```

The preview prints a localhost URL, normally `http://127.0.0.1:4173/`.

## Open in Android Studio

```powershell
npm run mobile:sync
npm run mobile:open
```

Before publishing, create a release signing key, set the final application icon, test the back button, audio, fullscreen, offline launch, and multiple screen sizes. Do not commit keystores or passwords.
