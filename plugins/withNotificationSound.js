const { IOSConfig, withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Kirim nada notifikasi kustom ke kedua platform saat prebuild.
 *
 * `android/` dan `ios/` tidak ikut version control — keduanya diregenerasi
 * setiap build, jadi menaruh berkas suara langsung di sana akan hilang. Satu-
 * satunya tempat yang bertahan adalah `assets/`, dan plugin ini yang
 * menyalinnya ke lokasi native yang benar.
 *
 * Nama berkasnya harus cocok dengan yang dirujuk kode dan payload FCM:
 * - Android: `res/raw/notif_soft.wav`, dirujuk tanpa ekstensi (`notif_soft`)
 * - iOS: berkas di bundle utama, dirujuk lengkap (`notif_soft.wav`)
 *
 * Channel untuk notifikasi latar belakang TIDAK diatur di sini.
 * `@react-native-firebase/messaging` sudah mendeklarasikan
 * `default_notification_channel_id` di manifest-nya dan mengambil nilainya dari
 * `firebase.json`. Menambahkan meta-data kedua membuat manifest merger menolak
 * build, jadi channel diatur di `firebase.json` saja.
 */

const SOUND_FILE_NAME = 'notif_soft.wav';
const SOURCE_RELATIVE_PATH = path.join('assets', 'sounds', SOUND_FILE_NAME);

function readSoundFile(projectRoot) {
  const source = path.join(projectRoot, SOURCE_RELATIVE_PATH);

  if (!fs.existsSync(source)) {
    // Dibuat gagal keras: build yang diam-diam kehilangan nadanya akan jatuh
    // kembali ke bunyi bawaan perangkat tanpa ada yang sadar.
    throw new Error(
      `[withNotificationSound] Berkas nada tidak ditemukan di ${SOURCE_RELATIVE_PATH}. ` +
        'Jalankan `python3 scripts/generate-notification-sound.py` untuk membuatnya.',
    );
  }

  return fs.readFileSync(source);
}

function withAndroidNotificationSound(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const contents = readSoundFile(config.modRequest.projectRoot);
      const rawDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'raw',
      );

      fs.mkdirSync(rawDir, { recursive: true });
      fs.writeFileSync(path.join(rawDir, SOUND_FILE_NAME), contents);

      return config;
    },
  ]);
}

function withIosNotificationSound(config) {
  return withXcodeProject(config, (config) => {
    const contents = readSoundFile(config.modRequest.projectRoot);
    const projectName = config.modRequest.projectName;
    if (!projectName) return config;

    const targetDir = path.join(config.modRequest.platformProjectRoot, projectName);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, SOUND_FILE_NAME), contents);

    // Menyalin berkas saja tidak cukup: tanpa terdaftar di resources build
    // phase, ia tidak ikut masuk ke bundle aplikasi.
    const relativePath = `${projectName}/${SOUND_FILE_NAME}`;
    const group = IOSConfig.XcodeUtils.ensureGroupRecursively(
      config.modResults,
      projectName,
    );
    const alreadyLinked = (group?.children ?? []).some(
      (child) => child.comment === SOUND_FILE_NAME,
    );

    if (!alreadyLinked) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: relativePath,
        groupName: projectName,
        project: config.modResults,
        isBuildFile: true,
      });
    }

    return config;
  });
}

module.exports = function withNotificationSound(config) {
  config = withAndroidNotificationSound(config);
  config = withIosNotificationSound(config);

  return config;
};
