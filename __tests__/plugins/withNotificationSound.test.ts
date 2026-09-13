import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Plugin config Expo ditulis CommonJS, mengikuti plugin lain di repo ini.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withNotificationSound = require('../../plugins/withNotificationSound');

type DangerousMod = (config: unknown) => Promise<unknown>;

/**
 * `android/` dan `ios/` tidak ikut version control — keduanya diregenerasi tiap
 * build, jadi berkas suara hanya bertahan kalau plugin ini menyalinnya saat
 * prebuild. Kalau penyalinan diam-diam gagal, aplikasi jatuh kembali ke bunyi
 * bawaan perangkat tanpa ada yang sadar.
 */
describe('withNotificationSound', () => {
  let projectRoot: string;
  let platformRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'notif-sound-'));
    platformRoot = path.join(projectRoot, 'android');
    fs.mkdirSync(path.join(projectRoot, 'assets', 'sounds'), { recursive: true });
    fs.mkdirSync(platformRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  const tulisAset = (isi: string) =>
    fs.writeFileSync(
      path.join(projectRoot, 'assets', 'sounds', 'notif_soft.wav'),
      isi
    );

  const jalankanModAndroid = () => {
    const config = withNotificationSound({ name: 'RADPRO', slug: 'radpro' });
    const action = config.mods.android.dangerous as DangerousMod;

    return action({
      ...config,
      modRequest: { projectRoot, platformProjectRoot: platformRoot },
      modResults: {},
    });
  };

  it('menyalin berkas suara ke res/raw Android', async () => {
    tulisAset('RIFF-isi-nada');

    await jalankanModAndroid();

    const tujuan = path.join(
      platformRoot,
      'app',
      'src',
      'main',
      'res',
      'raw',
      'notif_soft.wav'
    );
    expect(fs.existsSync(tujuan)).toBe(true);
    expect(fs.readFileSync(tujuan, 'utf8')).toBe('RIFF-isi-nada');
  });

  it('gagal keras ketika aset suaranya hilang', async () => {
    // Bukan peringatan: build tanpa nada harus berhenti, bukan diam-diam
    // menghasilkan aplikasi yang berbunyi bawaan.
    await expect(jalankanModAndroid()).rejects.toThrow(
      'Berkas nada tidak ditemukan'
    );
  });

  it('menyebut skrip pembuat aset di pesan kegagalannya', async () => {
    await expect(jalankanModAndroid()).rejects.toThrow(
      'scripts/generate-notification-sound.py'
    );
  });
});

/**
 * `@react-native-firebase/messaging` sudah mendeklarasikan
 * `default_notification_channel_id` di manifest-nya sendiri, dengan nilai dari
 * `firebase.json`. Menambahkan meta-data kedua lewat config plugin membuat
 * manifest merger menolak build — itu yang menggagalkan build EAS #43.
 *
 * Jadi channel diatur di satu tempat saja, dan tes ini menjaga agar nilainya
 * tidak melenceng dari channel yang benar-benar dibuat aplikasi.
 */
describe('channel notifikasi Android', () => {
  const akarRepo = path.join(__dirname, '..', '..');

  const bacaChannelFirebaseJson = (): string =>
    JSON.parse(fs.readFileSync(path.join(akarRepo, 'firebase.json'), 'utf8'))[
      'react-native'
    ].messaging_android_notification_channel_id;

  it('sama persis dengan channel yang dibuat aplikasi', () => {
    // Kalau keduanya melenceng, notifikasi latar belakang mendarat di channel
    // yang tidak pernah dibuat dan kembali berbunyi bawaan perangkat.
    const sumber = fs.readFileSync(
      path.join(akarRepo, 'src', 'services', 'ForegroundNotificationService.ts'),
      'utf8'
    );

    expect(sumber).toContain(
      `const FOREGROUND_NOTIFICATION_CHANNEL_ID = '${bacaChannelFirebaseJson()}'`
    );
  });
});
