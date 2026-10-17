import { describe, expect, it } from '@jest/globals';

import {
  describeFailedRequest,
  getHttpStatus,
  getReportSeverity,
  getServerErrorMessage,
  getStaleQueryRootsAfterRejection,
  shouldReportToBackend,
  shouldRetryMutation,
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
      status: 400,
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


function buatPenolakanServer(
  status: number,
  url: string,
  data: Record<string, unknown>,
) {
  const error = buatAxiosError(status, { method: 'post', url }) as Error & {
    response?: { status: number; data?: unknown };
  };
  error.response = { status, data };
  return error;
}

describe('describeFailedRequest: status dan pesan server', () => {
  it('melampirkan status HTTP dan pesan galat dari server', () => {
    const error = buatPenolakanServer(400, '/api/mobile/attendance/check-in', {
      error: 'Check-in terlalu awal. Waktu check-in paling awal: 06:00',
    });

    expect(describeFailedRequest(error)).toEqual({
      method: 'POST',
      endpoint: '/api/mobile/attendance/check-in',
      status: 400,
      serverMessage: 'Check-in terlalu awal. Waktu check-in paling awal: 06:00',
    });
  });

  it('memotong pesan server yang terlalu panjang', () => {
    const error = buatPenolakanServer(400, '/api/x', { message: 'a'.repeat(500) });
    expect(describeFailedRequest(error).serverMessage).toHaveLength(300);
  });
});

describe('getServerErrorMessage', () => {
  it('mengambil pesan dari error atau message di body respons', () => {
    expect(getServerErrorMessage(buatPenolakanServer(400, '/a', { error: 'A' }))).toBe('A');
    expect(getServerErrorMessage(buatPenolakanServer(400, '/a', { message: 'B' }))).toBe('B');
  });

  it('mengembalikan undefined bila server tidak mengirim pesan', () => {
    expect(getServerErrorMessage(buatAxiosError(400))).toBeUndefined();
    expect(getServerErrorMessage(buatAxiosError(undefined))).toBeUndefined();
  });
});

describe('getReportSeverity', () => {
  it('menandai penolakan 4xx sebagai warning, bukan error', () => {
    expect(getReportSeverity(buatAxiosError(400))).toBe('warning');
    expect(getReportSeverity(buatAxiosError(422))).toBe('warning');
  });

  it('tetap error untuk 5xx dan kegagalan tanpa respons', () => {
    expect(getReportSeverity(buatAxiosError(500))).toBe('error');
    expect(getReportSeverity(buatAxiosError(undefined))).toBe('error');
  });
});

describe('shouldRetryMutation', () => {
  it('tidak mengulang mutasi yang ditolak server dengan 4xx', () => {
    expect(shouldRetryMutation(0, buatAxiosError(400))).toBe(false);
    expect(shouldRetryMutation(0, buatAxiosError(409))).toBe(false);
  });

  it('mengulang sekali untuk galat jaringan dan 5xx', () => {
    expect(shouldRetryMutation(0, buatAxiosError(undefined))).toBe(true);
    expect(shouldRetryMutation(0, buatAxiosError(503))).toBe(true);
    expect(shouldRetryMutation(1, buatAxiosError(503))).toBe(false);
  });
});

describe('getStaleQueryRootsAfterRejection', () => {
  it('menyegarkan data WO saat aksi WO ditolak karena status sudah berubah', () => {
    const error = buatPenolakanServer(400, '/api/mobile/work-orders/wo-1/update', {});
    expect(getStaleQueryRootsAfterRejection(error)).toEqual([['workOrders']]);
  });

  it('menyegarkan status absensi saat check-in/out ditolak', () => {
    const error = buatPenolakanServer(400, '/api/mobile/attendance/check-out', {});
    expect(getStaleQueryRootsAfterRejection(error)).toEqual([['attendance']]);
  });

  it('tidak menyegarkan apa pun untuk galat server atau endpoint lain', () => {
    expect(
      getStaleQueryRootsAfterRejection(
        buatPenolakanServer(500, '/api/mobile/work-orders/wo-1/update', {}),
      ),
    ).toEqual([]);
    expect(
      getStaleQueryRootsAfterRejection(buatPenolakanServer(400, '/api/mobile/leaves', {})),
    ).toEqual([]);
  });
});
