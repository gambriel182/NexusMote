# NexusMote Mobile

## Development

```bash
cd mobile
npm install
npm start
```

## Build Android APK (Production)

### Prerequisites
- Android SDK + build tools
- JDK 17+
- Expo CLI (`npm i -g expo-cli`)

### Build via EAS (Recommended - no local Android SDK needed)
```bash
cd mobile
npm i -g eas-cli
eas build --platform android --profile production
```

### Build Locally
```bash
cd mobile
npx expo prebuild
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Build iOS (Mac required)
```bash
eas build --platform ios --profile production
```

## Environment Variables
Create `.env` in mobile/ (optional — defaults are sensible):
```
EXPO_PUBLIC_DEFAULT_PORT=8080
```

No token needs to be configured on the mobile app. The desktop server generates a random token per session and encodes it in the QR code. When scanning the QR code, the token is automatically imported. When connecting manually, the token is auto-received from the server via `server:hello`.