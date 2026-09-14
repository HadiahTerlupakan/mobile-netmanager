import { describe, expect, it } from '@jest/globals';
import { resolveVersionCode } from '../../app.config';

/**
 * `eas.json` memakai `appVersionSource: "remote"`, artinya EAS yang memegang
 * versionCode dan menaikkannya tiap build. Begitu build native pindah ke Gitea
 * Actions, EAS tidak lagi ikut dalam alur — dan tanpa pengganti, `expo
 * prebuild` akan menulis `versionCode 1` ke build.gradle.
 *
 * versionCode 1 tidak gagal saat build. Ia gagal saat unggah ke Play Store,
 * setelah satu siklus build penuh, dengan alasan yang tidak menyebut CI sama
 * sekali. Karena itu sumbernya dibuat eksplisit dan divalidasi di sini.
 */
describe('sumber versionCode dari lingkungan', () => {
  it('mengambil angka dari RADPRO_VERSION_CODE', () => {
    expect(resolveVersionCode({ RADPRO_VERSION_CODE: '47' })).toBe(47);
  });

  it('tidak memaksakan nilai ketika variabelnya tidak diset', () => {
    // `expo start` dan build pengembangan tidak butuh versionCode sungguhan;
    // memaksakan angka di sini akan membuat keduanya gagal tanpa alasan.
    expect(resolveVersionCode({})).toBeUndefined();
    expect(resolveVersionCode({ RADPRO_VERSION_CODE: '' })).toBeUndefined();
    expect(resolveVersionCode({ RADPRO_VERSION_CODE: '   ' })).toBeUndefined();
  });

  it('menolak nilai yang bukan bilangan bulat positif', () => {
    // Nilai rusak yang diterima diam-diam akan terbawa sampai ke artefak.
    for (const rusak of ['0', '-3', '4.5', 'abc', '47abc', 'NaN', 'Infinity']) {
      expect(() => resolveVersionCode({ RADPRO_VERSION_CODE: rusak })).toThrow(
        /RADPRO_VERSION_CODE/
      );
    }
  });

  it('menolak angka di atas batas Play Store', () => {
    // Play Store menolak versionCode di atas 2100000000. Angka di atas itu
    // hampir pasti salah hitung, dan lebih baik ketahuan sebelum build.
    expect(() =>
      resolveVersionCode({ RADPRO_VERSION_CODE: '2100000001' })
    ).toThrow(/RADPRO_VERSION_CODE/);
  });

  it('menerima spasi di sekitar angka', () => {
    expect(resolveVersionCode({ RADPRO_VERSION_CODE: ' 48 ' })).toBe(48);
  });
});
