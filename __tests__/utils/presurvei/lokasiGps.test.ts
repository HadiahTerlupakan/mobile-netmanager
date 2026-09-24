import { describe, expect, it } from '@jest/globals';

import {
  KEADAAN_LOKASI_AWAL,
  KEADAAN_LOKASI_IZIN_DITOLAK,
  KEADAAN_LOKASI_MENCARI,
  TEKS_STATUS_LOKASI,
  bacaTitikGps,
  keadaanDariHasil,
  teksAkurasi,
} from '@/utils/presurvei/lokasiGps';

const hasil = (latitude: string, longitude: string, accuracy: number | null = 12) => ({
  latitude,
  longitude,
  locationName: 'Jl. Melati',
  accuracy,
});

describe('bacaTitikGps', () => {
  it('koordinat 0,0 tetap titik yang sah', () => {
    expect(bacaTitikGps(hasil('0', '0'))).toEqual({ latitude: 0, longitude: 0, akurasiMeter: 12 });
  });

  it('string kosong atau bukan angka berarti tidak ada titik', () => {
    expect(bacaTitikGps(hasil('', '106.8'))).toBeNull();
    expect(bacaTitikGps(hasil('-6.2', 'abc'))).toBeNull();
  });

  it('akurasi null diteruskan apa adanya', () => {
    expect(bacaTitikGps(hasil('-6.2', '106.8', null))?.akurasiMeter).toBeNull();
  });
});

describe('keadaanDariHasil', () => {
  it('siap dengan alamat terdeteksi bila titik ada', () => {
    expect(keadaanDariHasil(hasil('-6.2', '106.8'))).toEqual({
      status: 'siap',
      titik: { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 },
      alamatTerdeteksi: 'Jl. Melati',
    });
  });

  it('gagal tanpa alamat bila titik tidak ada', () => {
    expect(keadaanDariHasil(hasil('', ''))).toEqual({ status: 'gagal', titik: null, alamatTerdeteksi: '' });
  });
});

describe('teksAkurasi', () => {
  it('dibulatkan ke meter', () => {
    expect(teksAkurasi(12.4)).toBe('±12 m');
    expect(teksAkurasi(0)).toBe('±0 m');
  });

  it('akurasi tak diketahui disebut jelas', () => {
    expect(teksAkurasi(null)).toBe('Akurasi tidak diketahui');
  });
});

// Amandemen preflight (task-10, G11): konstanta KEADAAN_* wajib dibekukan
// supaya konsumen tidak diam-diam memutasinya (state bersama antar pemanggil).
describe('konstanta keadaan lokasi dibekukan', () => {
  it('KEADAAN_LOKASI_AWAL, KEADAAN_LOKASI_MENCARI, dan KEADAAN_LOKASI_IZIN_DITOLAK beku', () => {
    expect(Object.isFrozen(KEADAAN_LOKASI_AWAL)).toBe(true);
    expect(Object.isFrozen(KEADAAN_LOKASI_MENCARI)).toBe(true);
    expect(Object.isFrozen(KEADAAN_LOKASI_IZIN_DITOLAK)).toBe(true);
  });
});

// Amandemen preflight (task-10, S16): izin ditolak wajib punya status & teks
// tersendiri, berbeda dari "GPS gagal", supaya sales tahu harus membuka
// pengaturan izin alih-alih mengira GPS-nya mati.
describe('status izin_ditolak', () => {
  it('teksnya mengarahkan sales membuka pengaturan izin, bukan menyuruh aktifkan GPS', () => {
    expect(TEKS_STATUS_LOKASI.izin_ditolak).not.toBe(TEKS_STATUS_LOKASI.gagal);
    expect(TEKS_STATUS_LOKASI.izin_ditolak.toLowerCase()).toContain('pengaturan');
  });

  it('KEADAAN_LOKASI_IZIN_DITOLAK tidak punya titik maupun alamat', () => {
    expect(KEADAAN_LOKASI_IZIN_DITOLAK).toEqual({ status: 'izin_ditolak', titik: null, alamatTerdeteksi: '' });
  });
});
