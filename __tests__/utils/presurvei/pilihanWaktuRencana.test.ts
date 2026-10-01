import { describe, expect, it } from '@jest/globals';

import {
  daftarKelompokJam,
  labelTombolJam,
  tentukanPilihanJam,
  tentukanPilihanTanggal,
  teksJamRingkas,
  teksTanggalLengkap,
} from '@/utils/presurvei/pilihanWaktuRencana';

describe('pilihan waktu rencana', () => {
  const HARI_INI = '2026-09-26';
  const BESOK = '2026-09-27';

  it('tombol tanggal yang menyala', () => {
    expect(tentukanPilihanTanggal(HARI_INI, HARI_INI, BESOK)).toBe('HARI_INI');
    expect(tentukanPilihanTanggal(BESOK, HARI_INI, BESOK)).toBe('BESOK');
    expect(tentukanPilihanTanggal('2026-10-03', HARI_INI, BESOK)).toBe('LAIN');
  });

  it('tanggal ditulis lengkap dengan nama hari, tanpa singkatan', () => {
    expect(teksTanggalLengkap(HARI_INI)).toBe('Sabtu, 26 September 2026');
  });

  it('jam: tanpa jam dijelaskan, jam terpilih ditulis dengan titik', () => {
    expect(tentukanPilihanJam('')).toBe('TANPA_JAM');
    expect(tentukanPilihanJam('09:30')).toBe('PAKAI_JAM');
    expect(labelTombolJam('')).toBe('Pilih jam');
    expect(labelTombolJam('09:30')).toBe('Pukul 09.30');
    expect(teksJamRingkas('')).toMatch(/Tidak pakai jam/);
    expect(teksJamRingkas('14:05')).toBe('Datang pukul 14.05. Ketuk tombol jam untuk mengganti.');
  });

  it('pilihan jam: Pagi–Malam, per 30 menit, urut', () => {
    const kelompok = daftarKelompokJam();

    expect(kelompok.map((item) => item.judul)).toEqual(['Pagi', 'Siang', 'Sore', 'Malam']);
    expect(kelompok[0].daftarJam.slice(0, 3)).toEqual(['07:00', '07:30', '08:00']);
    expect(kelompok[3].daftarJam.at(-1)).toBe('21:30');
    const semua = kelompok.flatMap((item) => item.daftarJam);
    expect([...semua].sort()).toEqual(semua);
    expect(new Set(semua).size).toBe(semua.length);
  });
});
