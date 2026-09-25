import { describe, expect, it } from '@jest/globals';
import { generateKeyPairSync, verify } from 'node:crypto';

const {
  nextVersionCode,
  buildInternalTrack,
  buildProductionTrack,
  validasiPromosi,
  peringatanProduction,
  buildServiceAccountJwt,
} = require('../../scripts/play-internal.js');

/**
 * Play Store menolak unggahan yang versionCode-nya tidak lebih besar dari
 * setiap bundle yang pernah diunggah — termasuk yang tidak pernah dirilis.
 * Karena itu angka berikutnya dihitung dari daftar bundle di Play sendiri, bukan
 * dari penghitung EAS yang tidak lagi ikut dalam alur build.
 */
describe('versionCode berikutnya', () => {
  it('satu di atas bundle tertinggi yang pernah diunggah', () => {
    expect(nextVersionCode([{ versionCode: 11 }, { versionCode: 46 }, { versionCode: 45 }])).toBe(47);
  });

  it('dimulai dari 1 bila belum ada bundle', () => {
    expect(nextVersionCode([])).toBe(1);
  });

  it('memakai angka manual bila lebih besar dari bundle tertinggi', () => {
    expect(nextVersionCode([{ versionCode: 46 }], '50')).toBe(50);
  });

  it('menolak angka manual yang pasti ditolak Play Store', () => {
    // Lebih baik gagal sebelum build satu jam daripada saat unggah.
    expect(() => nextVersionCode([{ versionCode: 46 }], '46')).toThrow(/46/);
    expect(() => nextVersionCode([{ versionCode: 46 }], 'abc')).toThrow();
  });
});

describe('rilis track internal', () => {
  it('menerbitkan satu versionCode ke track internal', () => {
    expect(buildInternalTrack({ versionCode: 47, releaseName: '1.0.9 (47)' })).toEqual({
      track: 'internal',
      releases: [{ name: '1.0.9 (47)', versionCodes: ['47'], status: 'completed' }],
    });
  });

  it('tidak pernah menyentuh track produksi', () => {
    // Promosi ke produksi sengaja manual lewat Play Console.
    expect(JSON.stringify(buildInternalTrack({ versionCode: 47, releaseName: 'x' }))).not.toContain(
      'production'
    );
  });
});

describe('JWT service account', () => {
  it('ditandatangani RS256 dengan cakupan androidpublisher', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwt: string = buildServiceAccountJwt(
      {
        client_email: 'ci@proyek.iam.gserviceaccount.com',
        private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
        token_uri: 'https://oauth2.googleapis.com/token',
      },
      1_700_000_000
    );
    const [kepala, isi, tanda] = jwt.split('.');
    const klaim = JSON.parse(Buffer.from(isi, 'base64url').toString());

    expect(JSON.parse(Buffer.from(kepala, 'base64url').toString()).alg).toBe('RS256');
    expect(klaim.scope).toBe('https://www.googleapis.com/auth/androidpublisher');
    expect(klaim.exp - klaim.iat).toBeLessThanOrEqual(3600);
    expect(
      verify('RSA-SHA256', Buffer.from(`${kepala}.${isi}`), publicKey, Buffer.from(tanda, 'base64url'))
    ).toBe(true);
  });
});

describe('promosi ke production', () => {
  it('hanya menerima build target OTA yang sudah ada di track internal', () => {
    expect(validasiPromosi({ versionCode: '47', kodeInternal: ['47'], versionCodeTargetOta: 47 })).toBe('47');
  });

  it('menolak build yang belum diuji di track internal', () => {
    expect(() => validasiPromosi({ versionCode: '48', kodeInternal: ['47'], versionCodeTargetOta: 48 })).toThrow(
      /tidak ada di track internal/,
    );
  });

  it('menolak build yang bukan target OTA, karena pengguna production akan kehilangan OTA', () => {
    expect(() => validasiPromosi({ versionCode: '46', kodeInternal: ['46', '47'], versionCodeTargetOta: 47 })).toThrow(
      /bukan target OTA/,
    );
  });

  it('menolak versionCode yang bukan bilangan bulat', () => {
    expect(() => validasiPromosi({ versionCode: '47; rm', kodeInternal: ['47'], versionCodeTargetOta: 47 })).toThrow(
      /bilangan bulat/,
    );
  });

  it('merilis penuh ke track production dengan catatan berbahasa Indonesia', () => {
    expect(buildProductionTrack({ versionCode: 47, releaseName: '1.0.9 (47)', catatanRilis: 'Perbaikan' })).toEqual({
      track: 'production',
      releases: [
        {
          name: '1.0.9 (47)',
          versionCodes: ['47'],
          status: 'completed',
          releaseNotes: [{ language: 'id', text: 'Perbaikan' }],
        },
      ],
    });
  });
});

describe('peringatan build target OTA belum di production', () => {
  it('diam bila build target sudah dirilis penuh', () => {
    expect(
      peringatanProduction({ versionCodeTargetOta: 47, rilisProduction: [{ versionCodes: ['47'], status: 'completed' }] }),
    ).toBeNull();
  });

  it('memperingatkan bila production masih build lama (kejadian 15-25 Sep 2026)', () => {
    expect(
      peringatanProduction({ versionCodeTargetOta: 47, rilisProduction: [{ versionCodes: ['46'], status: 'completed' }] }),
    ).toMatch(/versionCode 47\) belum dirilis penuh di production/);
  });

  it('memperingatkan bila build target baru rollout sebagian', () => {
    expect(
      peringatanProduction({ versionCodeTargetOta: 47, rilisProduction: [{ versionCodes: ['47'], status: 'inProgress' }] }),
    ).not.toBeNull();
  });
});
