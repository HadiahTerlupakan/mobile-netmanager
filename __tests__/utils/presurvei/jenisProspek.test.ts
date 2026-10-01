import { describe, expect, it } from '@jest/globals';

import { PANJANG_PERAN_PROSPEK_MAKS } from '@/constants/presurvei';
import {
  OPSI_JENIS_PROSPEK,
  OPSI_PERAN_PERANTARA,
  PESAN_PERAN,
  batasKeteranganPeran,
  gabungPeran,
  isPeranDitulisSendiri,
  isPerantara,
  teksLencanaJenisProspek,
  validasiPeran,
} from '@/utils/presurvei/jenisProspek';

describe('jenisProspek', () => {
  it('pilihan "Orang ini siapa?": calon pelanggan dulu, lalu perantara, masing-masing berketerangan', () => {
    expect(OPSI_JENIS_PROSPEK.map((opsi) => opsi.nilai)).toEqual(['CALON_PELANGGAN', 'PERANTARA']);
    expect(OPSI_JENIS_PROSPEK.every((opsi) => opsi.keterangan.length > 0)).toBe(true);
    expect(isPerantara('PERANTARA')).toBe(true);
    expect(isPerantara('CALON_PELANGGAN')).toBe(false);
  });

  it('pilihan peran berakhir dengan "Lainnya" yang ditulis sendiri', () => {
    expect(OPSI_PERAN_PERANTARA.map((opsi) => opsi.label)).toEqual([
      'Ketua RT/RW',
      'Kepala desa/lurah',
      'Tokoh masyarakat',
      'Pemilik warung/usaha',
      'Lainnya',
    ]);
    expect(isPeranDitulisSendiri('LAINNYA')).toBe(true);
    expect(isPeranDitulisSendiri('KETUA_RT_RW')).toBe(false);
    expect(isPeranDitulisSendiri(null)).toBe(false);
  });

  describe('gabungPeran', () => {
    it('peran baku tanpa keterangan → labelnya saja', () => {
      expect(gabungPeran('KETUA_RT_RW', '   ')).toBe('Ketua RT/RW');
    });

    it('peran baku + keterangan → "Label (keterangan)" dengan spasi dirapikan', () => {
      expect(gabungPeran('KETUA_RT_RW', '  RT 03   Kel. Melati ')).toBe('Ketua RT/RW (RT 03 Kel. Melati)');
      expect(gabungPeran('PEMILIK_USAHA', 'Warung Bu Tini')).toBe('Pemilik warung/usaha (Warung Bu Tini)');
    });

    it('"Lainnya" → keterangannya sendiri; kosong bila belum ditulis', () => {
      expect(gabungPeran('LAINNYA', ' Ketua karang taruna ')).toBe('Ketua karang taruna');
      expect(gabungPeran('LAINNYA', '  ')).toBe('');
    });

    it('belum memilih → kosong', () => {
      expect(gabungPeran(null, 'RT 03')).toBe('');
    });
  });

  it('batas ketik keterangan menjaga peran gabungan tetap ≤ batas server', () => {
    for (const { nilai } of OPSI_PERAN_PERANTARA) {
      const batas = batasKeteranganPeran(nilai);
      expect(gabungPeran(nilai, 'x'.repeat(batas)).length).toBeLessThanOrEqual(PANJANG_PERAN_PROSPEK_MAKS);
    }
    expect(batasKeteranganPeran('LAINNYA')).toBe(PANJANG_PERAN_PROSPEK_MAKS);
  });

  describe('validasiPeran (meniru isPeranProspekSah server)', () => {
    it('calon pelanggan selalu sah, apa pun sisa isian peran', () => {
      expect(validasiPeran('CALON_PELANGGAN', null, '')).toEqual({});
    });

    it('perantara wajib memilih peran', () => {
      expect(validasiPeran('PERANTARA', null, 'RT 03')).toEqual({ peranPilihan: PESAN_PERAN.belumDipilih });
    });

    it('peran baku sah tanpa keterangan', () => {
      expect(validasiPeran('PERANTARA', 'KEPALA_DESA', '')).toEqual({});
    });

    it('"Lainnya" wajib ditulis', () => {
      expect(validasiPeran('PERANTARA', 'LAINNYA', ' ')).toEqual({ peranKeterangan: PESAN_PERAN.lainnyaKosong });
      expect(validasiPeran('PERANTARA', 'LAINNYA', 'Ketua karang taruna')).toEqual({});
    });

    it('peran gabungan lebih dari 120 huruf ditolak', () => {
      expect(validasiPeran('PERANTARA', 'LAINNYA', 'a'.repeat(PANJANG_PERAN_PROSPEK_MAKS + 1))).toEqual({
        peranKeterangan: PESAN_PERAN.terlaluPanjang,
      });
    });
  });

  describe('teksLencanaJenisProspek', () => {
    it('perantara berperan → "Perantara · peran"', () => {
      expect(teksLencanaJenisProspek({ jenis: 'PERANTARA', peran: 'Ketua RT 03' })).toBe('Perantara · Ketua RT 03');
    });

    it('perantara tanpa peran (data lama) → "Perantara"', () => {
      expect(teksLencanaJenisProspek({ jenis: 'PERANTARA', peran: null })).toBe('Perantara');
      expect(teksLencanaJenisProspek({ jenis: 'PERANTARA', peran: '  ' })).toBe('Perantara');
    });

    it('calon pelanggan tanpa lencana', () => {
      expect(teksLencanaJenisProspek({ jenis: 'CALON_PELANGGAN', peran: null })).toBeNull();
    });
  });
});
