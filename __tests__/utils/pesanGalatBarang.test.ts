import { Alert } from 'react-native';

import {
  jelaskanGalatBarang,
  jelaskanStokKurang,
  tampilkanGalatBarang,
} from '@/utils/pesanGalatBarang';
import { PESAN_FOTO_LOKAL_HILANG } from '@/utils/fotoMutasi';
import { AWALAN_GALAT_STATUS_UNGGAH } from '@/services/UploadService';
import {
  InventoryKeluarSchema,
  InventoryMasukSchema,
  validateDataPerBaris,
} from '@/utils/validation';

/**
 * Pesan galat layar barang dibaca staf lapangan. Tiap pesan harus menyebut
 * apa yang terjadi dan apa yang ditekan sesudahnya — tanpa istilah teknis.
 */

function galatHttp(status: number, data: unknown = {}) {
  return { isAxiosError: true, message: `Request failed with status code ${status}`, response: { status, data } };
}

const ISTILAH_TEKNIS = /(server error|status code|undefined|null|JSON|payload|tenant|\bID\b|Upload failed|Authentication)/i;

describe('jelaskanGalatBarang', () => {
  it('meneruskan kalimat penolakan server (stok kurang) apa adanya', () => {
    const pesanServer = 'Stok kurang. "ONU" kondisi Baru tinggal 3, tapi Anda isi 5. Ubah jumlahnya jadi 3 atau kurang.';

    expect(jelaskanGalatBarang(galatHttp(400, { error: pesanServer }))).toEqual({
      judul: 'Periksa Lagi',
      pesan: pesanServer,
    });
  });

  it('meneruskan pesan izin 403 dari server', () => {
    const pesanServer = 'Akun Anda belum boleh mencatat barang masuk. Minta admin menambahkan izin barang masuk di akun Anda.';

    expect(jelaskanGalatBarang(galatHttp(403, { error: pesanServer })).pesan).toBe(pesanServer);
  });

  it('memakai pesan 5xx server yang layak baca', () => {
    const pesanServer = 'Ada gangguan di server. Buka Riwayat dulu: kalau datanya belum ada, coba simpan lagi. Kalau tetap gagal, lapor admin.';

    expect(jelaskanGalatBarang(galatHttp(500, { error: pesanServer }))).toEqual({
      judul: 'Gangguan Server',
      pesan: pesanServer,
    });
  });

  it('mengganti 5xx mentah dengan kalimat yang menyuruh cek Riwayat dulu', () => {
    const hasil = jelaskanGalatBarang(galatHttp(500, { error: 'Invalid `prisma.barangKeluar.create()` invocation' }));

    expect(hasil.judul).toBe('Gangguan Server');
    expect(hasil.pesan).toContain('Buka Riwayat dulu');
    expect(hasil.pesan).not.toMatch(/prisma/i);
  });

  it('internet putus: suruh cari sinyal, petunjuknya ikut langkah', () => {
    const putus = { isAxiosError: true, code: 'ERR_NETWORK', message: 'Network Error' };

    expect(jelaskanGalatBarang(putus, 'simpan')).toEqual({
      judul: 'Internet Putus',
      pesan: 'HP tidak tersambung ke internet. Cari sinyal atau nyalakan data seluler, lalu tekan Simpan lagi.',
    });
    expect(jelaskanGalatBarang(putus, 'muat').pesan).toContain('tarik layar ke bawah');
  });

  it('sesi habis: suruh masuk lagi', () => {
    expect(jelaskanGalatBarang(galatHttp(401)).judul).toBe('Perlu Masuk Lagi');
  });

  it('galat unggah foto berbahasa Inggris tidak bocor ke layar', () => {
    const hasil = jelaskanGalatBarang(new Error('Authentication required for upload'), 'foto');

    expect(hasil.judul).toBe('Foto Belum Terkirim');
    expect(hasil.pesan).not.toMatch(ISTILAH_TEKNIS);
  });

  it('foto terlalu besar (413) disebut dengan jalan keluarnya', () => {
    const hasil = jelaskanGalatBarang(new Error(`${AWALAN_GALAT_STATUS_UNGGAH} 413: <html>`), 'foto');

    expect(hasil.judul).toBe('Foto Terlalu Besar');
  });

  it('foto lokal hilang di langkah simpan tetap dijelaskan', () => {
    expect(jelaskanGalatBarang(new Error(PESAN_FOTO_LOKAL_HILANG), 'simpan').pesan).toBe(PESAN_FOTO_LOKAL_HILANG);
  });

  it.each([
    [galatHttp(429)],
    [galatHttp(426)],
    [galatHttp(404)],
    [galatHttp(422)],
    [{ isAxiosError: true, code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }],
    [new Error('Cannot read properties of undefined')],
    ['string mentah'],
  ])('tanpa istilah teknis untuk %j', (galat) => {
    expect(jelaskanGalatBarang(galat).pesan).not.toMatch(ISTILAH_TEKNIS);
  });
});

describe('tampilkanGalatBarang', () => {
  it('memakai Alert yang menunggu ditutup, bukan toast yang hilang sendiri', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    tampilkanGalatBarang(galatHttp(400, { error: 'Gudang belum dipilih. Pilih gudangnya dulu.' }));

    expect(alertSpy).toHaveBeenCalledWith('Periksa Lagi', 'Gudang belum dipilih. Pilih gudangnya dulu.', [{ text: 'Mengerti' }]);
    alertSpy.mockRestore();
  });
});

describe('jelaskanStokKurang', () => {
  it('menyebut barang, kondisi, sisa, dan angka yang boleh', () => {
    expect(jelaskanStokKurang({ namaBarang: 'Kabel Drop', kondisi: 'BEKAS', tersedia: 3, diminta: 5 })).toEqual({
      judul: 'Stok Kurang',
      pesan: 'Stok kurang. "Kabel Drop" kondisi Bekas tinggal 3, tapi Anda isi 5. Ubah jumlahnya jadi 3 atau kurang.',
    });
  });

  it('stok 0 disebut habis dan menyarankan kondisi/gudang lain', () => {
    expect(jelaskanStokKurang({ namaBarang: 'ONU', kondisi: 'BARU', tersedia: 0, diminta: 1 }).judul).toBe('Stok Habis');
  });
});

describe('isian barang masuk/keluar', () => {
  it('melaporkan semua isian yang kurang, satu per baris, dengan petunjuk', () => {
    const hasil = validateDataPerBaris(InventoryMasukSchema, { barangId: '', gudangId: '', jumlah: 0, kondisi: 'BARU' });

    expect(hasil).toEqual({
      success: false,
      error: [
        'Barang belum dipilih. Tekan kotak Barang, lalu pilih barangnya.',
        'Gudang belum dipilih. Tekan kotak Gudang, lalu pilih gudangnya.',
        'Jumlah belum diisi atau masih 0. Ketik berapa banyak barangnya, misalnya 5.',
      ].join('\n'),
    });
  });

  it('tujuan penggunaan yang terlalu panjang menyebut batasnya', () => {
    const hasil = validateDataPerBaris(InventoryKeluarSchema, {
      barangId: 'b-1',
      gudangId: 'g-1',
      jumlah: 1,
      kondisi: 'BARU',
      tujuanPenggunaan: 'x'.repeat(501),
    });

    expect(hasil).toEqual({
      success: false,
      error: 'Tujuan penggunaan terlalu panjang. Paling banyak 500 huruf, coba dipersingkat.',
    });
  });
});
