import { describe, expect, it } from '@jest/globals';

import { KEGIATAN_HASIL, KEGIATAN_JENIS, LABEL_HASIL_KEGIATAN } from '@/constants/presurvei';
import {
  daftarOpsiHasil,
  HASIL_PER_JENIS,
  hasilTetapUntukJenis,
  labelHasilKegiatan,
  pertanyaanHasil,
} from '@/utils/presurvei/hasilKegiatan';

/** Kontrak netmanager `modules/presurvei/domain/hasil-kegiatan.ts`: pilihan dan label per jenis, urut tampil. */
const KONTRAK_PILIHAN = {
  KUNJUNGAN: [
    ['TERTARIK', 'Tertarik'],
    ['DEAL', 'Setuju pasang'],
    ['PERLU_FOLLOWUP', 'Masih pikir-pikir'],
    ['TIDAK_MINAT', 'Tidak minat'],
    ['TIDAK_ADA_ORANG', 'Tidak ketemu orangnya'],
  ],
  SURVEI_LOKASI: [
    ['BISA_DIPASANG', 'Bisa dipasang'],
    ['TIDAK_BISA_DIPASANG', 'Tidak bisa dipasang'],
    ['PERLU_FOLLOWUP', 'Perlu dicek ulang'],
    ['TIDAK_ADA_ORANG', 'Tidak ketemu orangnya'],
  ],
  TELEPON: [
    ['TERTARIK', 'Tertarik'],
    ['DEAL', 'Setuju pasang'],
    ['PERLU_FOLLOWUP', 'Minta ditelepon lagi'],
    ['TIDAK_MINAT', 'Tidak minat'],
    ['TIDAK_ADA_ORANG', 'Tidak diangkat / nomor tidak aktif'],
  ],
  CHAT: [
    ['TERTARIK', 'Tertarik'],
    ['DEAL', 'Setuju pasang'],
    ['PERLU_FOLLOWUP', 'Masih tanya-tanya'],
    ['TIDAK_MINAT', 'Tidak minat'],
    ['TIDAK_ADA_ORANG', 'Belum dibalas'],
  ],
  IKLAN: [
    ['TERTARIK', 'Tertarik'],
    ['DEAL', 'Deal'],
    ['PERLU_FOLLOWUP', 'Perlu follow-up'],
    ['TIDAK_MINAT', 'Tidak minat'],
    ['TIDAK_ADA_ORANG', 'Tidak ada orang'],
  ],
} as const;

describe('hasil kegiatan per jenis', () => {
  it('pilihan dan label tiap jenis sama dengan kontrak server', () => {
    expect(Object.keys(HASIL_PER_JENIS)).toEqual([...KEGIATAN_JENIS]);
    for (const jenis of KEGIATAN_JENIS) {
      const harapan = KONTRAK_PILIHAN[jenis].map(([nilai, label]) => ({ nilai, label }));
      expect(daftarOpsiHasil(jenis)).toEqual(harapan);
    }
  });

  it('label umum mencakup semua hasil, termasuk dua hasil survei', () => {
    expect(Object.keys(LABEL_HASIL_KEGIATAN)).toEqual([...KEGIATAN_HASIL]);
    expect(LABEL_HASIL_KEGIATAN.BISA_DIPASANG).toBe('Bisa dipasang');
    expect(LABEL_HASIL_KEGIATAN.TIDAK_BISA_DIPASANG).toBe('Tidak bisa dipasang');
  });

  it('hasil di luar pilihan jenis (data lama) tetap berlabel umum', () => {
    expect(labelHasilKegiatan('TERTARIK', 'SURVEI_LOKASI')).toBe('Tertarik');
    expect(labelHasilKegiatan('DEAL', 'SURVEI_LOKASI')).toBe('Deal');
    expect(labelHasilKegiatan('BISA_DIPASANG', 'KUNJUNGAN')).toBe('Bisa dipasang');
  });

  it('survei lokasi punya pertanyaan pemandu kelayakan pasang', () => {
    expect(pertanyaanHasil('SURVEI_LOKASI')).toBe('Bisa dipasang di lokasi ini?');
    expect(pertanyaanHasil('IKLAN')).toBeNull();
  });

  it('ganti jenis: hasil yang tidak ada di pilihan jenis baru dikosongkan', () => {
    expect(hasilTetapUntukJenis('TERTARIK', 'SURVEI_LOKASI')).toBeNull();
    expect(hasilTetapUntukJenis('BISA_DIPASANG', 'TELEPON')).toBeNull();
    expect(hasilTetapUntukJenis('PERLU_FOLLOWUP', 'SURVEI_LOKASI')).toBe('PERLU_FOLLOWUP');
    expect(hasilTetapUntukJenis('TERTARIK', 'CHAT')).toBe('TERTARIK');
    expect(hasilTetapUntukJenis(null, 'CHAT')).toBeNull();
    expect(hasilTetapUntukJenis('DEAL', null)).toBe('DEAL');
  });
});
