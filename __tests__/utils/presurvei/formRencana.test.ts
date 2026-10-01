import { describe, expect, it } from '@jest/globals';

import { buatRencanaUji } from '../../fixtures/presurvei/rencana';
import {
  isJenisBeralamat,
  keMuatanBuatRencana,
  keMuatanUbahRencana,
  nilaiFormDariRencana,
  nilaiFormRencanaBaru,
  PESAN_FORM_RENCANA,
  validasiAlasanBatal,
  validasiFormRencana,
} from '@/utils/presurvei/formRencana';

const HARI_INI = '2026-09-26';

const RENCANA = buatRencanaUji('r-1', {
  tanggal: '2026-09-24', tujuan: 'Presentasi', prospekId: 'p-1', namaProspek: 'Budi', statusTampil: 'TERLEWAT',
});

describe('validasiFormRencana', () => {
  it('form baru dengan tujuan terisi sah', () => {
    expect(validasiFormRencana({ ...nilaiFormRencanaBaru(HARI_INI), tujuan: 'Presentasi' }, HARI_INI)).toEqual({});
  });

  it('menolak tanggal lampau, jenis kosong, tujuan kosong, dan isian terlalu panjang', () => {
    const kesalahan = validasiFormRencana(
      { tanggal: '2026-09-25', jam: '', jenis: null, tujuan: '   ', prospekId: null, alamat: 'x'.repeat(301) },
      HARI_INI,
    );
    expect(kesalahan).toEqual({
      tanggal: PESAN_FORM_RENCANA.tanggalLampau,
      jenis: PESAN_FORM_RENCANA.jenis,
      tujuan: PESAN_FORM_RENCANA.tujuanKosong,
      alamat: PESAN_FORM_RENCANA.alamatPanjang,
    });
    expect(validasiFormRencana({ ...nilaiFormRencanaBaru(HARI_INI), tujuan: 'x'.repeat(501) }, HARI_INI).tujuan)
      .toBe(PESAN_FORM_RENCANA.tujuanPanjang);
  });

  it('saat mengubah, tanggal lama yang tidak diganti tidak diperiksa', () => {
    const nilai = nilaiFormDariRencana(RENCANA);
    expect(validasiFormRencana(nilai, HARI_INI, RENCANA.tanggal)).toEqual({});
    expect(validasiFormRencana({ ...nilai, tanggal: '2026-09-25' }, HARI_INI, RENCANA.tanggal).tanggal)
      .toBe(PESAN_FORM_RENCANA.tanggalLampau);
  });
});

describe('muatan rencana', () => {
  it('buat: tujuan dirapikan dan alamat kosong menjadi null', () => {
    expect(keMuatanBuatRencana({ tanggal: HARI_INI, jam: '', jenis: 'TELEPON', tujuan: '  Tanya paket ', prospekId: null, alamat: ' ' }))
      .toEqual({ tanggal: HARI_INI, jam: null, jenis: 'TELEPON', tujuan: 'Tanya paket', prospekId: null, alamat: null });
  });

  it('alamat hanya dikirim untuk jenis yang mendatangi tempat', () => {
    const dasar = { ...nilaiFormRencanaBaru(HARI_INI), tujuan: 'Demo', alamat: 'Jl. Melati 5' };

    expect(isJenisBeralamat('KUNJUNGAN')).toBe(true);
    expect(isJenisBeralamat('SURVEI_LOKASI')).toBe(true);
    expect(isJenisBeralamat('CHAT')).toBe(false);
    expect(keMuatanBuatRencana({ ...dasar, jenis: 'KUNJUNGAN' }).alamat).toBe('Jl. Melati 5');
    // Alamat sisa sebelum jenis diganti ke Telepon tidak ikut terkirim.
    expect(keMuatanBuatRencana({ ...dasar, jenis: 'TELEPON' }).alamat).toBeNull();
  });

  it('alamat kepanjangan hanya dipersoalkan bila kolom alamat tampil', () => {
    const panjang = { ...nilaiFormRencanaBaru(HARI_INI), tujuan: 'Demo', alamat: 'x'.repeat(1000) };

    expect(validasiFormRencana({ ...panjang, jenis: 'KUNJUNGAN' }, HARI_INI).alamat).toBeDefined();
    expect(validasiFormRencana({ ...panjang, jenis: 'CHAT' }, HARI_INI).alamat).toBeUndefined();
  });

  it('buat: jam terisi ikut terkirim', () => {
    expect(keMuatanBuatRencana({ ...nilaiFormRencanaBaru(HARI_INI), jam: '13:30', tujuan: 'Demo' }).jam).toBe('13:30');
  });

  it('ubah: menambah, mengganti, dan menghapus jam', () => {
    const berjam = buatRencanaUji('r-2', { jam: '09:00' });
    expect(keMuatanUbahRencana(RENCANA, { ...nilaiFormDariRencana(RENCANA), jam: '10:15' })).toEqual({ jam: '10:15' });
    expect(keMuatanUbahRencana(berjam, { ...nilaiFormDariRencana(berjam), jam: '' })).toEqual({ jam: null });
    expect(nilaiFormDariRencana(berjam).jam).toBe('09:00');
  });

  it('ubah: hanya medan yang berubah', () => {
    const nilai = { ...nilaiFormDariRencana(RENCANA), tanggal: '2026-09-27', alamat: 'Jl. Mawar' };
    expect(keMuatanUbahRencana(RENCANA, nilai)).toEqual({ tanggal: '2026-09-27', alamat: 'Jl. Mawar' });
    expect(keMuatanUbahRencana(RENCANA, nilaiFormDariRencana(RENCANA))).toEqual({});
  });

  it('alasan batal 3..300 karakter setelah dirapikan', () => {
    expect(validasiAlasanBatal(' ab ')).toBe(PESAN_FORM_RENCANA.alasanPendek);
    expect(validasiAlasanBatal('x'.repeat(301))).toBe(PESAN_FORM_RENCANA.alasanPanjang);
    expect(validasiAlasanBatal('Hujan deras')).toBeUndefined();
  });
});
