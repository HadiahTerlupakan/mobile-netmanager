# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Environment Management

Project ini mendukung 3 environment (Local, Staging, Production) yang diatur melalui variabel `EXPO_PUBLIC_APP_VARIANT`.

### Quick Android Commands

Gunakan perintah ini untuk menjalankan development build Android sesuai environment:

- **Development / Local**
  ```bash
  npm run android:dev
  ```
- **Staging**
  ```bash
  npm run android:staging
  ```
- **Production**
  ```bash
  npm run android:prod
  ```

### 1. Menjalankan di Emulator/HP (Development)

Secara default, jika Anda menjalankan `npx expo start`, aplikasi akan menggunakan **Local Dev** (IP komputer Anda).

Untuk mengetes environment lain tanpa build:

- **Local Development**:
  ```bash
  npx expo start
  ```
- **Staging (Beta Test Server)**:
  ```bash
  EXPO_PUBLIC_APP_VARIANT=staging npx expo start
  ```
- **Production Server**:
  ```bash
  EXPO_PUBLIC_APP_VARIANT=production npx expo start
  ```

### 2. Melakukan Build (EAS)

Environment akan otomatis dipilih berdasarkan profile build:

- **Build Staging (Preview)**:
  ```bash
  eas build --profile preview
  ```
- **Build Production**:
  ```bash
  eas build --profile production
  ```

### 3. Build APK dengan build_apk.sh

Anda dapat melakukan build APK untuk environment tertentu dengan script `build_apk.sh`. Script ini akan otomatis menyesuaikan versi build dan nama file output.

- **Build Production (Default):**
  ```bash
  ./build_apk.sh
  # atau
  ./build_apk.sh production
  ```

- **Build Staging:**
  ```bash
  ./build_apk.sh staging
  ```

- **Build Development:**
  ```bash
  ./build_apk.sh development
  ```

### 4. Visual Environment Indicator

Untuk menghindari kesalahan penggunaan environment, aplikasi akan menampilkan badge di pojok kanan bawah:
- **Badge Biru (LOCAL DEV)**: Muncul saat menjalankan di local development.
- **Badge Oranye (BETA / STAGING)**: Muncul saat menggunakan variant staging.
- **Tanpa Badge**: Saat aplikasi berjalan di environment production.

---

## Development Build (Native)

Since this app uses native modules (sqlite, netinfo, camera), you must use a **Development Build**, not Expo Go.

### Prerequisities

1.  **Android Studio** installed & SDK set up.
2.  **Java JDK 17** (or 11) installed.
3.  `local.properties` file exists in `android/` with `sdk.dir`.

### Rebuild Command

To compile and install the native android app (Debug mode):

```bash
npx expo run:android
```

Atau gunakan script variant agar konsisten dengan `EXPO_PUBLIC_APP_VARIANT`:

```bash
npm run android:dev
npm run android:staging
npm run android:prod
```

This command will:
1.  Run `prebuild` to generate native android folders.
2.  Compile the Gradle project.
3.  Install the `.apk` onto your connected emulator or device.
4.  Launch the metro bundler.

## Internal Technical Guides

| Guide | Tujuan | Lokasi |
| --- | --- | --- |
| Attendance Face Tuning Guide | Panduan tuning deteksi wajah absensi untuk device lapangan (agar tidak terlalu ketat tapi tetap aman). | `plans/ATTENDANCE_FACE_TUNING_GUIDE.md` |

Tambahkan guide baru ke tabel ini agar dokumentasi teknis internal tetap terpusat.

## How to Share APK (Build for Friend)

To generate a standalone APK file that you can send to a friend (does not require development server):

```bash
ANDROID_HOME=/Users/rohadimraja/Library/Android/sdk npx eas-cli build -p android --profile preview --local --output=./netman.apk
```

> **Note:** We need to specify `ANDROID_HOME` because the local build process might ignore your `local.properties` file.

This command will:
1.  Bundle the Javascript code inside the app.
2.  Generate a `netman.apk` file in the current folder.
3.  You can send this file via WhatsApp/Telegram to your friend.
