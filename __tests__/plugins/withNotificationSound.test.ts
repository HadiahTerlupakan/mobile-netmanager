import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Plugin config Expo ditulis CommonJS, mengikuti plugin lain di repo ini.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withNotificationSound = require('../../plugins/withNotificationSound');

type DangerousMod = (config: unknown) => Promise<unknown>;
type ManifestMod = (config: unknown) => Promise<{
  modResults: { manifest: { application: { 'meta-data'?: { $: Record<string, string> }[] }[] } };
}>;

const META_CHANNEL = 'com.google.firebase.messaging.default_notification_channel_id';

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

  const jalankanModManifest = (metaAwal: { $: Record<string, string> }[] = []) => {
    const config = withNotificationSound({ name: 'RADPRO', slug: 'radpro' });
    const action = config.mods.android.manifest as ManifestMod;

    return action({
      ...config,
      modRequest: { projectRoot, platformProjectRoot: platformRoot },
      modResults: { manifest: { application: [{ 'meta-data': metaAwal }] } },
    });
  };

  it('mengarahkan notifikasi FCM latar belakang ke channel bernada lembut', async () => {
    // Sejak Android 8 suara ditentukan channel, bukan payload. Tanpa penunjuk
    // ini notifikasi saat aplikasi tertutup mendarat di channel cadangan FCM
    // dan tetap berbunyi bawaan perangkat.
    const hasil = await jalankanModManifest();

    const meta = hasil.modResults.manifest.application[0]['meta-data'] ?? [];
    expect(meta).toContainEqual({
      $: { 'android:name': META_CHANNEL, 'android:value': 'high-priority-soft' },
    });
  });

  it('memperbarui penunjuk yang sudah ada alih-alih menggandakannya', async () => {
    const hasil = await jalankanModManifest([
      { $: { 'android:name': META_CHANNEL, 'android:value': 'high-priority' } },
    ]);

    const meta = hasil.modResults.manifest.application[0]['meta-data'] ?? [];
    const cocok = meta.filter((m) => m.$['android:name'] === META_CHANNEL);
    expect(cocok).toHaveLength(1);
    expect(cocok[0].$['android:value']).toBe('high-priority-soft');
  });
});
