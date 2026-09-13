import { describe, expect, it } from '@jest/globals';

import {
  describeFailedRequest,
  getHttpStatus,
  shouldReportToBackend,
} from '@/lib/queryErrorReporting';

function buatAxiosError(
  status: number | undefined,
  config?: { method?: string; url?: string }
) {
  const error = new Error(
    status ? `Request failed with status code ${status}` : 'Network Error'
  ) as Error & {
    isAxiosError: boolean;
    response?: { status: number };
    config?: { method?: string; url?: string };
  };
  error.isAxiosError = true;
  if (status !== undefined) error.response = { status };
  if (config) error.config = config;
  return error;
}

describe('getHttpStatus', () => {
  it('membaca status dari respons axios', () => {
    expect(getHttpStatus(buatAxiosError(403))).toBe(403);
  });

  it('mengembalikan undefined saat tidak ada respons (error jaringan)', () => {
    expect(getHttpStatus(buatAxiosError(undefined))).toBeUndefined();
  });

  it('tidak meledak pada nilai yang bukan error', () => {
    expect(getHttpStatus(null)).toBeUndefined();
    expect(getHttpStatus('bukan error')).toBeUndefined();
  });
});

/**
 * 418 laporan "status code 403" berasal dari teknisi yang membuka work order
 * bukan miliknya — hasil yang memang diharapkan aturan akses, bukan kerusakan.
 * Melaporkannya sebagai exception menenggelamkan error yang benar-benar perlu
 * dilihat.
 */
describe('shouldReportToBackend', () => {
  it.each([401, 403, 404, 409, 426])(
    'tidak melaporkan status %i yang merupakan hasil yang diharapkan',
    (status) => {
      expect(shouldReportToBackend(buatAxiosError(status))).toBe(false);
    }
  );

  it.each([400, 422, 500, 502, 503])(
    'tetap melaporkan status %i',
    (status) => {
      expect(shouldReportToBackend(buatAxiosError(status))).toBe(true);
    }
  );

  it('tetap melaporkan kegagalan jaringan tanpa status', () => {
    expect(shouldReportToBackend(buatAxiosError(undefined))).toBe(true);
  });

  it('tetap melaporkan error biasa yang bukan dari HTTP', () => {
    expect(shouldReportToBackend(new Error('boom'))).toBe(true);
  });
});

/**
 * Seluruh 562 laporan "status code 400" tercatat dengan mutationKey "null",
 * karena mutation tidak menyetel kunci. Endpoint yang gagal diambil dari error
 * itu sendiri supaya kategori terbesar berhenti gelap.
 */
describe('describeFailedRequest', () => {
  it('mengambil metode dan endpoint dari config axios', () => {
    expect(
      describeFailedRequest(
        buatAxiosError(400, { method: 'post', url: '/api/mobile/attendance/check-in' })
      )
    ).toEqual({
      method: 'POST',
      endpoint: '/api/mobile/attendance/check-in',
    });
  });

  it('membuang query string agar endpoint tidak meledak variasinya', () => {
    // Tanpa ini tiap id jadi endpoint berbeda dan pengelompokan jadi mustahil.
    expect(
      describeFailedRequest(
        buatAxiosError(400, { method: 'get', url: '/api/mobile/work-orders?page=2&q=budi' })
      ).endpoint
    ).toBe('/api/mobile/work-orders');
  });

  it('menyisakan path saja dari URL absolut', () => {
    expect(
      describeFailedRequest(
        buatAxiosError(500, {
          method: 'get',
          url: 'https://admin.radpro.id/api/mobile/dashboard',
        })
      ).endpoint
    ).toBe('/api/mobile/dashboard');
  });

  it('mengembalikan objek kosong saat error tidak membawa config', () => {
    expect(describeFailedRequest(new Error('boom'))).toEqual({});
  });
});
