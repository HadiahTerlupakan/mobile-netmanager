import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

type StatusJaringan = { isConnected: boolean | null; isInternetReachable: boolean | null };

let mockPendengarJaringan: ((status: StatusJaringan) => void) | undefined;
const mockShowToast = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (pendengar: (status: StatusJaringan) => void) => {
      mockPendengarJaringan = pendengar;
      return () => undefined;
    },
  },
}));

jest.mock('@/utils/errorPresenter', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

const ONLINE: StatusJaringan = { isConnected: true, isInternetReachable: true };
const OFFLINE: StatusJaringan = { isConnected: false, isInternetReachable: false };

/** Modul segar yang sudah memantau jaringan; kondisi awalnya dikirim lewat pendengar NetInfo. */
function muatPeredam(statusAwal: StatusJaringan): (tampilkan: () => void) => void {
  jest.resetModules();
  const modul = require('@/services/redamGalatOtomatis');
  modul.pantauJaringanUntukGalatOtomatis();
  kirimStatus(statusAwal);
  return modul.tampilkanGalatOtomatis;
}

function kirimStatus(status: StatusJaringan) {
  if (!mockPendengarJaringan) throw new Error('Pendengar NetInfo belum terpasang');
  mockPendengarJaringan(status);
}

const pemberitahuanTanpaKoneksi = () =>
  mockShowToast.mock.calls.filter(([jenis, judul]) => jenis === 'warning' && judul === 'Tidak Ada Koneksi Internet');

describe('redamGalatOtomatis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPendengarJaringan = undefined;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('online: galat otomatis tampil seperti biasa', () => {
    const tampilkanGalatOtomatis = muatPeredam(ONLINE);
    const tampilkan = jest.fn();

    tampilkanGalatOtomatis(tampilkan);

    expect(tampilkan).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it.each([
    ['tidak tersambung', OFFLINE],
    ['tersambung tanpa internet', { isConnected: true, isInternetReachable: false }],
  ])('%s: galat otomatis diganti satu pemberitahuan tanpa koneksi', (_keadaan, status) => {
    const tampilkanGalatOtomatis = muatPeredam(status);
    const tampilkan = jest.fn();

    tampilkanGalatOtomatis(tampilkan);
    tampilkanGalatOtomatis(tampilkan);
    tampilkanGalatOtomatis(tampilkan);

    expect(tampilkan).not.toHaveBeenCalled();
    expect(pemberitahuanTanpaKoneksi()).toHaveLength(1);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it('kembali online: galat otomatis masih diredam 5 detik tanpa pemberitahuan, lalu tampil normal', () => {
    const tampilkanGalatOtomatis = muatPeredam(OFFLINE);
    kirimStatus(ONLINE);
    const tampilkan = jest.fn();

    jest.advanceTimersByTime(4999);
    tampilkanGalatOtomatis(tampilkan);
    const jumlahSaatTenang = tampilkan.mock.calls.length;
    jest.advanceTimersByTime(1);
    tampilkanGalatOtomatis(tampilkan);

    expect(jumlahSaatTenang).toBe(0);
    expect(tampilkan).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('offline lagi setelah sempat tersambung: pemberitahuan boleh muncul lagi', () => {
    const tampilkanGalatOtomatis = muatPeredam(OFFLINE);
    tampilkanGalatOtomatis(jest.fn());
    kirimStatus(ONLINE);
    kirimStatus(OFFLINE);
    tampilkanGalatOtomatis(jest.fn());

    expect(pemberitahuanTanpaKoneksi()).toHaveLength(2);
  });
});
