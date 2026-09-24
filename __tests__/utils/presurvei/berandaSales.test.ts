import { describe, expect, it } from '@jest/globals';

import {
  barisTargetBeranda,
  keadaanRingkasan,
  rekapKegiatanHariIni,
  TEKS_TARGET_BELUM_DITETAPKAN,
  teksStatusAbsen,
  type KeadaanRingkasan,
  type StatusAbsenRingkas,
} from '@/utils/presurvei/berandaSales';

describe('rekapKegiatanHariIni', () => {
  it('menjumlahkan telepon dan chat, tanpa iklan', () => {
    expect(
      rekapKegiatanHariIni({ KUNJUNGAN: 3, SURVEI_LOKASI: 1, TELEPON: 4, CHAT: 2, IKLAN: 9 }),
    ).toEqual({ kunjungan: 3, survei: 1, teleponChat: 6 });
  });
});

describe('barisTargetBeranda', () => {
  it('target belum ditetapkan tetap null, bukan baris nol', () => {
    expect(barisTargetBeranda(null)).toBeNull();
    expect(TEKS_TARGET_BELUM_DITETAPKAN).toBe('Target belum ditetapkan');
  });

  it('tiga baris berurutan dengan angka tercapai / target', () => {
    expect(
      barisTargetBeranda({
        periodeTahun: 2026,
        periodeBulan: 9,
        kunjungan: { target: 20, tercapai: 10, persen: 50 },
        prospek: { target: 10, tercapai: 3, persen: 30 },
        konversi: { target: 5, tercapai: 1, persen: 20 },
      }),
    ).toEqual([
      { label: 'Kunjungan', teks: '10 / 20', persen: 50 },
      { label: 'Prospek', teks: '3 / 10', persen: 30 },
      { label: 'Konversi', teks: '1 / 5', persen: 20 },
    ]);
  });
});

describe('teksStatusAbsen', () => {
  /** Tupel bertipe agar `it.each` lolos tsc (TS2345 bila `as const`). */
  const KASUS_ABSEN: [StatusAbsenRingkas | null, string][] = [
    [null, 'Status absen belum dimuat'],
    [{ status: 'idle', checkInTime: null, checkOutTime: null }, 'Belum check-in'],
    [{ status: 'checked-in', checkInTime: '07:58', checkOutTime: null }, 'Check-in 07:58'],
    [{ status: 'checked-in', checkInTime: null, checkOutTime: null }, 'Sudah check-in'],
    [{ status: 'checked-out', checkInTime: '07:58', checkOutTime: '17:02' }, 'Selesai 07:58–17:02'],
    [{ status: 'checked-out', checkInTime: null, checkOutTime: null }, 'Selesai -–-'],
  ];

  it.each(KASUS_ABSEN)('%j → %s', (status, harapan) => {
    expect(teksStatusAbsen(status)).toBe(harapan);
  });
});

describe('keadaanRingkasan', () => {
  const galat403 = { isAxiosError: true, response: { status: 403 } };
  const galat500 = { isAxiosError: true, response: { status: 500 } };

  const KASUS_KEADAAN: [Parameters<typeof keadaanRingkasan>[0], KeadaanRingkasan][] = [
    [{ isPresurveiAktif: false, hasData: false, error: null }, 'belum-aktif'],
    [{ isPresurveiAktif: true, hasData: false, error: galat403 }, 'belum-aktif'],
    [{ isPresurveiAktif: true, hasData: false, error: null }, 'memuat'],
    [{ isPresurveiAktif: true, hasData: false, error: galat500 }, 'galat'],
    [{ isPresurveiAktif: true, hasData: true, error: galat500 }, 'siap'],
  ];

  it.each(KASUS_KEADAAN)('%j → %s', (masukan, harapan) => {
    expect(keadaanRingkasan(masukan)).toBe(harapan);
  });
});
