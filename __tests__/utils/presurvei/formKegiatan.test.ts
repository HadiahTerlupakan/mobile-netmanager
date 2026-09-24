import { describe, expect, it, jest } from '@jest/globals';
import * as Crypto from 'expo-crypto';

import {
  keMuatanKegiatan,
  NILAI_FORM_KEGIATAN_KOSONG,
  PESAN_FORM_KEGIATAN,
  validasiFormKegiatan,
  type NilaiFormKegiatan,
} from '@/utils/presurvei/formKegiatan';
import { badanCatatKegiatan, bangunVariabelCatat } from '@/utils/presurvei/variabelCatat';

const TITIK = { latitude: -6.2, longitude: 106.8, akurasiMeter: 12 };
const WAKTU = new Date('2026-09-24T03:15:00.000Z');

const nilai = (over: Partial<NilaiFormKegiatan>): NilaiFormKegiatan => ({
  ...NILAI_FORM_KEGIATAN_KOSONG,
  ...over,
});

describe('validasiFormKegiatan', () => {
  it('menuntut jenis dan hasil', () => {
    expect(validasiFormKegiatan(nilai({}), { titik: null, jumlahFoto: 0 })).toEqual({
      jenis: PESAN_FORM_KEGIATAN.jenis,
      hasil: PESAN_FORM_KEGIATAN.hasil,
    });
  });

  it('menolak jenis Iklan walau terkirim dari state', () => {
    const kesalahan = validasiFormKegiatan(nilai({ jenis: 'IKLAN', hasil: 'TERTARIK' }), { titik: null, jumlahFoto: 0 });
    expect(kesalahan.jenis).toBe(PESAN_FORM_KEGIATAN.jenis);
  });

  it.each(['KUNJUNGAN', 'SURVEI_LOKASI'] as const)('%s wajib titik GPS dan foto', (jenis) => {
    expect(validasiFormKegiatan(nilai({ jenis, hasil: 'TERTARIK' }), { titik: null, jumlahFoto: 0 })).toEqual({
      lokasi: PESAN_FORM_KEGIATAN.lokasi,
      foto: PESAN_FORM_KEGIATAN.fotoKurang,
    });
  });

  it('menolak lebih dari enam foto', () => {
    const kesalahan = validasiFormKegiatan(nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }), { titik: TITIK, jumlahFoto: 7 });
    expect(kesalahan).toEqual({ foto: PESAN_FORM_KEGIATAN.fotoLebih });
  });

  it('enam foto masih diterima', () => {
    expect(
      validasiFormKegiatan(nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }), { titik: TITIK, jumlahFoto: 6 }),
    ).toEqual({});
  });

  it.each(['TELEPON', 'CHAT'] as const)('%s tidak menuntut GPS maupun foto', (jenis) => {
    expect(validasiFormKegiatan(nilai({ jenis, hasil: 'TIDAK_MINAT' }), { titik: null, jumlahFoto: 0 })).toEqual({});
  });

  it.each([
    ['', undefined],
    ['0', undefined],
    ['5000', undefined],
    ['5001', PESAN_FORM_KEGIATAN.kabel],
    ['12.5', PESAN_FORM_KEGIATAN.kabel],
    ['-1', PESAN_FORM_KEGIATAN.kabel],
  ])('estimasi kabel survei "%s" → %s', (estimasiKabel, harapan) => {
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'SURVEI_LOKASI', hasil: 'PERLU_FOLLOWUP', estimasiKabel }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan.estimasiKabel).toBe(harapan);
  });

  it('isian teknis tidak divalidasi untuk kunjungan karena tidak dikirim', () => {
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', estimasiKabel: 'abc' }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan).toEqual({});
  });

  it('menolak nama yang ditemui lebih dari 120 huruf', () => {
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', ditemuiNama: 'a'.repeat(121) }),
      { titik: null, jumlahFoto: 0 },
    );
    expect(kesalahan).toEqual({ ditemuiNama: PESAN_FORM_KEGIATAN.terlaluPanjang });
  });

  it('memeriksa prospek baru hanya bila benar-benar dipakai', () => {
    const prospekBaru = { nama: 'A', noTelp: '0812', alamat: 'Jl', paketDiminati: '' };
    const lapangan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    const telepon = validasiFormKegiatan(
      nilai({ jenis: 'TELEPON', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: null, jumlahFoto: 0 },
    );

    expect(lapangan).toEqual({
      prospekBaruNama: PESAN_FORM_KEGIATAN.namaProspek,
      prospekBaruNoTelp: PESAN_FORM_KEGIATAN.telpProspek,
      prospekBaruAlamat: PESAN_FORM_KEGIATAN.alamatProspek,
    });
    expect(telepon).toEqual({});
  });

  // Amandemen preflight (task-11, R14): nama prospek baru >120 huruf dulu
  // memberi pesan "Nama minimal 2 huruf" — salah untuk kasus terlalu panjang.
  it('menolak nama prospek baru lebih dari 120 huruf dengan pesan terpisah dari batas minimal', () => {
    const prospekBaru = { nama: 'a'.repeat(121), noTelp: '081234567890', alamat: 'Jl. Kenanga 1' , paketDiminati: '' };
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan).toEqual({ prospekBaruNama: PESAN_FORM_KEGIATAN.terlaluPanjang });
  });

  // Amandemen preflight (task-11, S15): server (`kegiatan.validator.ts:60`)
  // membatasi alamat prospek baru maksimal 500 huruf; klien sebelumnya tidak
  // memeriksanya sehingga kegiatan offline bisa gagal permanen (400).
  it('menolak alamat prospek baru lebih dari 500 huruf', () => {
    const prospekBaru = { nama: 'Budi', noTelp: '081234567890', alamat: 'a'.repeat(501), paketDiminati: '' };
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan).toEqual({ prospekBaruAlamat: PESAN_FORM_KEGIATAN.terlaluPanjang });
  });

  // Amandemen preflight (task-11, S15): server (`kegiatan.validator.ts:62`)
  // membatasi paketDiminati maksimal 120 huruf; sebelumnya tidak divalidasi.
  it('menolak paket diminati lebih dari 120 huruf', () => {
    const prospekBaru = { nama: 'Budi', noTelp: '081234567890', alamat: 'Jl. Kenanga 1', paketDiminati: 'a'.repeat(121) };
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan).toEqual({ prospekBaruPaket: PESAN_FORM_KEGIATAN.terlaluPanjang });
  });

  // Amandemen preflight (task-11, S15): server tidak memaksa nomor HP
  // hanya-digit (`dataProspekBaruSchema.noTelp` = `z.string().min(8).max(20)`
  // tanpa regex). Klien yang lebih ketat menolak data yang server terima.
  it('menerima nomor HP prospek baru berisi spasi/tanda hubung selama 8–20 karakter', () => {
    const prospekBaru = { nama: 'Budi', noTelp: '0812-3456-789', alamat: 'Jl. Kenanga 1', paketDiminati: '' };
    const kesalahan = validasiFormKegiatan(
      nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK', isBuatProspekBaru: true, prospekBaru }),
      { titik: TITIK, jumlahFoto: 1 },
    );
    expect(kesalahan.prospekBaruNoTelp).toBeUndefined();
  });
});

describe('keMuatanKegiatan', () => {
  it('kunjungan membawa titik GPS dan alamat, tanpa kolom teknis', () => {
    const muatan = keMuatanKegiatan(
      nilai({
        jenis: 'KUNJUNGAN',
        hasil: 'TERTARIK',
        ditemuiNama: '  Bu Sari ',
        alamat: 'Jl. Melati 9',
        catatan: '',
        odpTerdekat: 'ODP-1',
        estimasiKabel: '40',
      }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan).toEqual({
      jenis: 'KUNJUNGAN',
      hasil: 'TERTARIK',
      waktuMulai: '2026-09-24T03:15:00.000Z',
      prospekId: null,
      ditemuiNama: 'Bu Sari',
      catatan: null,
      latitude: -6.2,
      longitude: 106.8,
      alamatDikunjungi: 'Jl. Melati 9',
    });
  });

  it('survei membawa kabel nol sebagai angka, bukan null', () => {
    const muatan = keMuatanKegiatan(
      nilai({ jenis: 'SURVEI_LOKASI', hasil: 'PERLU_FOLLOWUP', estimasiKabel: '0', odpTerdekat: 'ODP-3', catatanTeknis: '' }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan.estimasiKabelMeter).toBe(0);
    expect(muatan.odpTerdekat).toBe('ODP-3');
    expect(muatan.catatanTeknis).toBeNull();
  });

  it('telepon tidak membawa koordinat walau titik tersedia', () => {
    const muatan = keMuatanKegiatan(
      nilai({ jenis: 'TELEPON', hasil: 'TIDAK_MINAT', prospekId: 'p-7', alamat: 'Jl. X' }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan).toEqual({
      jenis: 'TELEPON',
      hasil: 'TIDAK_MINAT',
      waktuMulai: '2026-09-24T03:15:00.000Z',
      prospekId: 'p-7',
      ditemuiNama: null,
      catatan: null,
    });
  });

  it('prospek baru ikut hanya bila diizinkan, paket kosong menjadi null', () => {
    const muatan = keMuatanKegiatan(
      nilai({
        jenis: 'KUNJUNGAN',
        hasil: 'DEAL',
        isBuatProspekBaru: true,
        prospekBaru: { nama: ' Budi ', noTelp: '081234567890', alamat: 'Jl. Kenanga 1', paketDiminati: '' },
      }),
      { titik: TITIK, waktuMulai: WAKTU },
    );

    expect(muatan.prospekBaru).toEqual({
      nama: 'Budi',
      noTelp: '081234567890',
      alamat: 'Jl. Kenanga 1',
      paketDiminati: null,
    });
  });

  it('menolak dipanggil sebelum jenis dan hasil dipilih', () => {
    expect(() => keMuatanKegiatan(nilai({}), { titik: null, waktuMulai: WAKTU })).toThrow();
  });
});

describe('variabel catat', () => {
  const MUATAN = keMuatanKegiatan(nilai({ jenis: 'KUNJUNGAN', hasil: 'TERTARIK' }), { titik: TITIK, waktuMulai: WAKTU });

  it('foto lokal ikut lewat meta.photos ke medan fotoUrls bertipe presurvei', () => {
    const foto = Object.freeze(['file:///cache/a.jpg', 'file:///cache/b.jpg']);

    const variabel = bangunVariabelCatat(MUATAN, foto);

    expect(variabel.meta).toEqual({
      photos: ['file:///cache/a.jpg', 'file:///cache/b.jpg'],
      targetField: 'fotoUrls',
      photoType: 'presurvei',
    });
    expect(variabel.meta?.photos).not.toBe(foto);
  });

  it('tanpa foto tidak ada meta', () => {
    expect('meta' in bangunVariabelCatat(MUATAN, [])).toBe(false);
  });

  it('badan request tidak pernah membawa meta, tetapi membawa requestId', () => {
    const variabel = bangunVariabelCatat(MUATAN, ['file:///cache/a.jpg']);
    const badan = badanCatatKegiatan(variabel);
    expect(badan).toEqual({ ...MUATAN, requestId: variabel.requestId });
  });

  // Task 11b: requestId sekali per upaya simpan — dipakai header
  // Idempotency-Key di jalur online dan replay antrean.
  it('membuat requestId berawalan presurvei dari UUID', () => {
    jest.mocked(Crypto.randomUUID).mockReturnValueOnce('uuid-satu');

    expect(bangunVariabelCatat(MUATAN, []).requestId).toBe('presurvei-uuid-satu');
  });

  it('dua upaya simpan terpisah mendapat requestId berbeda', () => {
    jest.mocked(Crypto.randomUUID).mockReturnValueOnce('uuid-satu').mockReturnValueOnce('uuid-dua');

    const pertama = bangunVariabelCatat(MUATAN, []);
    const kedua = bangunVariabelCatat(MUATAN, ['file:///cache/a.jpg']);

    expect(pertama.requestId).toBe('presurvei-uuid-satu');
    expect(kedua.requestId).toBe('presurvei-uuid-dua');
  });

  // Ruling Task 13 (progress.md): fotoUrls hanya dikirim bila
  // isButuhLokasi(jenis) — Telepon/Chat tidak membawa bukti foto di form
  // (spec §4.1), jadi foto sisa dari jenis lapangan tidak boleh ikut.
  it.each(['TELEPON', 'CHAT'] as const)('%s tidak membawa foto meski fotoLokal masih terisi', (jenis) => {
    const muatanNonLapangan = keMuatanKegiatan(nilai({ jenis, hasil: 'TIDAK_MINAT' }), { titik: null, waktuMulai: WAKTU });

    const variabel = bangunVariabelCatat(muatanNonLapangan, ['file:///cache/a.jpg']);

    expect('meta' in variabel).toBe(false);
  });
});
