const {
  IOSConfig,
  withAndroidManifest,
  withDangerousMod,
  withXcodeProject,
} = require('@expo/config-plugins');
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
 * Plugin ini juga mengarahkan notifikasi FCM latar belakang ke channel yang
 * membawa nada tersebut. Sejak Android 8, suara ditentukan oleh channel, bukan
 * oleh payload — tanpa penunjuk ini notifikasi saat aplikasi tertutup mendarat
 * di channel cadangan bikinan FCM dan tetap berbunyi bawaan perangkat.
 */

const SOUND_FILE_NAME = 'notif_soft.wav';
const NOTIFICATION_CHANNEL_ID = 'high-priority-soft';
const DEFAULT_CHANNEL_META = 'com.google.firebase.messaging.default_notification_channel_id';
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

function withAndroidDefaultChannel(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (!application) return config;

    application['meta-data'] = application['meta-data'] ?? [];
    const existing = application['meta-data'].find(
      (item) => item.$?.['android:name'] === DEFAULT_CHANNEL_META,
    );

    if (existing) {
      existing.$['android:value'] = NOTIFICATION_CHANNEL_ID;
      return config;
    }

    application['meta-data'].push({
      $: {
        'android:name': DEFAULT_CHANNEL_META,
        'android:value': NOTIFICATION_CHANNEL_ID,
      },
    });

    return config;
  });
}

module.exports = function withNotificationSound(config) {
  config = withAndroidNotificationSound(config);
  config = withAndroidDefaultChannel(config);
  config = withIosNotificationSound(config);

  return config;
};
