import { describe, expect, it } from '@jest/globals';

import {
  ambilDuplikatProspek,
  pilihTawaranDuplikat,
  teksPemberitahuanDuplikat,
} from '@/utils/presurvei/duplikatProspek';
import { buatGalatDuplikatUji } from '../../fixtures/presurvei/prospek';

const MILIK_LAIN = { id: 'p-lain', nama: 'UJI Orang Lain', status: 'BARU', pemilikId: 's-9' } as const;
const MILIK_SENDIRI = { id: 'p-1', nama: 'UJI Pak Budi Santoso', status: 'DIHUBUNGI', pemilikId: 's-1' } as const;

describe('ambilDuplikatProspek', () => {
  it('membaca details.duplikat dari 409 DUPLIKAT (bentuk balasan server)', () => {
    expect(ambilDuplikatProspek(buatGalatDuplikatUji([MILIK_SENDIRI]))).toEqual([MILIK_SENDIRI]);
  });

  it('galat selain 409 DUPLIKAT bukan duplikat', () => {
    expect(ambilDuplikatProspek(new Error('jaringan'))).toBeNull();
    expect(
      ambilDuplikatProspek({ isAxiosError: true, response: { status: 409, data: { code: 'CONFLICT' } } }),
    ).toBeNull();
    expect(
      ambilDuplikatProspek({ isAxiosError: true, response: { status: 400, data: { code: 'DUPLIKAT' } } }),
    ).toBeNull();
  });

  it('baris berbentuk asing dibuang; details kosong tetap dikenali sebagai duplikat', () => {
    expect(ambilDuplikatProspek(buatGalatDuplikatUji([{ id: 1 }, { ...MILIK_LAIN, pemilikId: null }]))).toEqual([
      { ...MILIK_LAIN, pemilikId: null },
    ]);
    const tanpaDetails = { isAxiosError: true, response: { status: 409, data: { code: 'DUPLIKAT' } } };
    expect(ambilDuplikatProspek(tanpaDetails)).toEqual([]);
  });
});

describe('pilihTawaranDuplikat & teksPemberitahuanDuplikat', () => {
  it('mengutamakan prospek milik sendiri yang boleh dipakai', () => {
    const tawaran = pilihTawaranDuplikat([MILIK_LAIN, MILIK_SENDIRI], 's-1');
    expect(tawaran).toEqual({ prospek: MILIK_SENDIRI, isBolehDipakai: true });
    expect(teksPemberitahuanDuplikat(tawaran)).toBe('Nomor HP ini sudah tercatat atas nama UJI Pak Budi Santoso.');
  });

  it('milik sales lain hanya diberitahukan, tidak boleh dipakai', () => {
    const tawaran = pilihTawaranDuplikat([MILIK_LAIN], 's-1');
    expect(tawaran).toEqual({ prospek: MILIK_LAIN, isBolehDipakai: false });
    expect(teksPemberitahuanDuplikat(tawaran)).toBe(
      'Nomor HP ini sudah tercatat atas nama UJI Orang Lain. Data itu dipegang sales lain.',
    );
    expect(pilihTawaranDuplikat([MILIK_SENDIRI], null).isBolehDipakai).toBe(false);
  });

  it('daftar kosong tetap memberi kalimat umum', () => {
    const tawaran = pilihTawaranDuplikat([], 's-1');
    expect(tawaran).toEqual({ prospek: null, isBolehDipakai: false });
    expect(teksPemberitahuanDuplikat(tawaran)).toBe('Nomor HP ini sudah tercatat sebelumnya.');
  });
});
