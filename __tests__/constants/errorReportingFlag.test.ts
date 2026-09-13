import { describe, expect, it } from '@jest/globals';

import { resolveBackendErrorReporting } from '@/constants/Config';

/**
 * Pelaporan error mobile berhenti total selama seminggu tanpa ada perubahan
 * kode, dan tidak ada cara membedakan "tidak ada error" dari "pelaporan mati".
 *
 * Penyebabnya bisa bermacam-macam, tapi satu kelemahannya pasti: gerbangnya
 * gagal-tertutup. Bundle rilis yang dibangun tanpa `EXPO_PUBLIC_APP_VARIANT`
 * — misalnya profil `preview` yang menyetelnya `staging` — mematikan pelaporan
 * diam-diam. Nilai env ini dibekukan ke dalam bundle saat build, jadi satu
 * build dengan profil keliru cukup untuk membutakan pemantauan.
 *
 * Arah bawaannya dibalik: bundle rilis melapor kecuali dimatikan eksplisit.
 */
describe('resolveBackendErrorReporting', () => {
  it('menyala saat diminta eksplisit, walau di bundle pengembangan', () => {
    expect(
      resolveBackendErrorReporting(
        { EXPO_PUBLIC_ENABLE_ERROR_REPORTING: 'true' },
        true
      )
    ).toBe(true);
  });

  it('mati saat dimatikan eksplisit, walau di bundle rilis', () => {
    expect(
      resolveBackendErrorReporting(
        { EXPO_PUBLIC_ENABLE_ERROR_REPORTING: 'false' },
        false
      )
    ).toBe(false);
  });

  it('menyala di bundle rilis meski tidak ada env sama sekali', () => {
    // Inti perbaikannya: profil build yang keliru tidak lagi membutakan
    // pemantauan tanpa suara.
    expect(resolveBackendErrorReporting({}, false)).toBe(true);
  });

  it('menyala di bundle rilis profil staging', () => {
    expect(
      resolveBackendErrorReporting({ EXPO_PUBLIC_APP_VARIANT: 'staging' }, false)
    ).toBe(true);
  });

  it('mati di bundle pengembangan saat tidak diminta', () => {
    expect(
      resolveBackendErrorReporting(
        { EXPO_PUBLIC_APP_VARIANT: 'development' },
        true
      )
    ).toBe(false);
  });

  it('tetap menyala untuk varian production seperti sebelumnya', () => {
    expect(
      resolveBackendErrorReporting(
        { EXPO_PUBLIC_APP_VARIANT: 'production' },
        false
      )
    ).toBe(true);
  });
});
