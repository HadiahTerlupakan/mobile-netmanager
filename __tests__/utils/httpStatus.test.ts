import { describe, expect, it } from '@jest/globals';

import { isAksesDitolak } from '@/utils/httpStatus';

// Bentuk galat axios seadanya; isAksesDitolak membaca `response.status` lewat
// `getHttpStatus` (`@/lib/queryErrorReporting`), helper yang sama dipakai
// toast global — bukan lewat `isAxiosError` sendiri (lihat laporan Task 8).
const galatAxios = (status?: number) => ({ isAxiosError: true, response: status ? { status } : undefined });

describe('isAksesDitolak', () => {
  it('benar hanya untuk respons 403', () => {
    expect(isAksesDitolak(galatAxios(403))).toBe(true);
    expect(isAksesDitolak(galatAxios(401))).toBe(false);
    expect(isAksesDitolak(galatAxios(500))).toBe(false);
  });

  it('salah untuk galat jaringan tanpa respons dan galat biasa', () => {
    expect(isAksesDitolak(galatAxios())).toBe(false);
    expect(isAksesDitolak(new Error('403'))).toBe(false);
  });
});
