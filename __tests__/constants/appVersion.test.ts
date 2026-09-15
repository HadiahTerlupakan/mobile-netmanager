import { describe, expect, it } from '@jest/globals';

import { FALLBACK_VERSION_CODE, formatAppVersionLabel, resolveAppVersion } from '@/constants/appVersion';

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

  it('mendahulukan nama versi native ketimbang app config', () => {
    // versionName di app.json dipatok manual, sama seperti versionCode dulu.
    expect(resolveAppVersion(config, '45', '1.0.10').versionName).toBe('1.0.10');
  });

  it('jatuh ke nama versi app config ketika native tidak terbaca', () => {
    expect(resolveAppVersion(config, '45', null).versionName).toBe('1.0.9');
  });

  it('melaporkan dari mana versionCode diambil', () => {
    expect(resolveAppVersion(config, '45', null).versionCodeSource).toBe('native');
    expect(resolveAppVersion(config, null, null).versionCodeSource).toBe('config');
    expect(resolveAppVersion(undefined, null, null).versionCodeSource).toBe('fallback');
  });
});

/**
 * Nilai cadangan dulu 53 — lebih tinggi dari versionCode sungguhan mana pun
 * (build terbaru 47). Angka itu dipakai di dua tempat yang sama-sama berbahaya
 * bila terlalu tinggi:
 *
 * - `/api/mobile/app-version/check`: aplikasi tidak pernah ditawari update.
 * - claim `appVersionCode` yang ditandatangani ke JWT saat login: server
 *   memakainya untuk gerbang MOBILE_MIN_NATIVE_VERSION_CODE, sehingga aplikasi
 *   berversi apa pun lolos gerbang itu.
 *
 * Versi yang tidak terbaca harus diperlakukan sebagai yang tertua. Akibat
 * terburuknya teknisi diminta update dari Play Store — terlihat dan bisa
 * dipulihkan — bukan diam-diam tertinggal dan lolos gerbang.
 */
describe('nilai cadangan versionCode', () => {
  it('lebih rendah dari versionCode sungguhan mana pun', () => {
    expect(FALLBACK_VERSION_CODE).toBeLessThan(1);
    expect(resolveAppVersion(undefined, null, null).versionCode).toBe(FALLBACK_VERSION_CODE);
  });

  it('tidak pernah menang atas angka dari app config', () => {
    expect(resolveAppVersion({ android: { versionCode: 1 } }, null, null).versionCode).toBe(1);
  });

  it('terlihat di label versi, bukan tampil seperti build sungguhan', () => {
    const label = formatAppVersionLabel(
      resolveAppVersion(undefined, null, null),
      'embedded'
    );

    expect(label).toContain('tidak terbaca');
  });

  it('label build normal tetap ringkas', () => {
    expect(
      formatAppVersionLabel(
        resolveAppVersion({ version: '1.0.9', android: { versionCode: 42 } }, '47', '1.0.9'),
        '6fb4906a'
      )
    ).toBe('RADPRO v1.0.9 (Build 47 · OTA #6fb4906a)');
  });
});
