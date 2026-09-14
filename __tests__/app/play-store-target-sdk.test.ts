import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Sejak 31 Agustus 2026, Google Play menolak setiap update aplikasi yang
 * target-nya di bawah Android 16 (API 36). Penolakannya terjadi saat unggah,
 * bukan saat build — jadi tanpa penjaga ini kesalahannya baru ketahuan setelah
 * satu siklus build EAS terbuang:
 *
 *     Google Api Error: Invalid request - Target SDK of artifact is too low
 *
 * Referensi: https://developer.android.com/google/play/requirements/target-sdk
 */

const PLAY_STORE_MINIMUM_TARGET_SDK = 36;

function readBuildProperties(): Record<string, number | string> {
  const appJson = JSON.parse(
    readFileSync(join(__dirname, '../../app.json'), 'utf8')
  );

  const plugin = appJson.expo.plugins.find(
    (entry: unknown) =>
      Array.isArray(entry) && entry[0] === 'expo-build-properties'
  );

  expect(plugin).toBeDefined();
  return plugin[1].android;
}

describe('syarat target API Google Play', () => {
  it('target minimal Android 16 (API 36)', () => {
    const android = readBuildProperties();

    expect(android.targetSdkVersion).toBeGreaterThanOrEqual(
      PLAY_STORE_MINIMUM_TARGET_SDK
    );
  });

  it('compile tidak lebih rendah dari target', () => {
    // Kompilasi di bawah target membuat API baru tidak terlihat kompiler
    // padahal runtime menjalankannya dengan perilaku Android 16.
    const android = readBuildProperties();

    expect(Number(android.compileSdkVersion)).toBeGreaterThanOrEqual(
      Number(android.targetSdkVersion)
    );
  });

  it('build tools sejalan dengan compile SDK', () => {
    const android = readBuildProperties();
    const major = String(android.buildToolsVersion).split('.')[0];

    expect(Number(major)).toBeGreaterThanOrEqual(
      Number(android.compileSdkVersion)
    );
  });
});
