import { AlertService } from './alert';
import { extractApiErrorMessage, getUserFriendlyError } from './errorHandling';
import { adalahKegagalanJaringan } from './kegagalanJaringan';
import { PESAN_FOTO_LOKAL_HILANG, type AlasanAntre } from './fotoMutasi';
import { AWALAN_GALAT_STATUS_UNGGAH } from '@/services/UploadService';

/**
 * Pesan galat untuk layar barang (masuk, keluar, ambil, kembalikan, riwayat).
 *
 * Pemakainya staf lapangan: tiap pesan menyebut apa yang terjadi dan apa yang
 * harus ditekan sesudahnya, dengan kata sehari-hari. Ditampilkan sebagai Alert
 * (bukan toast) karena toast hilang dalam beberapa detik dan memotong kalimat
 * panjang menjadi satu baris.
 */

/** Langkah yang gagal: menyimpan, memuat daftar, atau mengirim foto bukti. */
export type LangkahBarang = 'simpan' | 'muat' | 'foto';

export interface PesanGalatBarang {
  judul: string;
  pesan: string;
}

const HTTP_PAYLOAD_TOO_LARGE = 413;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;

const PETUNJUK_ULANG: Record<LangkahBarang, string> = {
  simpan: 'lalu tekan Simpan lagi.',
  muat: 'lalu tarik layar ke bawah untuk memuat ulang.',
  foto: 'lalu tekan Simpan lagi.',
};

const JUDUL_GAGAL: Record<LangkahBarang, string> = {
  simpan: 'Belum Tersimpan',
  muat: 'Data Belum Muncul',
  foto: 'Foto Belum Terkirim',
};

/** Status HTTP dari galat axios, bila server sempat menjawab. */
function ambilStatus(error: unknown): number | undefined {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

/** Kalimat penolakan dari server (4xx); server sudah menulisnya untuk staf. */
function ambilPesanPenolakan(error: unknown): string | undefined {
  const status = ambilStatus(error);
  if (status === undefined || status < HTTP_CLIENT_ERROR_MIN || status >= HTTP_SERVER_ERROR_MIN) {
    return undefined;
  }
  const data = (error as { response?: { data?: unknown } }).response?.data;
  return extractApiErrorMessage(data)?.trim() || undefined;
}

/** Pesan 5xx yang layak baca; `undefined` bila aplikasi menggantinya dengan pesan umum. */
function ambilPesanGangguanServer(error: unknown): string | undefined {
  const status = ambilStatus(error);
  if (status === undefined || status < HTTP_SERVER_ERROR_MIN) return undefined;
  // Pesan umum aplikasi untuk status ini, dihitung dari galat berbadan kosong.
  const pesanUmum = getUserFriendlyError({
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { status, data: {} },
  }).message;
  const pesan = getUserFriendlyError(error).message;
  return pesan !== pesanUmum ? pesan : undefined;
}

function jelaskanGalatFoto(error: unknown): PesanGalatBarang | undefined {
  if (!(error instanceof Error)) return undefined;
  if (error.message === PESAN_FOTO_LOKAL_HILANG) {
    return { judul: JUDUL_GAGAL.foto, pesan: PESAN_FOTO_LOKAL_HILANG };
  }
  if (error.message.startsWith(`${AWALAN_GALAT_STATUS_UNGGAH} ${HTTP_PAYLOAD_TOO_LARGE}`)) {
    return {
      judul: 'Foto Terlalu Besar',
      pesan: 'Foto bukti terlalu besar untuk dikirim. Hapus fotonya, ambil ulang dengan kamera, lalu tekan Simpan lagi.',
    };
  }
  return undefined;
}

/**
 * Terjemahkan galat apa pun menjadi judul dan kalimat untuk staf. `langkah`
 * menentukan petunjuk sesudahnya (tekan Simpan lagi / tarik layar ke bawah).
 */
export function jelaskanGalatBarang(error: unknown, langkah: LangkahBarang = 'simpan'): PesanGalatBarang {
  const ulang = PETUNJUK_ULANG[langkah];
  // Foto bisa gagal di langkah mana pun: antrean offline menyalin foto lokal.
  const galatFoto = jelaskanGalatFoto(error);
  if (galatFoto) return galatFoto;

  const { kind } = getUserFriendlyError(error);

  if (kind === 'network' || kind === 'offline' || adalahKegagalanJaringan(error)) {
    return {
      judul: 'Internet Putus',
      pesan: `HP tidak tersambung ke internet. Cari sinyal atau nyalakan data seluler, ${ulang}`,
    };
  }
  if (kind === 'timeout') {
    return {
      judul: 'Internet Lambat',
      pesan: langkah === 'muat'
        ? `Server terlalu lama menjawab. Tunggu sebentar, ${ulang}`
        : 'Server terlalu lama menjawab. Buka Riwayat dulu: kalau datanya belum ada, tekan Simpan lagi.',
    };
  }
  if (kind === 'auth') {
    return {
      judul: 'Perlu Masuk Lagi',
      pesan: 'Waktu masuk (login) Anda sudah habis. Keluar dari aplikasi, lalu masuk lagi dengan akun Anda.',
    };
  }
  if (kind === 'rate_limit') {
    return { judul: 'Terlalu Cepat', pesan: 'Anda menekan terlalu sering. Tunggu 1 menit, lalu coba lagi.' };
  }
  if (kind === 'update_required') {
    return {
      judul: 'Aplikasi Perlu Diperbarui',
      pesan: 'Versi aplikasi ini sudah lama. Buka Play Store, perbarui aplikasinya, lalu coba lagi.',
    };
  }

  const penolakan = ambilPesanPenolakan(error);
  if (kind === 'permission') {
    return {
      judul: 'Tidak Diizinkan',
      pesan: penolakan ?? 'Akun Anda belum boleh melakukan ini. Minta admin memeriksa izin akun Anda.',
    };
  }
  if (kind === 'not_found') {
    return {
      judul: 'Data Tidak Ada',
      pesan: penolakan ?? `Data yang dicari sudah tidak ada, mungkin baru dihapus. Tarik layar ke bawah untuk memuat ulang.`,
    };
  }
  if (kind === 'validation' || kind === 'conflict') {
    return {
      judul: 'Periksa Lagi',
      pesan: penolakan ?? 'Ada isian yang belum benar. Periksa lagi gudang, barang, dan jumlahnya.',
    };
  }
  if (kind === 'server') {
    return {
      judul: 'Gangguan Server',
      pesan: ambilPesanGangguanServer(error) ?? (langkah === 'muat'
        ? 'Server sedang ada gangguan. Tunggu beberapa menit, lalu tarik layar ke bawah. Kalau tetap gagal, lapor admin.'
        : 'Server sedang ada gangguan. Buka Riwayat dulu: kalau datanya belum ada, coba simpan lagi beberapa menit lagi. Kalau tetap gagal, lapor admin.'),
    };
  }

  // Galat tak dikenal (mis. dari unggah foto berbahasa Inggris): jangan
  // tampilkan teks mentahnya, cukup katakan langkah mana yang gagal.
  return {
    judul: JUDUL_GAGAL[langkah],
    pesan: langkah === 'foto'
      ? 'Foto bukti belum terkirim. Pastikan internet lancar, lalu tekan Simpan lagi. Kalau tetap gagal, lapor admin.'
      : `Ada masalah yang tidak terduga. Coba sekali lagi, ${ulang} Kalau tetap gagal, lapor admin.`,
  };
}

/** Tampilkan galat barang sebagai Alert yang menunggu ditutup staf. */
export function tampilkanGalatBarang(error: unknown, langkah: LangkahBarang = 'simpan'): PesanGalatBarang {
  const penjelasan = jelaskanGalatBarang(error, langkah);
  AlertService.custom(penjelasan.judul, penjelasan.pesan, [{ text: 'Mengerti' }]);
  return penjelasan;
}

/** Label kondisi barang untuk kalimat pengguna. */
export const LABEL_KONDISI: Record<string, string> = { BARU: 'Baru', BEKAS: 'Bekas', RUSAK: 'Rusak' };

/**
 * Kalimat stok kurang: sebut barang, kondisi, sisa stok, dan jalan keluarnya.
 * Sama dengan kalimat server, supaya staf membaca hal yang sama di mana pun.
 */
export function jelaskanStokKurang(input: {
  namaBarang?: string | null;
  kondisi: string;
  tersedia: number;
  diminta: number;
}): PesanGalatBarang {
  const barang = input.namaBarang ? `"${input.namaBarang}"` : 'Barang ini';
  const kondisi = LABEL_KONDISI[input.kondisi] ?? input.kondisi;
  if (input.tersedia <= 0) {
    return {
      judul: 'Stok Habis',
      pesan: `Stok habis. ${barang} kondisi ${kondisi} di gudang ini tinggal 0. Pilih kondisi lain atau gudang lain.`,
    };
  }
  return {
    judul: 'Stok Kurang',
    pesan: `Stok kurang. ${barang} kondisi ${kondisi} tinggal ${input.tersedia}, tapi Anda isi ${input.diminta}. Ubah jumlahnya jadi ${input.tersedia} atau kurang.`,
  };
}

/** Kalimat izin kamera/galeri yang ditolak HP. */
export const PESAN_IZIN_FOTO = {
  kamera: {
    judul: 'Kamera Belum Diizinkan',
    pesan: 'Aplikasi belum boleh memakai kamera. Buka Pengaturan HP, izinkan Kamera untuk aplikasi ini, lalu coba lagi.',
  },
  galeri: {
    judul: 'Galeri Belum Diizinkan',
    pesan: 'Aplikasi belum boleh membuka galeri foto. Buka Pengaturan HP, izinkan Foto untuk aplikasi ini, lalu coba lagi.',
  },
} as const;

/**
 * Beri tahu bahwa data belum terkirim, hanya tersimpan di HP. Staf perlu tahu
 * bedanya: barang belum tercatat di gudang sampai antrean terkirim.
 */
export function tampilkanAntreBarang(alasan: AlasanAntre): void {
  const pesan = alasan === 'offline'
    ? 'Internet sedang putus, jadi data disimpan dulu di HP. Data akan terkirim sendiri saat internet nyala. Cek Riwayat nanti untuk memastikan.'
    : 'Server belum menjawab, jadi data disimpan dulu di HP dan akan dikirim ulang otomatis. Cek Riwayat nanti untuk memastikan.';
  AlertService.custom('Disimpan di HP Dulu', pesan, [{ text: 'Mengerti' }]);
}

/** Tampilkan kesalahan isian (sebelum dikirim) sebagai Alert, satu masalah per baris. */
export function tampilkanIsianSalah(pesan: string, judul = 'Periksa Lagi'): void {
  AlertService.custom(judul, pesan, [{ text: 'Mengerti' }]);
}
