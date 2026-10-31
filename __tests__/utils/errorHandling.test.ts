import { extractApiErrorMessage, getUserFriendlyError } from '@/utils/errorHandling';

describe('errorHandling taxonomy', () => {
  it('marks server errors as reportable and retryable', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 500',
      response: {
        status: 500,
        data: {},
      },
    };

    expect(getUserFriendlyError(error)).toMatchObject({
      kind: 'server',
      severity: 'error',
      reportable: true,
      retryable: true,
      audience: 'both',
    });
  });

  it('preserves backend validation messages with validation metadata', () => {
    const error = {
      isAxiosError: true,
      message: 'Request failed with status code 422',
      response: {
        status: 422,
        data: {
          message: 'Password minimal 8 karakter',
        },
      },
    };

    expect(getUserFriendlyError(error)).toMatchObject({
      kind: 'validation',
      title: 'Periksa Data',
      message: 'Password minimal 8 karakter',
      reportable: false,
      retryable: false,
    });
  });

  it('sanitizes technical unknown errors', () => {
    expect(getUserFriendlyError(new Error('TypeError: undefined is not an object'))).toMatchObject({
      kind: 'unknown',
      severity: 'error',
      message: 'Terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
    });
  });
});

// 5xx dulu selalu dipetakan ke "Gangguan Server", termasuk 502 checkout yang
// justru meminta pelanggan memakai metode pembayaran lain.
describe('pesan server untuk 5xx', () => {
  const galatServer = (status: number, data: unknown) => ({
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data },
  });
  const PESAN_GATEWAY = 'Gagal menghubungi payment gateway. Silakan coba lagi atau gunakan metode pembayaran lain.';

  it('menampilkan pesan yang dikirim server', () => {
    expect(getUserFriendlyError(galatServer(502, { success: false, error: PESAN_GATEWAY }))).toMatchObject({
      kind: 'server',
      message: PESAN_GATEWAY,
    });
  });

  it.each([
    ['tanpa pesan', {}],
    ['halaman HTML proxy', '<html><body>502 Bad Gateway</body></html>'],
    ['bawaan berbahasa Inggris', { error: 'Internal server error' }],
    ['galat Prisma mentah', { error: 'Invalid `prisma.invoice.findMany()` invocation: Cannot read properties of undefined' }],
  ])('tetap memakai pesan umum bila jawaban server %s', (_nama, data) => {
    expect(getUserFriendlyError(galatServer(500, data)).message).toBe(
      'Terjadi kesalahan pada server. Silakan coba lagi dalam beberapa saat.',
    );
  });
});

// Rute API yang belum ada di server lama (mis. /payments/cancel) dijawab
// halaman 404 HTML Next.js, dan proxy menjawab 413 dengan HTML; teks itu
// dulu tampil mentah di toast.
describe('badan respons HTML', () => {
  const HALAMAN_404 = '<!DOCTYPE html><html><body>404: This page could not be found.</body></html>';

  it('tidak dipakai sebagai pesan galat', () => {
    expect(extractApiErrorMessage(HALAMAN_404)).toBeUndefined();
    expect(
      getUserFriendlyError({ isAxiosError: true, message: 'x', response: { status: 404, data: HALAMAN_404 } }).message,
    ).toBe('Data yang Anda cari tidak ditemukan atau telah dihapus.');
  });

  it('teks biasa dari server tetap dipakai', () => {
    expect(extractApiErrorMessage('Missing invoiceId')).toBe('Missing invoiceId');
  });
});
