import { describe, expect, it } from '@jest/globals';

import { resolveAppVersion } from '@/constants/appVersion';

/**
 * Aplikasi melaporkan versinya sendiri ke `/api/mobile/app-version/check`, dan
 * server membandingkannya dengan `app_releases` untuk memutuskan apakah ada
 * update. Kalau angkanya salah, seluruh mekanisme update ikut salah.
 *
 * Sebelumnya versionCode diambil dari `app.json`, yang dipatok manual dan tidak
 * pernah ikut naik: EAS memakai `appVersionSource: "remote"` dengan
 * autoIncrement, jadi build 45 tetap melaporkan dirinya 42. Akibatnya setiap
 * aplikasi akan mengira dirinya usang selamanya begitu `app_releases`
 * dinaikkan — termasuk yang baru saja update.
 *
 * `Constants.platform` juga tidak bisa diandalkan: ia bagian manifest klasik
 * yang sudah tidak ada di build Expo SDK 54.
 */
describe('resolveAppVersion', () => {
  const config = { version: '1.0.9', android: { versionCode: 42 } };

  it('mendahulukan versionCode native ketimbang app.json', () => {
    expect(resolveAppVersion(config, '45').versionCode).toBe(45);
  });

  it('mendahulukan versi native walau app.json lebih besar', () => {
    // Arahnya bukan "ambil yang terbesar" — nilai native selalu kebenarannya.
    expect(
      resolveAppVersion({ ...config, android: { versionCode: 99 } }, '45')
        .versionCode
    ).toBe(45);
  });

  it('jatuh ke app.json ketika versi native tidak terbaca', () => {
    expect(resolveAppVersion(config, null).versionCode).toBe(42);
    expect(resolveAppVersion(config, undefined).versionCode).toBe(42);
  });

  it('mengabaikan versi native yang bukan angka', () => {
    expect(resolveAppVersion(config, 'bukan-angka').versionCode).toBe(42);
    expect(resolveAppVersion(config, '0').versionCode).toBe(42);
  });

  it('memakai nama versi dari app config', () => {
    expect(resolveAppVersion(config, '45').versionName).toBe('1.0.9');
  });

  it('memakai nilai cadangan ketika config tidak ada sama sekali', () => {
    const hasil = resolveAppVersion(undefined, null);

    expect(hasil.versionName).toBe('1.0.0');
    expect(hasil.versionCode).toBe(53);
  });
});
