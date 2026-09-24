# Android APK Build

The game remains a static web app. Capacitor wraps the same local files for Android without changing game rules.

## Requirements

- Node.js and npm
- Android Studio with Android SDK and a device/emulator
- Java 17 or the JDK version required by the installed Android Gradle Plugin

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

## Open in Android Studio

```powershell
npm run mobile:sync
npm run mobile:open
```

Before publishing, create a release signing key, set the final application icon, test the back button, audio, fullscreen, offline launch, and multiple screen sizes. Do not commit keystores or passwords.
