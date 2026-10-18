import { describe, expect, it } from '@jest/globals';

import { labelTombolUnduh } from '@/utils/labelTombolUnduh';

describe('labelTombolUnduh', () => {
  it('mengarahkan ke Play Store bila tautannya halaman Play Store', () => {
    expect(
      labelTombolUnduh('https://play.google.com/store/apps/details?id=com.netmanager.mobile'),
    ).toBe('Update di Play Store');
  });

  it('tetap mengunduh APK untuk tautan berkas APK', () => {
    expect(labelTombolUnduh('https://cdn.radpro.id/app/radpro.apk')).toBe('Download APK Sekarang');
  });
});
